export const meta = {
  id: 'numbers',
  a1Code: 'A1.3',
  label: 'A1.3 Numbers & Time',
  active: true,
  subtitle: 'Unit 3/8 · Numbers 0–2000, dollar prices, telling time, and age.',
  description: 'Numbers 0–2000, prices, clock time, and age with TENER.',
  grammarTitle: 'Unit 3 Grammar Notes',
  grammarRules: [
    '16–29 are one word (dieciséis, veintidós); 31–99 use "y" (treinta y cinco).',
    '"Uno" → "un" before masculine nouns (un dólar) and "una" before feminine nouns.',
    'Time: "Es la una" (1:00) vs. "Son las [2–12]". Age uses TENER ("Tengo veinte años").'
  ],
  stages: [
    {
      contextMode: 'bare',
      shortTitle: 'Core Numbers 0–100',
      label: 'Stage 1/5: Core Numbers 0–100',
      desc: 'Numbers 0–100.',
      hint: 'Pass Stage 1 to unlock Stage 2.',
      focusRule: '16–29: one word; 31–99: "tens y ones".'
    },
    {
      contextMode: 'prices',
      shortTitle: 'Prices in Dollars',
      label: 'Stage 2/5: Prices in Dollars',
      desc: 'Prices in dólares (dollars).',
      hint: 'Pass Stage 2 to unlock Stage 3.',
      focusRule: '"Dólar" is masculine: "un dólar", "veintiún dólares".'
    },
    {
      contextMode: 'time',
      shortTitle: 'Telling Time',
      label: 'Stage 3/5: Telling Time',
      desc: 'Clock times ("la una", "las tres y cuarto", "y media").',
      hint: 'Pass Stage 3 to unlock Stage 4.',
      focusRule: '"la una" (1:00) vs. "las + 2–12".'
    },
    {
      contextMode: 'age',
      shortTitle: 'Age & Quantities',
      label: 'Stage 4/5: Age & Quantities',
      desc: 'Age ("años") and counting across 15 everyday quantity scenarios.',
      hint: 'Pass Stage 4 to unlock Stage 5.',
      focusRule: '"un" before masculine nouns (años, minutos, boletos) vs. "una" before feminine nouns (personas, horas, empanadas).'
    },
    {
      contextMode: 'mixed',
      shortTitle: 'Mixed A1 Contexts',
      label: 'Stage 5/5: Mixed A1 Contexts',
      desc: 'Mixed prices, times, ages, and quantities (0–2000).',
      hint: 'Finish Stage 5 to unlock Unit 4.',
      focusRule: 'Match "un / una / la una / las" to the noun or hour.'
    }
  ]
};

export const guide = {
  heading: 'A1.3 Numbers, Time & Money',
  vocab: [
    ['10 / 20 / 30', 'diez / veinte / treinta'],
    ['40 / 50', 'cuarenta / cincuenta'],
    ['60 / 70', 'sesenta / setenta'],
    ['80 / 90 / 100', 'ochenta / noventa / cien'],
    ['un dólar', '1 dollar'],
    ['es la una', 'it is 1:00'],
    ['son las dos', 'it is 2:00'],
    ['tengo ... años', 'I am ... years old']
  ],
  tips: [
    "16–19 ('dieci-') & 21–29 ('veinti-') are single words.",
    "31–99 use three words with 'y' ('treinta y dos').",
    'Prices use dólares (masculine: "un dólar", "veintiún dólares").',
    'Uno shortens to "un" before masculine nouns ("veintiún años").',
    'Time: "Es la una" (1:00) vs "Son las..." (2:00–12:00).',
    'Age uses TENER ("Tengo treinta años", never "soy").'
  ]
};

// Core Number Constants & Dictionaries (0–2000)
export const NUMBER_MIN = 0;
export const NUMBER_MAX = 100;
export const CORE_NUMBER_COUNT = NUMBER_MAX - NUMBER_MIN + 1;

