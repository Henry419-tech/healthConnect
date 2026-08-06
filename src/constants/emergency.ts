/* ================================================================
   src/constants/emergency.ts
   Static data for the Emergency Hub page — first aid guides,
   Ghana services, blood compatibility, and personalised guide logic.
   Extracted from emergency/page.tsx to keep the page component lean.
   ================================================================ */
import React from 'react';
import {
  Heart, Wind, Droplets, Thermometer, Zap, Eye,
  Activity, AlertTriangle, Phone, Flame, Shield, Plus,
} from 'lucide-react';
import type { HealthProfileData } from '@/types/health';

/* ─── Types ─────────────────────────────────────────────────── */
export interface FirstAidStep {
  instruction: string;
  tip?: string;
  /** Short eyebrow label shown above the instruction, e.g. "Call 193 immediately" */
  label?: string;
  /** Single emoji used as the step's visual anchor inside the guide card */
  emoji?: string;
  /** Flags a step as time-critical — gets a stronger visual treatment */
  urgent?: boolean;
}

export interface FirstAidGuide {
  id: string;
  title: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  severity: 'critical' | 'high' | 'medium';
  offline: boolean;
  warning?: string;
  steps: FirstAidStep[];
  /** Search tags — symptom names, alternate titles, keywords */
  tags?: string[];
}

export interface GhanaService {
  id: string;
  name: string;
  description: string;
  number: string;
  icon: React.ComponentType<{ size: number }>;
  color: string;
}

