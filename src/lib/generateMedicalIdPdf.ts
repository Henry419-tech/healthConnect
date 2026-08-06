// src/lib/generateMedicalIdPdf.ts
//
// Client-side Medical ID PDF generator using jsPDF. No server needed —
// works offline, downloads instantly.
//
// REBUILT — this now mirrors the emergency page's Medical ID modal (the
// single-view, no-tabs redesign): same section order, same content, same
// "formal document" tone. Think hospital admission paperwork, not an app
// screenshot — light background, printable, a letterhead, and a clear
// HealthConnect provenance stamp so a paramedic trusts where it came from.
//
// Sections, in the exact order the modal shows them:
//   Letterhead → Patient / Blood Type → Allergies → Active Medications →
//   Conditions → Blood Compatibility → NHIS Card →
//   Footer (generated timestamp + disclaimer + HealthConnect provenance)
//
// Deliberately left out vs. the old PDF: age/DOB/height/weight/BMI/photo
// and live GPS location. None of those appear in the modal anymore, and a
// printed document doesn't stay in sync with a moving GPS pin — including
// them would break the "the app view is the preview" promise this rebuild
// is built around. Every list (allergies, medications, conditions) is shown
// in FULL here, even though the on-screen modal may keep some lists compact
// for a phone — a downloaded/printed record is the one place completeness
// matters more than screen space.
//
// Install once:  npm install jspdf

import jsPDF from 'jspdf';
import { BLOOD_COMPATIBILITY } from '@/constants/emergency';

/* ════════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════════ */
export interface MedicalIdPdfData {
  userName:  string;
  userEmail?: string;

  bloodType: string; // 'Not set' (or falsy) when unknown

  allergies:   { name: string; severity: string }[];
  medications: { name: string; dose?: string }[];
  conditions:  { name: string; status: string }[];

  nhis?: {
    nhisId?:         string;
    membershipType?: string;
    issuedDate?:     string;
    expiryDate?:     string;
    issuingBody?:    string;
    notes?:          string;
  } | null;
}

type RGB = [number, number, number];

/* ════════════════════════════════════════════════════════════════════
   COLOUR PALETTE — a light, printable document. Every colour here is
   picked to hold AA-ish contrast on white paper (unlike the old dark
   navy / neon-teal palette, which was designed for a phone screen).
════════════════════════════════════════════════════════════════════ */
const C = {
  // Brand
  teal:      [0,   134, 168] as RGB,   // legible teal-on-white (vs the app's #00D2FF, too light for print)
  tealTint:  [224, 247, 250] as RGB,
  violet:    [109, 40,  217] as RGB,

  // Semantic
  red:       [200, 30,  55 ] as RGB,
  redTint:   [253, 226, 229] as RGB,
  amber:     [166, 90,  10 ] as RGB,
  amberTint: [255, 241, 219] as RGB,
  green:     [21,  128, 61 ] as RGB,
  greenTint: [220, 248, 231] as RGB,
  gold:      [146, 100, 6  ] as RGB,   // NHIS accent text
  goldBar:   [252, 209, 22 ] as RGB,   // Ghana-flag gold, decorative only

  // Neutrals
  navy:        [15,  32,  64 ] as RGB, // headings / primary text
  slate:       [71,  85,  105] as RGB, // secondary text
  slateLight:  [148, 163, 184] as RGB, // placeholders / tertiary text
  border:      [226, 232, 240] as RGB,
  panelBg:     [248, 250, 252] as RGB,
  white:       [255, 255, 255] as RGB,

  ghanaGreen: [0,   107, 63 ] as RGB,
  ghanaGold:  [252, 209, 22 ] as RGB,
  ghanaRed:   [206, 17,  38 ] as RGB,
};

