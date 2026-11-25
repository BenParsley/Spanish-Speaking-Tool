export const meta = {
  id: 'identity',
  a1Code: 'A1.2',
  label: 'A1.2 Identity & Ser',
  active: true,
  subtitle: 'Unit 2/8 · Pronouns, names, SER (to be), gender, articles, and jobs.',
  description: 'Subject pronouns, introductions, SER, articles, and professions.',
  grammarTitle: 'Unit 2 Grammar Notes',
  grammarRules: [
    '"Tú" (informal you) vs. "usted" (polite you).',
    'SER: yo soy, tú eres, él/ella/usted es, nosotros somos, ellos son.',
    'Masculine nouns use el/un (-o); feminine nouns use la/una (-a).'
  ],
  stages: [
    {
      stageKey: 'identity_s1',
      shortTitle: 'Pronouns & Names',
      label: 'Stage 1/3: Pronouns & Names',
      desc: 'yo, tú, usted, él, ella, nosotros, ellos, and "Me llamo...".',
      hint: 'Pass Stage 1 to unlock Stage 2.',
      focusRule: '"Tú" (casual) vs. "usted" (polite).'
    },
    {
      stageKey: 'identity_s2',
      shortTitle: 'Origin & Verb Ser',
      label: 'Stage 2/3: Origin & Verb Ser',
      desc: 'SER (soy, eres, es, somos), nationalities, and contact basics.',
      hint: 'Pass Stage 2 to unlock Stage 3.',
      focusRule: 'SER + de for origin ("Soy de Inglaterra"); VIVIR + en for residence.'
    },
    {
      stageKey: 'identity_s3',
      shortTitle: 'Gender, Articles & Work',
      label: 'Stage 3/3: Gender, Articles & Work',
      desc: 'el/la, un/una, los/las, jobs, and languages.',
      hint: 'Finish Stage 3 to unlock Unit 3.',
      focusRule: 'Omit un/una with jobs after SER ("Soy estudiante").'
    }
  ]
};

export const guide = {
  heading: 'A1.2 Pronouns, Ser & Gender',
  vocab: [
    ['yo / tú / usted', 'I / you / you (pol.)'],
    ['él / ella', 'he / she'],
    ['nosotros / ellos', 'we / they'],
    ['me llamo...', 'my name is...'],
    ['yo soy / tú eres', 'I am / you are'],
    ['él/ella/usted es', 'he/she/you is'],
    ['el / la', 'the (masc / fem)'],
    ['un / una', 'a/an (masc / fem)']
  ],
  tips: [
    'Nouns ending in -o are usually masculine ("el amigo").',
    'Nouns ending in -a are usually feminine ("la amiga").',
    'Use SER (soy/eres/es) for identity, origin & profession.',
    '"Soy de Inglaterra" = I am from England (ser + de).',
    'Omit "un/una" before professions ("Soy estudiante").',
    'Use "usted" in Panama with strangers, elders & staff.'
  ]
};

