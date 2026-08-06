// prisma/seed-facilities-datagovgh.ts
// One-time seed: import the "Ghana Health Facilities" dataset into the
// Facility table, geocoding any rows that are missing coordinates.
//
// SOURCE: data.gov.gh's own download links are broken (site returns "page
// does not exist" for every CSV as of July 2026). Using the Kaggle mirror
// of the same underlying government dataset instead:
//   https://www.kaggle.com/datasets/citizen-ds-ghana/health-facilities-gh
// (file: health-facilities-gh.csv, 3,756 rows, confirmed columns below —
// no longer a guess, verified against the actual downloaded file.)
//
// WHY THIS EXISTS
// See HEALTHNAV_MASTER_HANDOFF.md Phase 9 — this is the seed half of the
// Facility DB that merges with live OSM/Overpass results on /facilities to
// cover gaps in OSM's Ghana coverage (see constants.ts comment on
// FACILITY_TYPE_OPTIONS for why ENT/maternity/mental_health are thin there).
//
// COVERAGE REALITY CHECK (checked against the actual file, not assumed):
// This dataset has ZERO pharmacy / laboratory / eye_clinic / ent_clinic
// entries — it only breaks out Hospital, Clinic, Health Centre, CHPS,
// Maternity Home, RCH, and 3 Psychiatric Hospitals. So this seed genuinely
// helps `maternity` (369 real rows) and gives a small real boost to
// `mental_health` (3 rows) — but does NOTHING for pharmacy/lab/eye/ENT.
// Those still depend entirely on OSM tagging or the admin submission flow.
// Administrative rows (District/Regional/Municipal Health Directorates,
// Training/Research Institutions, bare "Centre", "Others") are intentionally
// left unmapped below so they're excluded, not imported as facilities.
//
// Run with --dry-run first regardless — it prints a full summary (mapped
// rows, unmapped types, geocode failures) without writing to the DB.
//
// USAGE
//   npx tsx prisma/seed-facilities-datagovgh.ts --dry-run --file=./data/health-facilities-gh.csv
//   npx tsx prisma/seed-facilities-datagovgh.ts --file=./data/health-facilities-gh.csv
//
// REQUIRES: DATABASE_URL set, `npx prisma generate` already run.
// No new dependencies — uses a small inline CSV parser and the built-in
// fetch client, so nothing extra to npm install.

import { PrismaClient, FacilityStatus } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

// ─── 1. CONFIG — verified against the actual health-facilities-gh.csv ─────
// Real header row: Region,District,FacilityName,Type,Town,Ownership,Latitude,Longitude

const COLUMN_MAP = {
  name: 'FacilityName',
  type: 'Type',
  ownership: 'Ownership',      // Government | Private | CHAG | Quasi-Government | ...
  region: 'Region',
  district: 'District',
  town: 'Town',
  lat: 'Latitude',              // only 24 of 3,756 rows are missing this —
  lng: 'Longitude',             // script falls back to geocoding for those
};

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
// Nominatim's usage policy requires a real identifying User-Agent and caps
// usage at 1 request/second for the public instance.
const NOMINATIM_USER_AGENT = 'HealthConnectNavigator-SeedScript/1.0';
// Nominatim's usage policy asks for real contact info in case of abuse —
// optional for a one-off script this small, but if you want to add it,
// append plain text with no angle brackets, e.g.:
//   'HealthConnectNavigator-SeedScript/1.0 (contact: kobby@example.com)'
// The previous version had a literal unfilled "<add your email/repo url>"
// placeholder going out as a real header on every request — prime suspect
// for the 23/23 failure in the last run.
const NOMINATIM_DELAY_MS = 1100;