/* ════════════════════════════════════════════════════════════════════
   LAYOUT CONSTANTS (mm, A4 = 210 × 297)
════════════════════════════════════════════════════════════════════ */
const PAGE_W    = 210;
const PAGE_H    = 297;
const MARGIN    = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;          // 178mm
const FOOTER_H  = 20;
const SAFE_BOTTOM = PAGE_H - FOOTER_H - 3;       // where a panel must stop before triggering a page break

/* ════════════════════════════════════════════════════════════════════
   TINY DRAWING HELPERS
════════════════════════════════════════════════════════════════════ */
function fillColor(doc: jsPDF, c: RGB) { doc.setFillColor(c[0], c[1], c[2]); }
function drawColor(doc: jsPDF, c: RGB) { doc.setDrawColor(c[0], c[1], c[2]); }
function textColor(doc: jsPDF, c: RGB) { doc.setTextColor(c[0], c[1], c[2]); }

function roundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, style: 'F' | 'S' | 'FD' = 'F') {
  doc.roundedRect(x, y, Math.max(w, 0.01), Math.max(h, 0.01), r, r, style);
}

/* ════════════════════════════════════════════════════════════════════
   ICON GLYPHS — small vector marks instead of emoji (emoji render as
   tofu boxes in jsPDF's built-in fonts, and read as "app UI" rather than
   "formal document"). Each takes a centre point + radius/size.
════════════════════════════════════════════════════════════════════ */

/** HealthConnect / Medical-ID mark — a clipboard, matching the icon used
 *  everywhere else in the app for "Medical ID" (emergency page, profile). */
function drawClipboardGlyph(doc: jsPDF, x: number, y: number, w: number, h: number, ink: RGB) {
  // Clip tab
  fillColor(doc, ink);
  roundedRect(doc, x + w * 0.32, y - h * 0.08, w * 0.36, h * 0.16, 0.5, 'F');
  // Board outline
  drawColor(doc, ink);
  doc.setLineWidth(0.45);
  roundedRect(doc, x + w * 0.08, y + h * 0.08, w * 0.84, h * 0.86, 0.9, 'S');
  // Checklist lines
  doc.setLineWidth(0.4);
  const lineXs = [x + w * 0.24, x + w * 0.76];
  [0.36, 0.55, 0.74].forEach(fy => doc.line(lineXs[0], y + h * fy, lineXs[1], y + h * fy));
}

/** Allergy warning — outlined triangle with an exclamation mark. */
function drawTriangleGlyph(doc: jsPDF, cx: number, cy: number, r: number, ink: RGB) {
  drawColor(doc, ink);
  doc.setLineWidth(0.5);
  doc.triangle(cx, cy - r, cx - r * 0.95, cy + r * 0.8, cx + r * 0.95, cy + r * 0.8, 'S');
  fillColor(doc, ink);
  roundedRect(doc, cx - 0.25, cy - r * 0.35, 0.5, r * 0.75, 0.25, 'F');
  doc.circle(cx, cy + r * 0.55, 0.35, 'F');
}

/** Medications — a two-tone capsule. */
function drawCapsuleGlyph(doc: jsPDF, cx: number, cy: number, w: number, h: number, ink: RGB) {
  drawColor(doc, ink);
  doc.setLineWidth(0.4);
  roundedRect(doc, cx - w / 2, cy - h / 2, w, h, h / 2, 'S');
  doc.line(cx, cy - h / 2 + 0.3, cx, cy + h / 2 - 0.3);
}

/** Conditions — a simple medical cross. */
function drawCrossGlyph(doc: jsPDF, cx: number, cy: number, r: number, ink: RGB) {
  fillColor(doc, ink);
  doc.rect(cx - r, cy - r * 0.32, r * 2, r * 0.64, 'F');
  doc.rect(cx - r * 0.32, cy - r, r * 0.64, r * 2, 'F');
}