export const EXACT_NUMBERS = {
  0: 'cero',
  1: 'uno',
  2: 'dos',
  3: 'tres',
  4: 'cuatro',
  5: 'cinco',
  6: 'seis',
  7: 'siete',
  8: 'ocho',
  9: 'nueve',
  10: 'diez',
  11: 'once',
  12: 'doce',
  13: 'trece',
  14: 'catorce',
  15: 'quince',
  16: 'dieciséis',
  17: 'diecisiete',
  18: 'dieciocho',
  19: 'diecinueve',
  20: 'veinte',
  21: 'veintiuno',
  22: 'veintidós',
  23: 'veintitrés',
  24: 'veinticuatro',
  25: 'veinticinco',
  26: 'veintiséis',
  27: 'veintisiete',
  28: 'veintiocho',
  29: 'veintinueve',
  100: 'cien'
};

export const TENS_ROOTS = {
  30: 'treinta',
  40: 'cuarenta',
  50: 'cincuenta',
  60: 'sesenta',
  70: 'setenta',
  80: 'ochenta',
  90: 'noventa'
};

export const HUNDREDS_ROOTS = {
  100: 'ciento',
  200: 'doscientos',
  300: 'trescientos',
  400: 'cuatrocientos',
  500: 'quinientos',
  600: 'seiscientos',
  700: 'setecientos',
  800: 'ochocientos',
  900: 'novecientos'
};

export const TRICKY_SET = [
  11, 12, 13, 14, 15, 16, 17, 19, 20, 22, 23, 26, 30, 40, 50, 55, 60, 66, 70, 77, 90, 100
];

export const RANGE_BUCKETS = [
  { label: '0 to 10', min: 0, max: 10 },
  { label: '11 to 19', min: 11, max: 19 },
  { label: '20 to 29', min: 20, max: 29 },
  { label: '30 to 39', min: 30, max: 39 },
  { label: '40 to 49', min: 40, max: 49 },
  { label: '50 to 59', min: 50, max: 59 },
  { label: '60 to 69', min: 60, max: 69 },
  { label: '70 to 79', min: 70, max: 79 },
  { label: '80 to 89', min: 80, max: 89 },
  { label: '90 to 100', min: 90, max: 100 }
];

const NUMBERS_STAGE_KEY_NUMS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 25, 30, 40, 50, 60, 70, 80, 90, 100
];

export const SPANISH_NUMBERS = (() => {
  const dict = {};
  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n++) {
    if (EXACT_NUMBERS[n] !== undefined) {
      dict[n] = EXACT_NUMBERS[n];
    } else {
      const tenVal = Math.floor(n / 10) * 10;
      const oneVal = n % 10;
      dict[n] = oneVal === 0 ? TENS_ROOTS[tenVal] : `${TENS_ROOTS[tenVal]} y ${EXACT_NUMBERS[oneVal]}`;
    }
  }
  return dict;
})();

export const ENGLISH_NUMBERS = (() => {
  const exactEn = {
    0: 'zero',
    1: 'one',
    2: 'two',
    3: 'three',
    4: 'four',
    5: 'five',
    6: 'six',
    7: 'seven',
    8: 'eight',
    9: 'nine',
    10: 'ten',
    11: 'eleven',
    12: 'twelve',
    13: 'thirteen',
    14: 'fourteen',
    15: 'fifteen',
    16: 'sixteen',
    17: 'seventeen',
    18: 'eighteen',
    19: 'nineteen',
    100: 'one hundred'
  };
  const tensEn = {
    20: 'twenty',
    30: 'thirty',
    40: 'forty',
    50: 'fifty',
    60: 'sixty',
    70: 'seventy',
    80: 'eighty',
    90: 'ninety'
  };
  const dict = {};
  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n++) {
    if (exactEn[n] !== undefined) {
      dict[n] = exactEn[n];
    } else {
      const tenVal = Math.floor(n / 10) * 10;
      const oneVal = n % 10;
      dict[n] = oneVal === 0 ? tensEn[tenVal] : `${tensEn[tenVal]}-${exactEn[oneVal]}`;
    }
  }
  return dict;
})();

