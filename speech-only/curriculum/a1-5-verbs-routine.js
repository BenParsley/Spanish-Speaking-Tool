export const meta = {
  id: 'verbs',
  a1Code: 'A1.5',
  label: 'A1.5 Verbs & Routine',
  active: true,
  subtitle: 'Unit 5/8 · Present tense verbs, daily routines, and GUSTAR.',
  description: 'Regular -AR/-ER/-IR verbs, core irregulars, reflexives, and GUSTAR.',
  grammarTitle: 'Unit 5 Grammar Notes',
  grammarRules: [
    'Regular present "yo" ends in -o (hablo, como, vivo); tú: -as/-es; usted/él/ella: -a/-e.',
    'Reflexive routines place me/te/se before the verb ("Me levanto").',
    '"Me gusta" + singular noun/verb vs. "Me gustan" + plural noun. "Tener que + verb" = have to.'
  ],
  stages: [
    {
      stageKey: 'verbs_s1',
      shortTitle: 'Present Action Verbs',
      label: 'Stage 1/3: Present Action Verbs',
      desc: '-AR/-ER/-IR verbs and voy, tengo, quiero, puedo, hago.',
      hint: 'Pass Stage 1 to unlock Stage 2.',
      focusRule: 'Present yo = -o; keep a second verb in the infinitive ("quiero aprender").'
    },
    {
      stageKey: 'verbs_s2',
      shortTitle: 'Daily Routine & Frequency',
      label: 'Stage 2/3: Daily Routine & Frequency',
      desc: 'Daily schedule, reflexives, and siempre/nunca.',
      hint: 'Pass Stage 2 to unlock Stage 3.',
      focusRule: 'Place "me" before routine verbs (me levanto, me baño, me acuesto).'
    },
    {
      stageKey: 'verbs_s3',
      shortTitle: 'Gustar, Needs & Requests',
      label: 'Stage 3/3: Gustar, Needs & Requests',
      desc: 'Likes ("me gusta/n"), needs ("tengo que"), and requests.',
      hint: 'Finish Stage 3 to unlock Unit 6.',
      focusRule: '"Me gusta" (singular/verb) vs. "Me gustan" (plural).'
    }
  ]
};

export const guide = {
  heading: 'A1.5 Present Verbs, Routine & Gustar',
  vocab: [
    ['hablo / hablas / habla', 'speak (-AR)'],
    ['como / comes / come', 'eat (-ER)'],
    ['vivo / vives / vive', 'live (-IR)'],
    ['voy / tengo / quiero', 'I go / have / want'],
    ['puedo / hago / salgo', 'I can / do / leave'],
    ['me levanto / me baño', 'I get up / shower'],
    ['me gusta / gustan', 'I like (sing. / pl.)'],
    ['tengo que + inf.', 'I have to...']
  ],
  tips: [
    'Regular "yo" present tense almost always ends in -o!',
    'Two verbs in a row: conjugate the 1st, keep the 2nd infinitive ("quiero ir").',
    'Reflexive routines place me/te/se before the verb ("me levanto").',
    '"Me gusta" + singular/infinitive; "Me gustan" + plural noun.',
    '"Tengo que + infinitive" expresses obligation ("tengo que ir").',
    '"Saber" (sé) = know facts; "Conocer" (conozco) = know places/people.'
  ]
};