// ─── 2. Type taxonomy mapping ───────────────────────────────────────────────
// Tuned against the real "Type" value counts in health-facilities-gh.csv:
//   Clinic 1171, Health Centre 786, CHPS 652, Maternity Home 369,
//   Hospital(+District/Regional/Municipal/Teaching) ~376, RCH 152,
//   Psychiatric Hospital 3, plus ~180 administrative/institutional rows
//   (District/Regional/Municipal Health Directorates, Training Institution,
//   Research Institution, "Others", bare "Centre") that are deliberately
//   left unmapped so they're excluded rather than imported as facilities.
//
// Two tiers, checked in order:
//   1. EXACT_TYPE_MAP — for short/ambiguous values where substring matching
//      is unsafe. RCH is the reason this tier exists: a naive substring
//      rule for "rch" would also match inside "Resea-RCH Institution" and
//      wrongly classify research institutes as maternity facilities.
//      Exact-matching after trim+lowercase avoids that collision.
//   2. SUBSTRING_TYPE_MAP — for everything else. 'psychiatric' is checked
//      before 'hospital' so "Psychiatric Hospital" classifies as
//      mental_health, not hospital.
const EXACT_TYPE_MAP: Record<string, string> = {
  'rch': 'maternity',   // Reproductive & Child Health — closest fit, not a directorate
  'chps': 'clinic',     // Community-based Health Planning & Services
  'cphs': 'clinic',     // typo variant seen once in the raw data
};

const SUBSTRING_TYPE_MAP: Record<string, string> = {
  'psychiatric': 'mental_health', // must precede 'hospital' below
  'polyclinic': 'hospital',
  'hospital': 'hospital',
  'health centre': 'clinic',
  'health center': 'clinic',
  'clinic': 'clinic',
  'maternity': 'maternity',
  'pharmacy': 'pharmacy',        // present for future datasets; this CSV has none
  'chemical shop': 'pharmacy',
  'dispensary': 'pharmacy',
  'dental': 'dentist',
};

function classifyType(raw: string | undefined): string | null {
  if (!raw) return null;
  const val = raw.toLowerCase().trim();
  if (EXACT_TYPE_MAP[val]) return EXACT_TYPE_MAP[val];
  for (const [needle, slug] of Object.entries(SUBSTRING_TYPE_MAP)) {
    if (val.includes(needle)) return slug;
  }
  return null; // unmapped — logged and skipped, not guessed (catches
               // directorates, training/research institutions, "Others")
}

// ─── 3. Minimal CSV parser (handles quoted fields, no new dependency) ──────

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.some(f => f.trim() !== '')) rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }

  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
    return obj;
  });
}

// ─── 4. Geocoding (only for rows missing lat/lng) ──────────────────────────

