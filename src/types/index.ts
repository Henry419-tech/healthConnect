export interface User {
  id: string
  name: string | null
  email: string
  emergencyContact: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Facility {
  id: string
  name: string
  type: FacilityType
  address: string
  latitude: number
  longitude: number
  phone: string | null
  website: string | null
  rating: number | null
  emergencyServices: boolean
  operatingHours: Record<string, string> | null
  services: string[] | null
  verified: boolean
  distance?: number
}

export interface EmergencyContact {
  id: string
  name: string
  phone: string
  relationship: string
  priority: number
}

export enum FacilityType {
  HOSPITAL = 'HOSPITAL',
  CLINIC = 'CLINIC',
  PHARMACY = 'PHARMACY',
  EMERGENCY = 'EMERGENCY',
  SPECIALIST = 'SPECIALIST',
}

export enum RiskLevel {
  EMERGENCY = 'EMERGENCY',
  URGENT = 'URGENT',
  ROUTINE = 'ROUTINE',
  SELF_CARE = 'SELF_CARE',
}

export interface Location {
  latitude: number
  longitude: number
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}