// Dynamic Number Builders & Stage Helpers
export function getSpanishNumber(n) {
  if (SPANISH_NUMBERS[n] !== undefined) return SPANISH_NUMBERS[n];
  if (n < 0 || !Number.isInteger(n)) return String(n);
  if (n === 1000) return 'mil';
  if (n > 1000 && n < 2000) {
    return `mil ${getSpanishNumber(n - 1000)}`;
  }
  if (n === 2000) return 'dos mil';
  if (n > 100 && n < 1000) {
    const hundredVal = Math.floor(n / 100) * 100;
    const rem = n % 100;
    const root = HUNDREDS_ROOTS[hundredVal] || '';
    return rem === 0 ? root : `${root} ${getSpanishNumber(rem)}`;
  }
  return String(n);
}

export function getEnglishNumber(n) {
  if (ENGLISH_NUMBERS[n] !== undefined) return ENGLISH_NUMBERS[n];
  if (n < 0 || !Number.isInteger(n)) return String(n);
  if (n === 1000) return 'one thousand';
  if (n > 1000 && n < 2000) {
    return `one thousand ${getEnglishNumber(n - 1000)}`;
  }
  if (n === 2000) return 'two thousand';
  if (n > 100 && n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rem = n % 100;
    const base = `${ENGLISH_NUMBERS[hundreds]} hundred`;
    return rem === 0 ? base : `${base} ${getEnglishNumber(rem)}`;
  }
  return String(n);
}

export function applySpanishGender(numWord, gender) {
  if (gender === 'm') {
    if (numWord === 'uno') return 'un';
    if (numWord.endsWith(' veintiuno')) return `${numWord.slice(0, -9)} veintiún`;
    if (numWord === 'veintiuno') return 'veintiún';
    if (numWord.endsWith(' y uno')) return `${numWord.slice(0, -3)}un`;
    return numWord;
  }
  if (gender === 'f') {
    if (numWord === 'uno') return 'una';
    if (numWord.endsWith(' veintiuno')) return `${numWord.slice(0, -1)}a`;
    if (numWord === 'veintiuno') return 'veintiuna';
    if (numWord.endsWith(' y uno')) return `${numWord.slice(0, -1)}a`;
    return numWord;
  }
  return numWord;
}

export function expandSpokenDigitsToSpanish(rawStr) {
  const cleaned = String(rawStr || '').replace(/\$/g, ' ').trim();
  const replaced = cleaned.replace(/\b\d+\b/g, (m) => {
    const n = Number(m);
    if (Number.isInteger(n) && n >= 0 && n <= 9999) {
      return getSpanishNumber(n);
    }
    return m;
  });
  return replaced;
}

