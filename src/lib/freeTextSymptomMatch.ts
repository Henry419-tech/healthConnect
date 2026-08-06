/* ================================================================
   src/lib/freeTextSymptomMatch.ts
   Deterministic free-text → facility-type matcher for the /find-care
   "text bar" (Section 3.1, Use 2). Runs entirely server-side, no
   network call — reuses the same weighted SYMPTOM_FACILITY_MAP /
   matchSymptoms() the symptom-chip picker already uses, so free text
   and chip selections route through identical, auditable logic.

   This is the PRIMARY path for POST /api/symptom-match. Gemini is
   only called when free text doesn't hit any phrase below — see
   route.ts for the fallback wiring and why (quota, cost, latency,
   and keeping this routing-only feature free of anything that could
   read as AI-generated medical advice).

   Coverage over precision: SYNONYMS maps varied real-world phrasing
   onto the same slugs the chips use. Expand this list whenever real
   user free text misses here and falls through to Gemini for
   something a human would consider an easy match — that fallthrough
   rate is the signal for what to add next.
   ================================================================ */

import { matchSymptoms, type FacilityMatch } from '@/lib/symptomSpecialtyMap';

const SYNONYMS: Record<string, string[]> = {
  headache:              ['headache', 'head ache', 'head pain', 'migraine', 'pain in my head', 'headace', 'my head hurts', 'my head is hurting', 'my head is paining me', 'head is paining me', 'my head is banging', 'head is pounding', 'pounding head', 'throbbing head', 'splitting headache', 'severe headache', 'head is aching', 'pressure in my head', 'my head dey pain me'],
  fever:                 ['fever', 'high temperature', 'temperature', 'feverish', 'chills', 'hot body', 'feaver', 'my body is hot', 'body is hot', 'body feels hot', 'running a temperature', 'burning up', 'feel hot all over', 'shivering', 'malaria', 'i think i have malaria', 'high fever', 'temperature is up', 'feel warm all over'],
  dizziness:             ['dizzy', 'dizziness', 'lightheaded', 'light headed', 'feel faint', 'faint', 'dizzy spells', 'head spinning', 'my head is spinning', 'room is spinning', 'giddy', 'woozy', 'wooziness', 'everything is spinning', 'feel like i will faint', 'unsteady on my feet', 'vertigo'],
  'blurred-vision':      ['blurred vision', 'blurry vision', "can't see clearly", 'cant see clearly', 'vision problem', 'seeing double', 'double vision', 'blur vision', 'my eyes are blurry', "can't see well", 'cant see well', 'hazy vision', 'my sight is not clear', 'my sight is blurry', 'things look blurry', 'vision is not sharp', 'cloudy vision'],
  'eye-pain':            ['eye pain', 'pain in my eye', 'sore eye', 'eyes hurt', 'my eye is paining me', 'eyes are paining me', 'eye is paining me', 'painful eyes', 'eye hurting', 'stinging eyes', 'burning eyes', 'my eyes are sore'],
  redness:               ['red eye', 'red eyes', 'eye redness', 'pink eye', 'my eyes are red', 'eyes look red', 'eye looks red', 'bloodshot eyes', 'eyes are inflamed', 'irritated red eyes'],
  'ear-pain':            ['ear pain', 'earache', 'ear ache', 'pain in my ear', 'my ear is paining me', 'ear is paining me', 'ear hurting', 'painful ear', 'sharp pain in my ear', 'ear throbbing', 'my ears hurt'],
  'hearing-loss':        ['hearing loss', "can't hear", 'cant hear', 'hard of hearing', 'not hearing well', "can't hear well", 'cant hear well', 'ear blockage', 'muffled hearing', 'ringing in my ears', 'tinnitus', 'ears feel blocked', 'sounds are muffled'],
  'sore-throat':         ['sore throat', 'throat pain', 'throat hurts', 'painful throat', 'my throat is paining me', 'throat is paining me', 'pain when swallowing', 'scratchy throat', 'throat is sore', 'raspy throat', 'hoarse voice', 'difficulty swallowing'],
  'nasal-congestion':    ['blocked nose', 'stuffy nose', 'nasal congestion', 'runny nose', 'congested', 'my nose is blocked', 'nose is blocked', 'nose blocked', 'stuffed nose', 'blocked nostrils', 'sinuses blocked', 'nose is stuffy', 'sinus congestion'],
  'tooth-pain':          ['tooth pain', 'toothache', 'tooth ache', 'my tooth hurts', 'dental pain', 'toothake', 'my tooth is paining me', 'tooth is paining me', 'teeth hurt', 'sensitive tooth', 'throbbing tooth', 'tooth is throbbing', 'pain when i chew', 'tooth sensitive to cold'],
  'gum-swelling':        ['gum swelling', 'swollen gum', 'swollen gums', 'bleeding gum', 'my gums are swollen', 'my gum is swollen', 'gums bleeding', 'gum pain', 'gums are painful', 'gum infection', 'gums look swollen'],
  'chest-pain':          ['chest pain', 'pain in my chest', 'tight chest', 'tightness in my chest', 'chest tightness', 'chest tight', 'my chest is paining me', 'chest is paining me', 'chest hurts', 'chest hurting', 'sharp pain in my chest', 'chest pains', 'stabbing chest pain', 'chest burning', 'chest discomfort', 'pains in my chest'],
  'shortness-of-breath': ['shortness of breath', 'short of breath', "can't breathe", 'cant breathe', 'out of breath', 'cant breath', "can't breath", 'breathless', 'gasping for air', "can't catch my breath", 'cant catch my breath', 'struggling to breathe', 'winded', 'i feel breathless', 'panting for no reason', "cant get enough air"],
  palpitations:          ['palpitations', 'heart racing', 'heart pounding', 'irregular heartbeat', 'racing heart', 'my heart is racing', 'heart beating fast', 'heart skipping', 'skipped heartbeat', 'thumping heart', 'heart feels jumpy', 'heart beating irregularly', 'heart doing something strange'],
  'breathing-difficulty': ['difficulty breathing', 'trouble breathing', 'hard to breathe', 'breathing problem', 'labored breathing', 'wheezing', 'heavy breathing', 'my breathing is not normal', 'finding it hard to breathe', 'breathing is difficult'],
  'chronic-cough':       ['chronic cough', 'cough for weeks', "cough that won't go away", 'persistent cough', 'cough for months', 'cough wont go', 'long term cough', 'cough has lasted a long time', 'ongoing cough'],
  cough:                 ['cough', 'coughing', 'coughing a lot', 'dry cough', 'wet cough', 'cough with phlegm', 'coughing fits', 'keep coughing', 'cough at night'],
  'high-blood-pressure': ['high blood pressure', 'hypertension', 'bp is high', 'blood pressure is high', 'bp high', 'high bp', 'my pressure is high', 'diagnosed with hypertension', 'bp reading is high'],
  'stomach-pain':        ['stomach pain', 'stomach ache', 'stomachache', 'abdominal pain', 'belly pain', 'pain in my stomach', 'stomache', 'my stomach is paining me', 'stomach is paining me', 'belly is paining me', 'tummy ache', 'tummy pain', 'stomach cramps', 'cramping stomach', 'sharp pain in my belly', 'gut pain'],
  nausea:                ['nausea', 'nauseous', 'feel sick', 'queasy', 'want to vomit', 'feel like vomiting', 'sick to my stomach', 'stomach turning', 'queasy feeling'],
  vomiting:              ['vomiting', 'throwing up', 'vomit', 'been sick', 'vomitting', 'puking', 'throwing up a lot', 'been vomiting', "can't keep food down", 'cant keep food down', 'vomited this morning'],
  diarrhoea:             ['diarrhoea', 'diarrhea', 'loose stool', 'running stomach', 'diarhea', 'diarrea', 'watery stool', 'running belly', 'stooling', 'frequent stooling', 'stomach running', 'the runs'],
  bloating:              ['bloating', 'bloated', 'gassy', 'gas pain', 'belly feels bloated', 'stomach feels bloated', 'belly feels puffy', 'full of gas', 'stomach feels tight and full', 'bloated after eating'],
  'skin-rash':           ['rash', 'skin rash', 'red spots', 'red bumps', 'skin breaking out in a rash', 'rashes on my skin', 'red patches on skin', 'skin irritation with bumps', 'skin broke out', 'itchy rash', 'rash spreading'],
  itching:               ['itching', 'itchy', 'itchy skin', 'scratching a lot', 'body is itching', 'my skin is itching me', 'itches all over', "can't stop scratching", 'cant stop scratching', 'itchy all over my body'],
  hives:                 ['hives', 'welts', 'allergic reaction on skin', 'itchy welts', 'allergic bumps', 'raised bumps on skin', 'skin swelling in patches'],
  'skin-discoloration':  ['skin discoloration', 'skin discolouration', 'dark patches', 'light patches', 'skin colour change', 'dark spots on skin', 'light spots on skin', 'discolored patches on my skin', 'skin turning dark', 'skin turning pale', 'uneven skin tone', 'blotchy skin'],
  acne:                  ['acne', 'pimples', 'breakout', 'pimples on my face', 'spots on my face', 'skin breakout', 'zits', 'face breaking out', 'acne on my face'],
  'hair-loss':           ['hair loss', 'losing hair', 'balding', 'thinning hair', 'my hair is falling out', 'hair falling', 'shedding hair', 'receding hairline', 'bald patches', 'hair thinning out'],
  anxiety:               ['anxiety', 'anxious', 'panic attack', 'worried all the time', 'nervous all the time', 'feeling anxious all the time', 'panic attacks', 'racing thoughts', 'constant worry', 'on edge', 'heart races when i worry', "can't stop worrying", 'feel tense all the time'],
  depression:            ['depression', 'depressed', 'feeling hopeless', 'no motivation', 'sad all the time', 'feeling down', 'feeling low', 'lost interest in everything', 'crying a lot', "don't feel like doing anything", 'nothing feels enjoyable anymore', 'feel empty inside'],
  'mood-changes':        ['mood swings', 'mood changes', 'irritable', 'moody', 'my mood changes suddenly', 'easily irritated', 'snapping at people', 'mood keeps changing', 'emotional ups and downs'],
  insomnia:              ['insomnia', "can't sleep", 'cant sleep', 'trouble sleeping', 'not sleeping', 'not able to sleep', 'sleepless nights', "cant fall asleep", "can't fall asleep", 'sleep problems', 'lying awake at night', 'keep waking up at night'],
  'memory-loss':         ['memory loss', 'forgetting things', 'losing my memory', 'confusion', 'forgetful', 'keep forgetting things', 'memory is not sharp', 'losing my train of thought', 'blanking out', "can't remember simple things"],
  fatigue:               ['fatigue', 'tired all the time', 'exhausted', 'no energy', 'weakness', 'always tired', 'feeling weak all over', 'body is weak', 'my body is weak', 'drained', 'no strength', 'lack of energy', 'always sleepy', 'struggling to stay awake'],
  cold:                  ['common cold', 'flu', 'catarrh', 'i have a cold', 'catching a cold', 'flu like symptoms', 'catarrh is disturbing me', 'sneezing a lot'],
  'joint-pain':          ['joint pain', 'joints hurt', 'painful joints', 'my joints are paining me', 'joints paining me', 'knee pain', 'pain in my knees', 'elbow pain', 'shoulder pain', 'wrist pain', 'hip pain', 'ankle pain'],
  swelling:              ['swelling', 'swollen', 'puffy', 'my leg is swollen', 'swollen leg', 'swollen hand', 'parts of my body are swollen', 'swollen ankle', 'swollen face'],
  stiffness:             ['stiffness', 'stiff joints', 'stiff muscles', 'stiff neck', 'muscles feel stiff', 'body feels stiff', "can't move my joint freely", 'stiff in the morning', 'hard to bend my knee'],
  'back-pain':           ['back pain', 'backache', 'back ache', 'pain in my back', 'my back is paining me', 'back is paining me', 'lower back pain', 'waist pain', 'pain in my waist', 'spine pain', 'pain along my spine', 'back is stiff and painful'],
  fracture:              ['fracture', 'broken bone', 'think i broke', 'broke my arm', 'broke my leg', 'bone is broken', 'i think my bone is fractured', 'snapped bone', 'x-ray shows a fracture', "can't move my arm after a fall"],
  'joint-injury':        ['sprain', 'twisted my ankle', 'twisted ankle', 'joint injury', 'sprained my ankle', 'twisted my knee', 'rolled my ankle', 'ankle sprain', 'twisted my wrist', 'dislocated my shoulder'],
  'sports-injury':       ['sports injury', 'injured while playing', 'pulled a muscle', 'injured playing football', 'gym injury', 'strained a muscle', 'pulled my hamstring', 'twisted it during a match', 'injury from exercising'],
  'frequent-urination':  ['frequent urination', 'peeing a lot', 'urinating a lot', 'peeing frequently', 'urinating frequently', 'peeing every few minutes', 'using the bathroom a lot to pee', 'urinating more than usual', 'always needing to pee'],
  'kidney-pain':         ['kidney pain', 'pain in my kidney', 'pain in my kidneys', 'my kidney is paining me', 'flank pain', 'pain in my lower back near the kidney', 'sharp pain in my side', 'kidney area hurts'],
  'weight-changes':      ['weight loss', 'weight gain', 'losing weight', 'gaining weight', 'lost a lot of weight', 'gained a lot of weight', 'suddenly lost weight', 'clothes are looser', "clothes don't fit anymore", 'losing weight without trying'],
  'excessive-thirst':    ['excessive thirst', 'always thirsty', 'very thirsty', 'thirsty all the time', 'drinking water non stop', "can't quench my thirst", 'mouth always dry and thirsty', 'drinking more water than usual'],
  'night-sweats':        ['night sweats', 'sweating at night', 'sweat a lot at night', 'waking up sweaty', 'drenched in sweat at night', 'wake up soaked in sweat', 'bedsheets wet from sweating', 'sweating through my clothes at night'],
  pregnancy:             ['pregnant', 'pregnancy', 'missed my period', "think i'm pregnant", 'i might be pregnant', 'morning sickness', 'expecting a baby', 'late period', 'took a pregnancy test'],
  'menstrual-issues':    ['period pain', 'menstrual pain', 'irregular periods', 'heavy periods', 'my period pain is too much', 'period cramps', 'painful periods', 'my period is late', 'periods are irregular', 'spotting between periods'],
  'pelvic-pain':         ['pelvic pain', 'pain in my pelvis', 'lower abdominal pain', 'pain in my lower abdomen', 'pelvic area hurts', 'pain down there', 'lower pelvis pain', 'cramping in my pelvis', 'sharp pain below my belly button'],
  'child-illness':       ['my child is sick', 'my son is sick', 'my daughter is sick', 'baby is sick', 'my child is not well', 'my baby is not feeling well', 'my kid is sick', 'baby is unwell', 'toddler is sick', 'my baby has a fever', 'newborn is not feeding well', 'infant is crying nonstop'],
  'growth-concern':      ['not growing well', 'growth concern', 'developmental delay', 'my child is not growing properly', 'delayed development', 'not meeting milestones', 'small for his age', 'child is underweight', 'not gaining weight like other kids', 'short for his age'],
  lump:                  ['lump', 'growth that will not go away', "bump that won't go away", 'found a lump', 'noticed a growth', 'hard lump under skin', 'unusual growth on my body', 'painless lump', 'lump under my arm', 'growth that keeps growing'],
};

