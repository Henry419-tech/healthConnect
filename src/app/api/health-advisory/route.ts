// src/app/api/health-advisory/route.ts
//
// Serves the dashboard's "Health Tip" card from Simple English Wikipedia
// (https://simple.wikipedia.org) instead of an LLM or MedlinePlus.
//
// Why the switch from MedlinePlus: MedlinePlus summaries are written for a
// US clinical-literacy audience ("inflammation of the thin tissue that
// surrounds the brain and spinal cord, called the meninges") — accurate,
// but not plain English for a general Ghanaian audience. Simple English
// Wikipedia is written specifically in simplified vocabulary and short
// sentences (originally built for language learners and readers with
// limited English), is human-written/human-edited (not AI-generated), and
// has a free, keyless REST API. Example, same topic as above:
// "Meningitis happens when the brain's lining becomes inflamed. This
// lining is called the meninges." — much closer to what we want here.
//
// There's still no region/season targeting (same limitation as the
// MedlinePlus version had) — we rotate through a curated list of topic
// titles, one per day, and surface that topic's plain-English intro.
//
// Docs: https://www.mediawiki.org/wiki/API:Extracts
// Example: https://simple.wikipedia.org/w/api.php?action=query&format=json
//          &prop=extracts&exintro=true&explaintext=true&redirects=1&titles=Malaria

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession }          from 'next-auth';
import { authOptions }               from '@/lib/auth';

const WIKI_API_BASE = 'https://simple.wikipedia.org/w/api.php';

// Wikimedia asks API consumers to identify themselves with a descriptive
// User-Agent including contact info — replace the email below with a real
// address before shipping (see https://meta.wikimedia.org/wiki/User-Agent_policy).
const WIKI_USER_AGENT = 'HealthConnectNavigator/1.0 (contact: dev@healthconnect.example)';

// ── Topic rotation ───────────────────────────────────────────────────────
// One lookup per day of the year (see dayOfYear() below). Titles are exact
// Simple English Wikipedia page titles (or close enough for `redirects=1`
// to resolve). Mix of topics that matter most in Ghana (malaria, cholera,
// typhoid, meningitis) plus general preventive-health topics.
const TOPIC_ROTATION: { title: string; display?: string }[] = [
  { title: 'Malaria' },
  { title: 'Hand washing' },
  { title: 'Cholera' },
  { title: 'Typhoid fever' },
  { title: 'Meningitis' },
  { title: 'Vaccine' },
  { title: 'Hypertension', display: 'High Blood Pressure' },
  { title: 'Diabetes' },
  { title: 'Nutrition' },
  { title: 'Dengue fever' },
  { title: 'Tuberculosis' },
  { title: 'HIV/AIDS' },
  { title: 'Pregnancy' },
  { title: 'Mental health' },
  { title: 'First aid' },
  { title: 'Dehydration' },
  { title: 'Diarrhea' },
  { title: 'Anemia' },
  { title: 'Skin infection' },
  { title: 'Common cold' },
];

// ── Server-side cache ────────────────────────────────────────────────────
// Key: "{topic}:{yyyy-mm-dd}". TTL 24h. Stashed on globalThis so it
// survives Next.js dev-mode hot reloads — same pattern used elsewhere in
// this codebase (see symptom-match/route.ts).

interface CacheEntry { tip: string; sourceUrl: string; title: string; expiresAt: number; }

const globalForCache = globalThis as unknown as {
  healthTipCache?: Map<string, CacheEntry>;
};
const tipCache = globalForCache.healthTipCache ?? new Map<string, CacheEntry>();
globalForCache.healthTipCache = tipCache;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_MAX    = 40;

function getCached(key: string): CacheEntry | null {
  const entry = tipCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { tipCache.delete(key); return null; }
  return entry;
}

function setCached(key: string, entry: Omit<CacheEntry, 'expiresAt'>): void {
  if (tipCache.size >= CACHE_MAX) {
    const oldest = tipCache.keys().next().value;
    if (oldest) tipCache.delete(oldest);
  }
  tipCache.set(key, { ...entry, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Day helpers (topic picker) ───────────────────────────────────────────
function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

function todayKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Accra' }).format(new Date()); // yyyy-mm-dd
}

// ── Snippet trimming ─────────────────────────────────────────────────────
// explaintext=true already gives us plain text (no HTML/wikitext to
// strip), but the full intro can be several paragraphs — trim to the
// first 1-2 sentences, capped around 220 characters, so it fits the card.
function toTipSnippet(extract: string): string {
  const cleaned = extract.replace(/\s+/g, ' ').trim();
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) ?? [cleaned];
  let snippet = sentences[0]?.trim() ?? cleaned;
  if (snippet.length < 100 && sentences[1]) {
    snippet = `${snippet} ${sentences[1].trim()}`;
  }
  if (snippet.length > 220) {
    snippet = `${snippet.slice(0, 217).trim()}…`;
  }
  return snippet;
}

async function fetchWikiTip(topic: { title: string; display?: string }): Promise<{ tip: string; sourceUrl: string; title: string } | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'extracts',
    exintro: 'true',
    explaintext: 'true',
    redirects: '1',
    titles: topic.title,
  });

  const res = await fetch(`${WIKI_API_BASE}?${params.toString()}`, {
    headers: { 'User-Agent': WIKI_USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw Object.assign(new Error(`Simple Wikipedia ${res.status}`), { status: res.status });
  }
  const data = await res.json();

  const pages = data?.query?.pages ?? {};
  const page = Object.values(pages)[0] as { title?: string; extract?: string; missing?: unknown } | undefined;

  if (!page || page.missing !== undefined || !page.extract) return null;

  const tip = toTipSnippet(page.extract);
  if (!tip) return null;

  const pageTitle = page.title ?? topic.title;
  const sourceUrl = `https://simple.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`;

  return { tip, sourceUrl, title: topic.display ?? pageTitle };
}

// ── Route handler ────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const topic = TOPIC_ROTATION[dayOfYear() % TOPIC_ROTATION.length];
    const cacheKey = `${topic.title}:${todayKey()}`;

    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json({
        advisory: cached.tip,
        title: cached.title,
        sourceUrl: cached.sourceUrl,
        source: 'Simple English Wikipedia',
        cached: true,
      });
    }

    const result = await fetchWikiTip(topic);

    if (!result) {
      console.error(`[health-advisory] No Simple Wikipedia extract found for topic "${topic.title}"`);
      return NextResponse.json({ advisory: null }, { status: 200 });
    }

    setCached(cacheKey, result);

    return NextResponse.json({
      advisory: result.tip,
      title: result.title,
      sourceUrl: result.sourceUrl,
      source: 'Simple English Wikipedia',
      cached: false,
    });

  } catch (error: any) {
    console.error('[health-advisory] Error:', error?.message ?? error);
    // Return 200 with null advisory so the dashboard degrades gracefully
    // to its static FALLBACK_TIPS rather than showing an error state.
    return NextResponse.json({ advisory: null }, { status: 200 });
  }
}