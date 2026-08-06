// src/app/api/symptom-match/route.ts
//
// Step 15 — Section 3.1, Use 2: the "text bar" on /find-care.
// A user types free text when the symptom chips don't cover their
// situation. This is routing only — never diagnosis, never medical advice.
//
// Matching order:
//   1. matchFreeText() — deterministic, local, no network call. Reuses the
//      same weighted SYMPTOM_FACILITY_MAP the chip picker uses. Handles
//      the large majority of real phrasing (pain, fever, cough, etc).
//   2. Gemini — only called when step 1 finds nothing. Kept as a fallback
//      for phrasing SYNONYMS doesn't cover yet, rather than removed
//      outright, since free text is open-ended and a static dictionary
//      will always miss some of it.
//
// Request:   POST { text: string }
// Response:  200 { facilityType, reason, facility: { slug, name, icon } }
//            200 { facilityType: 'clinic', reason, facility, lowConfidence: true }
//                — Gemini was unreachable/failed/exhausted quota for text
//                the local dictionary also missed. Rather than a dead end,
//                this routes to a general clinic (the same safe floor used
//                elsewhere in this file for ambiguous answers) with
//                lowConfidence: true so the UI can distinguish a real
//                match from the safety net if it wants to.
//            4xx { error: '<reason>' } — genuine input problems only
//                (unauthenticated, invalid body, text too short/long).
//
// This is routing only. No diagnosis is made or implied, per Section 3.1.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession }          from 'next-auth';
import { authOptions }               from '@/lib/auth';
import { prisma }                    from '@/lib/prisma';
import { FACILITY_TYPE_OPTIONS, type FacilityTypeOption } from '@/lib/constants';
import { matchFreeText, reasonForMatch } from '@/lib/freeTextSymptomMatch';

// ── Gemini setup ────────────────────────────────────────────────────────────
// Uses GEMINI_API_KEY_SYMPTOMS_PRIMARY as primary, with its own dedicated
// fallback (GEMINI_API_KEY_SYMPTOMS_FALLBACK — a separate account) rather
// than borrowing the advisory route's keys. Sharing across routes meant
// every symptom search that overflowed onto a shared key was draining the
// key the other route depends on first, so both routes would end up
// exhausted together.

const KEY_PRIMARY  = process.env.GEMINI_API_KEY_SYMPTOMS_PRIMARY  ?? '';
const KEY_FALLBACK = process.env.GEMINI_API_KEY_SYMPTOMS_FALLBACK ?? '';
const GEMINI_MODEL = 'gemini-2.0-flash';

function geminiUrl() {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
}

// ── Input limits ─────────────────────────────────────────────────────────
// Keeps the free-text box to a short symptom description, not a paragraph.

const MIN_LENGTH = 3;
const MAX_LENGTH = 300;

// ── Server-side cache ────────────────────────────────────────────────────
// Same free text tends to repeat across users searching common symptoms
// ("burning pain when I urinate", "toothache", etc). Cache the mapped
// result so Gemini isn't re-queried for identical input.
//
// TTL and max size bumped up (from 1hr/200 entries) after real quota
// exhaustion in production — symptom-to-facility-type mappings don't go
// stale the way, say, prices or availability would, so there's little
// downside to holding onto them longer. Entries are tiny (a couple of
// short strings each), so 2,000 of them is a trivial memory cost even on
// a small serverless instance. This won't fix quota exhaustion caused by
// genuinely high unique-phrase volume or shared preview/prod keys, but it
// squeezes more out of every Gemini call that does succeed.
//
// Stashed on globalThis (same pattern as the Prisma client singleton) so
// the cache survives Next.js dev-mode hot reloads. Without this, editing
// any file this route depends on recompiles the module and wipes a plain
// module-scope Map — in dev that can mean the cache effectively resets
// every few minutes, turning near-every request into a live Gemini call
// and burning through quota far faster than real usage would.

interface CacheEntry { facilityType: string; reason: string; expiresAt: number }