/* ─── First Aid Guides ───────────────────────────────────────── */
export const FIRST_AID_GUIDES: FirstAidGuide[] = [
  {
    id: 'cpr', title: 'CPR — Adult', icon: Heart, severity: 'critical', offline: true,
    tags: ['cardiac arrest', 'heart attack', 'not breathing', 'unconscious', 'chest compressions', 'resuscitation', 'pulse', 'collapse'],
    warning: 'Call 193 FIRST. Only perform CPR if the person is unresponsive and not breathing normally.',
    steps: [
      { emoji: '👋', label: 'Check responsiveness', instruction: 'Check the scene is safe, then check the person. Tap their shoulders firmly and shout "Are you okay?"' },
      { emoji: '📞', label: 'Call 193 immediately', instruction: 'Call 193 (National Ambulance) immediately or ask a bystander to call. Put on speaker.', urgent: true },
      { emoji: '🛏️', label: 'Open the airway', instruction: 'Lay the person on their back on a firm, flat surface. Tilt head back gently and lift chin to open the airway.' },
      { emoji: '🫁', label: 'Check for breathing', instruction: 'Check for normal breathing for no more than 10 seconds. Look for chest rise, listen, and feel for breath.', tip: 'Occasional gasps are NOT normal breathing — begin CPR.' },
      { emoji: '✋', label: 'Hand position', instruction: 'Place the heel of one hand on the centre of the chest (lower half of breastbone). Place other hand on top, interlock fingers, and keep arms straight.' },
      { emoji: '🤲', label: 'Start compressions', instruction: 'Push hard and fast — compress at least 5 cm (2 inches) deep at 100–120 compressions per minute.', tip: "Think of the beat of \"Stayin' Alive\" — that's the right pace.", urgent: true },
      { emoji: '💨', label: 'Rescue breaths & repeat', instruction: 'After 30 compressions, give 2 rescue breaths: pinch the nose, seal mouth over theirs, breathe until chest rises. Continue 30:2 cycle until help arrives.', tip: 'If uncomfortable with rescue breaths, continuous chest compressions alone are still effective.' },
    ],
  },
  {
    id: 'choking', title: 'Choking — Heimlich', icon: Wind, severity: 'critical', offline: true,
    tags: ['heimlich', 'airway', 'obstruction', 'cannot breathe', 'throat', 'food stuck', 'infant choking', 'back blows', 'abdominal thrust'],
    warning: 'If the person can still cough forcefully, encourage them to keep coughing. Only intervene if they cannot cough, speak, or breathe.',
    steps: [
      { emoji: '❓', label: 'Confirm choking', instruction: 'Ask clearly "Are you choking?" If they cannot speak, cough, or breathe — act immediately.', urgent: true },
      { emoji: '🤚', label: 'Give back blows', instruction: 'Stand behind them, lean them forward slightly, and give up to 5 sharp back blows between the shoulder blades with the heel of your hand. Check mouth after each blow.' },
      { emoji: '🫂', label: 'Get into position', instruction: 'If back blows do not work, stand behind them and wrap your arms around their waist.' },
      { emoji: '✊', label: 'Make a fist', instruction: 'Make a fist with one hand and place it — thumb side in — just above the belly button, well below the breastbone.' },
      { emoji: '⬆️', label: 'Abdominal thrusts', instruction: 'Grasp your fist with your other hand. Pull sharply inward and upward — up to 5 times.', tip: 'Each thrust must be a sharp, distinct movement aimed to dislodge the blockage.', urgent: true },
      { emoji: '🔁', label: 'Alternate technique', instruction: 'Alternate 5 back blows with 5 abdominal thrusts until the object clears or the person becomes unconscious.' },
      { emoji: '🚨', label: 'If they go unconscious', instruction: 'If they become unconscious, lower them carefully to the floor and start CPR. Call 193 immediately.', urgent: true },
    ],
  },
  {
    id: 'bleeding', title: 'Severe Bleeding', icon: Droplets, severity: 'high', offline: true,
    tags: ['blood', 'wound', 'cut', 'laceration', 'hemorrhage', 'tourniquet', 'stab', 'injury', 'gash', 'trauma'],
    warning: 'Call 193 for severe or uncontrolled bleeding. Do NOT remove objects embedded in a wound.',
    steps: [
      { emoji: '🧤', label: 'Protect yourself', instruction: 'Protect yourself — use gloves if available, otherwise a plastic bag or thick cloth as a barrier.' },
      { emoji: '✋', label: 'Apply direct pressure', instruction: 'Apply firm, direct pressure to the wound using a clean cloth, dressing, or clothing. Press hard and hold continuously.', urgent: true },
      { emoji: '🩹', label: 'Maintain pressure', instruction: 'Do NOT lift the cloth to check — this disrupts clotting. If blood soaks through, add more cloth on top and press harder.', tip: 'Maintain pressure for at least 10–15 minutes without releasing.' },
      { emoji: '🪢', label: 'Tourniquet if needed', instruction: 'If the wound is on a limb and bleeding is life-threatening, apply a tourniquet 5–7 cm above the wound. Tighten until bleeding stops. Write down the time applied.', urgent: true },
      { emoji: '🛌', label: 'Treat for shock', instruction: 'Keep the person still and warm. Lay them down and raise their legs (unless head/neck injury suspected) to reduce shock risk.' },
    ],
  },
  {
    id: 'burns', title: 'Burns Treatment', icon: Thermometer, severity: 'high', offline: true,
    tags: ['burn', 'fire', 'scald', 'hot water', 'chemical burn', 'electrical burn', 'blister', 'skin', 'flame'],
    warning: "Call 193 for burns larger than the person's palm, burns on face/hands/genitals, or any chemical/electrical burn.",
    steps: [
      { emoji: '⚠️', label: 'Remove from danger', instruction: 'Remove the person from danger. For chemical burns, brush off dry chemicals first before removing clothing (cut if necessary, do not pull over head).', urgent: true },
      { emoji: '💧', label: 'Cool the burn', instruction: 'Cool the burn under cool (not cold or iced) running water for at least 20 minutes.', tip: 'Start within 3 hours. This single step reduces tissue damage more than anything else.' },
      { emoji: '💍', label: 'Remove jewellery', instruction: 'While cooling, remove jewellery, watches, and clothing near the burn — but NOT if stuck to the skin.' },
      { emoji: '🚫', label: 'Avoid home remedies', instruction: 'Do NOT apply butter, toothpaste, oil, ice, or any home remedies. Do NOT burst blisters.' },
      { emoji: '🩹', label: 'Cover the burn', instruction: 'Cover loosely with a clean non-fluffy material — cling film (plastic wrap) is ideal. Layer it rather than wrapping tightly.' },
      { emoji: '🧣', label: 'Prevent hypothermia', instruction: 'Keep the person warm with a blanket (avoiding the burn area) to prevent hypothermia from prolonged cooling.' },
    ],
  },
  {
    id: 'seizure', title: 'Seizure Response', icon: Zap, severity: 'high', offline: true,
    tags: ['epilepsy', 'fit', 'convulsion', 'shaking', 'twitching', 'unconscious', 'spasm', 'epileptic'],
    warning: "Call 193 if: first seizure, lasts more than 5 minutes, they don't regain consciousness, or they are injured.",
    steps: [
      { emoji: '⏱️', label: 'Note the time', instruction: 'Stay calm. Note the exact time the seizure started. Most seizures end on their own within 1–3 minutes.' },
      { emoji: '🛡️', label: 'Protect their head', instruction: 'Protect the person — cushion their head with something soft. Clear hard or sharp objects away from them.' },
      { emoji: '🚫', label: "Don't restrain them", instruction: 'Do NOT hold them down or restrain their movements. Do NOT put anything in their mouth.', tip: 'People cannot swallow their tongue. Putting something in the mouth is dangerous and wrong.', urgent: true },
      { emoji: '🔄', label: 'Recovery position', instruction: 'If possible, gently turn them onto their side (recovery position) to keep the airway clear, especially if vomiting.' },
      { emoji: '🤝', label: 'Stay & reassure', instruction: 'Stay with them until full consciousness returns. Speak calmly and reassuringly — they may be confused and frightened for several minutes after.' },
    ],
  },
  {
    id: 'eye', title: 'Eye Injury', icon: Eye, severity: 'medium', offline: true,
    tags: ['eye', 'vision', 'chemical splash', 'foreign object', 'cornea', 'blind', 'irritation', 'splash'],
    warning: 'Seek immediate care for any penetrating eye injury, chemical splash, or sudden vision loss.',
    steps: [
      { emoji: '🚫', label: "Don't rub the eye", instruction: 'Do NOT rub the eye — this can worsen any injury. Keep the person as still and calm as possible.' },
      { emoji: '💧', label: 'Flush chemical splash', instruction: 'For chemical splash: immediately flush the eye with clean water for at least 15–20 minutes, holding the eyelid open. Tilt head so water runs away from the other eye.', urgent: true },
      { emoji: '👁️', label: 'Foreign object', instruction: 'For a foreign object: try blinking rapidly or flushing with clean water. Do NOT try to remove anything embedded in the eye.' },
      { emoji: '🩹', label: 'Cover the eye', instruction: 'Cover the injured eye loosely with a clean cloth — do not apply pressure. Cover both eyes for penetrating injuries to reduce movement.' },
      { emoji: '🏥', label: 'Seek care urgently', instruction: 'Get to a hospital or eye clinic as soon as possible, even if pain seems mild initially.' },
    ],
  },
  {
    id: 'fracture', title: 'Suspected Fracture', icon: Activity, severity: 'medium', offline: true,
    tags: ['broken bone', 'fracture', 'sprain', 'splint', 'swelling', 'deformity', 'arm', 'leg', 'wrist', 'ankle', 'fall'],
    steps: [
      { emoji: '🦴', label: 'Keep it still', instruction: 'Keep the injured area completely still. Do NOT try to straighten the limb. Support it in the position found using your hands or rolled clothing.' },
      { emoji: '🩺', label: 'Check circulation', instruction: 'Check circulation below the injury: feel for a pulse, check skin colour, and ask if they feel tingling or numbness.', tip: 'Pale, cold, or bluish skin below the injury means circulation is compromised — this is urgent.', urgent: true },
      { emoji: '🩹', label: 'Open fracture care', instruction: 'For an open fracture (bone visible): cover loosely with a clean cloth — do NOT press on the bone. Treat bleeding by pressing around the wound, not on it.' },
      { emoji: '🪵', label: 'Splint if needed', instruction: 'Splint if moving is necessary: use a rigid item (board, rolled newspaper) padded with cloth. Secure above and below the fracture — never directly over it.' },
      { emoji: '🧊', label: 'Cold pack & monitor', instruction: 'Apply a cold pack (wrapped in cloth) to reduce swelling. Keep the person warm, treat for shock, and monitor until help arrives.' },
    ],
  },
  {
    id: 'poisoning', title: 'Poisoning / Overdose', icon: AlertTriangle, severity: 'critical', offline: true,
    tags: ['poison', 'overdose', 'drug', 'chemical', 'ingested', 'swallowed', 'toxic', 'medication', 'alcohol', 'fumes', 'inhaled'],
    warning: 'Call 193 immediately. Do NOT induce vomiting unless specifically directed by medical staff — it can cause further harm.',
    steps: [
      { emoji: '📞', label: 'Call 193 immediately', instruction: 'Call 193 immediately or take the person to the nearest emergency department. Give the substance name, amount, and time taken if known.', urgent: true },
      { emoji: '💬', label: 'Identify the substance', instruction: 'If conscious and alert, ask what they took. Save and show the container, packaging, or substance to medical staff.' },
      { emoji: '🚫', label: "Don't induce vomiting", instruction: 'Do NOT give anything to eat or drink. Do NOT induce vomiting unless explicitly told by a doctor.', urgent: true },
      { emoji: '🔄', label: 'Recovery position', instruction: 'If unconscious but breathing, place in the recovery position (on their side) to prevent choking on vomit.' },
      { emoji: '❤️', label: 'If breathing stops', instruction: 'If they stop breathing, begin CPR. Check breathing and consciousness continuously until help arrives.', urgent: true },
      { emoji: '💧', label: 'Chemical contact', instruction: 'For skin/eye chemical contact: remove contaminated clothing and flush the area with large amounts of clean water for at least 20 minutes.' },
    ],
  },
];