export const items = [
  // Stage 1: Subject Pronouns & Introducing Yourself (Llamarse)
  { id: 'id_yo', stage: 'identity_s1', es: 'yo', altEs: [], en: 'I', altEn: ['i'], note: 'First-person singular pronoun ("yo"). Often dropped once verb endings are clear!' },
  { id: 'id_tu', stage: 'identity_s1', es: 'tú', altEs: [], en: 'you (informal)', altEn: ['you'], note: 'Used with friends, family, and peers. Note the accent on "tú" ("tu" without accent = "your").' },
  { id: 'id_usted', stage: 'identity_s1', es: 'usted', altEs: [], en: 'you (formal / polite)', altEn: ['you formal', 'you polite', 'you'], note: 'Used in Panama with elders, strangers, officials, and polite service.' },
  { id: 'id_el_ella', stage: 'identity_s1', es: 'él y ella', altEs: ['él', 'ella'], en: 'he and she', altEn: ['he and she', 'he or she'], note: '"Él" (with tilde) = he; "ella" = she (double "ll" sounds like English "y").' },
  { id: 'id_nosotros', stage: 'identity_s1', es: 'nosotros', altEs: ['nosotras'], en: 'we', altEn: ['we', 'us'], note: '"Nosotros" = we (masculine/mixed group); "nosotras" = we (all-female).' },
  { id: 'id_ellos', stage: 'identity_s1', es: 'ellos', altEs: ['ellas', 'ustedes'], en: 'they', altEn: ['they'], note: '"Ellos" = they; note that in Panama "ustedes" is the universal plural "you all".' },
  { id: 'id_me_llamo', stage: 'identity_s1', es: 'me llamo [Your name]', altEs: [], en: 'my name is [your name]', altEn: ['my name is', 'i am called', 'im called'], note: 'Standard A1 self-introduction: say "Me llamo [your name]" or "Mi nombre es [your name]".', slotTemplate: { prefixEs: ['me llamo', 'yo me llamo', 'mi nombre es'], suffixEs: [], slotHintEs: 'Your name', patternEs: 'me llamo [Your name]' } },
  { id: 'id_como_te_llamas', stage: 'identity_s1', es: '¿cómo te llamas?', altEs: ['cómo te llamas'], en: 'what is your name? (informal)', altEn: ['what is your name', 'whats your name'], note: 'Friendly way to ask a peer\'s name.' },
  {
    id: 'id_como_se_llama',
    stage: 'identity_s1',
    es: '¿cómo se llama usted?',
    altEs: ['cómo se llama usted', '¿cómo se llama?'],
    en: 'what is your name? (formal)',
    altEn: ['what is your name', 'whats your name'],
    note: 'Polite/formal A1 question using "se llama" + person.',
    structure: {
      bank: 'intro_people',
      patternEs: '¿cómo se llama [person]?',
      patternEn: 'what is [person]\'s name?',
      build: (p) => ({
        es: `¿cómo se llama ${p.es}?`,
        altEs: [`cómo se llama ${p.es}`],
        en: `what is ${p.en}'s name?`
      })
    }
  },
  {
    id: 'id_mucho_gusto',
    stage: 'identity_s1',
    es: 'mucho gusto',
    altEs: ['encantado', 'encantada'],
    en: 'nice to meet you',
    altEn: ['pleased to meet you', 'nice to meet you'],
    note: 'Universal reply when meeting someone for the first time.',
    structure: {
      bank: 'greeting_people',
      patternEs: 'mucho gusto, [person]',
      patternEn: 'nice to meet you, [person]',
      build: (p) => ({
        es: `mucho gusto ${p.es}`,
        altEs: [`encantado ${p.es}`, `encantada ${p.es}`],
        en: `nice to meet you, ${p.en}`
      })
    }
  },
  { id: 'id_igualmente', stage: 'identity_s1', es: 'igualmente', altEs: ['el gusto es mío'], en: 'likewise / nice to meet you too', altEn: ['likewise', 'same to you', 'nice to meet you too'], note: 'Easy response to "mucho gusto".' },
  {
    id: 'id_presento',
    stage: 'identity_s1',
    es: 'le presento a mi amigo',
    altEs: ['te presento a mi amigo'],
    en: 'let me introduce you to my friend',
    altEn: ['i introduce my friend', 'this is my friend'],
    note: 'Use "le presento a..." (polite) or "te presento a..." (casual) to introduce anyone!',
    structure: {
      bank: 'intro_people',
      patternEs: 'le presento a [person]',
      patternEn: 'let me introduce you to [person]',
      build: (p) => ({
        es: `le presento a ${p.es}`,
        altEs: [`te presento a ${p.es}`],
        en: `let me introduce you to ${p.en}`
      })
    }
  },

  // Stage 2: The Verb SER (Identity, Origin & Residence)
  { id: 'id_yo_soy', stage: 'identity_s2', es: 'yo soy', altEs: ['soy'], en: 'I am (identity / origin)', altEn: ['i am'], note: 'SER (soy, eres, es, somos, son) is used for permanent identity, origin, and profession.' },
  { id: 'id_tu_eres', stage: 'identity_s2', es: 'tú eres', altEs: ['eres'], en: 'you are (informal)', altEn: ['you are'], note: 'Second-person singular of SER ("Tú eres muy amable").' },
  {
    id: 'id_el_es',
    stage: 'identity_s2',
    es: 'él es',
    altEs: ['ella es', 'usted es', 'es'],
    en: 'he is / she is / you (formal) are',
    altEn: ['he is', 'she is', 'it is', 'you are'],
    note: '"Es" works for él (he), ella (she), AND usted (formal you) — drop "un/una" before professions!',
    structure: {
      banks: [
        [
          { id: 'el', es: 'él', en: 'he', g: 'm' },
          { id: 'ella', es: 'ella', en: 'she', g: 'f' }
        ],
        'ser_jobs_people'
      ],
      patternEs: 'él / ella es [profession]',
      patternEn: 'he / she is [profession]',
      build: (subj, job) => ({
        es: `${subj.es} es ${subj.g === 'f' ? job.fs : job.ms}`,
        altEs: [`es ${subj.g === 'f' ? job.fs : job.ms}`],
        en: `${subj.en} is ${job.en}`
      })
    }
  },
  {
    id: 'id_somos',
    stage: 'identity_s2',
    es: 'nosotros somos',
    altEs: ['somos'],
    en: 'we are',
    altEn: ['we are'],
    note: 'First-person plural of SER ("Somos de Panamá / Inglaterra").',
    structure: {
      bank: 'countries_origin',
      patternEs: 'nosotros somos de [country]',
      patternEn: 'we are from [country]',
      build: (c) => ({
        es: `nosotros somos de ${c.es}`,
        altEs: [`somos de ${c.es}`, `nosotras somos de ${c.es}`],
        en: `we are from ${c.en}`
      })
    }
  },
  { id: 'id_soy_panama', stage: 'identity_s2', es: 'soy de [Country]', altEs: [], en: 'I am from [any country]', altEn: ['i am from'], note: 'Use "ser + de + [any country]" to state where you are from.', slotTemplate: { prefixEs: ['soy de', 'yo soy de'], suffixEs: [], slotHintEs: 'Country', patternEs: 'soy de [Country]' } },
  { id: 'id_de_donde_eres', stage: 'identity_s2', es: '¿de dónde eres?', altEs: ['de dónde eres', '¿de dónde es usted?', 'de dónde es usted'], en: 'where are you from?', altEn: ['where are you from'], note: '"De" = from, "dónde" = where, "eres/es" = are you.' },
  { id: 'id_panameno', stage: 'identity_s2', es: 'soy [Nationality]', altEs: [], en: 'I am [any nationality]', altEn: ['i am'], note: 'Nationalities in Spanish are NOT capitalized and go directly after "soy".', slotTemplate: { prefixEs: ['soy', 'yo soy'], suffixEs: [], slotHintEs: 'Nationality', patternEs: 'soy [Nationality]' } },
  { id: 'id_vivo_en', stage: 'identity_s2', es: 'vivo en [City / Country]', altEs: [], en: 'I live in [any city / country]', altEn: ['i live in'], note: 'From vivir (to live) + en (in) + any city or country.', slotTemplate: { prefixEs: ['vivo en', 'yo vivo en'], suffixEs: [], slotHintEs: 'City / Country', patternEs: 'vivo en [City / Country]' } },
  { id: 'id_donde_vives', stage: 'identity_s2', es: '¿dónde vives?', altEs: ['dónde vives', '¿dónde vive usted?'], en: 'where do you live?', altEn: ['where do you live'], note: '"Vives" (tú) / "vive" (usted) from regular -ir verb vivir.' },
  { id: 'id_direccion', stage: 'identity_s2', es: '¿cuál es tu dirección?', altEs: ['¿cuál es su dirección?', 'mi dirección es'], en: 'what is your address?', altEn: ['what is your address', 'your address'], note: 'Required on every A1 registration form ("la dirección").' },
  { id: 'id_correo', stage: 'identity_s2', es: 'mi correo electrónico', altEs: ['el correo electrónico'], en: 'my email address', altEn: ['my email', 'email address'], note: 'In Spanish, "@" is called "arroba" and "." is "punto".' },

  // Stage 3: Gender, Articles (El/La, Un/Una) & Professions
  {
    id: 'id_el_la',
    stage: 'identity_s3',
    es: 'el hombre y la mujer',
    altEs: ['el hombre', 'la mujer'],
    en: 'the man and the woman',
    altEn: ['the man and woman', 'the man and the woman'],
    note: '"El" = the (masculine singular); "La" = the (feminine singular).',
    structure: {
      bank: 'gender_article_nouns',
      patternEs: 'el / la [noun]',
      patternEn: 'the [noun]',
      build: (n) => ({
        es: n.defEs,
        en: n.defEn
      })
    }
  },
  {
    id: 'id_un_una',
    stage: 'identity_s3',
    es: 'un amigo y una amiga',
    altEs: ['un amigo', 'una amiga'],
    en: 'a male friend and a female friend',
    altEn: ['a friend', 'a male friend and a female friend'],
    note: '"Un" = a/an (masculine); "Una" = a/an (feminine).',
    structure: {
      bank: 'gender_article_nouns',
      patternEs: 'un / una [noun]',
      patternEn: 'a / an [noun]',
      build: (n) => ({
        es: n.indefEs,
        en: n.indefEn
      })
    }
  },
  {
    id: 'id_los_las',
    stage: 'identity_s3',
    es: 'los libros y las mesas',
    altEs: ['los libros', 'las mesas'],
    en: 'the books and the tables',
    altEn: ['the books and tables'],
    note: 'Plural "the": "los" (masculine) & "las" (feminine). Add -s after vowels!',
    structure: {
      bank: 'gender_article_nouns',
      patternEs: 'los / las [plural noun]',
      patternEn: 'the [plural noun]',
      build: (n) => ({
        es: n.plEs,
        en: n.plEn
      })
    }
  },
  {
    id: 'id_estudiante',
    stage: 'identity_s3',
    es: 'soy estudiante',
    altEs: ['yo soy estudiante'],
    en: 'I am a student',
    altEn: ['im a student', 'i am a student'],
    note: 'Spanish drops "un/una" before professions after SER ("Soy estudiante", not "Soy un estudiante").',
    structure: {
      bank: 'ser_jobs_people',
      patternEs: 'soy [profession]',
      patternEn: 'I am [profession]',
      build: (job) => ({
        es: `soy ${job.ms}`,
        altEs: [`yo soy ${job.ms}`, `soy ${job.fs}`, `yo soy ${job.fs}`],
        en: `I am ${job.en}`
      })
    }
  },
  { id: 'id_profesor', stage: 'identity_s3', es: 'soy [Your profession]', altEs: [], en: 'I am a [any profession]', altEn: ['i am a'], note: 'Drop "un/una" before professions after SER — say "soy" + your profession.', slotTemplate: { prefixEs: ['soy', 'yo soy'], suffixEs: [], slotHintEs: 'Your profession', patternEs: 'soy [Your profession]' } },
  {
    id: 'id_trabajo_oficina',
    stage: 'identity_s3',
    es: 'trabajo en una oficina',
    altEs: ['yo trabajo en una oficina'],
    en: 'I work in an office',
    altEn: ['i work in an office', 'work in an office'],
    note: '"Trabajo en..." = I work in/at... (from regular -ar verb trabajar).',
    structure: {
      bank: 'workplaces',
      patternEs: 'trabajo en [workplace]',
      patternEn: 'I work in [workplace]',
      build: (wp) => ({
        es: `trabajo en ${wp.es}`,
        altEs: [`yo trabajo en ${wp.es}`],
        en: wp.id === 'casa' ? 'I work at home' : `I work in ${wp.en}`
      })
    }
  },
  { id: 'id_dedicas', stage: 'identity_s3', es: '¿a qué te dedicas?', altEs: ['a qué te dedicas', '¿a qué se dedica?', 'en qué trabajas'], en: 'what do you do for a living?', altEn: ['what do you do', 'what is your job'], note: 'Standard A1 question for asking someone\'s profession.' },
  { id: 'id_trabajo_casa', stage: 'identity_s3', es: 'trabajo desde casa', altEs: [], en: 'I work from home', altEn: ['work from home'], note: '"Desde" = from (origin point), "casa" = home/house.' },
  { id: 'id_idiomas', stage: 'identity_s3', es: 'hablo [Language(s)]', altEs: [], en: 'I speak [any language(s)]', altEn: ['i speak'], note: 'Say "hablo" + any language(s) you speak.', slotTemplate: { prefixEs: ['hablo', 'yo hablo'], suffixEs: [], slotHintEs: 'Language(s)', patternEs: 'hablo [Language(s)]' } },
  { id: 'id_telefono', stage: 'identity_s3', es: 'mi número de teléfono', altEs: ['¿cuál es tu número de teléfono?'], en: 'my phone number', altEn: ['phone number', 'my telephone number'], note: 'Next unit (A1.3 Numbers) lets you give your phone number, age, and time!' },
  { id: 'id_apellido', stage: 'identity_s3', es: 'mi apellido es [Your last name]', altEs: [], en: 'my last name is [your last name]', altEn: ['my surname is', 'my last name'], note: '"Nombre" = first name; "Apellido" = last name / surname. Say your own last name after "es".', slotTemplate: { prefixEs: ['mi apellido es'], suffixEs: [], slotHintEs: 'Your last name', patternEs: 'mi apellido es [Your last name]' } },
  {
    id: 'id_pasaporte',
    stage: 'identity_s3',
    es: 'aquí está mi pasaporte',
    altEs: ['mi pasaporte', 'mi cédula'],
    en: 'here is my passport',
    altEn: ['my passport', 'here is my passport'],
    note: 'In Panama, locals carry a national ID card called "la cédula".',
    structure: {
      bank: 'personal_docs',
      patternEs: 'aquí está [document]',
      patternEn: 'here is [document]',
      build: (doc) => ({
        es: `aquí está ${doc.es}`,
        altEs: [doc.es],
        en: `here is ${doc.en}`
      })
    }
  }
];

export default {
  id: 'identity',
  meta,
  guide,
  items
};
