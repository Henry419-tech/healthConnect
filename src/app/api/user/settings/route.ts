// src/app/api/user/settings/route.ts
// Extended: adds `language` field (string, 'en' | 'tw') alongside existing
// notifMuted, privacyPrefs, twoFactorEnabled.
// Further extended for Section 14 (Profile + Settings rebuild): adds
// `alertEmailsEnabled` and `alertNamePersonalization` — both already exist
// as scalar columns on User (see schema.prisma), this route just exposes
// them the same way `language` is exposed.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface QuietHours {
  enabled: boolean;
  from:    string; // "HH:MM" 24-hour
  to:      string;
}

interface PrivacyPrefs {
  activityTracking: boolean;
  dataSharing:      boolean;
  useMetric:        boolean;
  pushEnabled:      boolean;
  quietHours:       QuietHours;
}

const DEFAULT_PRIVACY: PrivacyPrefs = {
  activityTracking: true,
  dataSharing:      false,
  useMetric:        true,
  pushEnabled:      false,
  quietHours:       { enabled: false, from: '22:00', to: '07:00' },
};

const VALID_LANGUAGES = ['en', 'tw'] as const;
type ValidLanguage = typeof VALID_LANGUAGES[number];

function isValidLanguage(v: unknown): v is ValidLanguage {
  return typeof v === 'string' && (VALID_LANGUAGES as readonly string[]).includes(v);
}

// ── GET /api/user/settings ─────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        notifMuted:               true,
        privacyPrefs:             true,
        twoFactorEnabled:         true,
        language:                 true,
        alertEmailsEnabled:       true,
        alertNamePersonalization: true,
        accounts:                 { select: { provider: true } },
        password:                 true,
        createdAt:                true,
      },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const rawPrivacy = user.privacyPrefs as Partial<PrivacyPrefs> | null;
    const privacy: PrivacyPrefs = { ...DEFAULT_PRIVACY, ...(rawPrivacy ?? {}) };

    return NextResponse.json({
      notifMuted:               (user.notifMuted as string[]) ?? [],
      privacyPrefs:             privacy,
      twoFactorEnabled:         user.twoFactorEnabled,
      language:                 isValidLanguage(user.language) ? user.language : 'en',
      alertEmailsEnabled:       user.alertEmailsEnabled,
      alertNamePersonalization: user.alertNamePersonalization,
      hasPassword:              !!user.password,
      providers:                user.accounts.map(a => a.provider),
      memberSince:              user.createdAt,
    });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// ── PATCH /api/user/settings ───────────────────────────────────────────────
// Accepts any combination of:
//   { notifMuted: string[] }
//   { privacyPrefs: Partial<PrivacyPrefs> }
//   { twoFactorEnabled: boolean }
//   { language: 'en' | 'tw' }
//   { alertEmailsEnabled: boolean }
//   { alertNamePersonalization: boolean }
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (Array.isArray(body.notifMuted)) {
      updateData.notifMuted = body.notifMuted;
    }

    if (body.privacyPrefs && typeof body.privacyPrefs === 'object') {
      const existing = await prisma.user.findUnique({
        where:  { email: session.user.email },
        select: { privacyPrefs: true },
      });
      const current = { ...DEFAULT_PRIVACY, ...((existing?.privacyPrefs as Partial<PrivacyPrefs>) ?? {}) };
      updateData.privacyPrefs = { ...current, ...body.privacyPrefs };
    }

    if (typeof body.twoFactorEnabled === 'boolean') {
      updateData.twoFactorEnabled = body.twoFactorEnabled;
    }

    if (isValidLanguage(body.language)) {
      updateData.language = body.language;
    }

    if (typeof body.alertEmailsEnabled === 'boolean') {
      updateData.alertEmailsEnabled = body.alertEmailsEnabled;
    }

    if (typeof body.alertNamePersonalization === 'boolean') {
      updateData.alertNamePersonalization = body.alertNamePersonalization;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where:  { email: session.user.email },
      data:   updateData,
      select: {
        notifMuted:               true,
        privacyPrefs:             true,
        twoFactorEnabled:         true,
        language:                 true,
        alertEmailsEnabled:       true,
        alertNamePersonalization: true,
      },
    });

    const updatedPrivacy = { ...DEFAULT_PRIVACY, ...((updated.privacyPrefs as Partial<PrivacyPrefs>) ?? {}) };

    return NextResponse.json({
      success:                  true,
      notifMuted:               (updated.notifMuted as string[]) ?? [],
      privacyPrefs:             updatedPrivacy,
      twoFactorEnabled:         updated.twoFactorEnabled,
      language:                 isValidLanguage(updated.language) ? updated.language : 'en',
      alertEmailsEnabled:       updated.alertEmailsEnabled,
      alertNamePersonalization: updated.alertNamePersonalization,
    });
  } catch (error) {
    console.error('Settings PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}