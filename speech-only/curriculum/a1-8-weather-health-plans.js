export const meta = {
  id: 'a1_life',
  a1Code: 'A1.8',
  label: 'A1.8 Weather, Health & Plans',
  active: true,
  subtitle: 'Unit 8/8 · Weather, dates, health, future plans, past, and connectors.',
  description: 'Weather, calendar, pharmacy/doctor, near future, past, and connectors.',
  grammarTitle: 'Unit 8 Grammar Notes',
  grammarRules: [
    'Weather uses HACER ("Hace calor/sol"); body states use TENER ("Tengo hambre/fiebre").',
    'Near future: voy / vas / va / vamos / van + a + infinitive ("Voy a estudiar").',
    'Past (yo): -é (-AR), -í (-ER/-IR), fui (went). Connectors: porque, pero, también.'
  ],
  stages: [
    {
      stageKey: 'a1_life_s1',
      shortTitle: 'Weather & Calendar',
      label: 'Stage 1/3: Weather & Calendar',
      desc: 'Weather, days, months, and dates.',
      hint: 'Pass Stage 1 to unlock Stage 2.',
      focusRule: '"Hace calor/sol", "Está lloviendo"; days and months are lowercase.'
    },
    {
      stageKey: 'a1_life_s2',
      shortTitle: 'Health & Emergencies',
      label: 'Stage 2/3: Health & Emergencies',
      desc: '"Me duele...", doctor/pharmacy needs, and emergencies.',
      hint: 'Pass Stage 2 to unlock Stage 3.',
      focusRule: '"Me duele + la/el [part]" for pain; "Tengo fiebre/hambre/sed".'
    },
    {
      stageKey: 'a1_life_s3',
      shortTitle: 'Future, Past & Connectors',
      label: 'Stage 3/3: Future, Past & Connectors',
      desc: '"Voy a...", "ayer fui/compré/comí", and connectors.',
      hint: 'Finish Stage 3 to complete the A1 Curriculum.',
      focusRule: 'Future = "voy a + verb"; Past yo = "fui, -é, -í"; connect with "porque" & "pero".'
    }
  ]
};

export const guide = {
  heading: 'A1.8 Weather, Health, Future & Past',
  vocab: [
    ['hace calor / sol', 'it is hot / sunny'],
    ['está lloviendo', 'it is raining'],
    ['me duele la cabeza', 'my head hurts'],
    ['tengo hambre / sed', 'I am hungry / thirsty'],
    ['voy a + infinitive', 'I am going to...'],
    ['ayer fui / compré', 'yesterday I went/bought'],
    ['comí / llegué', 'I ate / I arrived'],
    ['porque / pero', 'because / but']
  ],
  tips: [
    'Weather uses HACER ("Hace calor") or ESTAR ("Está nublado").',
    'Hunger, thirst, heat & fever use TENER ("Tengo hambre/fiebre").',
    'Pain uses DOLER + article ("Me duele la cabeza").',
    'Near future: voy/vas/va + a + infinitive ("Mañana voy a viajar").',
    'Past "yo" endings: -é for -AR (compré), -í for -ER/-IR (comí).',
    '"¿Por qué?" = Why?; "Porque" (one word) = Because.'
  ]
};

