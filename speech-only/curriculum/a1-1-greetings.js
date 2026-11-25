export const meta = {
  id: 'greetings',
  a1Code: 'A1.1',
  label: 'A1.1 Greetings',
  active: true,
  subtitle: 'Unit 1/8 · Hellos, politeness, and basic survival phrases.',
  description: 'Essential Panamanian greetings, politeness, and clarity phrases.',
  grammarTitle: 'Unit 1 Grammar Notes',
  grammarRules: [
    'Vowels have one sound (a, e, i, o, u); the letter "h" is always silent ("hola" = OH-lah).',
    'Place "no" directly before a verb to negate ("Entiendo" → "No entiendo").',
    'Say "¡Buenas!" when entering shops, and "Con mucho gusto" or "A la orden" for "You\'re welcome".'
  ],
  stages: [
    {
      stageKey: 'greetings_s1',
      shortTitle: 'First Words & Hellos',
      label: 'Stage 1/3: First Words & Hellos',
      desc: 'Yes, no, hellos, "¿Cómo está?", and "¿Qué xopá?".',
      hint: 'Pass Stage 1 to unlock Stage 2.',
      focusRule: 'Silent "h" in "hola"; "¡Buenas!" when entering shops.'
    },
    {
      stageKey: 'greetings_s2',
      shortTitle: 'Politeness & Farewells',
      label: 'Stage 2/3: Politeness & Farewells',
      desc: 'Please, thank you, "con permiso", "buen provecho", and goodbyes.',
      hint: 'Pass Stage 2 to unlock Stage 3.',
      focusRule: '"Con mucho gusto" / "A la orden" = You\'re welcome.'
    },
    {
      stageKey: 'greetings_s3',
      shortTitle: 'Survival & Clarity',
      label: 'Stage 3/3: Survival & Clarity',
      desc: '"No entiendo", "¿Puede repetir?", and "¿Cómo se dice...?".',
      hint: 'Finish Stage 3 to unlock Unit 2.',
      focusRule: 'Put "no" before the verb to negate ("no entiendo").'
    }
  ]
};

export const guide = {
  heading: 'A1.1 Greetings & Survival Rules',
  vocab: [
    ['hola / buenas', 'hello / shop hi'],
    ['sí / no', 'yes / no'],
    ['por favor', 'please'],
    ['muchas gracias', 'thank you'],
    ['con mucho gusto', "you're welcome"],
    ['a la orden', 'at your service'],
    ['no entiendo', "I don't understand"],
    ['¿puede repetir?', 'can you repeat?']
  ],
  tips: [
    'Letter "h" is always silent ("hola" = OH-lah).',
    'Say "¡Buenas!" whenever entering a shop or elevator.',
    'Put "no" directly before a verb to negate ("no entiendo").',
    '"¿Qué xopá?" is Panama\'s friendly local "What\'s up?".',
    'Use "¿Cómo está?" (formal) and "¿Cómo estás?" (informal).',
    'Ask "Más despacio, por favor" anytime someone speaks fast.'
  ]
};