/** Blood compatibility — a droplet (triangle + circle). */
function drawDropletGlyph(doc: jsPDF, cx: number, cy: number, r: number, ink: RGB) {
  fillColor(doc, ink);
  doc.triangle(cx, cy - r, cx - r * 0.85, cy + r * 0.25, cx + r * 0.85, cy + r * 0.25, 'F');
  doc.circle(cx, cy + r * 0.25, r * 0.72, 'F');
}

/** NHIS — a miniature ID card. */
function drawCardGlyph(doc: jsPDF, x: number, y: number, w: number, h: number, ink: RGB) {
  drawColor(doc, ink);
  doc.setLineWidth(0.4);
  roundedRect(doc, x, y, w, h, 0.7, 'S');
  fillColor(doc, ink);
  doc.rect(x + w * 0.12, y + h * 0.22, w * 0.76, h * 0.2, 'F');
  doc.setLineWidth(0.35);
  doc.line(x + w * 0.12, y + h * 0.72, x + w * 0.55, y + h * 0.72);
  doc.line(x + w * 0.12, y + h * 0.86, x + w * 0.4,  y + h * 0.86);
}

/* ════════════════════════════════════════════════════════════════════
   PAGE-BREAK HELPER — starts a new page (with a slim continuation
   header) if the next block won't fit above the footer.
════════════════════════════════════════════════════════════════════ */
function ensureSpace(doc: jsPDF, y: number, needed: number, patientName: string): number {
  if (y + needed <= SAFE_BOTTOM) return y;
  doc.addPage();
  fillColor(doc, C.teal);
  doc.rect(0, 0, PAGE_W, 1.6, 'F');
  textColor(doc, C.slate);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('MEDICAL ID — CONTINUED', MARGIN, 12);
  textColor(doc, C.slateLight);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(patientName, PAGE_W - MARGIN, 12, { align: 'right' });
  drawColor(doc, C.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 16, PAGE_W - MARGIN, 16);
  return 24;
}

/* ════════════════════════════════════════════════════════════════════
   CHIP / TAG ROW LAYOUT — greedy word-wrap of colour-coded pill chips
   (used for allergy tags and blood-compatibility tags).
════════════════════════════════════════════════════════════════════ */
interface Chip { label: string; fill: RGB; border: RGB; ink: RGB; }
interface PlacedChip extends Chip { x: number; w: number; }

function layoutChips(doc: jsPDF, chips: Chip[], maxW: number, fontSize = 8): { rows: PlacedChip[][]; height: number } {
  const padX = 3.4, gapX = 2.5, gapY = 2.6, chipH = 6.6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize);
  const rows: PlacedChip[][] = [];
  let row: PlacedChip[] = [];
  let x = 0;
  for (const chip of chips) {
    const w = doc.getTextWidth(chip.label) + padX * 2;
    if (x + w > maxW && row.length > 0) { rows.push(row); row = []; x = 0; }
    row.push({ ...chip, x, w });
    x += w + gapX;
  }
  if (row.length) rows.push(row);
  return { rows, height: rows.length ? rows.length * chipH + (rows.length - 1) * gapY : 0 };
}

function drawChips(doc: jsPDF, rows: PlacedChip[][], startX: number, y: number, fontSize = 8) {
  const gapY = 2.6, chipH = 6.6;
  let cy = y;
  for (const row of rows) {
    for (const chip of row) {
      fillColor(doc, chip.fill);
      drawColor(doc, chip.border);
      doc.setLineWidth(0.3);
      roundedRect(doc, startX + chip.x, cy, chip.w, chipH, chipH / 2, 'FD');
      textColor(doc, chip.ink);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize);
      doc.text(chip.label, startX + chip.x + chip.w / 2, cy + chipH / 2 + 1.05, { align: 'center' });
    }
    cy += chipH + gapY;
  }
}