export const QUANTITY_SCENARIOS = [
  { id: 'personas', singularEs: 'persona', pluralEs: 'personas', gender: 'f', singularEn: 'person', pluralEn: 'people' },
  { id: 'minutos', singularEs: 'minuto', pluralEs: 'minutos', gender: 'm', singularEn: 'minute', pluralEn: 'minutes' },
  { id: 'horas', singularEs: 'hora', pluralEs: 'horas', gender: 'f', singularEn: 'hour', pluralEn: 'hours' },
  { id: 'dias', singularEs: 'día', pluralEs: 'días', gender: 'm', singularEn: 'day', pluralEn: 'days' },
  { id: 'semanas', singularEs: 'semana', pluralEs: 'semanas', gender: 'f', singularEn: 'week', pluralEn: 'weeks' },
  { id: 'meses', singularEs: 'mes', pluralEs: 'meses', gender: 'm', singularEn: 'month', pluralEn: 'months' },
  { id: 'tazas_cafe', singularEs: 'taza de café', pluralEs: 'tazas de café', gender: 'f', singularEn: 'cup of coffee', pluralEn: 'cups of coffee' },
  { id: 'botellas_agua', singularEs: 'botella de agua', pluralEs: 'botellas de agua', gender: 'f', singularEn: 'bottle of water', pluralEn: 'bottles of water' },
  { id: 'empanadas', singularEs: 'empanada', pluralEs: 'empanadas', gender: 'f', singularEn: 'empanada', pluralEn: 'empanadas' },
  { id: 'boletos', singularEs: 'boleto', pluralEs: 'boletos', gender: 'm', singularEn: 'ticket', pluralEn: 'tickets' },
  { id: 'manzanas', singularEs: 'manzana', pluralEs: 'manzanas', gender: 'f', singularEn: 'apple', pluralEn: 'apples' },
  { id: 'habitaciones', singularEs: 'habitación', pluralEs: 'habitaciones', gender: 'f', singularEn: 'room', pluralEn: 'rooms' },
  { id: 'maletas', singularEs: 'maleta', pluralEs: 'maletas', gender: 'f', singularEn: 'suitcase', pluralEn: 'suitcases' },
  { id: 'libros', singularEs: 'libro', pluralEs: 'libros', gender: 'm', singularEn: 'book', pluralEn: 'books' },
  { id: 'paginas', singularEs: 'página', pluralEs: 'páginas', gender: 'f', singularEn: 'page', pluralEn: 'pages' },
  { id: 'patacones', singularEs: 'patacón', pluralEs: 'patacones', gender: 'm', singularEn: 'fried plantain', pluralEn: 'fried plantains' },
  { id: 'hojaldras', singularEs: 'hojaldra', pluralEs: 'hojaldras', gender: 'f', singularEn: 'fried bread', pluralEn: 'fried breads' },
  { id: 'chichas', singularEs: 'chicha', pluralEs: 'chichas', gender: 'f', singularEn: 'fruit drink', pluralEn: 'fruit drinks' },
  { id: 'mangos', singularEs: 'mango', pluralEs: 'mangos', gender: 'm', singularEn: 'mango', pluralEn: 'mangos' },
  { id: 'platanos', singularEs: 'plátano', pluralEs: 'plátanos', gender: 'm', singularEn: 'plantain', pluralEn: 'plantains' },
  { id: 'buses', singularEs: 'bus', pluralEs: 'buses', gender: 'm', singularEn: 'bus', pluralEn: 'buses' },
  { id: 'paradas', singularEs: 'parada', pluralEs: 'paradas', gender: 'f', singularEn: 'bus stop', pluralEn: 'bus stops' },
  { id: 'camisas', singularEs: 'camisa', pluralEs: 'camisas', gender: 'f', singularEn: 'shirt', pluralEn: 'shirts' },
  { id: 'sillas', singularEs: 'silla', pluralEs: 'sillas', gender: 'f', singularEn: 'chair', pluralEn: 'chairs' },
  { id: 'amigos', singularEs: 'amigo', pluralEs: 'amigos', gender: 'm', singularEn: 'friend', pluralEn: 'friends' }
];

export function buildQuantityScenarioPhrase(num, scenario) {
  const baseEs = getSpanishNumber(num);
  const sc = scenario || QUANTITY_SCENARIOS[0];
  const isOne = num === 1;
  const nounEs = isOne ? sc.singularEs : sc.pluralEs;
  const nounEn = isOne ? sc.singularEn : sc.pluralEn;
  const adjEs = applySpanishGender(baseEs, sc.gender);
  const fullEs = `${adjEs} ${nounEs}`;
  return {
    id: sc.id,
    gender: sc.gender,
    nounEs,
    nounEn,
    adjEs,
    fullEs,
    promptEn: `${num} ${nounEn}`,
    hasGenderRule: adjEs !== baseEs
  };
}

