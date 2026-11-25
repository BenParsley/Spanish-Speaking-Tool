import { inflectSpanishAdj } from './structure-engine.js';

export const meta = {
  id: 'family',
  a1Code: 'A1.4',
  label: 'A1.4 Family & Estar',
  active: true,
  subtitle: 'Unit 4/8 · Family, possessives, SER descriptions, ESTAR states, and HAY.',
  description: 'Family, adjectives, SER vs. ESTAR, rooms, and HAY.',
  grammarTitle: 'Unit 4 Grammar Notes',
  grammarRules: [
    '"Mi" (singular) → "mis" (plural). Use TENER for family and pets.',
    'Adjectives follow the noun ("casa grande") and match gender/number (-o/-a, -os/-as).',
    'SER = permanent traits; ESTAR = feelings, open/closed & locations; HAY = there is/are.'
  ],
  stages: [
    {
      stageKey: 'family_s1',
      shortTitle: 'Family & Tener',
      label: 'Stage 1/3: Family & Tener',
      desc: 'Family members, mi/mis, marital status, and pets.',
      hint: 'Pass Stage 1 to unlock Stage 2.',
      focusRule: '"mi" (sing.) / "mis" (pl.); use "tengo" for family and pets.'
    },
    {
      stageKey: 'family_s2',
      shortTitle: 'Descriptions (Ser)',
      label: 'Stage 2/3: Descriptions (Ser)',
      desc: 'People/house descriptions, colors, and SER.',
      hint: 'Pass Stage 2 to unlock Stage 3.',
      focusRule: 'Use SER for traits; adjectives go after nouns and match -o / -a.'
    },
    {
      stageKey: 'family_s3',
      shortTitle: 'States & Home (Estar/Hay)',
      label: 'Stage 3/3: States & Home (Estar/Hay)',
      desc: 'Moods, open/closed, rooms, and "hay".',
      hint: 'Finish Stage 3 to unlock Unit 5.',
      focusRule: 'ESTAR = feelings/location/open-closed; HAY = there is / there are.'
    }
  ]
};

export const guide = {
  heading: 'A1.4 Ser vs. Estar & Hay',
  vocab: [
    ['mi / mis', 'my (sing. / pl.)'],
    ['madre / padre', 'mother / father'],
    ['hermano / hermana', 'brother / sister'],
    ['es alto / simpático', 'is tall / nice (SER)'],
    ['estoy contento', 'I am happy (ESTAR)'],
    ['estoy cansado', 'I am tired (ESTAR)'],
    ['está abierto/cerrado', 'is open / closed'],
    ['hay...', 'there is / there are']
  ],
  tips: [
    'SER = permanent traits, appearance & personality.',
    'ESTAR = temporary moods, open/closed states & locations.',
    'Adjectives usually follow the noun ("una casa grande").',
    'Adjectives match gender (-o/-a) and plural (-s).',
    '"Hay" means BOTH "there is" and "there are".',
    '"Estar listo" = to be ready; "Ser listo" = to be clever.'
  ]
};

