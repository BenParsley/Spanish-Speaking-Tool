import greetingsUnit from './a1-1-greetings.js';
import identityUnit from './a1-2-identity-ser.js';
import numbersUnit, {
  NUMBER_MIN,
  NUMBER_MAX,
  CORE_NUMBER_COUNT,
  SPANISH_NUMBERS,
  ENGLISH_NUMBERS,
  RANGE_BUCKETS,
  QUANTITY_SCENARIOS,
  getSpanishNumber,
  getEnglishNumber,
  applySpanishGender,
  buildQuantityScenarioPhrase,
  buildQuestionContext,
  detectQuantityScenarioFromSpanish,
  expandSpokenDigitsToSpanish,
  getNumbersPoolForRange,
  getNumbersStageVocabRows,
  getNumbersWordIntroDetails
} from './a1-3-numbers-time.js';
import familyUnit from './a1-4-family-estar.js';
import verbsUnit from './a1-5-verbs-routine.js';
import foodUnit from './a1-6-food-shopping.js';
import transitUnit from './a1-7-city-transit.js';
import a1LifeUnit from './a1-8-weather-health-plans.js';
import { FILL_BANKS } from './fill-banks.js';
import {
  PHRASE_MEMORY_TIPS,
  getNumberMemoryTip,
  getPhraseMemoryTip
} from './memory-tips.js';
import {
  SLOT_CONFIG_BY_ID,
  SLOT_OPTION_BANKS,
  buildFilledEnglishExampleForItem,
  detectMatchedSlotOptionsInSpanish,
  getAllFilledSpanishOptionsForItem,
  getDisplaySpanishForItem,
  getFilledSpanishForItem,
  getSlotConfigForItem,
  getSpeakableSpanishForItem,
  tokenizeDisplaySpanishWithSlots
} from './slot-options.js';
import {
  applySpanishContractions,
  getAllVariationsForStructure,
  getStructureVariationCount,
  inflectSpanishAdj,
  normalizeExtensionSlug,
  normalizeWordToken,
  polishEnglishGrammar,
  resolveDynamicQuestionInstance,
  tokenizeSpanishWords
} from './structure-engine.js';
import { normalizePhraseEnglish, normalizePhraseSpanish, stripAccents } from '../modules/utils.js';

export const CURRICULUM_UNITS = [
  greetingsUnit,
  identityUnit,
  numbersUnit,
  familyUnit,
  verbsUnit,
  foodUnit,
  transitUnit,
  a1LifeUnit
];

export const CATEGORY_ORDER = CURRICULUM_UNITS.map((unit) => unit.id);

export const CATEGORIES = Object.fromEntries(
  CURRICULUM_UNITS.map((unit) => {
    const baseStages = Array.isArray(unit.meta.stages) ? unit.meta.stages : [];
    const examStage = {
      stageKey: `${unit.id}_exam`,
      shortTitle: 'Topic Exam',
      label: `Final Exam: ${unit.meta.label} (90% to Pass)`,
      desc: 'Hard cumulative exam testing all stages of this topic together — 30 questions, 1 attempt each, no hints, 90% required.',
      hint: 'Score 90%+ (27/30) on the hard Topic Exam to unlock the next unit.',
      focusRule: 'Hard Topic Exam: All stages mixed · 1 attempt per question · No hints · 90% required.',
      isExam: true,
      ...(unit.id === 'numbers' ? { contextMode: 'mixed' } : {})
    };
    return [
      unit.id,
      {
        ...unit.meta,
        stages: [...baseStages, examStage]
      }
    ];
  })
);

export const CATEGORY_REFERENCE_GUIDES = Object.fromEntries(
  CURRICULUM_UNITS.map((unit) => [unit.id, unit.guide])
);

export const PHRASE_CURRICULUM = Object.fromEntries(
  CURRICULUM_UNITS
    .filter((unit) => Array.isArray(unit.items))
    .map((unit) => [
      unit.id,
      unit.items.map((item) => {
        if (!item.categoryId) item.categoryId = unit.id;
        return item;
      })
    ])
);

export const PHRASE_ITEM_MAP = (() => {
  const map = new Map();
  Object.entries(PHRASE_CURRICULUM).forEach(([catId, items]) => {
    items.forEach((item, index) => {
      map.set(item.id, { ...item, categoryId: catId, order: index + 1 });
    });
  });
  return map;
})();

export function getPhraseItemById(id) {
  return PHRASE_ITEM_MAP.get(id) || null;
}

export function getItemsForCategory(catId) {
  return PHRASE_CURRICULUM[catId] || [];
}

export function getCategoryItemCount(catId) {
  if (catId === 'numbers') return CORE_NUMBER_COUNT;
  return getItemsForCategory(catId).length;
}

