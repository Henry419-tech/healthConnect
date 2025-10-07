export const FACILITY_TYPES = {
  HOSPITAL: 'Hospital',
  CLINIC: 'Clinic',
  PHARMACY: 'Pharmacy',
  EMERGENCY: 'Emergency Room',
  SPECIALIST: 'Specialist',
} as const

export const RISK_LEVELS = {
  EMERGENCY: 'Emergency',
  URGENT: 'Urgent',
  ROUTINE: 'Routine',
  SELF_CARE: 'Self Care',
} as const

export const RISK_LEVEL_COLORS = {
  EMERGENCY: 'bg-red-500',
  URGENT: 'bg-orange-500',
  ROUTINE: 'bg-yellow-500',
  SELF_CARE: 'bg-green-500',
}

export const EMERGENCY_NUMBERS = {
  AMBULANCE: '999',
  FIRE: '192',
  POLICE: '191',
} as const

export const COMMON_SYMPTOMS = [
  'Headache',
  'Fever',
  'Cough',
  'Nausea',
  'Dizziness',
  'Chest Pain',
  'Abdominal Pain',
  'Shortness of Breath',
  'Fatigue',
  'Sore Throat',
]

export const BODY_PARTS = [
  'Head',
  'Neck',
  'Chest',
  'Abdomen',
  'Back',
  'Arms',
  'Legs',
  'Hands',
  'Feet',
]