export const items = [
  // Stage 1: Family Members, Possessives (Mi/Mis, Tu/Tus) & Tener
  {
    id: 'fam_familia',
    stage: 'family_s1',
    es: 'mi familia',
    altEs: ['la familia'],
    en: 'my family',
    altEn: ['family'],
    note: '"Mi" = my (singular noun); "Mis" = my (plural nouns, e.g., "mis padres").',
    structure: {
      bank: 'family_members',
      patternEs: 'mi / mis [family member]',
      patternEn: 'my [family member]',
      build: (f) => ({
        es: f.es,
        en: f.en
      })
    }
  },
  { id: 'fam_madre', stage: 'family_s1', es: 'mi madre', altEs: ['mi mamá', 'la madre'], en: 'my mother / my mom', altEn: ['my mother', 'my mom'], note: '"Madre" = mother; "mamá" (with accent on final á) = mom.' },
  { id: 'fam_padre', stage: 'family_s1', es: 'mi padre', altEs: ['mi papá', 'el padre'], en: 'my father / my dad', altEn: ['my father', 'my dad'], note: '"Padre" = father; "papá" (with accent on final á) = dad ("papa" without accent = potato!).' },
  { id: 'fam_padres', stage: 'family_s1', es: 'mis padres', altEs: ['los padres'], en: 'my parents', altEn: ['parents'], note: 'Masculine plural "mis padres" refers to both mother and father together.' },
  { id: 'fam_hermano', stage: 'family_s1', es: 'mi hermano y mi hermana', altEs: ['mi hermano', 'mi hermana'], en: 'my brother and my sister', altEn: ['my brother and sister', 'brother and sister'], note: '"Hermano" = brother (-o); "Hermana" = sister (-a).' },
  { id: 'fam_esposo', stage: 'family_s1', es: 'mi esposo', altEs: ['mi esposa', 'mi marido', 'mi pareja'], en: 'my husband / my spouse', altEn: ['my husband', 'my wife', 'my spouse'], note: '"Esposo" = husband; "Esposa" = wife; "Pareja" = partner.' },
  { id: 'fam_hijos', stage: 'family_s1', es: 'mis hijos', altEs: ['mi hijo', 'mi hija'], en: 'my children (sons and daughters)', altEn: ['my children', 'my kids', 'my son', 'my daughter'], note: '"Hijo" = son, "hija" = daughter, "hijos" = children.' },
  { id: 'fam_abuelos', stage: 'family_s1', es: 'mis abuelos', altEs: ['mi abuelo', 'mi abuela'], en: 'my grandparents', altEn: ['grandparents', 'my grandfather', 'my grandmother'], note: '"Abuelo" = grandfather; "Abuela" = grandmother.' },
  { id: 'fam_tengo_hermanos', stage: 'family_s1', es: 'tengo [Siblings]', altEs: [], en: 'I have [number] brother(s) / sister(s)', altEn: ['i have siblings'], note: 'Use TENER + any number + hermano(s)/hermana(s) for siblings.', slotTemplate: { prefixEs: ['tengo', 'yo tengo'], suffixEs: ['hermano', 'hermanos', 'hermana', 'hermanas', 'mayor', 'mayores', 'menor', 'menores', 'gemelo', 'gemela'], slotHintEs: 'Siblings', patternEs: 'tengo [Siblings]' } },
  { id: 'fam_casado', stage: 'family_s1', es: 'estoy casado', altEs: ['estoy casada', 'soy casado', 'soy casada'], en: 'I am married', altEn: ['im married', 'i am married'], note: 'Marital status works with estar or ser: casado (m) / casada (f).' },
  { id: 'fam_soltero', stage: 'family_s1', es: 'soy soltero', altEs: ['soy soltera', 'estoy soltero', 'estoy soltera'], en: 'I am single', altEn: ['im single', 'i am single'], note: 'Soltero (masculine) / Soltera (feminine).' },
  { id: 'fam_mascota', stage: 'family_s1', es: 'tengo [Your pet]', altEs: [], en: 'I have [any pet]', altEn: ['i have a pet'], note: 'Say "tengo" + any pet in Spanish.', slotTemplate: { prefixEs: ['tengo', 'yo tengo'], suffixEs: [], slotHintEs: 'Your pet', patternEs: 'tengo [Your pet]' } },

  // Stage 2: Physical & Personality Descriptions (Adjectives with SER)
  {
    id: 'fam_alto_bajo',
    stage: 'family_s2',
    es: 'él es alto y ella es baja',
    altEs: ['es alto', 'es baja'],
    en: 'he is tall and she is short',
    altEn: ['he is tall', 'tall and short'],
    note: 'Adjectives match gender (-o/-a) and number (-s) with SER.',
    structure: {
      banks: ['ser_nouns', 'ser_adjectives'],
      filter: (n, a) => n.kind === 'person' && a.kinds.includes('person'),
      patternEs: '[person] es / son [adjective]',
      patternEn: '[person] is / are [adjective]',
      build: (n, a) => {
        const esVerb = n.num === 'p' ? 'son' : 'es';
        const enVerb = n.num === 'p' || n.enPluralVerb ? 'are' : 'is';
        return {
          es: `${n.es} ${esVerb} ${inflectSpanishAdj(a, n.g, n.num)}`,
          en: `${n.en} ${enVerb} ${a.en}`
        };
      }
    }
  },
  { id: 'fam_joven_mayor', stage: 'family_s2', es: 'es joven', altEs: ['él es joven', 'ella es joven'], en: 'he / she is young', altEn: ['is young', 'he is young', 'she is young'], note: 'Adjectives ending in -e or a consonant ("joven", "mayor", "inteligente") stay the same for masculine & feminine!' },
  {
    id: 'fam_simpatico',
    stage: 'family_s2',
    es: 'es muy simpático',
    altEs: ['es muy simpática', 'simpático'],
    en: 'he / she is very nice (friendly)',
    altEn: ['very nice', 'very friendly', 'he is very nice'],
    note: 'False friend alert: "simpático" means friendly/nice (NOT sympathetic!). Pair "es / son muy" + any adjective!',
    structure: {
      banks: ['ser_nouns', 'ser_adjectives'],
      filter: (n, a) => n.kind === 'person' && a.kinds.includes('person'),
      patternEs: '[person] es / son muy [adjective]',
      patternEn: '[person] is / are very [adjective]',
      build: (n, a) => {
        const esVerb = n.num === 'p' ? 'son' : 'es';
        const enVerb = n.num === 'p' || n.enPluralVerb ? 'are' : 'is';
        return {
          es: `${n.es} ${esVerb} muy ${inflectSpanishAdj(a, n.g, n.num)}`,
          en: `${n.en} ${enVerb} very ${a.en}`
        };
      }
    }
  },
  { id: 'fam_amable', stage: 'family_s2', es: 'la gente es muy amable', altEs: ['es muy amable', 'amable'], en: 'the people are very kind', altEn: ['people are very kind', 'very kind'], note: 'Note: "la gente" (people) is grammatically singular in Spanish ("la gente es").' },
  { id: 'fam_inteligente', stage: 'family_s2', es: 'es inteligente y trabajador', altEs: ['es inteligente', 'es trabajadora'], en: 'he / she is smart and hardworking', altEn: ['smart and hardworking', 'intelligent'], note: '"Trabajador" (m) / "trabajadora" (f) = hardworking.' },
  {
    id: 'fam_casa_grande',
    stage: 'family_s2',
    es: 'una casa grande y bonita',
    altEs: ['la casa es grande', 'una casa bonita'],
    en: 'a big and pretty house',
    altEn: ['a big pretty house', 'big house'],
    note: 'With SER, adjectives match the noun in gender (-o/-a) and number (-s).',
    structure: {
      banks: ['ser_nouns', 'ser_adjectives'],
      filter: (n, a) => n.kind !== 'person' && a.kinds.includes(n.kind),
      patternEs: '[place / thing] es / son [adjective]',
      patternEn: '[place / thing] is / are [adjective]',
      build: (n, a) => {
        const esVerb = n.num === 'p' ? 'son' : 'es';
        const enVerb = n.num === 'p' ? 'are' : 'is';
        return {
          es: `${n.es} ${esVerb} ${inflectSpanishAdj(a, n.g, n.num)}`,
          en: `${n.en} ${enVerb} ${a.en}`
        };
      }
    }
  },
  { id: 'fam_apartamento', stage: 'family_s2', es: 'el apartamento es pequeño', altEs: ['un apartamento pequeño'], en: 'the apartment is small', altEn: ['small apartment', 'the apartment is small'], note: 'Pequeño (m) / Pequeña (f) = small.' },
  { id: 'fam_nuevo_viejo', stage: 'family_s2', es: 'el carro es nuevo', altEs: ['un carro nuevo', 'el auto es nuevo'], en: 'the car is new', altEn: ['new car', 'the car is new'], note: 'In Panama, "car" is almost always "el carro" (or "el auto").' },
  { id: 'fam_caro_barato', stage: 'family_s2', es: 'no es caro, es barato', altEs: ['es barato', 'es caro'], en: 'it is not expensive, it is cheap', altEn: ['not expensive it is cheap', 'cheap'], note: '"Caro" = expensive; "Barato" = inexpensive / cheap.' },
  { id: 'fam_como_es', stage: 'family_s2', es: '¿cómo es tu casa?', altEs: ['cómo es tu casa', '¿cómo es?'], en: 'what is your house like?', altEn: ['what is your house like', 'what is it like'], note: '"¿Cómo estás?" (estar) asks how you feel; "¿Cómo es?" (ser) asks what someone/something is like!' },
  {
    id: 'fam_colores',
    stage: 'family_s2',
    es: 'blanco, negro, azul y rojo',
    altEs: ['azul y rojo', 'blanco y negro'],
    en: 'white, black, blue and red',
    altEn: ['white black blue and red'],
    note: 'Colors match gender (-o/-a) and plural (-s) of the noun they describe!',
    structure: {
      banks: ['ser_nouns', 'colors'],
      filter: (n) => n.kind === 'thing',
      patternEs: '[object] es / son [color]',
      patternEn: '[object] is / are [color]',
      build: (n, c) => {
        const esVerb = n.num === 'p' ? 'son' : 'es';
        const enVerb = n.num === 'p' ? 'are' : 'is';
        return {
          es: `${n.es} ${esVerb} ${inflectSpanishAdj(c, n.g, n.num)}`,
          en: `${n.en} ${enVerb} ${c.en}`
        };
      }
    }
  },
  { id: 'fam_verde', stage: 'family_s2', es: 'verde y amarillo', altEs: ['verde'], en: 'green and yellow', altEn: ['green and yellow'], note: '"Verde" = green, "amarillo" = yellow.' },

  // Stage 3: Temporary States, Locations (ESTAR) & Existence (HAY)
  {
    id: 'fam_estoy_contento',
    stage: 'family_s3',
    es: 'estoy muy contento hoy',
    altEs: ['estoy contenta', 'estoy feliz', 'estoy muy contento'],
    en: 'I am very happy today',
    altEn: ['i am very happy today', 'im very happy'],
    note: 'Use ESTAR (estoy, estás, está, estamos, están) for moods and temporary states!',
    structure: {
      bank: 'estar_moods',
      patternEs: 'estoy [mood] hoy',
      patternEn: 'I am [mood] today',
      build: (m) => ({
        es: `estoy ${m.ms} hoy`,
        altEs: [`estoy ${m.fs} hoy`, `yo estoy ${m.ms} hoy`, `yo estoy ${m.fs} hoy`],
        en: `I am ${m.en} today`
      })
    }
  },
  {
    id: 'fam_estoy_cansado',
    stage: 'family_s3',
    es: 'estoy un poco cansado',
    altEs: ['estoy cansado', 'estoy cansada'],
    en: 'I am a little tired',
    altEn: ['i am tired', 'im a little tired'],
    note: 'ESTAR + "un poco" + any temporary feeling!',
    structure: {
      bank: 'estar_moods',
      patternEs: 'estoy un poco [mood]',
      patternEn: 'I am a little [mood]',
      build: (m) => ({
        es: `estoy un poco ${m.ms}`,
        altEs: [`estoy un poco ${m.fs}`, `yo estoy un poco ${m.ms}`, `yo estoy un poco ${m.fs}`],
        en: `I am a little ${m.en}`
      })
    }
  },
  {
    id: 'fam_ocupado',
    stage: 'family_s3',
    es: 'estoy ocupado ahora',
    altEs: ['estoy ocupada', 'estoy ocupado'],
    en: 'I am busy right now',
    altEn: ['i am busy', 'im busy now'],
    note: '"Ahora" = now / right now — conjugate ESTAR (estoy / está / estamos / están) + mood!',
    structure: {
      banks: ['estar_subjects', 'estar_moods'],
      patternEs: '[subject] está [mood] ahora',
      patternEn: '[subject] [mood] right now',
      build: (subj, m) => ({
        es: `${subj.es} ${subj.verb} ${inflectSpanishAdj(m, subj.g, subj.num)} ahora`,
        altEs: subj.id === 'yo' ? [`estoy ${m.ms} ahora`, `estoy ${m.fs} ahora`, `yo estoy ${m.fs} ahora`] : [],
        en: `${subj.en} ${m.en} right now`
      })
    }
  },
  { id: 'fam_listo', stage: 'family_s3', es: 'ya estoy listo', altEs: ['estoy listo', 'estoy lista', 'ya estoy lista'], en: 'I am ready now', altEn: ['i am ready', 'im ready'], note: 'Clever A1 rule: "Estar listo" = to be ready; "Ser listo" = to be clever!' },
  {
    id: 'fam_abierto',
    stage: 'family_s3',
    es: 'la tienda está abierta',
    altEs: ['está abierto', 'está abierta'],
    en: 'the store is open',
    altEn: ['the shop is open', 'is open'],
    note: '"Abierto/a" matches the place gender and always uses ESTAR.',
    structure: {
      bank: 'places_town',
      filter: (p) => Boolean(p.openable),
      patternEs: '[place] está abierto / abierta',
      patternEn: '[place] is open',
      build: (p) => ({
        es: `${p.es} está ${p.g === 'f' ? 'abierta' : 'abierto'}`,
        en: `${p.en} is open`
      })
    }
  },
  {
    id: 'fam_cerrado',
    stage: 'family_s3',
    es: 'el banco está cerrado',
    altEs: ['está cerrado'],
    en: 'the bank is closed',
    altEn: ['the bank is closed', 'is closed'],
    note: 'Use ESTAR + "cerrado/a" for businesses or places that are closed.',
    structure: {
      bank: 'places_town',
      filter: (p) => Boolean(p.openable),
      patternEs: '[place] está cerrado / cerrada',
      patternEn: '[place] is closed',
      build: (p) => ({
        es: `${p.es} está ${p.g === 'f' ? 'cerrada' : 'cerrado'}`,
        en: `${p.en} is closed`
      })
    }
  },
  {
    id: 'fam_en_casa',
    stage: 'family_s3',
    es: 'estoy en mi casa',
    altEs: ['estoy en la casa', 'estoy en casa'],
    en: 'I am at home',
    altEn: ['im at home', 'i am at home'],
    note: 'All physical locations (even permanent buildings!) use ESTAR: "Estoy en..."',
    structure: {
      bank: 'places_town',
      patternEs: 'estoy en [place]',
      patternEn: 'I am at [place]',
      build: (p) => ({
        es: `estoy en ${p.es}`,
        altEs: [`yo estoy en ${p.es}`],
        en: `I am at ${p.en}`
      })
    }
  },
  { id: 'fam_cocina_bano', stage: 'family_s3', es: 'la cocina, la sala y el baño', altEs: ['la cocina y el baño'], en: 'the kitchen, the living room and the bathroom', altEn: ['kitchen living room and bathroom'], note: 'Core A1 home rooms: la cocina (kitchen), la sala (living room), el baño (bathroom).' },
  { id: 'fam_habitacion', stage: 'family_s3', es: 'mi habitación tiene aire acondicionado', altEs: ['la habitación', 'el cuarto'], en: 'my bedroom has air conditioning', altEn: ['my room has air conditioning', 'my bedroom has ac'], note: 'Essential in Panama: "aire acondicionado" (A/C)!' },
  { id: 'fam_hay', stage: 'family_s3', es: 'hay [Rooms] en la casa', altEs: [], en: 'there are [rooms] in the house', altEn: ['there are rooms in the house'], note: '"Hay" (pronounced like "eye") means both "there is" and "there are" — use any number & room!', slotTemplate: { prefixEs: ['hay'], suffixEs: ['en la casa', 'en mi casa'], slotHintEs: 'Rooms', patternEs: 'hay [Rooms] en la casa' } },
  {
    id: 'fam_hay_cerca',
    stage: 'family_s3',
    es: 'hay un supermercado cerca',
    altEs: ['¿hay un supermercado cerca?'],
    en: 'there is a supermarket nearby',
    altEn: ['is there a supermarket nearby', 'there is a supermarket near'],
    note: 'Use "Hay un/una... cerca" to say something exists nearby.',
    structure: {
      bank: 'places_town',
      patternEs: 'hay [place] cerca',
      patternEn: 'there is [place] nearby',
      build: (p) => ({
        es: `hay ${p.indefEs} cerca`,
        en: `there is ${p.indefEn} nearby`
      })
    }
  },
  {
    id: 'fam_no_hay',
    stage: 'family_s3',
    es: 'hoy no hay agua caliente',
    altEs: ['no hay'],
    en: 'there is no hot water today',
    altEn: ['there is no hot water', 'no hot water today'],
    note: '"Hoy no hay..." = there is no... today.',
    structure: {
      bank: 'home_essentials',
      patternEs: 'hoy no hay [essential]',
      patternEn: 'there is no [essential] today',
      build: (item) => ({
        es: `hoy no hay ${item.es}`,
        altEs: [`no hay ${item.es} hoy`],
        en: `there is no ${item.en} today`
      })
    }
  }
];

export default {
  id: 'family',
  meta,
  guide,
  items
};