export function getItemsForStage(catId, stageIndex) {
  const cat = CATEGORIES[catId];
  if (!cat || !cat.stages || !cat.stages[stageIndex]) return [];
  const stage = cat.stages[stageIndex];
  if (stage.isExam || !stage.stageKey) return getItemsForCategory(catId);
  return getItemsForCategory(catId).filter((item) => item.stage === stage.stageKey);
}

export function getActiveCategoryMeta(catId) {
  return CATEGORIES[catId] || CATEGORIES.numbers || CURRICULUM_UNITS[0].meta;
}

export function getNextCategoryInOrder(catId) {
  const idx = CATEGORY_ORDER.indexOf(catId);
  if (idx === -1 || idx >= CATEGORY_ORDER.length - 1) return null;
  return CATEGORIES[CATEGORY_ORDER[idx + 1]] || null;
}

export function expandSlashVariants(rawStr) {
  const str = String(rawStr || '').trim();
  if (!str) return [];
  const results = new Set([str]);
  if (str.includes('/')) {
    str
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((part) => results.add(part));

    const inlineMatch = str.match(/^(.*?\b)([a-zA-Z'’]+)\s*\/\s*([a-zA-Z'’]+)(\b.*)$/);
    if (inlineMatch) {
      const [, prefix, optA, optB, suffix] = inlineMatch;
      results.add(`${prefix}${optA}${suffix}`.replace(/\s+/g, ' ').trim());
      results.add(`${prefix}${optB}${suffix}`.replace(/\s+/g, ' ').trim());
    }
  }
  return Array.from(results);
}

export const EN_CONTRACTION_PAIRS = [
  ['i am', 'im'],
  ['you are', 'youre'],
  ['he is', 'hes'],
  ['she is', 'shes'],
  ['it is', 'its'],
  ['we are', 'were'],
  ['they are', 'theyre'],
  ['do not', 'dont'],
  ['does not', 'doesnt'],
  ['cannot', 'cant'],
  ['can not', 'cant'],
  ['what is', 'whats'],
  ['where is', 'wheres'],
  ['how is', 'hows'],
  ['let us', 'lets'],
  ['today is', 'todays']
];

export function buildPhraseEnglishCandidates(item) {
  if (!item) return [];
  const rawSeeds = [item.en, ...(item.altEn || [])];
  const parenMatches = String(item.en || '').match(/\(([^)]+)\)/g);
  if (parenMatches) {
    parenMatches.forEach((m) => {
      const inner = m.slice(1, -1).trim();
      if (
        inner &&
        !/^(informal|formal|polite|panama|slang|masc|fem|singular|plural)/i.test(inner)
      ) {
        rawSeeds.push(inner);
      }
    });
  }

  const expandedRaw = [];
  rawSeeds.forEach((seed) => {
    expandSlashVariants(seed).forEach((v) => expandedRaw.push(v));
    const withoutParen = String(seed || '').replace(/\([^)]*\)/g, ' ').trim();
    expandSlashVariants(withoutParen).forEach((v) => expandedRaw.push(v));
  });

  const candidates = new Set();
  const addWithContractions = (norm) => {
    if (!norm) return;
    candidates.add(norm);
    EN_CONTRACTION_PAIRS.forEach(([full, short]) => {
      const fullRe = new RegExp(`\\b${full}\\b`, 'g');
      const shortRe = new RegExp(`\\b${short}\\b`, 'g');
      if (fullRe.test(norm)) {
        candidates.add(norm.replace(fullRe, short).replace(/\s+/g, ' ').trim());
      }
      if (shortRe.test(norm)) {
        candidates.add(norm.replace(shortRe, full).replace(/\s+/g, ' ').trim());
      }
    });
  };

  expandedRaw.forEach((rawCandidate) => {
    const norm = normalizePhraseEnglish(rawCandidate);
    if (!norm) return;
    addWithContractions(norm);

    if (item.id !== 'g_por_favor' && /\bplease\b/.test(norm)) {
      const noPlease = norm.replace(/\bplease\b/g, ' ').replace(/\s+/g, ' ').trim();
      if (noPlease) addWithContractions(noPlease);
    }
    if (/^(a|an|the)\s+\S+/.test(norm) && item.stage !== 'identity_s3') {
      const noArt = norm.replace(/^(a|an|the)\s+/, '').trim();
      if (noArt) addWithContractions(noArt);
    }
  });

  return Array.from(candidates);
}