/* ════════════════════════════════════════════════════════════════════
   LIST ROW — one entry (medication / condition) with an
   optional right-aligned status pill and a hairline under all but the
   last row. Returns the y position after the row.
════════════════════════════════════════════════════════════════════ */
function listRow(
  doc: jsPDF, x: number, y: number, w: number,
  name: string, meta: string,
  opts: { badge?: string; badgeColor?: RGB; isLast?: boolean } = {},
): number {
  const rowH = meta ? 9.6 : 7.2;
  textColor(doc, C.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const badgeW = opts.badge ? doc.getTextWidth(opts.badge.toUpperCase()) + 6 : 0;
  doc.text(fitText(doc, name, w - badgeW - (opts.badge ? 4 : 0)), x, y + 5);

  if (opts.badge) {
    fillColor(doc, opts.badgeColor ?? C.teal);
    roundedRect(doc, x + w - badgeW, y + 1, badgeW, 5.4, 1.4, 'F');
    textColor(doc, C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text(opts.badge.toUpperCase(), x + w - badgeW / 2, y + 4.5, { align: 'center' });
  }

  if (meta) {
    textColor(doc, C.slate);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(fitText(doc, meta, w), x, y + 8.6);
  }

  if (!opts.isLast) {
    drawColor(doc, C.border);
    doc.setLineWidth(0.2);
    doc.line(x, y + rowH, x + w, y + rowH);
  }
  return y + rowH;
}

/** Plain placeholder line, e.g. "None listed". */
/** Truncates with an ellipsis instead of letting jsPDF's maxWidth option
 *  silently wrap onto a second line (which would overflow a fixed row
 *  height). Used for any user-entered text placed in a single-line slot. */
function fitText(doc: jsPDF, text: string, maxW: number): string {
  if (!text) return text;
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1);
  return t + '…';
}

function emptyRow(doc: jsPDF, x: number, y: number, text: string, warn = false): number {
  textColor(doc, warn ? C.amber : C.slateLight);
  doc.setFont('helvetica', warn ? 'bold' : 'italic');
  doc.setFontSize(8.5);
  doc.text((warn ? '! ' : '') + text, x, y + 5);
  return y + 8;
}

/* ════════════════════════════════════════════════════════════════════
   PANEL — the bordered card used for every section (Allergies,
   Medications, Conditions, Contacts, Blood Compatibility, NHIS).
   Mirrors the modal's ".em-medid2-panel": icon chip + title + one-line
   purpose caption + optional count, a hairline, then content.
════════════════════════════════════════════════════════════════════ */
interface PanelSpec {
  glyph: (doc: jsPDF, cx: number, cy: number) => void;
  glyphInk: RGB;
  glyphBg: RGB;
  title: string;
  sub: string;
  count?: number;
}

function measurePanelHeader(doc: jsPDF, spec: PanelSpec, w: number): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  const subLines = doc.splitTextToSize(spec.sub, w - 16 - (spec.count !== undefined ? 12 : 0));
  return 7 + 5.2 + subLines.length * 3.6 + 4; // top pad + title line + sub lines + bottom pad to divider
}

