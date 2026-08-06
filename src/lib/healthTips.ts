/* ================================================================
   src/lib/healthTips.ts
   Static bank of health tips shown on the dashboard's health tip
   card. Replaces the Gemini-generated advisory (health-advisory
   route) - this pool covers general, broadly applicable health
   guidance plus Ghana-specific context, reviewed once instead of
   generated per request. No network call, no cost, no quota.

   Rotation (see dashboard/page.tsx): a new tip is picked whenever a
   login/session starts, and again after a tip has been showing for
   longer than TIP_ROTATE_MS even within the same session, so an
   always-open tab still sees the tip change periodically.

   Repeat avoidance: dashboard/page.tsx keeps a history of tip ids
   already shown and passes it to pickHealthTip, which always draws
   from the tips not yet seen. Once every tip in the pool has been
   shown once, the history resets and a fresh cycle begins, so a tip
   can never repeat until the whole list has had its turn.

   Expand this list over time rather than making selection cleverer;
   a bigger honest pool beats fancier targeting logic here.
   ================================================================ */

export interface HealthTip {
  id:   string;
  text: string;
  tag:  'ghana' | 'global';
}

export const HEALTH_TIPS: HealthTip[] = [
  { id: '01',  tag: 'ghana',  text: 'Sleep under a treated mosquito net every night since malaria remains the leading cause of clinic visits in Ghana.' },
  { id: '02',  tag: 'ghana',  text: 'Drink only boiled or treated water during the rainy season to lower your risk of cholera and typhoid.' },
  { id: '03',  tag: 'global', text: 'Wash your hands with soap before eating and after using the toilet, since it is still the cheapest way to avoid infection.' },
  { id: '04',  tag: 'ghana',  text: 'Any fever lasting more than 24 hours should be checked at a clinic, especially during malaria season.' },
  { id: '05',  tag: 'ghana',  text: 'Keep your NHIS card active, since renewing before it expires means one less thing to worry about in an emergency.' },
  { id: '06',  tag: 'ghana',  text: 'Store drinking water in clean, covered containers to keep mosquito breeding sites away from your home.' },
  { id: '07',  tag: 'global', text: 'Children under five should complete their full vaccination schedule, and you can ask your nearest clinic if you are unsure what is due.' },
  { id: '08',  tag: 'ghana',  text: 'During harmattan, drink extra water and use a lip balm or petroleum jelly, since dry air raises the risk of cracked skin and nosebleeds.' },
  { id: '09',  tag: 'ghana',  text: 'A stiff neck with fever and severe headache needs urgent attention, since these can be early signs of meningitis.' },
  { id: '10',  tag: 'global', text: 'Pregnant women should attend all scheduled antenatal visits, even when feeling well, because most complications are caught early rather than late.' },
  { id: '11',  tag: 'global', text: 'Aim for at least seven to eight hours of sleep a night, since consistent sleep supports memory, mood, and immune health.' },
  { id: '12',  tag: 'global', text: 'Try to get 30 minutes of movement most days, since a brisk walk counts just as much as a gym session.' },
  { id: '13',  tag: 'global', text: 'Eat a variety of colorful fruits and vegetables daily, since different colors usually mean different nutrients your body needs.' },
  { id: '14',  tag: 'global', text: 'Cut back on added salt where you can, since most people eat far more than the body actually needs.' },
  { id: '15',  tag: 'global', text: 'Limit sugary drinks and snacks, since small daily changes add up to a big difference over months.' },
  { id: '16',  tag: 'global', text: 'Take short breaks from screens every hour to rest your eyes and stretch your neck and shoulders.' },
  { id: '17',  tag: 'global', text: 'Talk to someone you trust when you are struggling emotionally, because mental health matters as much as physical health.' },
  { id: '18',  tag: 'global', text: 'Regular handwashing with soap for at least 20 seconds is one of the most effective ways to prevent illness.' },
  { id: '19',  tag: 'global', text: 'Brush your teeth twice a day and see a dentist at least once a year, even without pain.' },
  { id: '20',  tag: 'global', text: 'Get your blood pressure checked regularly, since high blood pressure often has no symptoms until it becomes serious.' },
  { id: '21',  tag: 'global', text: 'If you smoke, quitting is one of the single best things you can do for your health in the long run.' },
  { id: '22',  tag: 'global', text: 'Limit alcohol intake, since moderation protects your liver, heart, and sleep quality over time.' },
  { id: '23',  tag: 'ghana',  text: 'Wear a seatbelt or helmet every time you travel, since road injuries are preventable and not just bad luck.' },
  { id: '24',  tag: 'global', text: 'Wash fruits and vegetables thoroughly before eating, especially if eaten raw.' },
  { id: '25',  tag: 'global', text: 'Cook meat, fish, and eggs thoroughly to reduce the risk of foodborne illness.' },
  { id: '26',  tag: 'global', text: 'Keep a small first aid kit at home, since plasters, antiseptic, and paracetamol cover most everyday minor injuries.' },
  { id: '27',  tag: 'global', text: 'Never take antibiotics without a prescription, since misuse contributes to resistance that makes future infections harder to treat.' },
  { id: '28',  tag: 'global', text: 'If you have diabetes or hypertension, take your medication consistently, even on days you feel fine.' },
  { id: '29',  tag: 'global', text: 'Apply sunscreen or cover up during peak sun hours to protect your skin over the long term.' },
  { id: '30',  tag: 'ghana',  text: 'Practice safe food storage by refrigerating leftovers promptly and avoiding food left out too long in the heat.' },
  { id: '31',  tag: 'ghana',  text: 'Get tested for HIV at least once, since knowing your status is the first step to staying healthy either way.' },
  { id: '32',  tag: 'global', text: 'Breastfeeding exclusively for the first six months gives infants the strongest possible start, where possible.' },
  { id: '33',  tag: 'ghana',  text: 'Use mosquito repellent on exposed skin in the evenings, especially during peak transmission months.' },
  { id: '34',  tag: 'global', text: 'A persistent cough lasting more than two weeks should be checked, especially if it is paired with weight loss.' },
  { id: '35',  tag: 'global', text: 'Keep your living space well ventilated, since poor airflow raises the risk of respiratory illness spreading indoors.' },
  { id: '36',  tag: 'global', text: 'Schedule an eye test every couple of years, even if your vision feels fine, since many issues develop gradually.' },
  { id: '37',  tag: 'global', text: 'Wash bedsheets and clothing regularly in hot water to reduce skin infections and allergens.' },
  { id: '38',  tag: 'global', text: 'If a wound will not stop bleeding or looks infected, seek care the same day instead of waiting.' },
  { id: '39',  tag: 'global', text: 'Practice good posture when sitting for long periods, since it protects your back and neck over years, not days.' },
  { id: '40',  tag: 'global', text: "Know your family's health history, since some conditions are more likely to affect you if they run in the family." },
  { id: '41',  tag: 'global', text: 'Limit sitting for long stretches by standing up and moving around every hour if you work at a desk.' },
  { id: '42',  tag: 'global', text: "If you're trying to conceive or are newly pregnant, start folic acid early, since it supports healthy early development." },
  { id: '43',  tag: 'global', text: 'Check your skin occasionally for new moles or changes to existing ones, and mention anything unusual to a doctor.' },
  { id: '44',  tag: 'ghana',  text: 'Keep emergency numbers saved in your phone, including the nearest hospital and a trusted contact.' },
  { id: '45',  tag: 'ghana',  text: 'During flooding or heavy rains, avoid wading through standing water where possible, since it often carries disease risk.' },
  { id: '46',  tag: 'global', text: "Older adults should get a flu vaccine annually where available, since it's especially protective for those over 65." },
  { id: '47',  tag: 'global', text: 'Avoid sharing personal items like razors or toothbrushes, since some infections spread through simple contact like this.' },
  { id: '48',  tag: 'global', text: 'If a headache is sudden, extremely severe, or comes with vision changes, treat it as urgent, not routine.' },
  { id: '49',  tag: 'global', text: "Keep growing children's height and weight checked regularly at clinic visits, since early tracking catches issues sooner." },
  { id: '50',  tag: 'global', text: 'A short daily walk after meals can help with digestion and blood sugar control over time.' },
  { id: '51',  tag: 'ghana',  text: 'Use a gas or charcoal generator only in a well ventilated outdoor space, since running one indoors during a power outage can cause deadly carbon monoxide poisoning.' },
  { id: '52',  tag: 'global', text: 'If you are bitten by a dog or other animal, wash the wound thoroughly with soap and water and seek medical care promptly, since rabies can be prevented with timely vaccination.' },
  { id: '53',  tag: 'ghana',  text: 'Ask your health facility about your sickle cell genotype, since knowing it early helps with family planning and long term care decisions.' },
  { id: '54',  tag: 'global', text: 'Learn to recognize the signs of a stroke, such as sudden facial drooping, arm weakness, or slurred speech, and seek emergency care immediately if they appear.' },
  { id: '55',  tag: 'global', text: 'Chest pain, pressure, or shortness of breath should never be ignored, since these can be warning signs of a heart attack.' },
  { id: '56',  tag: 'ghana',  text: 'Get a malaria test before starting malaria treatment, since fever can have many causes and testing helps you get the right care.' },
  { id: '57',  tag: 'ghana',  text: 'Be cautious with skin lightening products, since many contain mercury or high dose steroids that can cause lasting damage to your skin, kidneys, and nerves.' },
  { id: '58',  tag: 'global', text: 'Keep all medicines, including paracetamol and vitamins, out of the reach of children to prevent accidental poisoning.' },
  { id: '59',  tag: 'global', text: 'Wear footwear when walking on soil or near standing water in areas with poor sanitation, since this lowers your risk of parasitic worm infections.' },
  { id: '60',  tag: 'ghana',  text: 'If your work involves mining, quarrying, or heavy machinery, wear the recommended protective gear such as a helmet, boots, and a dust mask every shift.' },
  { id: '61',  tag: 'ghana',  text: 'Long term exposure to silica dust from mining or quarry work raises the risk of lung disease, so use proper ventilation and dust masks whenever possible.' },
  { id: '62',  tag: 'global', text: 'Wear ear protection around loud machinery or equipment, since repeated noise exposure can cause permanent hearing loss over time.' },
  { id: '63',  tag: 'global', text: 'Get your cholesterol checked periodically, especially past age 40, since high cholesterol often has no obvious symptoms.' },
  { id: '64',  tag: 'ghana',  text: "Attend your child's welfare clinic visits and keep the vaccination card up to date, since it tracks growth and protects against preventable disease." },
  { id: '65',  tag: 'global', text: 'Floss daily in addition to brushing, since it removes the plaque between teeth that a toothbrush alone cannot reach.' },
  { id: '66',  tag: 'global', text: 'If a burn is large, deep, or on the face or hands, seek medical care rather than treating it at home.' },
  { id: '67',  tag: 'ghana',  text: 'Handle hot cooking oil and open flames carefully in the kitchen, since burns are one of the most common preventable household injuries.' },
  { id: '68',  tag: 'global', text: 'Update your tetanus vaccination after a deep or dirty wound, particularly one caused by rusty metal or soil contact.' },
  { id: '69',  tag: 'global', text: 'Encourage children to play actively outdoors rather than spending all their free time on screens.' },
  { id: '70',  tag: 'global', text: "Protect children's skin and eyes from strong sun with hats, shade, and appropriate clothing, since their skin is more sensitive than an adult's." },
  { id: '71',  tag: 'global', text: 'Women should attend recommended cervical cancer screenings, since early detection greatly improves treatment outcomes.' },
  { id: '72',  tag: 'global', text: 'Men should discuss prostate health with a doctor as they get older, particularly if there is a family history of prostate cancer.' },
  { id: '73',  tag: 'global', text: 'Perform occasional breast self checks and report any new lump or change to a doctor promptly.' },
  { id: '74',  tag: 'ghana',  text: 'Attend your six week postnatal checkup after delivery, since it catches complications in both mother and baby early.' },
  { id: '75',  tag: 'global', text: "Keep a newborn's umbilical cord stump clean and dry until it falls off naturally, and seek care if it looks red, swollen, or smells unusual." },
  { id: '76',  tag: 'global', text: 'Falls are a leading cause of injury in older adults, so keep floors clutter free and install handrails on stairs where possible.' },
  { id: '77',  tag: 'global', text: 'If you feel persistently anxious, low, or overwhelmed for more than two weeks, consider speaking with a health professional rather than waiting it out.' },
  { id: '78',  tag: 'global', text: 'Learn basic first aid, including how to help someone who is choking, so you can act quickly in an emergency.' },
  { id: '79',  tag: 'ghana',  text: 'Buy food from vendors who handle it hygienically, keep it covered, and store perishable items appropriately to reduce your risk of foodborne illness.' },
  { id: '80',  tag: 'global', text: 'Avoid overusing painkillers for chronic aches, since regular use without medical guidance can affect your liver, kidneys, or stomach over time.' },
  { id: '81',  tag: 'ghana',  text: 'If you travel to a country where yellow fever is present, check whether you need a yellow fever vaccination certificate before you go.' },
  { id: '82',  tag: 'global', text: 'People with a family history of diabetes should get their blood sugar checked periodically, even without symptoms.' },
  { id: '83',  tag: 'global', text: 'Watch for unusual thirst, frequent urination, or unexplained weight loss, since these can be early signs of diabetes worth discussing with a doctor.' },
  { id: '84',  tag: 'global', text: 'Deworm children periodically as recommended by a health worker, since intestinal worms are common where sanitation is limited and can affect growth.' },
  { id: '85',  tag: 'ghana',  text: 'Avoid burning waste, including electronic waste, in residential areas, since the smoke can expose you and your neighbors to toxic metals and fumes.' },
  { id: '86',  tag: 'global', text: 'Store household chemicals and cleaning products separately from food and clearly labeled to avoid accidental poisoning.' },
  { id: '87',  tag: 'ghana',  text: 'If you work night shifts, try to rest adequately between shifts, since fatigue increases the risk of accidents and long term health problems.' },
  { id: '88',  tag: 'global', text: 'Take short walking breaks during long journeys or flights to reduce the risk of blood clots in the legs.' },
  { id: '89',  tag: 'global', text: 'Keep your living and working spaces free of standing water and clutter, since these attract mosquitoes and other disease carrying pests.' },
  { id: '90',  tag: 'ghana',  text: 'Report suspected outbreaks of illness in your community to the nearest health facility promptly, since early reporting helps contain the spread.' },
  { id: '91',  tag: 'global', text: 'If you use earphones or other listening devices, keep the volume moderate and take listening breaks to protect your hearing.' },
  { id: '92',  tag: 'global', text: 'People with asthma or other chronic respiratory conditions should keep their prescribed medication accessible at all times, not just during a flare up.' },
  { id: '93',  tag: 'global', text: 'Discuss your vaccination history with a doctor when you are unsure which boosters, such as tetanus or hepatitis B, you might be due for.' },
  { id: '94',  tag: 'ghana',  text: 'Boil or properly treat water before giving it to infants for drinking or formula preparation, since their immune systems are more vulnerable.' },
  { id: '95',  tag: 'global', text: 'If you are caring for someone with a chronic illness, remember to look after your own health and rest too, since caregiver burnout is real.' },
  { id: '96',  tag: 'global', text: 'Keep a basic record of your own blood pressure, blood sugar, and weight readings over time, since trends matter more than any single reading.' },
  { id: '97',  tag: 'ghana',  text: 'During the dry season, be cautious with bush burning, since smoke inhalation can worsen asthma and other respiratory conditions.' },
  { id: '98',  tag: 'global', text: 'Avoid smoking or vaping around children, since secondhand smoke and vapor can affect their developing lungs.' },
  { id: '99',  tag: 'global', text: 'Practice safe lifting techniques, bending at the knees rather than the back, to avoid injuring your spine.' },
  { id: '100', tag: 'ghana',  text: 'If a child has diarrhea, give oral rehydration solution and continue feeding, and seek care quickly if there is blood in the stool or signs of dehydration.' },
];

/** Picks a tip that has not appeared in `recentIds` yet, if any remain
 *  unseen. Once every tip in the pool has been shown, starts a fresh
 *  cycle while still avoiding an immediate repeat of the most recent
 *  tip. Callers are expected to persist `recentIds` (see dashboard/
 *  page.tsx) so a tip never repeats until the whole pool has had a
 *  turn. */
export function pickHealthTip(recentIds: string[] = []): HealthTip {
  const unseen = HEALTH_TIPS.filter(t => !recentIds.includes(t.id));
  if (unseen.length > 0) {
    return unseen[Math.floor(Math.random() * unseen.length)];
  }
  const lastId = recentIds[recentIds.length - 1];
  const pool = lastId ? HEALTH_TIPS.filter(t => t.id !== lastId) : HEALTH_TIPS;
  return pool[Math.floor(Math.random() * pool.length)];
}