/* ─── Ghana Emergency Services ───────────────────────────────── */
export const GHANA_SERVICES: GhanaService[] = [
  { id: 'ambulance', name: 'National Ambulance Service', description: 'Emergency ambulance across Ghana',   number: '193',        icon: Plus,          color: 'red'    },
  { id: 'fire',      name: 'National Fire Service',      description: 'Fire emergencies and rescue',        number: '192',        icon: Flame,         color: 'orange' },
  { id: 'police',    name: 'Police Emergency',           description: 'Law enforcement emergency hotline',  number: '191',        icon: Shield,        color: 'blue'   },
  { id: 'disaster',  name: 'NADMO',                      description: 'Natural disaster & relief',          number: '0302773634', icon: AlertTriangle, color: 'amber'  },
  { id: 'kath',      name: 'KATH Emergency',             description: 'Komfo Anokye Teaching Hospital',     number: '0322022301', icon: Plus,          color: 'teal'   },
  { id: 'korle',     name: 'Korle Bu Hospital',          description: 'Teaching Hospital — Accra',          number: '0302674201', icon: Plus,          color: 'teal'   },
];

/* ─── Blood type compatibility ───────────────────────────────── */
export const BLOOD_COMPATIBILITY: Record<string, { canReceiveFrom: string[]; canDonateTo: string[] }> = {
  'A+':  { canReceiveFrom: ['A+','A-','O+','O-'],                        canDonateTo: ['A+','AB+'] },
  'A-':  { canReceiveFrom: ['A-','O-'],                                  canDonateTo: ['A+','A-','AB+','AB-'] },
  'B+':  { canReceiveFrom: ['B+','B-','O+','O-'],                        canDonateTo: ['B+','AB+'] },
  'B-':  { canReceiveFrom: ['B-','O-'],                                  canDonateTo: ['B+','B-','AB+','AB-'] },
  'AB+': { canReceiveFrom: ['A+','A-','B+','B-','AB+','AB-','O+','O-'],  canDonateTo: ['AB+'] },
  'AB-': { canReceiveFrom: ['A-','B-','AB-','O-'],                       canDonateTo: ['AB+','AB-'] },
  'O+':  { canReceiveFrom: ['O+','O-'],                                  canDonateTo: ['A+','B+','AB+','O+'] },
  'O-':  { canReceiveFrom: ['O-'],                                       canDonateTo: ['A+','A-','B+','B-','AB+','AB-','O+','O-'] },
};

