// src/app/api/overpass/route.ts
//
// Server-side proxy for the Overpass API.
// Bypasses CORS + browser IP rate-limits by running fetches server-side.
//
// PERFORMANCE NOTE (fixed — was the cause of 2-3 minute facility
// searches): this used to try mirrors one at a time, and each mirror got
// its own POST attempt AND a separate GET fallback attempt, each with up
// to a 20s timeout, with backoff sleeps between mirrors. That's a chain
// of up to 10 sequential network attempts with no shared budget — worst
// case (all 5 mirrors slow-but-not-instantly-failing) summed to roughly
// 160 seconds before giving up. Now every mirror gets ONE shared deadline
// (POST-then-GET-if-needed, bounded together, not each separately), and
// mirrors are raced with a short stagger between starts instead of
// waiting for each one to fully fail before trying the next. Worst case
// (every mirror dead) is now bounded to ~(MIRRORS.length-1)*STAGGER_MS +
// TIMEOUT_MS ≈ 22 seconds, and the common case (first mirror healthy) is
// a single request that resolves as soon as it responds.
//
// Usage: POST /api/overpass  { "query": "<overpass QL string>" }

import { NextRequest, NextResponse } from 'next/server';

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

// One deadline per mirror covering its POST attempt AND its GET fallback
// together (not 20s + 20s like before) — see note above.
const TIMEOUT_MS = 12_000;
// Head start given to an earlier-starting mirror before the next one also
// starts racing — keeps the common case (first mirror is healthy) down to
// a single outbound request instead of firing all 5 on every search.
const STAGGER_MS = 2_500;

const UA = 'HealthConnect-Navigator/1.0 (health facility finder)';

/** Fisher-Yates shuffle — randomise mirror order so load spreads across calls */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * POST first (standard Overpass form encoding), falling back to GET
 * (some mirrors only support GET) — both attempts share ONE
 * AbortController tied to `timeoutMs`, so together they can't exceed the
 * mirror's single deadline the way two independently-timed attempts
 * could before.
 */
async function tryMirror(
  mirror: string,
  encoded: string,
  query: string,
  timeoutMs: number,
): Promise<{ data: any; mirror: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    try {
      const resp = await fetch(mirror, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'User-Agent': UA,
        },
        body: encoded,
        signal: controller.signal,
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.elements) return { data, mirror };
      }
    } catch (e: any) {
      // Out of time entirely — don't bother with the GET fallback either.
      if (e?.name === 'AbortError' || controller.signal.aborted) {
        throw new Error(`${mirror}: timed out after ${timeoutMs}ms`);
      }
      // Otherwise fall through to the GET fallback below.
    }

    try {
      const url = `${mirror}?data=${encodeURIComponent(query)}&output=json`;
      const resp = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json', 'User-Agent': UA },
        signal: controller.signal,
      });
      if (!resp.ok) throw new Error(`${mirror}: HTTP ${resp.status}`);
      const data = await resp.json();
      if (!data?.elements) throw new Error(`${mirror}: bad response shape`);
      return { data, mirror };
    } catch (e: any) {
      // Same shared deadline can also expire mid-GET (e.g. POST failed
      // fast, GET was still in flight when the mirror's clock ran out) —
      // normalise that the same way as the POST-phase timeout above,
      // instead of leaking a raw "The operation was aborted" that doesn't
      // say which mirror or why.
      if (e?.name === 'AbortError' || controller.signal.aborted) {
        throw new Error(`${mirror}: timed out after ${timeoutMs}ms`);
      }
      throw e;
    }
  } finally {
    clearTimeout(timer);
  }
}

/** Starts `tryMirror` after `delayMs` — lets earlier mirrors get a head start. */
function staggeredMirror(
  mirror: string,
  delayMs: number,
  encoded: string,
  query: string,
): Promise<{ data: any; mirror: string }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      tryMirror(mirror, encoded, query, TIMEOUT_MS).then(resolve, reject);
    }, delayMs);
  });
}

export async function POST(req: NextRequest) {
  let query: string;
  try {
    const body = await req.json();
    query = body?.query;
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "query" field.' },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const encoded = `data=${encodeURIComponent(query)}`;
  const mirrors = shuffle(MIRRORS);

  const attempts = mirrors.map((mirror, i) =>
    staggeredMirror(mirror, i * STAGGER_MS, encoded, query),
  );

  try {
    const { data, mirror } = await Promise.any(attempts);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        'X-Overpass-Mirror': mirror,
      },
    });
  } catch (aggregateError: any) {
    const errors: string[] = Array.isArray(aggregateError?.errors)
      ? aggregateError.errors.map((e: any) => e?.message ?? String(e))
      : [String(aggregateError?.message ?? aggregateError)];

    console.error('[overpass proxy] all mirrors failed:', errors);
    return NextResponse.json(
      {
        error: 'All Overpass mirrors are currently unavailable. Please wait 30 seconds and try again.',
        details: errors,
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
