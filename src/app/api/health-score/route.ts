import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ── Health Score Algorithm (0–100) ────────────────────────────────────────────
//
// Categories & max points:
//   1. Profile Completeness   — 20 pts  (blood type, DOB, weight, height, gender)
//   2. BMI / Body Composition — 25 pts  (healthy range = full marks)
//   3. Medication Adherence   — 20 pts  (reminder set per active med = full marks)
//   4. Condition Management   — 20 pts  (managed/resolved > active/untracked)
//   5. Engagement Activity    — 15 pts  (app usage in last 30 days)
//
// Total: 100 pts
// ─────────────────────────────────────────────────────────────────────────────

function calculateHealthScore(
  profile: any,
  activities: any[],
): { score: number; breakdown: Record<string, number>; insights: string[] } {

  const breakdown = {
    profileCompleteness:  0,
    bmiScore:             0,
    medicationAdherence:  0,
    conditionManagement:  0,
    engagementScore:      0,
  };
  const insights: string[] = [];

  // ── 1. Profile Completeness (max 20) ────────────────────────────────────────
  if (profile?.bloodType)   breakdown.profileCompleteness += 4;
  if (profile?.dateOfBirth) breakdown.profileCompleteness += 4;
  if (profile?.weightKg)    breakdown.profileCompleteness += 4;
  if (profile?.heightCm)    breakdown.profileCompleteness += 4;
  if (profile?.gender)      breakdown.profileCompleteness += 4;

  if (breakdown.profileCompleteness < 20) {
    insights.push('Complete your health profile to improve your score');
  }

  // ── 2. BMI Score (max 25) ───────────────────────────────────────────────────
  if (profile?.bmi) {
    const bmi = profile.bmi as number;
    if      (bmi >= 18.5 && bmi < 25) { breakdown.bmiScore = 25; insights.push('Your BMI is in the healthy range — great work!'); }
    else if (bmi >= 17   && bmi < 18.5) { breakdown.bmiScore = 16; insights.push('You appear slightly underweight'); }
    else if (bmi >= 25   && bmi < 27)   { breakdown.bmiScore = 18; insights.push('Your BMI is slightly above the healthy range'); }
    else if (bmi >= 27   && bmi < 30)   { breakdown.bmiScore = 11; insights.push('Your BMI indicates being overweight'); }
    else                                { breakdown.bmiScore = 5;  insights.push('Your BMI suggests a significant health risk — consult a doctor'); }
  } else {
    breakdown.bmiScore = 12; // neutral when no data
    insights.push('Add your weight and height to get a BMI-based score');
  }

  // ── 3. Medication Adherence (max 20) ────────────────────────────────────────
  const activeMeds: any[] = profile?.medications?.filter((m: any) => m.active) ?? [];
  const reminders:  any[] = profile?.reminders?.filter((r: any) => r.active)   ?? [];

  if (activeMeds.length === 0) {
    breakdown.medicationAdherence = 20; // no meds needed → full score
  } else {
    const coverage = Math.min(reminders.length / activeMeds.length, 1);
    breakdown.medicationAdherence = Math.round(coverage * 20);
    if (coverage < 1) {
      insights.push(
        `Set reminders for all ${activeMeds.length} active medication${activeMeds.length > 1 ? 's' : ''}`,
      );
    }
  }

  // ── 4. Condition Management (max 20) ────────────────────────────────────────
  const conditions: any[] = profile?.conditions ?? [];

  if (conditions.length === 0) {
    breakdown.conditionManagement = 20;
  } else {
    let pts = 0;
    const perCond = 20 / conditions.length;
    conditions.forEach((c: any) => {
      if      (c.status === 'managed')  pts += perCond;
      else if (c.status === 'resolved') pts += perCond * 0.9;
      else                              pts += perCond * 0.4; // active / unmanaged
    });
    breakdown.conditionManagement = Math.round(pts);

    const unmanaged = conditions.filter((c: any) => c.status === 'active').length;
    if (unmanaged > 0) {
      insights.push(
        `${unmanaged} unmanaged condition${unmanaged > 1 ? 's' : ''} — please consult a doctor`,
      );
    }
  }

  // ── 5. Engagement (max 15) — activity in last 30 days ───────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentCount   = activities.filter(
    (a: any) => new Date(a.createdAt) > thirtyDaysAgo,
  ).length;

  if      (recentCount >= 10) breakdown.engagementScore = 15;
  else if (recentCount >= 5)  breakdown.engagementScore = 11;
  else if (recentCount >= 2)  breakdown.engagementScore = 7;
  else if (recentCount >= 1)  breakdown.engagementScore = 4;
  else                        insights.push('Use the app regularly to earn engagement points');

  const score = Math.min(
    100,
    Object.values(breakdown).reduce((a, b) => a + b, 0),
  );

  return { score, breakdown, insights };
}

// ── GET /api/health-score ─────────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve user id from email (consistent with the rest of the codebase)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch profile (with relations) + recent activities in parallel
    const [profile, activities] = await Promise.all([
      prisma.healthProfile.findUnique({
        where: { userId: user.id },
        include: {
          medications: { where: { active: true } },
          conditions:  true,
          reminders:   { where: { active: true } },
        },
      }),
      // ← correct accessor: userActivity (matches schema model name UserActivity)
      prisma.userActivity.findMany({
        where:   { userId: user.id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take:    100,
        select:  { createdAt: true },   // only need the date for engagement calc
      }),
    ]);

    const result = calculateHealthScore(profile, activities);

    // Persist the computed score so the profile page can display it without
    // re-running the algorithm on every request.
    if (profile) {
      await prisma.healthProfile.update({
        where: { userId: user.id },
        data:  { healthScore: result.score },
      });
    }

    return NextResponse.json({ ...result, success: true });

  } catch (error) {
    console.error('Error calculating health score:', error);
    return NextResponse.json(
      { error: 'Failed to calculate health score', details: String(error) },
      { status: 500 },
    );
  }
}