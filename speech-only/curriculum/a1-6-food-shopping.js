import { inflectSpanishAdj } from './structure-engine.js';

export const meta = {
  id: 'food',
  a1Code: 'A1.6',
  label: 'A1.6 Food & Shopping',
  active: true,
  subtitle: 'Unit 6/8 · Panamanian dishes, ordering, bills, and shopping.',
  description: 'Menus, dietary requests, payments, and clothing shopping.',
  grammarTitle: 'Unit 6 Grammar Notes',
  grammarRules: [
    'Polite ordering: "¿Me trae...?" (seated) and "¿Me da...?" (counter).',
    'Use "para" for recipients and purpose ("para llevar", "una mesa para dos").',
    'Contractions: "de + el" → "del", "a + el" → "al".'
  ],
  stages: [
    {
      stageKey: 'food_s1',
      shortTitle: 'Panamanian Menu Staples',
      label: 'Stage 1/3: Panamanian Menu Staples',
      desc: 'Local dishes and drinks (sancocho, patacones, chicha, café).',
      hint: 'Pass Stage 1 to unlock Stage 2.',
      focusRule: 'Use "de + ingredient" ("empanada de queso", "chicha de piña").'
    },
    {
      stageKey: 'food_s2',
      shortTitle: 'Ordering & Dietary Needs',
      label: 'Stage 2/3: Ordering & Dietary Needs',
      desc: 'Ordering, dine-in/takeout, and allergies/preferences.',
      hint: 'Pass Stage 2 to unlock Stage 3.',
      focusRule: '"Para comer aquí" (here) vs. "para llevar" (to go); "sin" = without.'
    },
    {
      stageKey: 'food_s3',
      shortTitle: 'Bills & Retail Shopping',
      label: 'Stage 3/3: Bills & Retail Shopping',
      desc: 'Paying, change ("vuelto"), sizes ("talla"), and store hours.',
      hint: 'Finish Stage 3 to unlock Unit 7.',
      focusRule: '"La cuenta, por favor" (the bill); "¿Cuánto cuesta?" (how much?).'
    }
  ]
};

export const guide = {
  heading: 'A1.6 Ordering, Fondas & Shopping',
  vocab: [
    ['sancocho / patacones', 'soup / plantains'],
    ['hojaldra / chicha', 'fried bread / juice'],
    ['¿me trae el menú?', 'bring me the menu?'],
    ['para comer aquí', 'for here (dine in)'],
    ['para llevar', 'to go (takeout)'],
    ['sin picante / hielo', 'no spice / no ice'],
    ['la cuenta, por favor', 'the check, please'],
    ['efectivo / sencillo', 'cash / small change']
  ],
  tips: [
    'In Panama, "chicha" means fresh blended fruit juice.',
    'Use "¿Me trae...?" at tables and "¿Me da...?" at counters.',
    'Contraction rule: "de + el" always becomes "del" ("plato del día").',
    'Always ask for "la cuenta, por favor" when ready to pay.',
    '"Sencillo" = small bills/coins; "el vuelto" = change back.',
    '"Me queda bien" = it fits me well (when shopping).'
  ]
};