/** Levenshtein edit distance — small DP table, fine for single-word lengths. */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

/** Words too short/generic to safely fuzz on their own (e.g. "ear", "hip") —
 *  these must match exactly, or not at all, in the fuzzy layer below. */
function fuzzyWordMatch(userWord: string, phraseWord: string): boolean {
  if (userWord === phraseWord) return true;
  if (phraseWord.length < 4) return false;
  const maxDistance = phraseWord.length <= 5 ? 1 : phraseWord.length <= 9 ? 2 : 3;
  if (Math.abs(userWord.length - phraseWord.length) > maxDistance) return false;
  return levenshtein(userWord, phraseWord) <= maxDistance;
}

// Filler words stripped out when deciding a phrase's "content words" for the
// fuzzy layer — these carry no diagnostic signal on their own, and leaving
// them in would make phrases too easy to satisfy.
const FILLER_WORDS = new Set([
  'my', 'is', 'in', 'the', 'a', 'an', 'am', 'i', 'im', 'me', 'to', 'are', 'of',
  'on', 'at', 'for', 'and', 'be', 'it', 'feel', 'feels', 'feeling', 'have',
  'having', 'been', 'all', 'over', 'really', 'very', 'so', 'lot', 'bit',
  'this', 'that', 'these', 'those', 'with', 'from', 'some', 'like',
]);

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function contentWords(phrase: string): string[] {
  return tokenize(phrase).filter(w => !FILLER_WORDS.has(w));
}

