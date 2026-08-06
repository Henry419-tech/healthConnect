import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDistance(distanceInKm: number): string {
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)}m`
  }
  return `${distanceInKm.toFixed(1)}km`
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function isEmergencySymptoms(symptoms: string[]): boolean {
  const emergencyKeywords = [
    'chest pain',
    'difficulty breathing',
    'severe bleeding',
    'unconscious',
    'seizure',
    'stroke',
    'severe allergic reaction',
    'heart attack'
  ]
  
  return symptoms.some(symptom => 
    emergencyKeywords.some(keyword => 
      symptom.toLowerCase().includes(keyword.toLowerCase())
    )
  )
}

export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Short relative time string for feed-style UI (AlertsPanel, notifications).
 * "just now" / "5m ago" / "3h ago" / "2d ago" / falls back to a short date
 * once it's more than a week old, since "47d ago" stops being useful.
 */
export function formatRelativeTime(date: Date | string): string {
  const then = typeof date === 'string' ? new Date(date) : date
  const diffMs = Date.now() - then.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  const hours   = Math.floor(diffMs / 3_600_000)
  const days    = Math.floor(diffMs / 86_400_000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}