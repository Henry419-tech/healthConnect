export const activityTypes = {
  FACILITY_FOUND: 'facility_found',
  SYMPTOM_CHECKED: 'symptom_checked',
  EMERGENCY_ACCESSED: 'emergency_accessed',
  FIRST_AID_VIEWED: 'first_aid_viewed'
} as const;

export async function trackActivity(
  activityType: string,
  title: string,
  description?: string,
  metadata?: any
) {
  try {
    const response = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityType,
        title,
        description,
        metadata
      })
    });

    if (!response.ok) {
      throw new Error('Failed to track activity');
    }

    return await response.json();
  } catch (error) {
    console.error('Error tracking activity:', error);
    return null;
  }
}

export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
}