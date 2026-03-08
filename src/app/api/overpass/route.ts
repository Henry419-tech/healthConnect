// src/app/api/overpass/route.ts
//
// Server-side proxy for the Overpass API.
// Bypasses CORS + browser IP rate-limits by running fetches server-side.
// Tries multiple mirrors with exponential back-off and a GET fallback.
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

/** Fisher-Yates shuffle — randomise mirror order so load spreads across calls */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function tryMirror(
  mirror: string,
  encoded: string,
  query: string,
  timeoutMs: number,
): Promise<Response | null> {
  // attempt 1: POST (standard Overpass form encoding)
  try {
    const resp = await fetch(mirror, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'HealthConnect-Navigator/1.0 (health facility finder)',
      },
      body: encoded,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (resp.status === 429) return null;
    if (resp.ok) return resp;
  } catch {
    // fall through to GET attempt
  }

  // attempt 2: GET fallback (some mirrors only support GET)
  try {
    const url = `${mirror}?data=${encodeURIComponent(query)}&output=json`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HealthConnect-Navigator/1.0 (health facility finder)',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (resp.status === 429) return null;
    if (resp.ok) return resp;
  } catch {
    // both attempts failed
  }

  return null;
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
  const errors: string[] = [];

  // Per-mirror timeout shrinks across attempts to stay under serverless limits
  const BASE_TIMEOUT = 20_000;
  const BACKOFF_MS   = [0, 1500, 3000];

  for (let mi = 0; mi < mirrors.length; mi++) {
    const mirror    = mirrors[mi];
    const timeoutMs = Math.max(10_000, BASE_TIMEOUT - mi * 2_500);
    const backoff   = BACKOFF_MS[Math.min(mi, BACKOFF_MS.length - 1)];

    if (backoff > 0) await sleep(backoff);

    try {
      const resp = await tryMirror(mirror, encoded, query, timeoutMs);
      if (!resp) { errors.push(`${mirror}: rate-limited`); continue; }

      const data = await resp.json();
      if (!data?.elements) { errors.push(`${mirror}: bad response shape`); continue; }

      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
          'X-Overpass-Mirror': mirror,
        },
      });
    } catch (err: any) {
      errors.push(`${mirror}: ${err?.message ?? 'unknown'}`);
    }
  }

  console.error('[overpass proxy] all mirrors failed:', errors);
  return NextResponse.json(
    {
      error: 'All Overpass mirrors are currently unavailable. Please wait 30 seconds and try again.',
      details: errors,
    },
    { status: 502, headers: { 'Cache-Control': 'no-store' } },
  );
}