export const items = [
  // Stage 1: Weather in Panama, Seasons, Days & Calendar (CEFR A1 Time/Climate)
  { id: 'a1_tiempo', stage: 'a1_life_s1', es: '¿qué tiempo hace hoy?', altEs: ['qué tiempo hace hoy', 'cómo está el clima'], en: 'what is the weather like today?', altEn: ['hows the weather today', 'what is the weather like'], note: 'Weather expressions in Spanish use HACER ("Hace calor") or ESTAR ("Está nublado").' },
  {
    id: 'a1_calor',
    stage: 'a1_life_s1',
    es: 'hoy hace mucho calor',
    altEs: ['hace calor', 'hace mucho calor'],
    en: 'it is very hot today',
    altEn: ['it is hot today', 'its very hot'],
    note: 'Weather expressions in Panama use HACER ("hace mucho calor", "hace sol", "hace bochorno")!',
    structure: {
      banks: ['time_markers_present', 'weather_hacer'],
      patternEs: '[time] hace [weather]',
      patternEn: 'it is [weather] [time]',
      build: (tm, w) => ({
        es: `${tm.es} hace ${w.es}`,
        altEs: [`hace ${w.es} ${tm.es}`],
        en: w.en.includes('weather') ? `the weather is ${w.en.replace(' weather', '')} ${tm.en}` : `it is ${w.en} ${tm.en}`
      })
    }
  },
  { id: 'a1_buen_tiempo', stage: 'a1_life_s1', es: 'hace buen tiempo y hace sol', altEs: ['hace buen tiempo', 'hace sol'], en: 'the weather is nice and it is sunny', altEn: ['nice weather', 'it is sunny'], note: '"Hace sol" = it is sunny; "Hace viento" = it is windy; "Hace fresco" = it is cool/breezy.' },
  {
    id: 'a1_lloviendo',
    stage: 'a1_life_s1',
    es: 'está lloviendo muy fuerte',
    altEs: ['está lloviendo', 'llueve mucho'],
    en: 'it is raining very hard',
    altEn: ['it is raining', 'raining hard'],
    note: 'Use ESTAR for active rain, clouds, and sky conditions across tropical Panama.',
    structure: {
      banks: ['time_markers_present', 'weather_estar'],
      patternEs: '[time] está [weather condition]',
      patternEn: 'it is [weather condition] [time]',
      build: (tm, w) => ({
        es: `${tm.es} está ${w.es}`,
        altEs: [`está ${w.es} ${tm.es}`],
        en: `it is ${w.en} ${tm.en}`
      })
    }
  },
  { id: 'a1_nublado', stage: 'a1_life_s1', es: 'el cielo está nublado', altEs: ['está nublado'], en: 'the sky is cloudy', altEn: ['it is cloudy', 'cloudy'], note: '"Estar nublado" = to be cloudy.' },
  { id: 'a1_temporada', stage: 'a1_life_s1', es: 'la temporada seca y la temporada lluviosa', altEs: ['la temporada seca', 'la temporada lluviosa'], en: 'the dry season and the rainy season', altEn: ['dry season and rainy season'], note: 'Panama has two seasons: dry "verano" (Dec–Apr) and rainy "invierno" (May–Nov).' },
  {
    id: 'a1_dias_semana',
    stage: 'a1_life_s1',
    es: 'lunes, martes, miércoles, jueves y viernes',
    altEs: ['hoy es lunes'],
    en: 'Monday, Tuesday, Wednesday, Thursday and Friday',
    altEn: ['monday tuesday wednesday thursday and friday'],
    note: 'Days of the week are NOT capitalized in Spanish — say "el + day" to mean "on [day]"!',
    structure: {
      banks: ['days_of_week', 'infinitive_actions'],
      patternEs: '[day] voy a [infinitive action]',
      patternEn: '[day] I am going to [action]',
      build: (day, act) => ({
        es: `${day.es} voy a ${act.es}`,
        altEs: [`voy a ${act.es} ${day.es}`],
        en: `${day.en} I am going to ${act.en}`
      })
    }
  },
  { id: 'a1_sabado_domingo', stage: 'a1_life_s1', es: 'sábado y domingo', altEs: ['el sábado y el domingo'], en: 'Saturday and Sunday', altEn: ['saturday and sunday'], note: 'Notice the required written accents on miércoles, sábado, and inglés.' },
  { id: 'a1_hoy_manana', stage: 'a1_life_s1', es: 'ayer, hoy y mañana', altEs: ['hoy y mañana'], en: 'yesterday, today and tomorrow', altEn: ['yesterday today and tomorrow'], note: 'Core A1 time markers: ayer (yesterday), hoy (today), mañana (tomorrow).' },
  { id: 'a1_cumpleanos', stage: 'a1_life_s1', es: '¿cuándo es tu cumpleaños?', altEs: ['cuándo es tu cumpleaños', 'mi cumpleaños es en mayo'], en: 'when is your birthday?', altEn: ['when is your birthday'], note: '"¿Cuándo?" (with tilde) = When?; dates in Spanish use "el + number + de + month" (el cinco de mayo).' },
  {
    id: 'a1_meses',
    stage: 'a1_life_s1',
    es: 'en enero, febrero o marzo',
    altEs: ['enero y febrero'],
    en: 'in January, February or March',
    altEn: ['in january february or march'],
    note: 'Use "en + month" (lowercase in Spanish!) to say "in [month]".',
    structure: {
      bank: 'months_es',
      patternEs: 'mi cumpleaños es en [month]',
      patternEn: 'my birthday is in [month]',
      build: (m) => ({
        es: `mi cumpleaños es en ${m.es}`,
        altEs: [`en ${m.es}`],
        en: `my birthday is in ${m.en}`
      })
    }
  },
  { id: 'a1_fecha', stage: 'a1_life_s1', es: '¿qué fecha es hoy?', altEs: ['qué fecha es hoy', '¿cuál es la fecha de hoy?'], en: "what is today's date?", altEn: ['what is the date today', 'whats todays date'], note: 'For the 1st of a month, say "el primero"; for all other days use regular numbers ("el dos", "el quince").' },

  // Stage 2: Health, Body, Pharmacy & Emergencies (CEFR A1 Well-being)
  { id: 'a1_no_bien', stage: 'a1_life_s2', es: 'no me siento bien hoy', altEs: ['no me siento bien', 'me siento mal'], en: 'I do not feel well today', altEn: ['i dont feel well', 'i feel sick'], note: 'Reflexive verb "sentirse" (e -> ie) + adverb ("bien/mal") expresses how you feel physically.' },
  {
    id: 'a1_duele_cabeza',
    stage: 'a1_life_s2',
    es: 'me duele la cabeza',
    altEs: ['me duele mucho la cabeza'],
    en: 'my head hurts (I have a headache)',
    altEn: ['my head hurts', 'i have a headache'],
    note: 'DOLER uses "me duele" (singular) and "me duelen" (plural) + el/la/los/las (never "mi")!',
    structure: {
      bank: 'body_parts',
      patternEs: 'me duele(n) [body part]',
      patternEn: '[body part] hurts / hurt',
      build: (bp) => ({
        es: `me ${bp.num === 'p' ? 'duelen' : 'duele'} ${bp.es}`,
        altEs: [`me ${bp.num === 'p' ? 'duelen' : 'duele'} mucho ${bp.es}`],
        en: `${bp.en} ${bp.num === 'p' ? 'hurt' : 'hurts'}`
      })
    }
  },
  { id: 'a1_duele_estomago', stage: 'a1_life_s2', es: 'me duele el estómago y la garganta', altEs: ['me duele el estómago', 'me duele la garganta'], en: 'my stomach and throat hurt', altEn: ['my stomach hurts', 'stomach and throat hurt'], note: 'Singular "me duele" for one body part; plural "me duelen" for plural body parts ("me duelen los pies").' },
  {
    id: 'a1_fiebre',
    stage: 'a1_life_s2',
    es: 'tengo fiebre y tengo frío',
    altEs: ['tengo fiebre'],
    en: 'I have a fever and I am cold',
    altEn: ['i have a fever'],
    note: 'Important A1 TENER expressions: tener fiebre, frío, calor, hambre, sed, sueño, tos!',
    structure: {
      bank: 'tengo_symptoms',
      patternEs: 'tengo [symptom / state]',
      patternEn: 'I [have / am] [symptom / state]',
      build: (sym) => ({
        es: `tengo ${sym.es}`,
        altEs: [`yo tengo ${sym.es}`],
        en: `I ${sym.en}`
      })
    }
  },
  {
    id: 'a1_hambre_sed',
    stage: 'a1_life_s2',
    es: 'tengo hambre y tengo sed',
    altEs: ['tengo hambre', 'tengo sed'],
    en: 'I am hungry and I am thirsty',
    altEn: ['im hungry and thirsty', 'i am hungry and thirsty'],
    note: 'Never say "estoy hambre" — Spanish uses TENER ("hoy tengo hambre / sed / calor")!',
    structure: {
      banks: ['time_markers_present', 'tengo_symptoms'],
      patternEs: '[time] tengo [symptom / state]',
      patternEn: '[time] I [have / am] [symptom / state]',
      build: (tm, sym) => ({
        es: `${tm.es} tengo ${sym.es}`,
        altEs: [`tengo ${sym.es} ${tm.es}`],
        en: `${tm.en} I ${sym.en}`
      })
    }
  },
  { id: 'a1_gripe', stage: 'a1_life_s2', es: 'tengo gripe y mucha tos', altEs: ['tengo gripe', 'tengo resfriado'], en: 'I have the flu / a cold and a bad cough', altEn: ['i have the flu', 'i have a cold and cough'], note: '"La gripe" / "el resfriado" = flu/cold; "la tos" = cough.' },
  {
    id: 'a1_medico',
    stage: 'a1_life_s2',
    es: 'necesito ver a un médico',
    altEs: ['necesito un médico', 'necesito un doctor'],
    en: 'I need to see a doctor',
    altEn: ['i need a doctor', 'need to see a doctor'],
    note: 'Grammar rule: add the "personal a" ("ver a un médico") when the direct object is a person!',
    structure: {
      bank: 'medical_professionals',
      patternEs: 'necesito ver a [medical professional]',
      patternEn: 'I need to see [medical professional]',
      build: (mp) => ({
        es: `necesito ver a ${mp.es}`,
        altEs: [`yo necesito ver a ${mp.es}`, `necesito ${mp.es}`],
        en: `I need to see ${mp.en}`
      })
    }
  },
  {
    id: 'a1_farmacia',
    stage: 'a1_life_s2',
    es: '¿dónde está la farmacia más cercana?',
    altEs: ['dónde está la farmacia más cercana', 'una farmacia cerca'],
    en: 'where is the nearest pharmacy?',
    altEn: ['nearest pharmacy', 'where is the closest pharmacy'],
    note: '"Más cercano/a" = nearest / closest — matches gender of the place!',
    structure: {
      bank: 'places_town',
      patternEs: '¿dónde está [place] más cercano / cercana?',
      patternEn: 'where is the nearest [place]?',
      build: (p) => ({
        es: `¿dónde está ${p.es} más ${p.g === 'f' ? 'cercana' : 'cercano'}?`,
        altEs: [`dónde está ${p.es} más ${p.g === 'f' ? 'cercana' : 'cercano'}`],
        en: `where is the nearest ${p.en.replace(/^the\s+/i, '')}?`
      })
    }
  },
  {
    id: 'a1_pastilla',
    stage: 'a1_life_s2',
    es: '¿tiene algo para el dolor?',
    altEs: ['tiene algo para el dolor', 'una pastilla para el dolor'],
    en: 'do you have something for the pain?',
    altEn: ['something for pain', 'medicine for pain'],
    note: 'Ask pharmacists in Panama: "¿Tiene algo para [symptom]?"',
    structure: {
      bank: 'pharmacy_needs',
      patternEs: '¿tiene algo para [symptom]?',
      patternEn: 'do you have something for [symptom]?',
      build: (pn) => ({
        es: `¿tiene algo para ${pn.es}?`,
        altEs: [`tiene algo para ${pn.es}`],
        en: `do you have something for ${pn.en}?`
      })
    }
  },
  { id: 'a1_alergico', stage: 'a1_life_s2', es: 'soy alérgico a [Allergen]', altEs: [], en: 'I am allergic to [anything]', altEn: ['i am allergic to'], note: '"Soy alérgico/a a [anything]" is critical for medical and food safety.', slotTemplate: { prefixEs: ['soy alérgico a', 'soy alérgica a', 'soy alergico a', 'soy alergica a', 'yo soy alérgico a', 'yo soy alérgica a'], suffixEs: [], slotHintEs: 'Allergen', patternEs: 'soy alérgico a [Allergen]' } },
  { id: 'a1_emergencia', stage: 'a1_life_s2', es: 'es una emergencia, llame a una ambulancia', altEs: ['es una emergencia'], en: 'it is an emergency, call an ambulance', altEn: ['it is an emergency', 'call an ambulance'], note: 'In Panama, the general emergency phone number is 911.' },
  {
    id: 'a1_perdi',
    stage: 'a1_life_s2',
    es: 'perdí mi teléfono y mi cartera',
    altEs: ['perdí mi pasaporte', 'perdí mi teléfono'],
    en: 'I lost my phone and my wallet',
    altEn: ['i lost my phone', 'lost my wallet'],
    note: '"Perdí" = I lost (past tense of perder) + any item!',
    structure: {
      bank: 'lost_items',
      patternEs: 'perdí [item]',
      patternEn: 'I lost [item]',
      build: (li) => ({
        es: `perdí ${li.es}`,
        altEs: [`yo perdí ${li.es}`],
        en: `I lost ${li.en}`
      })
    }
  },

  // Stage 3: Near Future Plans, Core Past Tense & A1 Connectors (Certificate Mastery)
  {
    id: 'a1_voy_estudiar',
    stage: 'a1_life_s3',
    es: 'mañana voy a estudiar español',
    altEs: ['voy a estudiar'],
    en: 'tomorrow I am going to study Spanish',
    altEn: ['tomorrow i am going to study', 'i am going to study spanish'],
    note: 'Near-future formula required for A1: [time] + voy a + [infinitive verb]!',
    structure: {
      banks: ['time_markers_future', 'infinitive_actions'],
      patternEs: '[time] voy a [infinitive action]',
      patternEn: '[time] I am going to [action]',
      build: (tm, act) => ({
        es: `${tm.es} voy a ${act.es}`,
        altEs: [`voy a ${act.es} ${tm.es}`, `${tm.es} yo voy a ${act.es}`],
        en: `${tm.en} I am going to ${act.en}`
      })
    }
  },
  {
    id: 'a1_vamos_playa',
    stage: 'a1_life_s3',
    es: 'este fin de semana vamos a ir a la playa',
    altEs: ['vamos a la playa'],
    en: 'this weekend we are going to go to the beach',
    altEn: ['we are going to the beach', 'going to the beach this weekend'],
    note: 'Plural near-future: [time] + vamos a + [infinitive verb]!',
    structure: {
      banks: ['time_markers_future', 'infinitive_actions'],
      patternEs: '[time] vamos a [infinitive action]',
      patternEn: '[time] we are going to [action]',
      build: (tm, act) => ({
        es: `${tm.es} vamos a ${act.es}`,
        altEs: [`vamos a ${act.es} ${tm.es}`],
        en: `${tm.en} we are going to ${act.en}`
      })
    }
  },
  { id: 'a1_visitar_canal', stage: 'a1_life_s3', es: 'voy a visitar [Place]', altEs: [], en: 'I am going to visit [any place]', altEn: ['going to visit'], note: 'Use "voy a visitar" + any destination or landmark.', slotTemplate: { prefixEs: ['voy a visitar', 'yo voy a visitar', 'quiero visitar'], suffixEs: [], slotHintEs: 'Place', patternEs: 'voy a visitar [Place]' } },
  { id: 'a1_que_vas_hacer', stage: 'a1_life_s3', es: '¿qué vas a hacer esta noche?', altEs: ['qué vas a hacer esta noche', '¿qué vas a hacer hoy?', 'qué vas a hacer'], en: 'what are you going to do tonight?', altEn: ['what are you going to do', 'what are you doing tonight'], note: '"Esta noche" = tonight; "¿Qué vas a hacer?" = What are you going to do?' },
  {
    id: 'a1_ayer_fui',
    stage: 'a1_life_s3',
    es: 'ayer fui al centro con mis amigos',
    altEs: ['ayer fui al centro', 'yo fui'],
    en: 'yesterday I went downtown with my friends',
    altEn: ['yesterday i went downtown', 'i went downtown'],
    note: 'Past "yo" (preterite): fui (went), -é for -AR (compré, hablé), -í for -ER/-IR (comí, salí)!',
    structure: {
      bank: 'past_yo_actions',
      patternEs: 'ayer [past yo action]',
      patternEn: 'yesterday I [past action]',
      build: (pa) => ({
        es: `ayer ${pa.es}`,
        altEs: [`ayer yo ${pa.es}`, pa.es],
        en: `yesterday I ${pa.en}`
      })
    }
  },
  { id: 'a1_compre_pague', stage: 'a1_life_s3', es: 'compré un regalo y pagué en efectivo', altEs: ['compré un regalo', 'pagué'], en: 'I bought a gift and paid in cash', altEn: ['i bought a gift', 'bought a gift and paid in cash'], note: 'Regular -AR past "yo" ends in -é: compré (I bought), hablé (I spoke), trabajé (I worked).' },
  { id: 'a1_comi_tome', stage: 'a1_life_s3', es: 'comí pescado y tomé una chicha', altEs: ['comí y tomé'], en: 'I ate fish and drank a fruit juice', altEn: ['i ate fish', 'ate fish and drank juice'], note: 'Regular -ER/-IR past "yo" ends in -í: comí (I ate), bebí (I drank), salí (I left).' },
  { id: 'a1_llegue', stage: 'a1_life_s3', es: 'llegué a [Place + time ago]', altEs: [], en: 'I arrived in [place] [time] ago', altEn: ['i arrived in'], note: '"Llegué a [place] hace [time]" = I arrived in [place] [time] ago!', slotTemplate: { prefixEs: ['llegué a', 'llegue a', 'yo llegué a'], suffixEs: [], midEs: ['hace'], slotHintEs: 'Place + time ago', patternEs: 'llegué a [Place] hace [Time]' } },
  { id: 'a1_pase_bien', stage: 'a1_life_s3', es: 'la pasé muy bien en [Place]', altEs: [], en: 'I had a very good time in [any place]', altEn: ['i had a very good time in'], note: 'Idiomatic phrase: "la pasé muy bien en [any place]" = I had a great time in...', slotTemplate: { prefixEs: ['la pasé muy bien en', 'la pase muy bien en', 'la pasé bien en', 'la pase bien en'], suffixEs: [], slotHintEs: 'Place', patternEs: 'la pasé muy bien en [Place]' } },
  { id: 'a1_porque_pero', stage: 'a1_life_s3', es: 'estudio español porque [Your reason]', altEs: [], en: 'I study Spanish because [any reason]', altEn: ['i study spanish because'], note: '"Porque" (one word, no tilde) = Because — give any reason you study Spanish!', slotTemplate: { prefixEs: ['estudio español porque', 'yo estudio español porque', 'estudio espanol porque'], suffixEs: [], slotHintEs: 'Your reason', patternEs: 'estudio español porque [Your reason]' } },
  { id: 'a1_pero_tambien', stage: 'a1_life_s3', es: 'hablo despacio pero entiendo todo', altEs: ['pero entiendo', 'también'], en: 'I speak slowly but I understand everything', altEn: ['i speak slowly but i understand everything'], note: 'Core A1 connectors for exams: y (and), o (or), pero (but), porque (because), también (also).' },
  { id: 'a1_listo_examen', stage: 'a1_life_s3', es: 'primero estudio y después practico', altEs: ['estoy listo para el examen A1'], en: 'first I study and afterward I practice', altEn: ['first i study and then i practice'], note: 'Sequence connectors: primero (first), luego / después (then / afterward), finalmente (finally).' }
];

export default {
  id: 'a1_life',
  meta,
  guide,
  items
};
