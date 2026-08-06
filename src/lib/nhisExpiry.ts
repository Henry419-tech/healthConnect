// src/lib/nhisExpiry.ts
//
// Computes how close an NHIS card is to expiring, for the small badge
// shown on the Profile Medical ID panel and the Emergency page's Medical
// ID card.
//
// Ground truth is the user-entered `expiryDate` — no guessing needed there.
// If only `issuedDate` is available, we fall back to a soft one-year
// estimate (NHIS Ghana cards are generally renewed annually), clearly
// marked `estimated: true` so callers can render it as a guess rather
// than a fact.

export type NhisExpiryStatus = 'none' | 'expired' | 'expiring' | 'valid';

export interface NhisExpiryInfo {
  status: NhisExpiryStatus;
  daysLeft?: number;
  estimated: boolean;
  label: string;
}

const EXPIRING_SOON_WINDOW_DAYS = 30;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / 86_400_000);
}

export function getNhisExpiryInfo(
  expiryDate?: string | null,
  issuedDate?: string | null,
): NhisExpiryInfo {
  let expiry: Date | null = null;
  let estimated = false;

  if (expiryDate) {
    const parsed = new Date(expiryDate);
    if (!isNaN(parsed.getTime())) expiry = parsed;
  } else if (issuedDate) {
    const issued = new Date(issuedDate);
    if (!isNaN(issued.getTime())) {
      expiry = new Date(issued.getFullYear() + 1, issued.getMonth(), issued.getDate());
      estimated = true;
    }
  }

  if (!expiry) {
    return { status: 'none', estimated: false, label: '' };
  }

  const daysLeft = daysBetween(new Date(), expiry);
  const prefix = estimated ? 'Est. ' : '';

  if (daysLeft < 0) {
    const daysAgo = Math.abs(daysLeft);
    return {
      status: 'expired',
      daysLeft,
      estimated,
      label: `${prefix}Expired ${daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`}`,
    };
  }

  if (daysLeft <= EXPIRING_SOON_WINDOW_DAYS) {
    let when: string;
    if (daysLeft === 0) when = 'today';
    else if (daysLeft === 1) when = 'tomorrow';
    else when = `in ${daysLeft} days`;
    return { status: 'expiring', daysLeft, estimated, label: `${prefix}Renews ${when}` };
  }

  return {
    status: 'valid',
    daysLeft,
    estimated,
    label: `${prefix}Valid until ${expiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
  };
}