/* ─── Breathing guide phases — box breathing 4-4-4-4 ─────────── */
export const BREATH_PHASES: {
  phase: 'inhale' | 'hold' | 'exhale' | 'rest';
  label: string;
  secs: number;
  color: string;
}[] = [
  { phase: 'inhale', label: 'Breathe In',  secs: 4, color: '#00D2FF' },
  { phase: 'hold',   label: 'Hold',        secs: 4, color: '#a78bfa' },
  { phase: 'exhale', label: 'Breathe Out', secs: 4, color: '#34d399' },
  { phase: 'rest',   label: 'Rest',        secs: 4, color: '#64748b' },
];

/* ─── Personalised guide logic ───────────────────────────────── */
const CONDITION_GUIDE_MAP: { keywords: string[]; guideId: string }[] = [
  { keywords: ['epilep','seizure','convuls'],          guideId: 'seizure'  },
  { keywords: ['heart','cardiac','coronary','angina'], guideId: 'cpr'      },
  { keywords: ['diabet','hypoglycemi'],                guideId: 'diabetic' },
  { keywords: ['asthm','bronch'],                      guideId: 'asthma'   },
];

const ALLERGY_GUIDE_TRIGGERS = [
  'peanut','nut','bee','wasp','venom','penicill','latex',
  'shellfish','fish','egg','milk','wheat','soy','sesame',
];