export const items = [
  // Stage 1: Present Tense Regular (-AR, -ER, -IR) & Core Irregulars
  {
    id: 'v_hablo',
    stage: 'verbs_s1',
    es: 'yo hablo español',
    altEs: ['hablo español'],
    en: 'I speak Spanish',
    altEn: ['i speak spanish'],
    note: 'Regular -AR/-ER/-IR verbs change ending by subject (-o, -as/-es, -a/-e, -amos/-emos/-imos).',
    structure: {
      bank: 'present_verb_scenarios',
      patternEs: '[subject] + [present verb] + [object]',
      patternEn: '[subject] + [present verb]',
      build: (v) => ({
        es: v.es,
        altEs: v.altEs || [],
        en: v.en
      })
    }
  },
  { id: 'v_estudias', stage: 'verbs_s1', es: 'tú estudias mucho', altEs: ['estudias mucho'], en: 'you study a lot', altEn: ['you study a lot'], note: 'From estudiar (-ar): yo estudio, tú estudias, usted estudia.' },
  { id: 'v_trabaja', stage: 'verbs_s1', es: 'ella trabaja aquí', altEs: ['trabaja aquí', 'él trabaja aquí'], en: 'she works here', altEn: ['she works here', 'he works here'], note: 'Third-person singular (-a) works for él, ella, and usted.' },
  { id: 'v_comemos', stage: 'verbs_s1', es: 'nosotros comemos juntos', altEs: ['comemos juntos'], en: 'we eat together', altEn: ['we eat together'], note: 'Regular -ER verbs (comer) use -o, -es, -e, -emos, -en.' },
  { id: 'v_tomo_agua', stage: 'verbs_s1', es: 'tomo mucha agua', altEs: ['yo tomo agua', 'bebo agua'], en: 'I drink a lot of water', altEn: ['i drink water', 'i drink a lot of water'], note: 'In Panama, "tomar" is much more common than "beber" for drinking liquids.' },
  { id: 'v_viven', stage: 'verbs_s1', es: 'ellos viven en [City / Country]', altEs: [], en: 'they live in [any place / country]', altEn: ['they live in'], note: 'Regular -IR verbs (vivir): say "viven en" + any place or country.', slotTemplate: { prefixEs: ['ellos viven en', 'ellas viven en', 'viven en'], suffixEs: [], slotHintEs: 'City / Country', patternEs: 'ellos viven en [City / Country]' } },
  {
    id: 'v_voy',
    stage: 'verbs_s1',
    es: 'yo voy ahora',
    altEs: ['voy ahora', 'voy'],
    en: 'I am going now',
    altEn: ['i go now', 'i am going', 'im going now'],
    note: 'Irregular verb IR (to go): voy a + place (remember "a + el → al"!).',
    structure: {
      bank: 'places_town',
      patternEs: 'voy a [place]',
      patternEn: 'I am going to [place]',
      build: (p) => ({
        es: `voy a ${p.es}`,
        altEs: [`yo voy a ${p.es}`],
        en: `I am going to ${p.en}`
      })
    }
  },
  {
    id: 'v_tengo',
    stage: 'verbs_s1',
    es: 'tengo tiempo hoy',
    altEs: ['yo tengo tiempo', 'tengo'],
    en: 'I have time today',
    altEn: ['i have time', 'i have time today'],
    note: 'TENER (to have): tengo, tienes, tiene, tenemos, tienen.',
    structure: {
      bank: 'home_essentials',
      patternEs: 'tengo [essential] hoy',
      patternEn: 'I have [essential] today',
      build: (item) => ({
        es: `tengo ${item.es} hoy`,
        altEs: [`yo tengo ${item.es} hoy`, `tengo ${item.es}`],
        en: `I have ${item.en} today`
      })
    }
  },
  {
    id: 'v_quiero',
    stage: 'verbs_s1',
    es: 'quiero aprender español',
    altEs: ['yo quiero aprender'],
    en: 'I want to learn Spanish',
    altEn: ['i want to learn spanish', 'want to learn spanish'],
    note: 'QUERER (e -> ie) + infinitive verb = "I want to [action]".',
    structure: {
      bank: 'infinitive_actions',
      patternEs: 'quiero [infinitive action]',
      patternEn: 'I want to [action]',
      build: (act) => ({
        es: `quiero ${act.es}`,
        altEs: [`yo quiero ${act.es}`],
        en: `I want to ${act.en}`
      })
    }
  },
  {
    id: 'v_puedo',
    stage: 'verbs_s1',
    es: '¿puedo pagar con tarjeta?',
    altEs: ['puedo pagar con tarjeta', 'yo puedo'],
    en: 'can I pay by card?',
    altEn: ['i can pay with card', 'can i pay with card'],
    note: 'PODER (o -> ue) + infinitive = "can I [action]?"',
    structure: {
      bank: 'infinitive_actions',
      patternEs: '¿puedo [infinitive action]?',
      patternEn: 'can I [action]?',
      build: (act) => ({
        es: `¿puedo ${act.es}?`,
        altEs: [`puedo ${act.es}`],
        en: `can I ${act.en}?`
      })
    }
  },
  { id: 'v_hago', stage: 'verbs_s1', es: 'hago ejercicio por la mañana', altEs: ['yo hago ejercicio'], en: 'I exercise in the morning', altEn: ['i do exercise in the morning', 'i exercise'], note: 'HACER (to do/make) has irregular yo form "hago" (tú haces, él hace).' },
  {
    id: 'v_necesito',
    stage: 'verbs_s1',
    es: 'necesito practicar más',
    altEs: ['yo necesito practicar'],
    en: 'I need to practice more',
    altEn: ['i need to practice more', 'need to practice'],
    note: 'Necesitar + infinitive = "I need to [do something]".',
    structure: {
      bank: 'infinitive_actions',
      patternEs: 'necesito [infinitive action]',
      patternEn: 'I need to [action]',
      build: (act) => ({
        es: `necesito ${act.es}`,
        altEs: [`yo necesito ${act.es}`],
        en: `I need to ${act.en}`
      })
    }
  },

  // Stage 2: Daily Routine (Reflexive Verbs) & Frequency Adverbs
  { id: 'v_despierto', stage: 'verbs_s2', es: 'me despierto temprano', altEs: ['yo me despierto temprano'], en: 'I wake up early', altEn: ['i wake up early', 'wake up early'], note: 'Reflexive daily routine verbs use me (I), te (you), se (he/she/usted) before the verb!' },
  { id: 'v_levanto', stage: 'verbs_s2', es: 'me levanto [Time]', altEs: [], en: 'I get up at [any time]', altEn: ['i get up at'], note: '"Levantarse" = to get out of bed; use "a la(s) + any hour" for "at [time]".', slotTemplate: { prefixEs: ['me levanto a las', 'me levanto a la', 'yo me levanto a las', 'yo me levanto a la'], suffixEs: [], slotHintEs: 'Time', patternEs: 'me levanto [Time]' } },
  { id: 'v_bano', stage: 'verbs_s2', es: 'me baño todos los días', altEs: ['me ducho todos los días'], en: 'I shower / bathe every day', altEn: ['i shower every day', 'i take a shower every day'], note: 'In Panama, "bañarse" ("me baño") means taking a shower!' },
  { id: 'v_desayuno', stage: 'verbs_s2', es: 'desayuno [Breakfast food]', altEs: [], en: 'I eat [any food] for breakfast', altEn: ['i eat breakfast'], note: '"Desayunar" means "to have for breakfast" — name any food or drink!', slotTemplate: { prefixEs: ['desayuno', 'yo desayuno'], suffixEs: [], slotHintEs: 'Breakfast food', patternEs: 'desayuno [Breakfast food]' } },
  { id: 'v_salgo', stage: 'verbs_s2', es: 'salgo de la casa [Time]', altEs: [], en: 'I leave the house at [any time]', altEn: ['i leave home at', 'i leave the house at'], note: 'SALIR (to leave): say "salgo de (la) casa a la(s) [any time]".', slotTemplate: { prefixEs: ['salgo de la casa a las', 'salgo de la casa a la', 'salgo de casa a las', 'salgo de casa a la', 'yo salgo de la casa a las', 'yo salgo de casa a las'], suffixEs: [], slotHintEs: 'Time', patternEs: 'salgo de la casa [Time]' } },
  { id: 'v_llego', stage: 'verbs_s2', es: 'llego al trabajo a tiempo', altEs: ['llego a tiempo'], en: 'I arrive at work on time', altEn: ['i arrive at work on time', 'arrive on time'], note: 'Grammar rule: "a + el" always contracts into "al" ("llego al trabajo")!' },
  { id: 'v_almuerzo', stage: 'verbs_s2', es: 'almuerzo al mediodía', altEs: ['yo almuerzo al mediodía'], en: 'I eat lunch at noon', altEn: ['i have lunch at noon', 'i eat lunch at noon'], note: 'Almorzar (o -> ue): yo almuerzo ("el almuerzo" = lunch).' },
  { id: 'v_regreso', stage: 'verbs_s2', es: 'regreso a casa por la tarde', altEs: ['vuelvo a casa por la tarde'], en: 'I return home in the afternoon', altEn: ['i come back home in the afternoon', 'return home in the afternoon'], note: '"Por la mañana" = in the morning, "por la tarde" = in the afternoon, "por la noche" = at night.' },
  { id: 'v_ceno', stage: 'verbs_s2', es: 'ceno con mi familia', altEs: ['yo ceno con mi familia'], en: 'I eat dinner with my family', altEn: ['i have dinner with my family', 'dinner with my family'], note: '"Cenar" = to have dinner; "con" = with.' },
  { id: 'v_acuesto', stage: 'verbs_s2', es: 'me acuesto [Time]', altEs: [], en: 'I go to bed at [any time]', altEn: ['i go to bed at'], note: 'Acostarse (o -> ue): say "me acuesto a la(s) [any time]".', slotTemplate: { prefixEs: ['me acuesto a las', 'me acuesto a la', 'yo me acuesto a las', 'yo me acuesto a la', 'me duermo a las', 'me duermo a la'], suffixEs: [], slotHintEs: 'Time', patternEs: 'me acuesto [Time]' } },
  {
    id: 'v_siempre',
    stage: 'verbs_s2',
    es: 'siempre, a veces y nunca',
    altEs: ['siempre', 'a veces', 'nunca'],
    en: 'always, sometimes and never',
    altEn: ['always sometimes and never'],
    note: 'Place frequency words (siempre, normalmente, a veces, nunca) right before your routine verb!',
    structure: {
      banks: ['frequency_adverbs', 'routine_actions_yo'],
      patternEs: '[frequency] + [routine action]',
      patternEn: 'I [frequency] [routine action]',
      build: (freq, act) => ({
        es: `${freq.es} ${act.es}`,
        altEs: [`yo ${freq.es} ${act.es}`],
        en: `I ${freq.en} ${act.en}`
      })
    }
  },
  { id: 'v_fin_semana', stage: 'verbs_s2', es: 'descanso los fines de semana', altEs: ['descanso el fin de semana'], en: 'I rest on the weekends', altEn: ['i rest on weekends', 'rest on the weekend'], note: 'Use "los + plural day" to mean "on [days]" (e.g., "los lunes" = on Mondays).' },

  // Stage 3: Likes & Preferences (GUSTAR), Obligations & Polite Requests
  { id: 'v_me_gusta', stage: 'verbs_s3', es: 'me gusta [Something / Activity]', altEs: [], en: 'I like [anything / activity]', altEn: ['i like'], note: 'With GUSTAR, use singular "me gusta (mucho)" before any singular noun or infinitive verb!', slotTemplate: { prefixEs: ['me gusta mucho', 'me gusta'], suffixEs: [], slotHintEs: 'Something / Activity', patternEs: 'me gusta [Something / Activity]' } },
  { id: 'v_me_gustan', stage: 'verbs_s3', es: 'me gustan [Plural things]', altEs: [], en: 'I like [any plural things]', altEn: ['i like'], note: 'Use plural "me gustan" (with -n) before any plural noun!', slotTemplate: { prefixEs: ['me gustan mucho', 'me gustan'], suffixEs: [], slotHintEs: 'Plural things', patternEs: 'me gustan [Plural things]' } },
  {
    id: 'v_no_me_gusta',
    stage: 'verbs_s3',
    es: 'no me gusta el tráfico',
    altEs: ['no me gusta el tranque'],
    en: "I don't like the traffic",
    altEn: ['i do not like traffic', 'i dont like the traffic'],
    note: 'To say "I don\'t like", always put "no" BEFORE "me gusta".',
    structure: {
      bank: 'disliked_things',
      patternEs: 'no me gusta [thing]',
      patternEn: "I don't like [thing]",
      build: (d) => ({
        es: `no me gusta ${d.es}`,
        altEs: (d.altEs || []).map((a) => `no me gusta ${a}`),
        en: `I don't like ${d.en}`
      })
    }
  },
  {
    id: 'v_te_gusta',
    stage: 'verbs_s3',
    es: '¿te gusta comer aquí?',
    altEs: ['te gusta comer aquí', '¿le gusta comer aquí?'],
    en: 'do you like eating here?',
    altEn: ['do you like to eat here', 'do you like eating here'],
    note: '"¿Te gusta...?" (informal) / "¿Le gusta...?" (formal) + infinitive verb.',
    structure: {
      bank: 'infinitive_actions',
      patternEs: '¿te gusta [infinitive action]?',
      patternEn: 'do you like to [action]?',
      build: (act) => ({
        es: `¿te gusta ${act.es}?`,
        altEs: [`te gusta ${act.es}`, `¿le gusta ${act.es}?`],
        en: `do you like to ${act.en}?`
      })
    }
  },
  {
    id: 'v_me_encanta',
    stage: 'verbs_s3',
    es: 'me encanta vivir aquí',
    altEs: ['me encanta Inglaterra'],
    en: 'I love living here',
    altEn: ['i love living here', 'i love england'],
    note: '"Me encanta" = I love (for things/activities; "te quiero/amo" is for people).',
    structure: {
      bank: 'infinitive_actions',
      patternEs: 'me encanta [infinitive action]',
      patternEn: 'I love to [action]',
      build: (act) => ({
        es: `me encanta ${act.es}`,
        en: `I love to ${act.en}`
      })
    }
  },
  {
    id: 'v_prefiero',
    stage: 'verbs_s3',
    es: 'prefiero este',
    altEs: ['yo prefiero este'],
    en: 'I prefer this one',
    altEn: ['i prefer this', 'prefer this one'],
    note: 'Preferir (e -> ie): yo prefiero = I prefer + any dish or drink!',
    structure: {
      bank: 'panama_dishes_drinks',
      patternEs: 'prefiero [dish / drink]',
      patternEn: 'I prefer [dish / drink]',
      build: (d) => ({
        es: `prefiero ${d.es}`,
        altEs: [`yo prefiero ${d.es}`],
        en: `I prefer ${d.en}`
      })
    }
  },
  {
    id: 'v_tengo_que',
    stage: 'verbs_s3',
    es: 'tengo que trabajar hoy',
    altEs: ['yo tengo que trabajar'],
    en: 'I have to work today',
    altEn: ['i have to work', 'have to work today'],
    note: 'A1 obligation formula: TENER + QUE + infinitive = "I have to [do something]".',
    structure: {
      bank: 'infinitive_actions',
      patternEs: 'tengo que [infinitive action]',
      patternEn: 'I have to [action]',
      build: (act) => ({
        es: `tengo que ${act.es}`,
        altEs: [`yo tengo que ${act.es}`],
        en: `I have to ${act.en}`
      })
    }
  },
  { id: 'v_me_da', stage: 'verbs_s3', es: '¿me da esto por favor?', altEs: ['me da esto por favor', '¿me da esto?'], en: 'can you give me this please?', altEn: ['give me this please', 'can you give me this'], note: 'Polite Panamanian counter request ("¿Me da...?").' },
  {
    id: 'v_busco',
    stage: 'verbs_s3',
    es: 'estoy buscando un hotel',
    altEs: ['busco un hotel'],
    en: 'I am looking for a hotel',
    altEn: ['im looking for a hotel', 'looking for a hotel'],
    note: 'Estar + -ando forms the present progressive ("estoy buscando" = I am looking for).',
    structure: {
      bank: 'places_town',
      patternEs: 'estoy buscando [place]',
      patternEn: 'I am looking for [place]',
      build: (p) => ({
        es: `estoy buscando ${p.indefEs}`,
        altEs: [`busco ${p.indefEs}`, `yo estoy buscando ${p.indefEs}`],
        en: `I am looking for ${p.indefEn}`
      })
    }
  },
  { id: 'v_vamos', stage: 'verbs_s3', es: 'vamos ahora mismo', altEs: ['vamos'], en: "let's go right now", altEn: ['lets go right now', 'lets go'], note: '"Vamos" means both "we go" and "let\'s go"; "ahora mismo" = right now.' },
  { id: 'v_conozco', stage: 'verbs_s3', es: 'conozco [Place]', altEs: [], en: 'I know / am familiar with [any place]', altEn: ['i know'], note: 'CONOCER ("conozco") = to know/be familiar with any person or place!', slotTemplate: { prefixEs: ['conozco', 'yo conozco'], suffixEs: [], slotHintEs: 'Place', patternEs: 'conozco [Place]' } },
  { id: 'v_espera', stage: 'verbs_s3', es: 'espere un momento por favor', altEs: ['espera un momento'], en: 'wait a moment please', altEn: ['wait a moment', 'hold on a moment'], note: 'Polite command ("espere") used everywhere in Panama.' }
];

export default {
  id: 'verbs',
  meta,
  guide,
  items
};