const globalForCache = globalThis as unknown as {
  symptomMatchCache?: Map<string, CacheEntry>;
};
const matchCache = globalForCache.symptomMatchCache ?? new Map<string, CacheEntry>();
globalForCache.symptomMatchCache = matchCache;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (was 1 hour)
const CACHE_MAX    = 2000;                // (was 200)

function cacheKeyFor(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getCached(key: string): CacheEntry | null {
  const entry = matchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { matchCache.delete(key); return null; }
  return entry;
}

function setCached(key: string, entry: Omit<CacheEntry, 'expiresAt'>): void {
  if (matchCache.size >= CACHE_MAX) {
    const oldest = matchCache.keys().next().value;
    if (oldest) matchCache.delete(oldest);
  }
  matchCache.set(key, { ...entry, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Gemini fetch (with its own dedicated fallback key) ─────────────────────

async function fetchGemini(apiKey: string, body: object): Promise<string> {
  const res = await fetch(geminiUrl(), {
    method:  'POST',
    headers: {
      'Content-Type':   'application/json',
      'x-goog-api-key': apiKey,
    },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw Object.assign(new Error(`Gemini ${res.status}`), { status: res.status, body: err });
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

async function callGemini(userText: string): Promise<string> {
  // Exact prompt from Section 3.1 — do not reword; the "no diagnosis, no
  // medical advice" instruction is load-bearing for this feature.
  const prompt =
    `The user in Ghana describes: '${userText}'. Which type of medical ` +
    `facility do they need? Reply with only: facilityType (e.g. hospital, ` +
    `dental_clinic, eye_clinic) and a one-sentence reason. No diagnosis. ` +
    `No medical advice.`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature:       0.1, // deterministic routing, not creative
      maxOutputTokens:   150,
      responseSchema: {
        type: 'object',
        properties: {
          facilityType: { type: 'string' },
          reason:       { type: 'string' },
        },
        required: ['facilityType', 'reason'],
      },
    },
  };

  // No primary key configured at all — go straight to fallback rather
  // than firing a request that's guaranteed to 400 on an empty key.
  if (!KEY_PRIMARY && KEY_FALLBACK) {
    console.warn('[symptom-match] SYMPTOMS_PRIMARY not configured — using SYMPTOMS_FALLBACK');
    return await fetchGemini(KEY_FALLBACK, body);
  }

  try {
    return await fetchGemini(KEY_PRIMARY, body);
  } catch (err: any) {
    // Fall back on quota (429) AND on auth/key problems (400/401/403) —
    // a missing or invalid KEY_SYMPTOMS shouldn't strand every request,
    // only genuinely unrecoverable errors should skip the fallback.
    const recoverable = err?.status === 429 || err?.status === 400 || err?.status === 401 || err?.status === 403;
    if (recoverable && KEY_FALLBACK) {
      console.warn(`[symptom-match] SYMPTOMS_PRIMARY failed (${err?.status}) — retrying with SYMPTOMS_FALLBACK`);
      return await fetchGemini(KEY_FALLBACK, body);
    }
    throw err;
  }
}

// ── facilityType → facility-type-slug mapping ───────────────────────────
// Gemini's facilityType is free-form-ish English (hospital, dental_clinic,
// eye_clinic, ...). The rest of the app (results page, symptom chips)
// routes on the FACILITY_TYPE_OPTIONS slugs in lib/constants.ts, so we
// translate here via keyword matching rather than expecting an exact enum
// back. Falls back to 'clinic' — a safe first stop — for anything
// unrecognised, same behaviour as matchSymptoms() for ambiguous symptom
// chip selections.

const FACILITY_BY_SLUG: Record<string, FacilityTypeOption> =
  Object.fromEntries(FACILITY_TYPE_OPTIONS.map(o => [o.slug, o]));

const KEYWORD_TO_FACILITY: Array<{ keywords: string[]; slug: string }> = [
  { keywords: ['dent', 'tooth', 'gum'],                          slug: 'dentist' },
  { keywords: ['eye', 'vision', 'ophthalm', 'optic'],             slug: 'eye_clinic' },
  { keywords: ['ent', 'ear', 'nose', 'throat', 'sinus'],          slug: 'ent_clinic' },
  { keywords: ['pharma', 'medicine', 'drug', 'prescription'],     slug: 'pharmacy' },
  { keywords: ['lab', 'test', 'blood_work', 'diagnostic'],        slug: 'laboratory' },
  { keywords: ['matern', 'obgyn', 'gynae', 'pregnan', 'menstru', 'midwi'], slug: 'maternity' },
  { keywords: ['mental', 'psych', 'anxiety', 'depress'],          slug: 'mental_health' },
  { keywords: ['hospital', 'emergency', 'surger', 'fracture', 'severe'],  slug: 'hospital' },
  { keywords: ['clinic', 'general', 'gp', 'health_center', 'health_centre'], slug: 'clinic' },
];

function mapFacilityTypeToOption(facilityType: string): FacilityTypeOption | null {
  const normalised = facilityType.toLowerCase().replace(/[^a-z]/g, '_');
  for (const { keywords, slug } of KEYWORD_TO_FACILITY) {
    if (keywords.some(kw => normalised.includes(kw))) {
      return FACILITY_BY_SLUG[slug] ?? null;
    }
  }
  // Anything unrecognised — a general clinic is always a safe first stop.
  return FACILITY_BY_SLUG['clinic'] ?? null;
}

// ── Graceful degradation when Gemini itself is unreachable ─────────────────
// Previously, anything that stopped us from getting a usable answer out of
// Gemini (no key configured, empty response, malformed JSON, missing
// facilityType, quota exhaustion, network error) returned a dead-end
// "we couldn't process that" message with no facility at all. That's the
// worst possible outcome for someone who came here worried about a real
// symptom: the local dictionary already missed their phrasing, and now
// the fallback failed too, so they get nothing.
//
// clinic is already treated as the safe universal floor everywhere else in
// this route (mapFacilityTypeToOption falls back to it for any
// unrecognised Gemini answer, matchSymptoms does the same for ambiguous
// chip selections) — so it makes sense to apply the same floor here rather
// than dead-ending. lowConfidence signals to the UI that this came from
// the safety net, not a real routing decision, in case that's worth
// surfacing differently (e.g. a softer "we're not fully sure" tone).
function clinicFallbackResponse(reason: string): NextResponse {
  const clinic = FACILITY_BY_SLUG['clinic'];
  if (!clinic) {
    // Only reachable if 'clinic' itself was removed from FACILITY_TYPE_OPTIONS
    // — genuinely nothing safe left to fall back to.
    return NextResponse.json(
      { error: "We couldn't process that — try selecting a symptom above, or call 193 for emergencies." },
      { status: 200 }
    );
  }
  return NextResponse.json({
    facilityType:   'clinic',
    reason,
    facility:       { slug: clinic.slug, name: clinic.label, icon: clinic.icon },
    lowConfidence:  true,
  });
}

// ── Route handler ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (text.length < MIN_LENGTH) {
      return NextResponse.json(
        { error: 'Please describe what you\'re feeling in a bit more detail.' },
        { status: 400 }
      );
    }
    if (text.length > MAX_LENGTH) {
      return NextResponse.json(
        { error: `Please keep this under ${MAX_LENGTH} characters.` },
        { status: 400 }
      );
    }

    // ── Step 1: local deterministic match (no network call, no key needed) ─
    const localMatches = matchFreeText(text);
    if (localMatches.length > 0) {
      const top = localMatches[0];
      console.log(`[symptom-match] Local match for "${text.slice(0, 40)}" → ${top.slug}`);
      return NextResponse.json({
        facilityType: top.slug,
        reason:       reasonForMatch(top),
        facility:     { slug: top.slug, name: top.label, icon: top.icon },
      });
    }

    // ── Step 2: Gemini fallback (nothing local recognised the phrasing) ──
    if (!KEY_PRIMARY && !KEY_FALLBACK) {
      console.error('[symptom-match] No local match and no Gemini API key configured');
      return clinicFallbackResponse(
        "We couldn't automatically match that to a specific type of care — a general clinic is a safe place to start, or call 193 if this feels urgent."
      );
    }
    // Structured, full-text fallthrough log — the raw material for expanding
    // SYNONYMS in freeTextSymptomMatch.ts. Persisted to SymptomFallthroughLog
    // (see schema.prisma) rather than console-only, so real misses can be
    // queried directly instead of scraped out of hosting logs.
    // Best-effort: a logging failure must never break the actual feature.
    console.log(`[symptom-match] symptom_fallthrough ${JSON.stringify({ text, ts: new Date().toISOString() })}`);
    let fallthroughLogId: string | null = null;
    try {
      const row = await prisma.symptomFallthroughLog.create({
        data: { userId: session.user.id, text },
        select: { id: true },
      });
      fallthroughLogId = row.id;
    } catch (err: any) {
      console.error('[symptom-match] Failed to write fallthrough log:', err?.message ?? err);
    }

    // Cache lookup
    const cacheKey = cacheKeyFor(text);
    const cached   = getCached(cacheKey);
    let facilityType: string;
    let reason: string;

    if (cached) {
      console.log(`[symptom-match] symptom_fallthrough_resolved ${JSON.stringify({ text, facilityType: cached.facilityType, source: 'cache', ts: new Date().toISOString() })}`);
      if (fallthroughLogId) {
        try {
          await prisma.symptomFallthroughLog.update({
            where: { id: fallthroughLogId },
            data:  { facilityType: cached.facilityType, source: 'cache', resolvedAt: new Date() },
          });
        } catch (err: any) {
          console.error('[symptom-match] Failed to update fallthrough log:', err?.message ?? err);
        }
      }
      ({ facilityType, reason } = cached);
    } else {
      const raw = await callGemini(text);

      if (!raw) {
        console.error('[symptom-match] Gemini returned empty response');
        return clinicFallbackResponse(
          "We couldn't fully process what you described — a general clinic is a safe place to start, or call 193 if this feels urgent."
        );
      }

      let parsed: { facilityType?: string; reason?: string };
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.error('[symptom-match] Gemini response was not valid JSON:', raw.slice(0, 200));
        return clinicFallbackResponse(
          "We couldn't fully process what you described — a general clinic is a safe place to start, or call 193 if this feels urgent."
        );
      }

      facilityType = (parsed.facilityType ?? '').trim();
      reason       = (parsed.reason ?? '').trim();

      if (!facilityType) {
        console.error('[symptom-match] Gemini response missing facilityType:', raw.slice(0, 200));
        return clinicFallbackResponse(
          "We couldn't fully process what you described — a general clinic is a safe place to start, or call 193 if this feels urgent."
        );
      }

      setCached(cacheKey, { facilityType, reason });
      console.log(`[symptom-match] symptom_fallthrough_resolved ${JSON.stringify({ text, facilityType, source: 'gemini', ts: new Date().toISOString() })}`);
      if (fallthroughLogId) {
        try {
          await prisma.symptomFallthroughLog.update({
            where: { id: fallthroughLogId },
            data:  { facilityType, source: 'gemini', resolvedAt: new Date() },
          });
        } catch (err: any) {
          console.error('[symptom-match] Failed to update fallthrough log:', err?.message ?? err);
        }
      }
    }

    const facility = mapFacilityTypeToOption(facilityType);
    if (!facility) {
      // Should be unreachable ('clinic' is always the floor), but fail safe.
      return clinicFallbackResponse(
        "We couldn't fully process what you described — a general clinic is a safe place to start, or call 193 if this feels urgent."
      );
    }

    return NextResponse.json({
      facilityType,
      reason,
      facility: { slug: facility.slug, name: facility.label, icon: facility.icon },
    });

  } catch (error: any) {
    const status = error?.status as number | undefined;

    if (status === 429) {
      console.warn('[symptom-match] Both Gemini keys quota exceeded');
      return clinicFallbackResponse(
        "We're getting a lot of requests right now, so we couldn't fully process that — a general clinic is a safe place to start, or call 193 if this feels urgent."
      );
    }

    console.error('[symptom-match] Error:', error?.message ?? error);
    return clinicFallbackResponse(
      "We couldn't fully process what you described — a general clinic is a safe place to start, or call 193 if this feels urgent."
    );
  }
}