export function buildPersonalisedGuides(
  allergies: HealthProfileData['allergies'],
  conditions: HealthProfileData['conditions'],
  medications: HealthProfileData['medications'],
): FirstAidGuide[] {
  const guides: FirstAidGuide[] = [];

  /* Allergy action guide */
  const severeAllergies = (allergies || []).filter(
    a => a.severity === 'severe' || ALLERGY_GUIDE_TRIGGERS.some(t => a.name.toLowerCase().includes(t)),
  );
  if (severeAllergies.length > 0) {
    const allergyList = severeAllergies.map(a => a.name).join(', ');
    const hasEpipen = (medications || []).some(m => m.active && /epipen|epinephrine|adrenaline/i.test(m.name));
    guides.push({
      id: 'personal-allergy',
      title: `⚠️ Your Allergy Alert: ${allergyList}`,
      icon: AlertTriangle,
      severity: 'critical',
      offline: true,
      warning: `Personalised from your Medical ID. You have recorded severe allergies to: ${allergyList}.`,
      steps: [
        { emoji: '⛔', label: 'Stop contact with trigger', instruction: `You have recorded severe allergies to: ${allergyList}. Stop contact with the trigger immediately.`, urgent: true },
        ...(hasEpipen ? [
          { emoji: '💉', label: 'Use your EpiPen', instruction: 'Use your EpiPen immediately — outer thigh, through clothing if needed. Hold for 10 seconds.', tip: 'EpiPen buys time — it does NOT replace emergency care. Call 193 even after using it.', urgent: true },
        ] : [
          { emoji: '💉', label: 'Use EpiPen if available', instruction: 'If you have an EpiPen prescribed, use it now. If not, call 193 immediately — anaphylaxis can progress rapidly.', urgent: true },
        ]),
        { emoji: '📞', label: 'Call 193', instruction: 'Call 193 immediately. State: "I am having an allergic reaction." Lie flat with legs raised unless breathing is difficult — then sit up.', urgent: true },
        { emoji: '🚫', label: "Don't rely on antihistamines", instruction: 'Do NOT take antihistamines as a substitute for epinephrine in a severe reaction — they work too slowly for anaphylaxis.' },
        { emoji: '❤️', label: 'If symptoms worsen', instruction: 'If breathing stops or consciousness is lost, begin CPR. A second EpiPen dose can be given after 5–15 minutes if symptoms return.' },
        { emoji: '🏥', label: 'Always go to hospital', instruction: 'Even if symptoms improve after EpiPen, go to hospital immediately — biphasic reactions can occur hours later.', tip: 'Always seek emergency care after any severe allergic reaction.' },
      ],
    });
  }

  /* Condition-specific pinned guides */
  for (const cond of (conditions || []).filter(c => c.status !== 'resolved')) {
    const match = CONDITION_GUIDE_MAP.find(m => m.keywords.some(kw => cond.name.toLowerCase().includes(kw)));
    if (match?.guideId === 'diabetic' && !guides.find(g => g.id === 'personal-diabetic')) {
      guides.push({
        id: 'personal-diabetic',
        title: '🩸 Your Diabetes — Emergency',
        icon: Droplets,
        severity: 'high',
        offline: true,
        warning: 'Personalised from your Medical ID. Low blood sugar (hypoglycaemia) is more immediately dangerous than high blood sugar.',
        steps: [
          { emoji: '🩸', label: 'Know the signs', instruction: 'LOW blood sugar signs: shaking, sweating, confusion, pale skin, rapid heartbeat, hunger. HIGH blood sugar: extreme thirst, frequent urination, fruity breath, fatigue.' },
          { emoji: '🍬', label: 'Give fast sugar', instruction: 'If conscious and can swallow — give 15–20g fast-acting sugar: 4 glucose tablets, 150ml fruit juice, or 3–4 teaspoons of sugar in water.', tip: 'Do NOT give food or drink to anyone who is unconscious or unable to swallow safely.', urgent: true },
          { emoji: '⏱️', label: 'Recheck in 15 min', instruction: 'Recheck in 15 minutes. If no improvement, give another 15–20g sugar. If still not improving after two doses, call 193.' },
          { emoji: '📞', label: 'If unconscious', instruction: 'If unconscious, call 193 immediately. Place in recovery position. Do NOT attempt to give anything by mouth.', tip: 'Tell 193 dispatcher the person has diabetes — they can send glucagon.', urgent: true },
          { emoji: '💧', label: 'High blood sugar', instruction: 'For HIGH blood sugar emergency (diabetic ketoacidosis): drink water, take prescribed insulin if available and conscious, call 193 or go to hospital.' },
        ],
      });
    }
    if (match?.guideId === 'asthma' && !guides.find(g => g.id === 'personal-asthma')) {
      const hasInhaler = (medications || []).some(m => m.active && /inhaler|salbutamol|ventolin|albuterol|becotide|symbicort/i.test(m.name));
      guides.push({
        id: 'personal-asthma',
        title: '💨 Your Asthma — Emergency',
        icon: Wind,
        severity: 'high',
        offline: true,
        warning: 'Personalised from your Medical ID. A severe asthma attack can be life-threatening. Do not delay seeking help.',
        steps: [
          { emoji: '🪑', label: 'Sit upright', instruction: 'Sit upright — leaning slightly forward. Do NOT lie down. Loosen tight clothing around the neck and chest.' },
          ...(hasInhaler ? [
            { emoji: '💨', label: 'Use reliever inhaler', instruction: 'Use your reliever inhaler (usually blue) immediately: shake, exhale fully, seal lips around mouthpiece, press and inhale slowly, hold 10 seconds. Repeat every 30–60 seconds, up to 10 puffs.', tip: 'Using a spacer doubles the amount of medication that reaches your lungs.', urgent: true },
          ] : [
            { emoji: '💨', label: 'Use inhaler if available', instruction: 'If you have a reliever inhaler (blue/Ventolin), use it now — 1 puff every 30–60 seconds, up to 10 puffs. If no inhaler is available, call 193 immediately.', urgent: true },
          ]),
          { emoji: '📞', label: 'Call 193 if severe', instruction: "If no improvement after 10 puffs, or symptoms are severe (can't speak in sentences, lips turning blue), call 193 immediately.", urgent: true },
          { emoji: '🧘', label: 'Stay calm', instruction: 'Stay calm and encourage slow, controlled breathing. Panic worsens bronchospasm. Try breathing in through the nose and out through pursed lips.' },
          { emoji: '🔁', label: 'Continue treatment', instruction: 'Continue giving reliever inhaler every 15 minutes while waiting for emergency services. Note the time and number of puffs given.' },
        ],
      });
    }
  }

  return guides;
}