export const items = [
  // Stage 1: Panamanian Dishes, Fondas & Café Staples
  {
    id: 'f_agua',
    stage: 'food_s1',
    es: 'un vaso de agua fría',
    altEs: ['agua fría', 'agua'],
    en: 'a glass of cold water',
    altEn: ['cold water', 'glass of water'],
    note: 'At a seated table in Panama, politely order any dish or drink with "¿Me trae... por favor?"',
    structure: {
      bank: 'panama_dishes_drinks',
      patternEs: '¿me trae [dish / drink] por favor?',
      patternEn: 'can you bring me [dish / drink] please?',
      build: (d) => ({
        es: `¿me trae ${d.es} por favor?`,
        altEs: [`me trae ${d.es} por favor`, `¿me trae ${d.es}?`, d.es],
        en: `can you bring me ${d.en} please?`
      })
    }
  },
  {
    id: 'f_cafe',
    stage: 'food_s1',
    es: 'un café negro',
    altEs: ['café negro', 'un café'],
    en: 'a black coffee',
    altEn: ['black coffee', 'coffee'],
    note: 'At a fonda or café counter in Panama, order with "¿Me da... por favor?"',
    structure: {
      bank: 'panama_dishes_drinks',
      patternEs: '¿me da [dish / drink] por favor?',
      patternEn: 'can you give me [dish / drink] please?',
      build: (d) => ({
        es: `¿me da ${d.es} por favor?`,
        altEs: [`me da ${d.es} por favor`, `¿me da ${d.es}?`, d.es],
        en: `can you give me ${d.en} please?`
      })
    }
  },
  { id: 'f_cafe_leche', stage: 'food_s1', es: 'café con leche', altEs: ['un café con leche'], en: 'coffee with milk', altEn: ['latte', 'coffee with milk'], note: '"Con" = with, "sin" = without ("café sin azúcar" = coffee without sugar).' },
  {
    id: 'f_chicha',
    stage: 'food_s1',
    es: 'una chicha de piña',
    altEs: ['chicha de piña', 'chicha'],
    en: 'a fresh pineapple juice drink (Panama)',
    altEn: ['pineapple drink', 'pineapple juice', 'fruit drink'],
    note: 'In Panama, "chicha" is fresh blended tropical fruit juice (maracuyá, piña, limón, saril).',
    structure: {
      bank: 'tropical_fruits',
      patternEs: 'una chicha de [fruit]',
      patternEn: 'a fresh [fruit] juice drink (Panama)',
      build: (fr) => ({
        es: `una chicha de ${fr.es}`,
        altEs: [`chicha de ${fr.es}`],
        en: `a fresh ${fr.en} juice drink`
      })
    }
  },
  { id: 'f_sancocho', stage: 'food_s1', es: 'un sancocho panameño', altEs: ['sancocho'], en: 'a Panamanian chicken soup', altEn: ['chicken soup', 'sancocho'], note: 'Panama\'s national comfort dish made with chicken, ñame root, and culantro.' },
  { id: 'f_patacones', stage: 'food_s1', es: 'patacones con pescado', altEs: ['patacones'], en: 'fried green plantains with fish', altEn: ['fried plantains', 'fried green plantains'], note: 'Crispy twice-fried green plantains served across Panama.' },
  { id: 'f_hojaldra', stage: 'food_s1', es: 'una hojaldra caliente', altEs: ['hojaldra', 'hojaldre'], en: 'a warm Panamanian fried bread', altEn: ['fried bread', 'hojaldra'], note: 'Classic golden Panamanian breakfast dough.' },
  { id: 'f_carimanola', stage: 'food_s1', es: 'una carimañola de carne', altEs: ['carimañola'], en: 'a yuca meat fritter', altEn: ['yuca fritter', 'meat fritter'], note: 'Cassava (yuca) roll stuffed with seasoned ground beef or cheese.' },
  { id: 'f_arroz_pollo', stage: 'food_s1', es: 'arroz con pollo y ensalada', altEs: ['arroz con pollo'], en: 'rice with chicken and salad', altEn: ['chicken and rice', 'rice with chicken'], note: 'Fonda staple served with potato salad and sweet plantains ("tajadas").' },
  { id: 'f_ceviche', stage: 'food_s1', es: 'ceviche de corvina', altEs: ['un ceviche'], en: 'sea bass ceviche', altEn: ['ceviche', 'fish ceviche'], note: 'Fresh citrus-cured fish famous at the Mercado de Mariscos.' },
  {
    id: 'f_empanada',
    stage: 'food_s1',
    es: 'una empanada de queso',
    altEs: ['empanada de queso'],
    en: 'a cheese empanada',
    altEn: ['cheese empanada', 'empanada'],
    note: '"De + ingredient" tells what a dish is made of ("de queso", "de pollo", "de carne").',
    structure: {
      bank: 'empanada_fillings',
      patternEs: 'una empanada de [filling]',
      patternEn: 'a [filling] empanada',
      build: (f) => ({
        es: `una empanada de ${f.es}`,
        altEs: [`empanada de ${f.es}`],
        en: `a ${f.en} empanada`
      })
    }
  },
  { id: 'f_cerveza', stage: 'food_s1', es: 'una cerveza bien fría', altEs: ['cerveza bien fría'], en: 'an ice-cold beer', altEn: ['ice cold beer', 'cold beer'], note: '"Bien" before an adjective means "very / extra" ("bien fría" = extra cold).' },

  // Stage 2: Ordering at a Restaurant & Dietary Needs
  { id: 'f_una_mesa', stage: 'food_s2', es: 'una mesa para [Number of people]', altEs: [], en: 'a table for [number] people', altEn: ['a table for'], note: 'Use "una mesa para [number] (personas)" for any group size.', slotTemplate: { prefixEs: ['una mesa para', 'mesa para'], suffixEs: [], slotHintEs: 'Number of people', patternEs: 'una mesa para [Number of people]' } },
  {
    id: 'f_el_menu',
    stage: 'food_s2',
    es: '¿me trae el menú por favor?',
    altEs: ['me trae el menú por favor', 'el menú por favor', 'la carta por favor'],
    en: 'can you bring me the menu please?',
    altEn: ['the menu please', 'bring me the menu'],
    note: '"¿Me trae...?" (can you bring me...?) is the most natural table request.',
    structure: {
      bank: 'restaurant_table_items',
      patternEs: '¿me trae [table item] por favor?',
      patternEn: 'can you bring me [table item] please?',
      build: (ti) => ({
        es: `¿me trae ${ti.es} por favor?`,
        altEs: [`me trae ${ti.es} por favor`, `¿me trae ${ti.es}?`],
        en: `can you bring me ${ti.en} please?`
      })
    }
  },
  { id: 'f_menu_dia', stage: 'food_s2', es: '¿cuál es el plato del día?', altEs: ['cuál es el plato del día', 'tienen menú del día'], en: 'what is the dish of the day?', altEn: ['daily special', 'dish of the day'], note: 'Note contraction: "de + el" always becomes "del" ("el plato del día").' },
  { id: 'f_quiero_pedir', stage: 'food_s2', es: 'estamos listos para pedir', altEs: ['quiero pedir', 'voy a pedir'], en: 'we are ready to order', altEn: ['ready to order', 'i want to order'], note: '"Estar listo para + infinitive" = to be ready to do something.' },
  { id: 'f_para_mi', stage: 'food_s2', es: 'para mí [Dish / Drink]', altEs: [], en: 'for me, [any dish or drink]', altEn: ['for me'], note: '"Para mí" + any dish or drink you want to order!', slotTemplate: { prefixEs: ['para mí', 'para mi'], suffixEs: [], slotHintEs: 'Dish / Drink', patternEs: 'para mí [Dish / Drink]' } },
  { id: 'f_que_recomienda', stage: 'food_s2', es: '¿qué me recomienda usted?', altEs: ['qué me recomienda usted', '¿qué me recomienda?'], en: 'what do you recommend?', altEn: ['what do you recommend'], note: 'Great A1 conversation starter at any Panamanian restaurant.' },
  {
    id: 'f_para_llevar',
    stage: 'food_s2',
    es: 'es para llevar',
    altEs: ['para llevar'],
    en: 'it is to go (takeout)',
    altEn: ['to go', 'takeout', 'for takeout'],
    note: '"Para llevar" = to go; "Para comer aquí" = for here / dine in.',
    structure: {
      bank: 'panama_dishes_drinks',
      patternEs: '[dish / drink] para llevar',
      patternEn: '[dish / drink] to go',
      build: (d) => ({
        es: `${d.es} para llevar`,
        en: `${d.en} to go`
      })
    }
  },
  {
    id: 'f_para_aqui',
    stage: 'food_s2',
    es: 'es para comer aquí',
    altEs: ['para comer aquí', 'para aquí'],
    en: 'it is for here (dine in)',
    altEn: ['for here', 'dine in'],
    note: 'Cashiers at fondas and cafés always ask: "¿Para comer aquí o para llevar?"',
    structure: {
      bank: 'panama_dishes_drinks',
      patternEs: '[dish / drink] para comer aquí',
      patternEn: '[dish / drink] for here',
      build: (d) => ({
        es: `${d.es} para comer aquí`,
        en: `${d.en} for here`
      })
    }
  },
  {
    id: 'f_sin_hielo',
    stage: 'food_s2',
    es: 'sin hielo y sin azúcar',
    altEs: ['sin hielo'],
    en: 'without ice and without sugar',
    altEn: ['no ice and no sugar', 'without ice'],
    note: '"Sin" = without ("sin hielo", "sin azúcar", "sin sal", "sin picante").',
    structure: {
      bank: 'ingredients_without',
      patternEs: 'sin [ingredient] por favor',
      patternEn: 'without [ingredient] please',
      build: (ing) => ({
        es: `sin ${ing.es} por favor`,
        altEs: [`sin ${ing.es}`],
        en: `without ${ing.en} please`
      })
    }
  },
  { id: 'f_sin_picante', stage: 'food_s2', es: 'sin picante por favor', altEs: ['no como picante'], en: 'not spicy please (no hot sauce)', altEn: ['not spicy', 'no spice', 'not spicy please'], note: 'Panamanian "ají chombo" habanero sauce is fiery — ask "sin picante" if you prefer mild!' },
  { id: 'f_vegetariano', stage: 'food_s2', es: 'soy vegetariano, no como carne', altEs: ['soy vegetariana', 'no como carne'], en: 'I am vegetarian, I do not eat meat', altEn: ['i am vegetarian', 'i do not eat meat'], note: 'Important A1 dietary phrase; also "soy alérgico/a a..." (I am allergic to...).' },
  {
    id: 'f_riquismo',
    stage: 'food_s2',
    es: 'la comida está muy rica',
    altEs: ['está riquísimo', 'está delicioso'],
    en: 'the food is very delicious',
    altEn: ['the food is delicious', 'it is delicious'],
    note: 'Use ESTAR ("está / están") to describe how a specific meal tastes right now!',
    structure: {
      banks: ['food_subjects', 'food_taste_adjectives'],
      patternEs: '[dish] está / están [taste adjective]',
      patternEn: '[dish] is / are [taste adjective]',
      build: (dish, adj) => ({
        es: `${dish.es} ${dish.num === 'p' ? 'están' : 'está'} ${inflectSpanishAdj(adj, dish.g, dish.num)}`,
        en: `${dish.en} ${dish.num === 'p' ? 'are' : 'is'} ${adj.en}`
      })
    }
  },

  // Stage 3: Paying the Bill & Shopping in Stores (CEFR A1 Commercial)
  { id: 'f_la_cuenta', stage: 'food_s3', es: 'la cuenta por favor', altEs: ['¿me trae la cuenta?'], en: 'the check / bill please', altEn: ['check please', 'the bill please'], note: 'In Panama, servers consider it impolite to drop the check until you ask for "la cuenta".' },
  {
    id: 'f_cuanto_es',
    stage: 'food_s3',
    es: '¿cuánto es en total?',
    altEs: ['cuánto es en total', 'cuánto cuesta esto'],
    en: 'how much is it in total?',
    altEn: ['how much is the total', 'how much in total'],
    note: 'Use "¿Cuánto cuesta...?" (singular) and "¿Cuánto cuestan...?" (plural) when shopping!',
    structure: {
      bank: 'retail_items',
      patternEs: '¿cuánto cuesta(n) [item]?',
      patternEn: 'how much is / are [item]?',
      build: (item) => ({
        es: `¿cuánto ${item.num === 'p' ? 'cuestan' : 'cuesta'} ${item.es}?`,
        altEs: [`cuánto ${item.num === 'p' ? 'cuestan' : 'cuesta'} ${item.es}`],
        en: `how much ${item.num === 'p' || item.en.startsWith('these ') ? 'are' : 'is'} ${item.en}?`
      })
    }
  },
  { id: 'f_aceptan_tarjeta', stage: 'food_s3', es: '¿aceptan tarjeta de crédito?', altEs: ['aceptan tarjeta de crédito', '¿aceptan tarjeta?', 'aceptan tarjeta'], en: 'do you accept credit cards?', altEn: ['do you accept card', 'do you take credit cards'], note: 'Many small fondas and fruit stalls only take cash ("efectivo") or Yappy.' },
  {
    id: 'f_en_efectivo',
    stage: 'food_s3',
    es: 'voy a pagar en efectivo',
    altEs: ['en efectivo'],
    en: 'I am going to pay in cash',
    altEn: ['in cash', 'pay in cash'],
    note: 'Everyday payments in Panama use US dollars in cash ("efectivo"), cards, or Yappy.',
    structure: {
      bank: 'payment_methods',
      patternEs: 'voy a pagar [payment method]',
      patternEn: 'I am going to pay [payment method]',
      build: (pm) => ({
        es: `voy a pagar ${pm.es}`,
        altEs: [`pago ${pm.es}`, pm.es],
        en: `I am going to pay ${pm.en}`
      })
    }
  },
  { id: 'f_tiene_sencillo', stage: 'food_s3', es: '¿tiene sencillo?', altEs: ['tiene sencillo', 'tiene cambio'], en: 'do you have small change / small bills?', altEn: ['do you have change', 'small change'], note: '"Sencillo" is the essential Panamanian word for coins and $1/$5 bills.' },
  { id: 'f_el_vuelto', stage: 'food_s3', es: 'quédese con el vuelto', altEs: ['el vuelto', 'el cambio'], en: 'keep the change', altEn: ['keep the change', 'the change'], note: '"El vuelto" = the change returned after paying.' },
  { id: 'f_separadas', stage: 'food_s3', es: 'cuentas separadas o todo junto', altEs: ['cuentas separadas', 'todo junto'], en: 'separate checks or all together', altEn: ['separate checks', 'all together'], note: 'Helpful when dining with friends in Panama City.' },
  { id: 'f_recibo', stage: 'food_s3', es: '¿me da la factura por favor?', altEs: ['me da la factura por favor', 'me da el recibo', 'el recibo por favor'], en: 'can I have the receipt / invoice please?', altEn: ['the receipt please', 'can i get the receipt'], note: 'In Panama, receipts are commonly called "la factura" or "el recibo".' },
  { id: 'f_camisa', stage: 'food_s3', es: 'estoy buscando [Item / Clothing]', altEs: [], en: 'I am looking for [any item / clothing]', altEn: ['i am looking for'], note: 'Say "estoy buscando" or "busco" + any item or clothing piece.', slotTemplate: { prefixEs: ['estoy buscando', 'busco', 'yo busco'], suffixEs: [], slotHintEs: 'Item / Clothing', patternEs: 'estoy buscando [Item / Clothing]' } },
  { id: 'f_talla', stage: 'food_s3', es: '¿la tiene en talla [Size]?', altEs: [], en: 'do you have it in size [any size]?', altEn: ['do you have it in size'], note: 'Clothing sizes use "la talla" + any size.', slotTemplate: { prefixEs: ['la tiene en talla', 'lo tiene en talla', 'tiene en talla', 'tienen en talla', 'en talla'], suffixEs: [], slotHintEs: 'Size', patternEs: '¿la tiene en talla [Size]?' } },
  {
    id: 'f_queda_bien',
    stage: 'food_s3',
    es: 'me queda muy bien',
    altEs: ['me queda bien'],
    en: 'it fits me very well',
    altEn: ['it fits me well', 'fits well'],
    note: '"Me queda + [fit]" works just like GUSTAR to describe how clothes fit!',
    structure: {
      bank: 'fit_phrases',
      patternEs: 'me queda [fit]',
      patternEn: 'it fits me [fit]',
      build: (fit) => ({
        es: `me queda ${fit.es}`,
        en: fit.id.startsWith('muy_') || fit.id.startsWith('un_poco') ? `it is ${fit.en} on me` : `it fits me ${fit.en}`
      })
    }
  },
  { id: 'f_horario', stage: 'food_s3', es: '¿a qué hora abren y cierran?', altEs: ['a qué hora abren y cierran', '¿a qué hora cierran?'], en: 'what time do you open and close?', altEn: ['what time do you close', 'what time do you open'], note: 'Essential A1 store-hours question ("abrir" = to open, "cerrar" = to close).' }
];

export default {
  id: 'food',
  meta,
  guide,
  items
};