export function buildPhraseSpanishCandidates(item) {
  if (!item) return [];
  const rawSeeds = [item.es, ...(item.altEs || []), ...getAllFilledSpanishOptionsForItem(item)];
  const candidates = new Set();

  rawSeeds.forEach((seed) => {
    if (String(seed || '').includes('[')) return;
    expandSlashVariants(seed).forEach((variant) => {
      const norm = normalizePhraseSpanish(variant);
      if (!norm) return;
      if (item.slotTemplate && !matchesSlotTemplateSpanish(norm, item.slotTemplate)) {
        return;
      }
      candidates.add(norm);
      if (item.stage !== 'identity_s1') {
        const strippedPronoun = norm.replace(
          /^(yo|tú|tu|él|el|ella|usted|nosotros|nosotras|ellos|ellas|ustedes)\s+/,
          ''
        );
        if (strippedPronoun && strippedPronoun !== norm) {
          if (!item.slotTemplate || matchesSlotTemplateSpanish(strippedPronoun, item.slotTemplate)) {
            candidates.add(strippedPronoun);
          }
        }
      }
    });
  });

  return Array.from(candidates);
}

export function matchesSlotTemplateSpanish(rawSpanish, slotTemplate) {
  if (!slotTemplate || typeof slotTemplate !== 'object') return false;
  const clean = stripAccents(normalizePhraseSpanish(rawSpanish || ''));
  if (!clean) return false;
  const words = clean.split(/\s+/).filter(Boolean);
  const prefixes = (slotTemplate.prefixEs || [])
    .map((p) => stripAccents(normalizePhraseSpanish(p)))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  let remainder = clean;
  if (prefixes.length > 0) {
    let matchedPrefix = false;
    for (const p of prefixes) {
      const pWords = p.split(/\s+/).filter(Boolean);
      if (words.length <= pWords.length) continue;
      if (words.slice(0, pWords.length).join(' ') === p) {
        remainder = words.slice(pWords.length).join(' ').trim();
        matchedPrefix = true;
        break;
      }
    }
    if (!matchedPrefix || !remainder) return false;
  }

  const suffixes = (slotTemplate.suffixEs || [])
    .map((s) => stripAccents(normalizePhraseSpanish(s)))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  let slotBody = remainder;
  if (suffixes.length > 0) {
    const remWords = remainder.split(/\s+/).filter(Boolean);
    let matchedSuffix = false;
    for (const s of suffixes) {
      const sWords = s.split(/\s+/).filter(Boolean);
      if (remWords.length <= sWords.length) continue;
      if (remWords.slice(-sWords.length).join(' ') === s) {
        slotBody = remWords.slice(0, -sWords.length).join(' ').trim();
        matchedSuffix = true;
        break;
      }
    }
    if (!matchedSuffix || !slotBody) return false;
  }

  const mids = (slotTemplate.midEs || [])
    .map((m) => stripAccents(normalizePhraseSpanish(m)))
    .filter(Boolean);
  if (mids.length > 0) {
    const paddedBody = ` ${slotBody} `;
    const okMid = mids.some((m) => {
      const marker = ` ${m} `;
      const idx = paddedBody.indexOf(marker);
      if (idx === -1) return false;
      const before = paddedBody.slice(0, idx).trim();
      const after = paddedBody.slice(idx + marker.length).trim();
      return Boolean(before && after);
    });
    if (!okMid) return false;
  }

  return Boolean(slotBody.trim());
}

export {
  NUMBER_MIN,
  NUMBER_MAX,
  CORE_NUMBER_COUNT,
  SPANISH_NUMBERS,
  ENGLISH_NUMBERS,
  RANGE_BUCKETS,
  QUANTITY_SCENARIOS,
  getSpanishNumber,
  getEnglishNumber,
  applySpanishGender,
  buildQuantityScenarioPhrase,
  buildQuestionContext,
  detectQuantityScenarioFromSpanish,
  expandSpokenDigitsToSpanish,
  getNumbersPoolForRange,
  getNumbersStageVocabRows,
  getNumbersWordIntroDetails,
  PHRASE_MEMORY_TIPS,
  getPhraseMemoryTip,
  getNumberMemoryTip,
  SLOT_CONFIG_BY_ID,
  SLOT_OPTION_BANKS,
  FILL_BANKS,
  buildFilledEnglishExampleForItem,
  detectMatchedSlotOptionsInSpanish,
  getAllFilledSpanishOptionsForItem,
  getSlotConfigForItem,
  getDisplaySpanishForItem,
  getFilledSpanishForItem,
  getSpeakableSpanishForItem,
  tokenizeDisplaySpanishWithSlots,
  applySpanishContractions,
  getAllVariationsForStructure,
  getStructureVariationCount,
  inflectSpanishAdj,
  normalizeExtensionSlug,
  normalizeWordToken,
  polishEnglishGrammar,
  resolveDynamicQuestionInstance,
  tokenizeSpanishWords
};