function drawPanel(
  doc: jsPDF, x: number, y: number, w: number,
  spec: PanelSpec, contentH: number,
): { contentY: number; bottomY: number } {
  const headerH = measurePanelHeader(doc, spec, w);
  const totalH  = headerH + contentH + 5; // bottom padding inside the panel

  // Card background + border
  fillColor(doc, C.white);
  drawColor(doc, C.border);
  doc.setLineWidth(0.3);
  roundedRect(doc, x, y, w, totalH, 2.5, 'FD');

  // Icon chip
  const chipSize = 9;
  fillColor(doc, spec.glyphBg);
  roundedRect(doc, x + 5, y + 5.5, chipSize, chipSize, 1.8, 'F');
  spec.glyph(doc, x + 5 + chipSize / 2, y + 5.5 + chipSize / 2);

  // Title
  textColor(doc, C.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const countStr = spec.count !== undefined ? `(${spec.count})` : '';
  const countW = countStr ? doc.getTextWidth(countStr) + 2 : 0;
  doc.text(spec.title.toUpperCase(), x + 5 + chipSize + 5, y + 9.5, { maxWidth: w - (5 + chipSize + 5) - countW - 5, charSpace: 0.15 });

  if (countStr) {
    textColor(doc, C.slateLight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(countStr, x + w - 5, y + 9.5, { align: 'right' });
  }

  // Sub caption
  textColor(doc, C.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  const subLines = doc.splitTextToSize(spec.sub, w - (5 + chipSize + 5) - 5);
  doc.text(subLines, x + 5 + chipSize + 5, y + 13.4);

  // Divider
  drawColor(doc, C.border);
  doc.setLineWidth(0.25);
  doc.line(x + 5, y + headerH, x + w - 5, y + headerH);

  return { contentY: y + headerH + 4.5, bottomY: y + totalH };
}

/* ════════════════════════════════════════════════════════════════════
   MAIN BUILDER — shared by both the download and print entry points so
   the two never drift out of sync with each other.
════════════════════════════════════════════════════════════════════ */
export function buildMedicalIdDoc(data: MedicalIdPdfData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const innerW = CONTENT_W - 10; // panel content width (5mm inset each side)

  /* ── LETTERHEAD ─────────────────────────────────────────────── */
  fillColor(doc, C.teal);
  doc.rect(0, 0, PAGE_W, 2, 'F');

  // Clipboard mark + "MEDICAL ID" title/subtitle — mirrors the modal header
  drawClipboardGlyph(doc, MARGIN, 12, 8, 9, C.red);
  textColor(doc, C.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text('MEDICAL ID', MARGIN + 13, 17, { charSpace: 0.3 });
  textColor(doc, C.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const subtitle = doc.splitTextToSize(
    'For first responders — key details at a glance.',
    92,
  );
  doc.text(subtitle, MARGIN + 13, 22.5);

  // Right: HealthConnect wordmark + document metadata
  textColor(doc, C.teal);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('HealthConnect', PAGE_W - MARGIN, 13, { align: 'right' });
  textColor(doc, C.slateLight);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('NAVIGATOR · GHANA', PAGE_W - MARGIN, 17, { align: 'right' });

  const ts = new Date();
  const genDate = ts.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const genTime = ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const docRef  = `HN-${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(ts.getDate()).padStart(2, '0')}-${ts.getHours()}${ts.getMinutes()}`;
  doc.setFontSize(6.8);
  doc.text(`Ref ${docRef}`, PAGE_W - MARGIN, 22, { align: 'right' });
  doc.text(`Generated ${genDate}, ${genTime}`, PAGE_W - MARGIN, 26, { align: 'right' });

  drawColor(doc, C.border);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 32, PAGE_W - MARGIN, 32);

  let y = 40;

  /* ── PATIENT / BLOOD TYPE ───────────────────────────────────── */
  const hasBlood = !!data.bloodType && data.bloodType !== 'Not set';
  const identityH = 22;
  fillColor(doc, C.panelBg);
  roundedRect(doc, MARGIN, y, CONTENT_W, identityH, 2.5, 'F');

  const splitX = MARGIN + CONTENT_W * 0.64;
  textColor(doc, C.slateLight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('PATIENT', MARGIN + 7, y + 8, { charSpace: 0.5 });
  textColor(doc, C.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(fitText(doc, data.userName || 'Unknown', (splitX - MARGIN - 7) - 6), MARGIN + 7, y + 16.5);

  drawColor(doc, C.border);
  doc.setLineWidth(0.3);
  doc.line(splitX, y + 5, splitX, y + identityH - 5);

  textColor(doc, C.slateLight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('BLOOD TYPE', splitX + 8, y + 8, { charSpace: 0.5 });
  textColor(doc, hasBlood ? C.red : C.slateLight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(hasBlood ? data.bloodType : '—', splitX + 8, y + 17.5);

  y += identityH + 4;
  if (!hasBlood) {
    y = emptyRow(doc, MARGIN + 2, y, 'Blood type not added yet', true);
  }
  y += 4;

  /* ── ALLERGIES ──────────────────────────────────────────────── */
  {
    const items = data.allergies ?? [];
    let contentH: number;
    let chipLayout: ReturnType<typeof layoutChips> | null = null;
    if (items.length === 0) {
      contentH = 8;
    } else {
      chipLayout = layoutChips(doc, items.map(a => ({
        label: a.name,
        fill:   a.severity === 'severe' ? C.redTint   : a.severity === 'moderate' ? C.amberTint : C.greenTint,
        border: a.severity === 'severe' ? C.red        : a.severity === 'moderate' ? C.amber      : C.green,
        ink:    a.severity === 'severe' ? C.red        : a.severity === 'moderate' ? C.amber      : C.green,
      })), innerW);
      contentH = chipLayout.height;
    }
    y = ensureSpace(doc, y, 22 + contentH + 5, data.userName);
    const { contentY, bottomY } = drawPanel(doc, MARGIN, y, CONTENT_W, {
      glyph: (d, cx, cy) => drawTriangleGlyph(d, cx, cy, 3.1, C.amber),
      glyphInk: C.amber, glyphBg: C.amberTint,
      title: 'Allergies',
      sub: "Flags reactions before you're given medication or treatment.",
      count: items.length,
    }, contentH);
    if (items.length === 0) {
      emptyRow(doc, MARGIN + 5, contentY, 'None listed');
    } else if (chipLayout) {
      drawChips(doc, chipLayout.rows, MARGIN + 5, contentY);
    }
    y = bottomY + 4;
  }

  /* ── ACTIVE MEDICATIONS ─────────────────────────────────────── */
  {
    const items = data.medications ?? [];
    const rowH = (m: { dose?: string }) => (m.dose ? 9.6 : 7.2);
    const contentH = items.length === 0 ? 8 : items.reduce((s, m) => s + rowH(m), 0);
    y = ensureSpace(doc, y, 22 + contentH + 5, data.userName);
    const { contentY, bottomY } = drawPanel(doc, MARGIN, y, CONTENT_W, {
      glyph: (d, cx, cy) => drawCapsuleGlyph(d, cx, cy, 6.4, 3.1, C.teal),
      glyphInk: C.teal, glyphBg: C.tealTint,
      title: 'Active Medications',
      sub: 'Prevents dangerous drug interactions during treatment.',
      count: items.length,
    }, contentH);
    let ry = contentY;
    if (items.length === 0) {
      emptyRow(doc, MARGIN + 5, ry, 'None listed');
    } else {
      items.forEach((m, i) => {
        ry = listRow(doc, MARGIN + 5, ry, innerW, m.name, m.dose ?? '', { isLast: i === items.length - 1 });
      });
    }
    y = bottomY + 4;
  }

  /* ── CONDITIONS ─────────────────────────────────────────────── */
  {
    const items = data.conditions ?? [];
    const contentH = items.length === 0 ? 8 : items.length * 9.6;
    y = ensureSpace(doc, y, 22 + contentH + 5, data.userName);
    const { contentY, bottomY } = drawPanel(doc, MARGIN, y, CONTENT_W, {
      glyph: (d, cx, cy) => drawCrossGlyph(d, cx, cy, 2.6, C.violet),
      glyphInk: C.violet, glyphBg: [237, 233, 254] as RGB,
      title: 'Conditions',
      sub: 'Gives context responders need for the right care, fast.',
      count: items.length,
    }, contentH);
    let ry = contentY;
    if (items.length === 0) {
      emptyRow(doc, MARGIN + 5, ry, 'None listed');
    } else {
      items.forEach((c, i) => {
        const badgeColor = c.status === 'active' ? C.red : c.status === 'managed' ? C.teal : C.green;
        ry = listRow(doc, MARGIN + 5, ry, innerW, c.name, '', { badge: c.status, badgeColor, isLast: i === items.length - 1 });
      });
    }
    y = bottomY + 4;
  }

  /* ── BLOOD COMPATIBILITY (only if a blood type is on file) ───── */
  const compat = hasBlood ? BLOOD_COMPATIBILITY[data.bloodType] : undefined;
  if (compat) {
    const rowLayouts = [
      layoutChips(doc, compat.canReceiveFrom.map(bt => chipForBloodType(bt, data.bloodType)), innerW),
      layoutChips(doc, compat.canDonateTo.map(bt => chipForBloodType(bt, data.bloodType)), innerW),
    ];
    const contentH = 4.2 + rowLayouts[0].height + 6 + 4.2 + rowLayouts[1].height;
    y = ensureSpace(doc, y, 22 + contentH + 5, data.userName);
    const { contentY, bottomY } = drawPanel(doc, MARGIN, y, CONTENT_W, {
      glyph: (d, cx, cy) => drawDropletGlyph(d, cx, cy, 3, C.red),
      glyphInk: C.red, glyphBg: C.redTint,
      title: 'Blood Compatibility',
      sub: 'Who this blood type can give to and receive from.',
    }, contentH);
    let ry = contentY;
    textColor(doc, C.slate);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('CAN RECEIVE FROM', MARGIN + 5, ry + 3, { charSpace: 0.3 });
    ry += 4.2;
    drawChips(doc, rowLayouts[0].rows, MARGIN + 5, ry);
    ry += rowLayouts[0].height + 6;
    doc.text('CAN DONATE TO', MARGIN + 5, ry - 1.2, { charSpace: 0.3 });
    ry += 4.2;
    drawChips(doc, rowLayouts[1].rows, MARGIN + 5, ry);
    y = bottomY + 4;
  }

  /* ── NHIS CARD ──────────────────────────────────────────────── */
  {
    const hasNhis = !!(data.nhis && (data.nhis.nhisId || data.nhis.membershipType));
    const extraRows = hasNhis ? [
      data.nhis?.issuedDate ? 1 : 0,
      data.nhis?.notes ? 1 : 0,
    ].reduce((a, b) => a + b, 0) : 0;
    const cardH = hasNhis ? 26 : 0;
    const contentH = hasNhis ? cardH + (extraRows ? extraRows * 6 + 3 : 0) : 8;
    y = ensureSpace(doc, y, 22 + contentH + 5, data.userName);
    const { contentY, bottomY } = drawPanel(doc, MARGIN, y, CONTENT_W, {
      glyph: (d, cx, cy) => drawCardGlyph(d, cx - 3.4, cy - 2.4, 6.8, 4.8, C.gold),
      glyphInk: C.gold, glyphBg: [255, 249, 219] as RGB,
      title: 'NHIS Card',
      sub: 'Confirms cover without needing the physical card.',
    }, contentH);

    if (!hasNhis) {
      emptyRow(doc, MARGIN + 5, contentY, 'No NHIS card added', true);
    } else {
      const cx = MARGIN + 5, cw = innerW;
      fillColor(doc, [255, 253, 240] as RGB);
      drawColor(doc, C.goldBar);
      doc.setLineWidth(0.3);
      roundedRect(doc, cx, contentY, cw, cardH, 2, 'FD');
      fillColor(doc, C.goldBar);
      doc.rect(cx, contentY, 2.4, cardH, 'F');

      textColor(doc, C.slate);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      const issuer = data.nhis?.issuingBody || 'National Health Insurance Scheme';
      doc.text(fitText(doc, issuer, cw - 8), cx + cw - 4, contentY + 6, { align: 'right' });

      textColor(doc, C.gold);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13.5);
      doc.text(data.nhis?.nhisId || '—', cx + 7, contentY + 14);

      const colW = (cw - 14) / 3;
      const fields: [string, string][] = [
        ['MEMBER',  data.nhis?.membershipType || '—'],
        ['EXPIRES', data.nhis?.expiryDate || '—'],
        ['HOLDER',  data.userName],
      ];
      fields.forEach(([label, val], i) => {
        const fx = cx + 7 + i * colW;
        textColor(doc, C.slateLight);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.text(label, fx, contentY + 20.5, { charSpace: 0.3 });
        textColor(doc, C.navy);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(fitText(doc, val, colW - 3), fx, contentY + 23.8);
      });

      let ry = contentY + cardH + 5;
      if (data.nhis?.issuedDate) {
        textColor(doc, C.slateLight);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.text('DATE ISSUED', cx, ry, { charSpace: 0.3 });
        textColor(doc, C.navy);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(data.nhis.issuedDate, cx + 28, ry);
        ry += 6;
      }
      if (data.nhis?.notes) {
        textColor(doc, C.slateLight);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.text('NOTES', cx, ry, { charSpace: 0.3 });
        textColor(doc, C.navy);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(fitText(doc, data.nhis.notes, cw - 28), cx + 28, ry);
      }
    }
    y = bottomY + 4;
  }

  /* ── FOOTER — every page ──────────────────────────────────────── */
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const fy = PAGE_H - FOOTER_H;
    drawColor(doc, C.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, fy, PAGE_W - MARGIN, fy);

    fillColor(doc, C.teal);
    doc.circle(MARGIN + 1.2, fy + 6.5, 1, 'F');
    textColor(doc, C.navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('HealthConnect Navigator', MARGIN + 4.5, fy + 7.2);
    textColor(doc, C.slateLight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.text(
      'Auto-generated from the patient\u2019s HealthConnect profile. Verify with the patient before clinical use.',
      MARGIN, fy + 11.5,
    );
    doc.text(`Ref ${docRef} · Generated ${genDate}, ${genTime}`, MARGIN, fy + 15);

    textColor(doc, C.slateLight);
    doc.setFontSize(7);
    doc.text(pageCount > 1 ? `Page ${p} of ${pageCount}` : 'Page 1 of 1', PAGE_W - MARGIN, fy + 7.2, { align: 'right' });

    // Ghana flag strip — small, decorative, bottom-right
    const flagW = 12, flagX = PAGE_W - MARGIN - flagW, flagY = fy + 11.5;
    fillColor(doc, C.ghanaGreen); doc.rect(flagX, flagY, flagW / 3, 3, 'F');
    fillColor(doc, C.ghanaGold);  doc.rect(flagX + flagW / 3, flagY, flagW / 3, 3, 'F');
    fillColor(doc, C.ghanaRed);   doc.rect(flagX + (flagW / 3) * 2, flagY, flagW / 3, 3, 'F');
  }

  return doc;
}

function chipForBloodType(bt: string, self: string): Chip {
  const isSelf = bt === self;
  return {
    label: bt,
    fill:   isSelf ? C.red      : C.panelBg,
    border: isSelf ? C.red      : C.border,
    ink:    isSelf ? C.white    : C.navy,
  };
}

/* ════════════════════════════════════════════════════════════════════
   PUBLIC EXPORTS
════════════════════════════════════════════════════════════════════ */

/** Builds the PDF and triggers a browser download. */
export function generateMedicalIdPdf(data: MedicalIdPdfData): void {
  const doc = buildMedicalIdDoc(data);
  const safeName = (data.userName || 'patient').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`medical_id_${safeName}.pdf`);
}

/** Builds the PDF and opens it in a new tab, then triggers the browser's print dialog. */
export function printMedicalIdPdf(data: MedicalIdPdfData): void {
  const doc = buildMedicalIdDoc(data);
  const blob = doc.output('blob');
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (win) {
    win.addEventListener('load', () => { win.focus(); win.print(); });
  }
}