export function detectQuantityScenarioFromSpanish(spokenText, num = null) {
  const clean = String(spokenText || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿¡?!.,;:()"'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return '';

  const norm = (str) =>
    String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  if (Number.isInteger(num)) {
    for (const sc of QUANTITY_SCENARIOS) {
      const fullNorm = norm(buildQuantityScenarioPhrase(num, sc).fullEs);
      if (clean === fullNorm) return sc.id;
    }
  }
  const padded = ` ${clean} `;
  for (const sc of QUANTITY_SCENARIOS) {
    const plural = norm(sc.pluralEs);
    const singular = norm(sc.singularEs);
    if (padded.includes(` ${plural} `) || padded.includes(` ${singular} `)) {
      return sc.id;
    }
  }
  return '';
}

export function buildQuestionContext(
  num,
  contextMode,
  { quantityScenarioId = '', excludedScenarioIds = [] } = {}
) {
  const baseEs = getSpanishNumber(num);

  if (!contextMode || contextMode === 'bare' || (num > 100 && contextMode !== 'prices')) {
    return {
      isContext: false,
      resolvedMode: 'bare',
      badgeLabel: num > 100 ? 'Extended (100+)' : '',
      promptEn: String(num),
      promptEs: baseEs,
      answerEs: baseEs,
      altAnswersEs: num === 100 ? ['ciento'] : [],
      answerEn: String(num),
      spokenEs: baseEs,
      grammarNote: num === 500 || num === 700 || num === 900
        ? `Irregular hundred: ${num} = ${baseEs}`
        : ''
    };
  }

  let mode = contextMode;
  if (mode === 'mixed') {
    const modes = ['prices', 'time', 'age'];
    mode = modes[num % modes.length];
  }

  if (mode === 'prices') {
    const unitEs = num === 1 ? 'dólar' : 'dólares';
    const unitEn = num === 1 ? 'dollar' : 'dollars';
    const adjEs = applySpanishGender(baseEs, 'm');
    const fullEs = `${adjEs} ${unitEs}`;
    const hasApoc = adjEs !== baseEs;
    const baseWordCount = adjEs.trim().split(/\s+/).filter(Boolean).length;
    const extWordCount = unitEs.trim().split(/\s+/).filter(Boolean).length;
    return {
      isContext: true,
      resolvedMode: 'prices',
      hasExtension: true,
      baseEs: adjEs,
      baseAltEs: Array.from(new Set([adjEs, baseEs, num === 100 ? 'ciento' : ''].filter(Boolean))),
      extensionEs: unitEs,
      extensionEn: unitEn,
      extensionKey: 'numbers::dolares',
      extensionLabelEs: 'dólar / dólares',
      extensionLabelEn: 'dollar(s)',
      extensionGroup: 'numbers_prices',
      baseWordIndices: Array.from({ length: baseWordCount }, (_, i) => i),
      extensionWordIndices: Array.from({ length: extWordCount }, (_, i) => baseWordCount + i),
      badgeLabel: 'Price (Dollars)',
      promptEn: `$${num} ${unitEn}`,
      promptEs: fullEs,
      answerEs: fullEs,
      altAnswersEs: [],
      answerEn: String(num),
      spokenEs: fullEs,
      grammarNote: hasApoc
        ? `Apocopation: uno -> un before masculine "${unitEs}"`
        : ''
    };
  }

  if (mode === 'time') {
    const minute = num % 60;
    const hour = (num % 12) + 1;
    const hourEs = hour === 1 ? 'la una' : `las ${getSpanishNumber(hour)}`;
    const minEs = minute === 0 ? 'en punto' : minute === 15 ? 'y cuarto' : minute === 30 ? 'y media' : `y ${getSpanishNumber(minute)}`;
    const minAltEs = minute === 15 ? `${hourEs} y quince` : minute === 30 ? `${hourEs} y treinta` : '';
    const fullEs = `${hourEs} ${minEs}`;
    const minDisplay = String(minute).padStart(2, '0');
    return {
      isContext: true,
      resolvedMode: 'time',
      badgeLabel: 'La Hora (Time)',
      promptEn: `${hour}:${minDisplay}`,
      promptEs: fullEs,
      answerEs: fullEs,
      altAnswersEs: minAltEs ? [minAltEs] : [],
      answerEn: `${hour}:${minDisplay}`,
      spokenEs: hour === 1 ? `Es ${fullEs}` : `Son ${fullEs}`,
      grammarNote: minute === 15 ? 'y cuarto = quarter past' : minute === 30 ? 'y media = half past' : ''
    };
  }

  // 'age' / counting quantities across 15 everyday scenarios with masculine & feminine agreement
  const isQuantity =
    Boolean(quantityScenarioId) ||
    num === 0 ||
    num === 1 ||
    num % 2 === 0 ||
    num === 21 ||
    num === 51 ||
    num === 81;

  if (isQuantity) {
    const excludedSet = new Set(Array.isArray(excludedScenarioIds) ? excludedScenarioIds : []);
    const availableScenarios = QUANTITY_SCENARIOS.filter((s) => !excludedSet.has(s.id));
    const activePool = availableScenarios.length > 0 ? availableScenarios : QUANTITY_SCENARIOS;

    const pickedScenario =
      activePool.find((s) => s.id === quantityScenarioId) ||
      activePool[(Math.abs(num) * 7 + 3) % activePool.length];
    const primary = buildQuantityScenarioPhrase(num, pickedScenario);
    const altAnswersEs = activePool
      .filter((s) => s.id !== pickedScenario.id)
      .map((s) => buildQuantityScenarioPhrase(num, s).fullEs);

    const baseWordCount = primary.adjEs.trim().split(/\s+/).filter(Boolean).length;
    const extWordCount = primary.nounEs.trim().split(/\s+/).filter(Boolean).length;

    return {
      isContext: true,
      isQuantity: true,
      resolvedMode: 'age',
      hasExtension: true,
      baseEs: primary.adjEs,
      baseAltEs: Array.from(new Set([primary.adjEs, baseEs, applySpanishGender(baseEs, 'm'), applySpanishGender(baseEs, 'f'), num === 100 ? 'ciento' : ''].filter(Boolean))),
      extensionEs: primary.nounEs,
      extensionEn: primary.nounEn,
      extensionKey: `numbers::${pickedScenario.id}`,
      extensionLabelEs: pickedScenario.pluralEs,
      extensionLabelEn: pickedScenario.pluralEn,
      extensionGroup: 'numbers_quantities',
      baseWordIndices: Array.from({ length: baseWordCount }, (_, i) => i),
      extensionWordIndices: Array.from({ length: extWordCount }, (_, i) => baseWordCount + i),
      quantityScenarioId: pickedScenario.id,
      quantityScenarios: QUANTITY_SCENARIOS,
      quantityNounEs: primary.nounEs,
      quantityNounEn: primary.nounEn,
      quantityGender: pickedScenario.gender,
      badgeLabel:
        pickedScenario.gender === 'f'
          ? `Quantity (Feminine · ${activePool.length} available)`
          : `Quantity (Masculine · ${activePool.length} available)`,
      promptEn: primary.promptEn,
      promptEs: primary.fullEs,
      answerEs: primary.fullEs,
      altAnswersEs,
      answerEn: String(num),
      spokenEs: primary.fullEs,
      grammarNote: primary.hasGenderRule
        ? pickedScenario.gender === 'f'
          ? `Feminine agreement: uno -> una before "${primary.nounEs}"`
          : `Apocopation: uno -> un before masculine "${primary.nounEs}"`
        : ''
    };
  }

  const nounEs = num === 1 ? 'año' : 'años';
  const nounEn = num === 1 ? 'year old' : 'years old';
  const adjEs = applySpanishGender(baseEs, 'm');
  const fullEs = `${adjEs} ${nounEs}`;
  const hasGenderRule = adjEs !== baseEs;
  const ageBaseWordCount = adjEs.trim().split(/\s+/).filter(Boolean).length;
  const ageExtWordCount = nounEs.trim().split(/\s+/).filter(Boolean).length;
  return {
    isContext: true,
    isQuantity: false,
    resolvedMode: 'age',
    hasExtension: true,
    baseEs: adjEs,
    baseAltEs: Array.from(new Set([adjEs, baseEs, num === 100 ? 'ciento' : ''].filter(Boolean))),
    extensionEs: nounEs,
    extensionEn: nounEn,
    extensionKey: 'numbers::anos',
    extensionLabelEs: 'año / años',
    extensionLabelEn: 'year(s) old',
    extensionGroup: 'numbers_age',
    baseWordIndices: Array.from({ length: ageBaseWordCount }, (_, i) => i),
    extensionWordIndices: Array.from({ length: ageExtWordCount }, (_, i) => ageBaseWordCount + i),
    badgeLabel: 'Age (Años)',
    promptEn: `${num} ${nounEn}`,
    promptEs: fullEs,
    answerEs: fullEs,
    altAnswersEs: [],
    answerEn: String(num),
    spokenEs: fullEs,
    grammarNote: hasGenderRule
      ? `Apocopation: uno -> un before masculine "${nounEs}"`
      : ''
  };
}

export function getNumbersPoolForRange(rangeKey, { dueNumbers = [], reviewNumbers = [] } = {}) {
  switch (rangeKey) {
    case '0-15':
      return Array.from({ length: 16 }, (_, i) => i);
    case '16-29':
      return Array.from({ length: 14 }, (_, i) => i + 16);
    case '30-99':
      return Array.from({ length: 70 }, (_, i) => i + 30);
    case 'tens':
      return [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    case 'tricky':
      return [...TRICKY_SET];
    case '100-999':
      return [
        100, 101, 115, 125, 142, 175, 199,
        200, 214, 250, 280,
        300, 315, 340, 365,
        400, 420, 475,
        500, 505, 515, 550, 590,
        600, 630, 666,
        700, 710, 750, 777,
        800, 825, 888,
        900, 915, 950, 999
      ];
    case '100-2000':
      return [
        100, 120, 150, 200, 250, 300, 350, 400, 450,
        500, 550, 600, 650, 700, 750, 800, 850, 900, 950,
        1000, 1050, 1100, 1200, 1250, 1500, 1750, 1900, 2000
      ];
    case 'srs':
      return dueNumbers.length > 0 ? dueNumbers : Array.from({ length: CORE_NUMBER_COUNT }, (_, i) => i);
    case 'mistakes':
      return reviewNumbers.length > 0 ? reviewNumbers : Array.from({ length: CORE_NUMBER_COUNT }, (_, i) => i);
    default:
      return Array.from({ length: CORE_NUMBER_COUNT }, (_, i) => i);
  }
}

export function getNumbersStageVocabRows(stageIndex, { counts, isProficientFn } = {}) {
  const stage = meta.stages?.[stageIndex];
  const mode = stage?.contextMode || 'bare';
  if (mode === 'prices') {
    return [
      { es: 'un dólar', en: '$1.00' },
      { es: 'cinco dólares', en: '$5.00' },
      { es: 'diez dólares', en: '$10.00' },
      { es: 'quince dólares', en: '$15.00' },
      { es: 'veintiún dólares', en: '$21.00' },
      { es: 'veinticinco dólares', en: '$25.00' },
      { es: 'treinta y un dólares', en: '$31.00' },
      { es: 'cincuenta dólares', en: '$50.00' },
      { es: 'setenta y cinco dólares', en: '$75.00' },
      { es: 'cien dólares', en: '$100.00' }
    ];
  }
  if (mode === 'time') {
    return [
      { es: 'Es la una en punto', en: '1:00' },
      { es: 'Es la una y cuarto', en: '1:15' },
      { es: 'Es la una y media', en: '1:30' },
      { es: 'Son las dos en punto', en: '2:00' },
      { es: 'Son las tres y cuarto', en: '3:15' },
      { es: 'Son las cuatro y media', en: '4:30' },
      { es: 'Son las cinco menos cuarto', en: '4:45' },
      { es: 'Son las ocho y veinte', en: '8:20' },
      { es: 'Son las diez y diez', en: '10:10' },
      { es: 'Son las doce (mediodía / medianoche)', en: '12:00' }
    ];
  }
  if (mode === 'age') {
    return [
      { es: 'Tengo dieciocho años', en: '18 yrs old' },
      { es: 'Tengo veintiún años', en: '21 yrs old' },
      { es: 'Tengo treinta años', en: '30 yrs old' },
      { es: 'una persona', en: '1 person (fem)' },
      { es: 'veintiún minutos', en: '21 minutes (masc)' },
      { es: 'dos horas', en: '2 hours (fem)' },
      { es: 'treinta y un días', en: '31 days (masc)' },
      { es: 'dos tazas de café', en: '2 cups of coffee (fem)' },
      { es: 'tres empanadas', en: '3 empanadas (fem)' },
      { es: 'cinco boletos', en: '5 tickets (masc)' },
      { es: 'cuatro manzanas', en: '4 apples (fem)' },
      { es: 'veintiuna páginas', en: '21 pages (fem)' }
    ];
  }
  if (mode === 'mixed') {
    return [
      { es: 'cien / ciento uno', en: '100 / 101' },
      { es: 'doscientos / trescientos', en: '200 / 300' },
      { es: 'cuatrocientos / quinientos', en: '400 / 500' },
      { es: 'seiscientos / setecientos', en: '600 / 700' },
      { es: 'ochocientos / novecientos', en: '800 / 900' },
      { es: 'mil / dos mil', en: '1,000 / 2,000' },
      { es: 'veintiún dólares', en: '$21.00' },
      { es: 'Son las tres y media', en: '3:30' },
      { es: 'Tengo veinticinco años', en: '25 yrs old' }
    ];
  }

  return NUMBERS_STAGE_KEY_NUMS.map((n) => {
    const entry = counts?.[n];
    const correct = Math.max(0, Number(entry?.correct) || 0);
    const total = correct + Math.max(0, Number(entry?.incorrect) || 0);
    return {
      introKey: `num:${n}`,
      es: SPANISH_NUMBERS[n],
      en: String(n),
      isProficient: isProficientFn ? isProficientFn(entry) : false,
      correct,
      total
    };
  });
}

export function getNumbersWordIntroDetails(itemOrNum, stageIndex, buildPronunciationFn) {
  const stageMeta = meta.stages?.[stageIndex] || {};
  const n = Number(itemOrNum);
  const es = SPANISH_NUMBERS[n] || String(n);
  const en = String(n);
  let usage = stageMeta.desc || 'Core Spanish number used for counting, prices, age, and time.';
  let tip = stageMeta.focusRule || 'Break larger numbers into tens + "y" + ones.';
  if (n >= 16 && n <= 19) {
    usage = `Used for ${n} in counting, prices, and time.`;
    tip = `16–19 combine "dieci-" (10) + the ones digit into a single word ("${es}").`;
  } else if (n >= 21 && n <= 29) {
    usage = `Used for ${n} in counting, prices, and time.`;
    tip = `21–29 combine "veinti-" (20) + the ones digit into one word ("${es}").`;
  } else if (n >= 31 && n <= 99 && n % 10 !== 0) {
    usage = `Used for ${n} in counting, prices, and time.`;
    tip = `31–99 use three words: tens + "y" + ones ("${es}").`;
  }
  return {
    introKey: `num:${n}`,
    stageKey: `numbers:${stageIndex}`,
    es,
    en,
    usage,
    pronunciation: buildPronunciationFn ? buildPronunciationFn(es) : '',
    tip
  };
}

export default {
  id: 'numbers',
  isDynamicNumbers: true,
  itemCount: CORE_NUMBER_COUNT,
  meta,
  guide,
  items: null
};