export const items = [
  // Stage 1: First Words & Everyday Hellos (Absolute Zero)
  { id: 'g_hola', stage: 'greetings_s1', es: 'hola', altEs: [], en: 'hello / hi', altEn: ['hello', 'hi'], note: 'In Spanish, "h" is always silent — pronounce "hola" as "OH-lah".' },
  { id: 'g_si', stage: 'greetings_s1', es: 'sí', altEs: [], en: 'yes', altEn: ['yes'], note: '"Sí" with an accent means "yes" (without an accent, "si" means "if").' },
  { id: 'g_no', stage: 'greetings_s1', es: 'no', altEs: [], en: 'no / not', altEn: ['no', 'not'], note: '"No" means both "no" and "not" (placed directly before the verb).' },
  {
    id: 'g_buenos_dias',
    stage: 'greetings_s1',
    es: 'buenos días',
    altEs: ['buen día'],
    en: 'good morning',
    altEn: ['morning'],
    note: 'Used from waking up until 12:00 PM (noon).',
    structure: {
      bank: 'greeting_people',
      patternEs: 'buenos días, [person]',
      patternEn: 'good morning, [person]',
      build: (p) => ({
        es: `buenos días ${p.es}`,
        altEs: [`buen día ${p.es}`],
        en: `good morning, ${p.en}`
      })
    }
  },
  {
    id: 'g_buenas_tardes',
    stage: 'greetings_s1',
    es: 'buenas tardes',
    altEs: [],
    en: 'good afternoon',
    altEn: ['afternoon'],
    note: 'Used from 12:00 PM until sunset (~6:00 PM in Panama).',
    structure: {
      bank: 'greeting_people',
      patternEs: 'buenas tardes, [person]',
      patternEn: 'good afternoon, [person]',
      build: (p) => ({
        es: `buenas tardes ${p.es}`,
        en: `good afternoon, ${p.en}`
      })
    }
  },
  {
    id: 'g_buenas_noches',
    stage: 'greetings_s1',
    es: 'buenas noches',
    altEs: [],
    en: 'good evening / good night',
    altEn: ['good evening', 'good night'],
    note: 'Used both as an evening greeting AND when saying goodnight.',
    structure: {
      bank: 'greeting_people',
      patternEs: 'buenas noches, [person]',
      patternEn: 'good evening, [person]',
      build: (p) => ({
        es: `buenas noches ${p.es}`,
        en: `good evening, ${p.en}`,
        altEn: [`good night, ${p.en}`]
      })
    }
  },
  { id: 'g_buenas', stage: 'greetings_s1', es: 'buenas', altEs: [], en: 'hello there (entering a shop)', altEn: ['hi there', 'good day', 'hello'], note: 'Panama\'s universal polite greeting when stepping into any shop, bus, or elevator.' },
  {
    id: 'g_como_estas',
    stage: 'greetings_s1',
    es: '¿cómo estás?',
    altEs: ['cómo estás', 'cómo está', '¿cómo está?'],
    en: 'how are you?',
    altEn: ['how are you'],
    note: '"¿Cómo estás?" is friendly/informal; "¿Cómo está?" is polite/formal.',
    structure: {
      bank: 'greeting_people',
      filter: (p) => p.id !== 'todos' && p.id !== 'chicos',
      patternEs: '¿cómo está, [person]?',
      patternEn: 'how are you, [person]?',
      build: (p) => ({
        es: `¿cómo está ${p.es}?`,
        altEs: [`cómo está ${p.es}`, `¿cómo estás ${p.es}?`, `cómo estás ${p.es}`],
        en: `how are you, ${p.en}?`
      })
    }
  },
  { id: 'g_que_tal', stage: 'greetings_s1', es: '¿qué tal?', altEs: ['qué tal'], en: "how's it going?", altEn: ['hows it going', 'how are things', 'what is up'], note: 'Works in any casual or polite setting across Panama.' },
  { id: 'g_que_xopa', stage: 'greetings_s1', es: '¿qué xopá?', altEs: ['qué xopá', 'qué sopá', 'xopá'], en: "what's up? (Panama slang)", altEn: ['whats up', 'what is up'], note: 'Panama\'s signature local greeting — "qué pasó" with syllables flipped!' },
  { id: 'g_muy_bien', stage: 'greetings_s1', es: 'muy bien gracias', altEs: ['muy bien, gracias', 'muy bien'], en: 'very well thank you', altEn: ['very well thanks', 'very good thank you'], note: '"Muy" = very, "bien" = well, "gracias" = thank you.' },
  { id: 'g_todo_bien', stage: 'greetings_s1', es: 'todo bien', altEs: ['¡todo bien!'], en: 'all good / everything is fine', altEn: ['all good', 'everything is fine', 'everything is good'], note: 'Natural everyday Panamanian reply meaning everything is going great.' },
  { id: 'g_mas_o_menos', stage: 'greetings_s1', es: 'más o menos', altEs: [], en: 'so-so / more or less', altEn: ['so so', 'more or less'], note: '"Más" = more, "o" = or, "menos" = less.' },
  { id: 'g_y_tu', stage: 'greetings_s1', es: '¿y tú?', altEs: ['y tú', '¿y usted?', 'y usted'], en: 'and you?', altEn: ['and you'], note: 'Use "¿Y tú?" with peers/friends and "¿Y usted?" to show respect.' },

  // Stage 2: Politeness, Courtesies & Farewells
  { id: 'g_por_favor', stage: 'greetings_s2', es: 'por favor', altEs: ['por fa'], en: 'please', altEn: ['please'], note: 'Essential courtesy word; shortened casually to "por fa" in Panama.' },
  {
    id: 'g_gracias',
    stage: 'greetings_s2',
    es: 'muchas gracias',
    altEs: ['gracias'],
    en: 'thank you very much',
    altEn: ['thank you', 'thanks'],
    note: '"Muchas" = many, "gracias" = thanks.',
    structure: {
      bank: 'greeting_people',
      patternEs: 'muchas gracias, [person]',
      patternEn: 'thank you very much, [person]',
      build: (p) => ({
        es: `muchas gracias ${p.es}`,
        altEs: [`gracias ${p.es}`],
        en: `thank you very much, ${p.en}`
      })
    }
  },
  { id: 'g_con_gusto', stage: 'greetings_s2', es: 'con mucho gusto', altEs: ['con gusto', 'de nada'], en: "you're welcome (with pleasure)", altEn: ['youre welcome', 'you are welcome', 'with pleasure', 'my pleasure'], note: 'Panamanians warmly say "con mucho gusto" more often than "de nada".' },
  { id: 'g_a_la_orden', stage: 'greetings_s2', es: 'a la orden', altEs: [], en: 'at your service / how can I help?', altEn: ['at your service', 'how can i help', 'happy to help'], note: 'Heard in every Panamanian store, market, and taxi as both greeting and "you\'re welcome".' },
  { id: 'g_con_permiso', stage: 'greetings_s2', es: 'con permiso', altEs: ['permiso'], en: 'excuse me (passing by)', altEn: ['excuse me', 'pardon me', 'coming through'], note: 'Say "permiso" or "con permiso" when walking past someone.' },
  { id: 'g_disculpe', stage: 'greetings_s2', es: 'disculpe', altEs: ['disculpa', 'perdón'], en: 'excuse me (getting attention)', altEn: ['excuse me', 'pardon me', 'sorry'], note: 'Use "disculpe" to politely get a waiter\'s or stranger\'s attention.' },
  { id: 'g_lo_siento', stage: 'greetings_s2', es: 'lo siento', altEs: [], en: "I'm sorry", altEn: ['i am sorry', 'sorry'], note: 'Used to apologize or express sympathy.' },
  { id: 'g_no_hay_problema', stage: 'greetings_s2', es: 'no hay problema', altEs: ['tranquilo', 'tranquila'], en: 'no problem / no worries', altEn: ['no problem', 'no worries'], note: 'Locals also say "tranquilo/a" to mean "don\'t worry / relax".' },
  { id: 'g_buen_provecho', stage: 'greetings_s2', es: 'buen provecho', altEs: ['provecho'], en: 'enjoy your meal', altEn: ['enjoy your meal', 'bon appetit'], note: 'Panamanians politely say "¡Buen provecho!" whenever passing people who are eating.' },
  {
    id: 'g_hasta_luego',
    stage: 'greetings_s2',
    es: 'hasta luego',
    altEs: [],
    en: 'see you later',
    altEn: ['see you later', 'goodbye'],
    note: '"Hasta" means "until" — pair it with any time or day!',
    structure: {
      bank: 'farewell_times',
      patternEs: 'hasta [time]',
      patternEn: 'see you [time]',
      build: (t) => ({
        es: `hasta ${t.es}`,
        en: `see you ${t.en}`
      })
    }
  },
  {
    id: 'g_nos_vemos',
    stage: 'greetings_s2',
    es: 'nos vemos',
    altEs: [],
    en: 'see you around',
    altEn: ['see you', 'see you soon'],
    note: 'Literally "we see each other" — combine with any time marker!',
    structure: {
      bank: 'farewell_times',
      patternEs: 'nos vemos [time]',
      patternEn: 'see you [time]',
      build: (t) => ({
        es: `nos vemos ${t.es}`,
        en: `see you ${t.en}`
      })
    }
  },
  { id: 'g_hasta_manana', stage: 'greetings_s2', es: 'hasta mañana', altEs: [], en: 'see you tomorrow', altEn: ['see you tomorrow'], note: '"Mañana" means both "tomorrow" and "morning".' },
  {
    id: 'g_que_le_vaya_bien',
    stage: 'greetings_s2',
    es: 'que le vaya bien',
    altEs: ['que te vaya bien'],
    en: 'have a good day / go well',
    altEn: ['have a good day', 'go well', 'all the best'],
    note: 'Warm Panamanian parting wish heard everywhere.',
    structure: {
      bank: 'greeting_people',
      filter: (p) => p.id !== 'todos' && p.id !== 'chicos',
      patternEs: 'que le vaya bien, [person]',
      patternEn: 'have a good day, [person]',
      build: (p) => ({
        es: `que le vaya bien ${p.es}`,
        altEs: [`que te vaya bien ${p.es}`],
        en: `have a good day, ${p.en}`
      })
    }
  },
  {
    id: 'g_chao',
    stage: 'greetings_s2',
    es: 'chao',
    altEs: ['adiós'],
    en: 'bye / goodbye',
    altEn: ['bye', 'goodbye'],
    note: '"Chao" is the most common casual "bye" in Panama.',
    structure: {
      bank: 'greeting_people',
      patternEs: 'chao, [person]',
      patternEn: 'bye, [person]',
      build: (p) => ({
        es: `chao ${p.es}`,
        altEs: [`adiós ${p.es}`],
        en: `bye, ${p.en}`
      })
    }
  },

  // Stage 3: Beginner Classroom & Survival Communication (CEFR A1 Core)
  {
    id: 'g_no_entiendo',
    stage: 'greetings_s3',
    es: 'no entiendo',
    altEs: ['yo no entiendo'],
    en: "I don't understand",
    altEn: ['i do not understand', 'dont understand'],
    note: 'Put "no" before "entiendo" (I understand) to negate it.',
    structure: {
      bank: 'survival_objects',
      patternEs: 'no entiendo [thing]',
      patternEn: "I don't understand [thing]",
      build: (obj) => ({
        es: `no entiendo ${obj.es}`,
        altEs: [`yo no entiendo ${obj.es}`],
        en: `I don't understand ${obj.en}`
      })
    }
  },
  { id: 'g_entiendo', stage: 'greetings_s3', es: 'sí entiendo', altEs: ['entiendo'], en: 'I understand', altEn: ['yes i understand', 'understand'], note: 'From the verb entender (to understand).' },
  { id: 'g_puede_repetir', stage: 'greetings_s3', es: '¿puede repetir por favor?', altEs: ['¿puede repetir?', 'puede repetir', 'repite por favor'], en: 'can you repeat that please?', altEn: ['can you repeat', 'repeat please', 'can you repeat that'], note: 'Crucial A1 survival request when someone speaks quickly.' },
  { id: 'g_mas_despacio', stage: 'greetings_s3', es: 'más despacio por favor', altEs: ['hable más despacio', 'habla más despacio'], en: 'more slowly please', altEn: ['slower please', 'speak more slowly', 'more slowly'], note: '"Más" = more, "despacio" = slowly.' },
  {
    id: 'g_como_se_dice',
    stage: 'greetings_s3',
    es: '¿cómo se dice en español?',
    altEs: ['¿cómo se dice?', 'cómo se dice'],
    en: 'how do you say it in Spanish?',
    altEn: ['how do you say in spanish', 'how do you say'],
    note: 'Ask this anytime you want to learn a new Spanish word!',
    structure: {
      bank: 'how_say_words',
      patternEs: '¿cómo se dice [word] en español?',
      patternEn: 'how do you say [word] in Spanish?',
      build: (w) => ({
        es: `¿cómo se dice ${w.es} en español?`,
        altEs: [`cómo se dice ${w.es} en español`, `¿cómo se dice ${w.es}?`],
        en: `how do you say ${w.en} in Spanish?`
      })
    }
  },
  {
    id: 'g_que_significa',
    stage: 'greetings_s3',
    es: '¿qué significa esto?',
    altEs: ['¿qué significa?', 'qué significa'],
    en: 'what does this mean?',
    altEn: ['what does it mean', 'what does this mean'],
    note: 'Use when you hear or read an unfamiliar word or sign.',
    structure: {
      bank: 'survival_objects',
      patternEs: '¿qué significa [thing]?',
      patternEn: 'what does [thing] mean?',
      build: (obj) => ({
        es: `¿qué significa ${obj.es}?`,
        altEs: [`qué significa ${obj.es}`],
        en: `what does ${obj.en} mean?`
      })
    }
  },
  { id: 'g_hablo_poco', stage: 'greetings_s3', es: 'hablo un poco de español', altEs: ['hablo poquito español'], en: 'I speak a little Spanish', altEn: ['i speak a little spanish', 'speak a little spanish'], note: '"Hablo" = I speak, "un poco" = a little.' },
  { id: 'g_habla_ingles', stage: 'greetings_s3', es: '¿habla inglés?', altEs: ['habla inglés', '¿hablas inglés?'], en: 'do you speak English?', altEn: ['do you speak english', 'speak english'], note: 'In Spanish, questions use the same word order as statements with rising voice tone!' },
  {
    id: 'g_puede_ayudar',
    stage: 'greetings_s3',
    es: '¿me puede ayudar?',
    altEs: ['me puede ayudar', 'me puedes ayudar'],
    en: 'can you help me?',
    altEn: ['can you help me', 'help me'],
    note: 'Polite A1 request formula: "¿(me) puede + [action] por favor?"',
    structure: {
      bank: 'polite_requests',
      patternEs: '¿(me) puede [action] por favor?',
      patternEn: 'can you [action] please?',
      build: (req) => ({
        es: req.mePrefix ? `¿me puede ${req.es} por favor?` : `¿puede ${req.es} por favor?`,
        altEs: req.mePrefix
          ? [`me puede ${req.es} por favor`, `¿me puede ${req.es}?`, `¿me puedes ${req.es} por favor?`]
          : [`puede ${req.es} por favor`, `¿puede ${req.es}?`, `¿puedes ${req.es} por favor?`],
        en: `can you ${req.en} please?`
      })
    }
  },
  { id: 'g_pregunta', stage: 'greetings_s3', es: 'tengo una pregunta', altEs: ['una pregunta'], en: 'I have a question', altEn: ['i have a question', 'a question'], note: '"Tengo" = I have, "una pregunta" = a question.' },
  { id: 'g_claro', stage: 'greetings_s3', es: 'claro que sí', altEs: ['claro'], en: 'of course / sure', altEn: ['of course', 'sure', 'certainly'], note: 'Natural enthusiastic "of course!" in Spanish.' },
  { id: 'g_no_se', stage: 'greetings_s3', es: 'no sé', altEs: ['yo no sé'], en: "I don't know", altEn: ['i do not know', 'dont know'], note: '"Sé" (with tilde) is the "yo" form of saber (to know).' }
];

export default {
  id: 'greetings',
  meta,
  guide,
  items
};