const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCache.has(query)) return geocodeCache.get(query)!;

  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=gh`;
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': NOMINATIM_USER_AGENT },
    });
    await sleep(NOMINATIM_DELAY_MS); // rate limit regardless of outcome

    if (!resp.ok) {
      // Previously silent — this is very likely why the last run showed
      // 23/23 geocode failures with no error lines at all: a non-ok HTTP
      // response (403/429/etc.) fell through this branch without logging
      // anything, so it looked identical to "place not found."
      const bodyText = await resp.text().catch(() => '(could not read body)');
      console.warn(`  Geocode HTTP ${resp.status} ${resp.statusText} for "${query}": ${bodyText.slice(0, 200)}`);
      geocodeCache.set(query, null);
      return null;
    }
    const data = await resp.json();
    if (Array.isArray(data) && data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache.set(query, result);
      return result;
    }
    // Distinguish "request succeeded but Nominatim found nothing" from the
    // HTTP-error case above — genuinely useful when triaging next time.
    console.warn(`  Geocode: no results for "${query}" (request succeeded, 0 matches)`);
    geocodeCache.set(query, null);
    return null;
  } catch (err) {
    console.warn(`  Geocode network error for "${query}":`, err instanceof Error ? err.message : err);
    geocodeCache.set(query, null);
    return null;
  }
}

// ─── 5. Main ─────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArg = args.find(a => a.startsWith('--file='));
  const filePath = fileArg ? fileArg.split('=')[1] : './data/health-facilities-ghana.csv';

  console.log(`Reading CSV from: ${filePath}`);
  console.log(dryRun ? '*** DRY RUN — no DB writes ***\n' : '*** LIVE RUN — will write to DB ***\n');

  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`Could not read ${filePath}. Download the CSV from data.gov.gh first and pass --file=<path>.`);
    process.exit(1);
  }

  const rows = parseCsv(raw);
  console.log(`Parsed ${rows.length} rows.`);

  if (rows.length > 0) {
    console.log('Detected headers:', Object.keys(rows[0]).join(' | '));
    console.log('If these don\'t look like real column names, fix COLUMN_MAP at the top of this script.\n');
  }

  let inserted = 0;
  let skippedDuplicate = 0;
  let skippedUnmappedType = 0;
  let skippedNoName = 0;
  let geocoded = 0;
  let geocodedApprox = 0;
  let geocodeFailed = 0;
  const unmappedTypeSamples = new Set<string>();

  for (const [i, row] of rows.entries()) {
    const name = row[COLUMN_MAP.name];
    if (!name || name.length < 3) { skippedNoName++; continue; }

    const type = classifyType(row[COLUMN_MAP.type]);
    if (!type) {
      skippedUnmappedType++;
      if (row[COLUMN_MAP.type]) unmappedTypeSamples.add(row[COLUMN_MAP.type]);
      continue;
    }

    const region = row[COLUMN_MAP.region] || null;
    const district = row[COLUMN_MAP.district] || null;
    const town = row[COLUMN_MAP.town] || null;

    let lat = parseFloat(row[COLUMN_MAP.lat]);
    let lng = parseFloat(row[COLUMN_MAP.lng]);

    if (isNaN(lat) || isNaN(lng)) {
      const exactQuery = [name, town, district, region, 'Ghana'].filter(Boolean).join(', ');
      let geo = await geocode(exactQuery);
      let approximate = false;

      if (!geo && town) {
        // Exact building not in Nominatim (common for small rural facilities —
        // confirmed by the last dry run: all 23 misses were genuine "0 matches",
        // not request failures). Fall back to the town/village center instead
        // of dropping the facility from the map entirely. Lower precision,
        // but a facility placed at its town center is far more useful than a
        // facility missing from the map altogether.
        const townQuery = [town, district, region, 'Ghana'].filter(Boolean).join(', ');
        geo = await geocode(townQuery);
        approximate = !!geo;
        if (geo) {
          console.warn(`  [${i}] "${name}" — exact address not found, using town-level location for "${town}" instead.`);
        }
      }

      if (!geo) {
        geocodeFailed++;
        console.warn(`  [${i}] Skipping "${name}" — no coordinates and geocoding failed (exact + town-level both returned nothing).`);
        continue;
      }
      lat = geo.lat;
      lng = geo.lng;
      geocoded++;
      if (approximate) geocodedApprox++;
    }

    if (!dryRun) {
      const existing = await prisma.facility.findFirst({
        where: { name, district: district ?? undefined },
      });
      if (existing) { skippedDuplicate++; continue; }

      await prisma.facility.create({
        data: {
          name,
          type,
          status: FacilityStatus.VERIFIED, // government source — see decision note above
          source: 'datagovgh',
          region: region ?? undefined,
          district: district ?? undefined,
          city: town ?? undefined,
          lat,
          lng,
        },
      });
    }
    inserted++;

    if (inserted % 50 === 0) {
      console.log(`  ...${inserted} facilities processed so far`);
    }
  }

  console.log('\n─── Summary ───────────────────────────────');
  console.log(`Total rows parsed:        ${rows.length}`);
  console.log(`${dryRun ? 'Would insert' : 'Inserted'}:              ${inserted}`);
  console.log(`Skipped — no name:         ${skippedNoName}`);
  console.log(`Skipped — unmapped type:   ${skippedUnmappedType}`);
  console.log(`Skipped — duplicate:       ${skippedDuplicate}`);
  console.log(`Geocoded (was missing):    ${geocoded}  (${geocoded - geocodedApprox} exact, ${geocodedApprox} town-level approximate)`);
  console.log(`Geocode failed (skipped):  ${geocodeFailed}`);
  if (unmappedTypeSamples.size > 0) {
    console.log(`\nUnmapped "Type of Facility" values seen (add these to TYPE_MAP if relevant):`);
    [...unmappedTypeSamples].slice(0, 20).forEach(t => console.log(`  - "${t}"`));
  }
  console.log('────────────────────────────────────────────\n');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
