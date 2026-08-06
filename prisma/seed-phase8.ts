/* ================================================================
   prisma/seed-phase8.ts
   Seeds Specialty, SymptomTag, and SymptomSpecialtyMap for the
   Find Care system (Phase 8 — Section 13 of the handoff).

   IMPORTANT — keep in sync with src/lib/symptomSpecialtyMap.ts:
   The `specialties` and `symptomSpecialtyMap` data below were
   generated directly from that file so both start out identical.
   If you add/change a symptom or specialty in one place, mirror the
   change in the other — this script runs standalone in Node and
   does not import the client-side file directly.

   This is a separate file from any existing prisma/seed.ts you may
   already have (none was present in the uploaded src.zip, so this
   assumes no seed script currently exists — if you do have one,
   merge this into it rather than running both).

   Run with:
     npx tsx prisma/seed-phase8.ts
   or add "prisma": { "seed": "tsx prisma/seed-phase8.ts" } to
   package.json and run:
     npx prisma db seed
   ================================================================ */

   import { PrismaClient } from '@prisma/client';

   const prisma = new PrismaClient();
   
   /* ── Specialties ──────────────────────────────────────────────────── */
   const specialties = [
     { slug: 'gp', name: 'General Practitioner', description: 'Your first stop for most everyday health concerns — can refer you to a specialist if needed.', icon: 'Stethoscope' },
     { slug: 'neurologist', name: 'Neurologist', description: 'Treats conditions of the brain, nerves, and nervous system.', icon: 'Brain' },
     { slug: 'cardiologist', name: 'Cardiologist', description: 'Treats conditions of the heart and blood vessels.', icon: 'HeartPulse' },
     { slug: 'dermatologist', name: 'Dermatologist', description: 'Treats skin, hair, and nail conditions.', icon: 'Sparkles' },
     { slug: 'ophthalmologist', name: 'Ophthalmologist', description: 'Treats eye conditions and vision problems.', icon: 'Eye' },
     { slug: 'rheumatologist', name: 'Rheumatologist', description: 'Treats joint, muscle, and autoimmune conditions.', icon: 'Bone' },
     { slug: 'psychiatrist', name: 'Psychiatrist', description: 'Treats mental health conditions — mood, anxiety, and more.', icon: 'BrainCircuit' },
     { slug: 'gastroenterologist', name: 'Gastroenterologist', description: 'Treats digestive system conditions — stomach, gut, and liver.', icon: 'Activity' },
     { slug: 'ent', name: 'ENT Specialist', description: 'Treats ear, nose, and throat conditions.', icon: 'Ear' },
     { slug: 'dentist', name: 'Dentist', description: 'Treats teeth, gums, and oral health.', icon: 'Smile' },
     { slug: 'obgyn', name: 'OB/GYN', description: 'Treats women\'s reproductive health, pregnancy, and menstrual concerns.', icon: 'Heart' },
     { slug: 'paediatrician', name: 'Paediatrician', description: 'Treats infants, children, and teenagers\' health.', icon: 'Baby' },
     { slug: 'orthopaedic', name: 'Orthopaedic Surgeon', description: 'Treats bones, joints, and musculoskeletal injuries.', icon: 'Bone' },
     { slug: 'urologist', name: 'Urologist', description: 'Treats urinary tract and male reproductive conditions.', icon: 'Droplet' },
     { slug: 'pulmonologist', name: 'Pulmonologist', description: 'Treats lung and breathing conditions.', icon: 'Wind' },
     { slug: 'endocrinologist', name: 'Endocrinologist', description: 'Treats hormone conditions — diabetes, thyroid, and metabolism.', icon: 'Gauge' },
     { slug: 'physiotherapist', name: 'Physiotherapist', description: 'Treats injuries and mobility through physical rehabilitation.', icon: 'Dumbbell' },
     { slug: 'oncologist', name: 'Oncologist', description: 'Treats cancer and investigates unusual growths — always start with a GP referral.', icon: 'Microscope' },
   ];
   
   /* ── Symptom tags ─────────────────────────────────────────────────── */
   const symptomTags = [
     { slug: 'headache', name: 'Headache', category: 'Head & Neck' },
     { slug: 'fever', name: 'Fever', category: 'Head & Neck' },
     { slug: 'dizziness', name: 'Dizziness', category: 'Head & Neck' },
     { slug: 'blurred-vision', name: 'Blurred vision', category: 'Head & Neck' },
     { slug: 'eye-pain', name: 'Eye pain', category: 'Head & Neck' },
     { slug: 'redness', name: 'Eye redness', category: 'Head & Neck' },
     { slug: 'ear-pain', name: 'Ear pain', category: 'Head & Neck' },
     { slug: 'hearing-loss', name: 'Hearing loss', category: 'Head & Neck' },
     { slug: 'sore-throat', name: 'Sore throat', category: 'Head & Neck' },
     { slug: 'nasal-congestion', name: 'Nasal congestion', category: 'Head & Neck' },
     { slug: 'tooth-pain', name: 'Tooth pain', category: 'Head & Neck' },
     { slug: 'gum-swelling', name: 'Gum swelling', category: 'Head & Neck' },
     { slug: 'chest-pain', name: 'Chest pain', category: 'Chest' },
     { slug: 'shortness-of-breath', name: 'Shortness of breath', category: 'Chest' },
     { slug: 'palpitations', name: 'Palpitations', category: 'Chest' },
     { slug: 'breathing-difficulty', name: 'Breathing difficulty', category: 'Chest' },
     { slug: 'chronic-cough', name: 'Chronic cough', category: 'Chest' },
     { slug: 'cough', name: 'Cough', category: 'Chest' },
     { slug: 'high-blood-pressure', name: 'High blood pressure', category: 'Chest' },
     { slug: 'stomach-pain', name: 'Stomach pain', category: 'Stomach' },
     { slug: 'nausea', name: 'Nausea', category: 'Stomach' },
     { slug: 'vomiting', name: 'Vomiting', category: 'Stomach' },
     { slug: 'diarrhoea', name: 'Diarrhoea', category: 'Stomach' },
     { slug: 'bloating', name: 'Bloating', category: 'Stomach' },
     { slug: 'skin-rash', name: 'Skin rash', category: 'Skin' },
     { slug: 'itching', name: 'Itching', category: 'Skin' },
     { slug: 'hives', name: 'Hives', category: 'Skin' },
     { slug: 'skin-discoloration', name: 'Skin discolouration', category: 'Skin' },
     { slug: 'acne', name: 'Acne', category: 'Skin' },
     { slug: 'hair-loss', name: 'Hair loss', category: 'Skin' },
     { slug: 'anxiety', name: 'Anxiety', category: 'Mental Health' },
     { slug: 'depression', name: 'Depression', category: 'Mental Health' },
     { slug: 'mood-changes', name: 'Mood changes', category: 'Mental Health' },
     { slug: 'insomnia', name: 'Insomnia', category: 'Mental Health' },
     { slug: 'memory-loss', name: 'Memory loss', category: 'Mental Health' },
     { slug: 'fatigue', name: 'Fatigue', category: 'General' },
     { slug: 'cold', name: 'Cold symptoms', category: 'General' },
     { slug: 'joint-pain', name: 'Joint pain', category: 'General' },
     { slug: 'swelling', name: 'Swelling', category: 'General' },
     { slug: 'stiffness', name: 'Stiffness', category: 'General' },
     { slug: 'back-pain', name: 'Back pain', category: 'General' },
     { slug: 'fracture', name: 'Fracture', category: 'General' },
     { slug: 'joint-injury', name: 'Joint injury', category: 'General' },
     { slug: 'sports-injury', name: 'Sports injury', category: 'General' },
     { slug: 'frequent-urination', name: 'Frequent urination', category: 'General' },
     { slug: 'kidney-pain', name: 'Kidney pain', category: 'General' },
     { slug: 'weight-changes', name: 'Weight changes', category: 'General' },
     { slug: 'excessive-thirst', name: 'Excessive thirst', category: 'General' },
     { slug: 'night-sweats', name: 'Night sweats', category: 'General' },
     { slug: 'pregnancy', name: 'Pregnancy', category: 'General' },
     { slug: 'menstrual-issues', name: 'Menstrual issues', category: 'General' },
     { slug: 'pelvic-pain', name: 'Pelvic pain', category: 'General' },
     { slug: 'child-illness', name: 'Child illness', category: 'General' },
     { slug: 'growth-concern', name: 'Growth concern', category: 'General' },
     { slug: 'lump', name: 'Lump or abnormal growth', category: 'General' },
   ];
   
   /* ── Symptom → Specialty weighted map (mirrors src/lib/symptomSpecialtyMap.ts) ── */
   const symptomSpecialtyMap: Record<string, { specialtySlug: string; weight: number; gpFirst: boolean }[]> = {
     'headache': [{ specialtySlug: 'neurologist', weight: 2, gpFirst: true }],
     'fever': [{ specialtySlug: 'neurologist', weight: 1, gpFirst: true }, { specialtySlug: 'gp', weight: 2, gpFirst: false }],
     'dizziness': [{ specialtySlug: 'neurologist', weight: 1, gpFirst: true }, { specialtySlug: 'ent', weight: 2, gpFirst: false }],
     'blurred-vision': [{ specialtySlug: 'neurologist', weight: 1, gpFirst: true }, { specialtySlug: 'ophthalmologist', weight: 2, gpFirst: false }],
     'eye-pain': [{ specialtySlug: 'ophthalmologist', weight: 3, gpFirst: false }],
     'redness': [{ specialtySlug: 'ophthalmologist', weight: 2, gpFirst: false }],
     'ear-pain': [{ specialtySlug: 'ent', weight: 3, gpFirst: false }],
     'hearing-loss': [{ specialtySlug: 'ent', weight: 3, gpFirst: false }],
     'sore-throat': [{ specialtySlug: 'ent', weight: 1, gpFirst: false }, { specialtySlug: 'gp', weight: 2, gpFirst: false }],
     'nasal-congestion': [{ specialtySlug: 'ent', weight: 2, gpFirst: false }, { specialtySlug: 'gp', weight: 1, gpFirst: false }],
     'tooth-pain': [{ specialtySlug: 'dentist', weight: 3, gpFirst: false }],
     'gum-swelling': [{ specialtySlug: 'dentist', weight: 3, gpFirst: false }],
     'chest-pain': [{ specialtySlug: 'cardiologist', weight: 3, gpFirst: true }],
     'shortness-of-breath': [{ specialtySlug: 'cardiologist', weight: 2, gpFirst: true }, { specialtySlug: 'pulmonologist', weight: 2, gpFirst: true }],
     'palpitations': [{ specialtySlug: 'cardiologist', weight: 3, gpFirst: true }],
     'breathing-difficulty': [{ specialtySlug: 'pulmonologist', weight: 3, gpFirst: true }],
     'chronic-cough': [{ specialtySlug: 'pulmonologist', weight: 2, gpFirst: true }],
     'cough': [{ specialtySlug: 'gp', weight: 2, gpFirst: false }],
     'high-blood-pressure': [{ specialtySlug: 'cardiologist', weight: 2, gpFirst: false }],
     'stomach-pain': [{ specialtySlug: 'gastroenterologist', weight: 2, gpFirst: true }],
     'nausea': [{ specialtySlug: 'gastroenterologist', weight: 1, gpFirst: true }, { specialtySlug: 'gp', weight: 2, gpFirst: false }],
     'vomiting': [{ specialtySlug: 'gastroenterologist', weight: 2, gpFirst: true }],
     'diarrhoea': [{ specialtySlug: 'gastroenterologist', weight: 2, gpFirst: true }],
     'bloating': [{ specialtySlug: 'gastroenterologist', weight: 2, gpFirst: true }],
     'skin-rash': [{ specialtySlug: 'dermatologist', weight: 3, gpFirst: false }],
     'itching': [{ specialtySlug: 'dermatologist', weight: 2, gpFirst: false }],
     'hives': [{ specialtySlug: 'dermatologist', weight: 3, gpFirst: false }],
     'skin-discoloration': [{ specialtySlug: 'dermatologist', weight: 3, gpFirst: false }],
     'acne': [{ specialtySlug: 'dermatologist', weight: 3, gpFirst: false }],
     'hair-loss': [{ specialtySlug: 'dermatologist', weight: 2, gpFirst: false }],
     'anxiety': [{ specialtySlug: 'psychiatrist', weight: 3, gpFirst: false }],
     'depression': [{ specialtySlug: 'psychiatrist', weight: 3, gpFirst: false }],
     'mood-changes': [{ specialtySlug: 'psychiatrist', weight: 2, gpFirst: false }],
     'insomnia': [{ specialtySlug: 'psychiatrist', weight: 1, gpFirst: true }, { specialtySlug: 'gp', weight: 1, gpFirst: false }],
     'memory-loss': [{ specialtySlug: 'neurologist', weight: 2, gpFirst: true }],
     'fatigue': [{ specialtySlug: 'gp', weight: 2, gpFirst: false }],
     'cold': [{ specialtySlug: 'gp', weight: 2, gpFirst: false }],
     'joint-pain': [{ specialtySlug: 'rheumatologist', weight: 2, gpFirst: true }, { specialtySlug: 'orthopaedic', weight: 2, gpFirst: true }],
     'swelling': [{ specialtySlug: 'rheumatologist', weight: 2, gpFirst: true }],
     'stiffness': [{ specialtySlug: 'rheumatologist', weight: 2, gpFirst: true }],
     'back-pain': [{ specialtySlug: 'orthopaedic', weight: 2, gpFirst: true }, { specialtySlug: 'physiotherapist', weight: 1, gpFirst: false }],
     'fracture': [{ specialtySlug: 'orthopaedic', weight: 3, gpFirst: true }],
     'joint-injury': [{ specialtySlug: 'orthopaedic', weight: 3, gpFirst: true }],
     'sports-injury': [{ specialtySlug: 'physiotherapist', weight: 2, gpFirst: false }, { specialtySlug: 'orthopaedic', weight: 2, gpFirst: false }],
     'frequent-urination': [{ specialtySlug: 'urologist', weight: 2, gpFirst: true }],
     'kidney-pain': [{ specialtySlug: 'urologist', weight: 3, gpFirst: true }],
     'weight-changes': [{ specialtySlug: 'endocrinologist', weight: 2, gpFirst: true }],
     'excessive-thirst': [{ specialtySlug: 'endocrinologist', weight: 3, gpFirst: true }],
     'night-sweats': [{ specialtySlug: 'gp', weight: 1, gpFirst: false }],
     'pregnancy': [{ specialtySlug: 'obgyn', weight: 3, gpFirst: false }],
     'menstrual-issues': [{ specialtySlug: 'obgyn', weight: 3, gpFirst: false }],
     'pelvic-pain': [{ specialtySlug: 'obgyn', weight: 2, gpFirst: true }],
     'child-illness': [{ specialtySlug: 'paediatrician', weight: 3, gpFirst: false }],
     'growth-concern': [{ specialtySlug: 'paediatrician', weight: 2, gpFirst: false }],
     'lump': [{ specialtySlug: 'oncologist', weight: 2, gpFirst: true }],
   };
   
   async function main() {
     console.log('Seeding Phase 8 — Find Care specialties, symptom tags, and mappings...');
   
     // ── Specialties ──────────────────────────────────────────────────
     const specialtyIdBySlug: Record<string, string> = {};
     for (const s of specialties) {
       const row = await prisma.specialty.upsert({
         where:  { slug: s.slug },
         update: { name: s.name, description: s.description, icon: s.icon },
         create: s,
       });
       specialtyIdBySlug[s.slug] = row.id;
     }
     console.log(`  ✓ ${specialties.length} specialties upserted`);
   
     // ── Symptom tags ─────────────────────────────────────────────────
     const symptomIdBySlug: Record<string, string> = {};
     for (const t of symptomTags) {
       const row = await prisma.symptomTag.upsert({
         where:  { slug: t.slug },
         update: { name: t.name, category: t.category },
         create: t,
       });
       symptomIdBySlug[t.slug] = row.id;
     }
     console.log(`  ✓ ${symptomTags.length} symptom tags upserted`);
   
     // ── Symptom → Specialty join rows ───────────────────────────────
     let joinCount = 0;
     for (const [symptomSlug, entries] of Object.entries(symptomSpecialtyMap)) {
       const symptomId = symptomIdBySlug[symptomSlug];
       if (!symptomId) {
         console.warn(`  ⚠ Skipping unknown symptom slug "${symptomSlug}" — not found in symptomTags`);
         continue;
       }
       for (const { specialtySlug, weight, gpFirst } of entries) {
         const specialtyId = specialtyIdBySlug[specialtySlug];
         if (!specialtyId) {
           console.warn(`  ⚠ Skipping unknown specialty slug "${specialtySlug}" (symptom "${symptomSlug}") — not found in specialties`);
           continue;
         }
         await prisma.symptomSpecialtyMap.upsert({
           where:  { symptomId_specialtyId: { symptomId, specialtyId } },
           update: { weight, gpFirst },
           create: { symptomId, specialtyId, weight, gpFirst },
         });
         joinCount++;
       }
     }
     console.log(`  ✓ ${joinCount} symptom→specialty mappings upserted`);
   
     console.log('Phase 8 seed complete.');
   }
   
   main()
     .catch((e) => {
       console.error('Phase 8 seed failed:', e);
       process.exit(1);
     })
     .finally(async () => {
       await prisma.$disconnect();
     });