/** Matches free text against known symptom phrasing and scores it through
 *  the same weighted map the symptom chips use. Returns [] when nothing
 *  recognisable was found — the caller should treat that as "try Gemini". */
export function matchFreeText(text: string): FacilityMatch[] {
  const normalised = ` ${text.toLowerCase().replace(/[’']/g, "'")} `;
  const matchedSlugs = new Set<string>();

  // Layer 1 — exact substring matching against SYNONYMS. Fast, precise,
  // and always tried first: an exact hit is always preferred over a fuzzy
  // one, so this layer's behaviour is unchanged from before.
  for (const [slug, phrases] of Object.entries(SYNONYMS)) {
    if (phrases.some(phrase => normalised.includes(phrase))) {
      matchedSlugs.add(slug);
    }
  }

  // Layer 2 — fuzzy fallback, only tried when layer 1 found nothing at all.
  // Catches typos, plurals, and reordered variants of phrases already in
  // SYNONYMS (e.g. "pains in my chest" for "chest pain") without needing an
  // ever-growing exact-phrase list. Deliberately conservative: only phrases
  // with 2+ meaningful content words are eligible, and ALL of those words
  // must be found (with small typo tolerance) somewhere in the user's text
  // — so a single short/generic word can never trigger a match by itself,
  // and this never degrades into a general keyword search.
  if (matchedSlugs.size === 0) {
    const userTokens = tokenize(text);
    for (const [slug, phrases] of Object.entries(SYNONYMS)) {
      const fuzzyHit = phrases.some(phrase => {
        const words = contentWords(phrase);
        if (words.length < 2) return false;
        return words.every(pw => userTokens.some(uw => fuzzyWordMatch(uw, pw)));
      });
      if (fuzzyHit) matchedSlugs.add(slug);
    }
  }

  return matchSymptoms(Array.from(matchedSlugs));
}

/** Human-readable reason for a locally-matched facility, mirroring the
 *  tone of Gemini's one-sentence reason but generated deterministically —
 *  routing only, same as the rest of this feature. */
export function reasonForMatch(match: FacilityMatch): string {
  if (match.generalFirst) {
    return `Based on what you described, it's safest to start with a ${match.label.toLowerCase()} first.`;
  }
  return `Based on what you described, we're pointing you to a ${match.label.toLowerCase()}.`;
}
