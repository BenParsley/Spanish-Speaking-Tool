import { CATEGORIES, CATEGORY_ORDER } from '../curriculum/index.js';

export const SKILL_PILLARS = ['read', 'write', 'listen', 'speak'];

export const SKILL_META = {
  read: { key: 'read', label: 'Reading', shortLabel: 'Read', desc: 'Panamanian Spanish to English' },
  write: { key: 'write', label: 'Writing', shortLabel: 'Write', desc: 'English to Panamanian Spanish' },
  listen: { key: 'listen', label: 'Listening', shortLabel: 'Listen', desc: 'Audio comprehension' },
  speak: { key: 'speak', label: 'Speaking', shortLabel: 'Speak', desc: 'Panamanian pronunciation (es-PA)' }
};

export const PRESET_STAGE_THRESHOLD = 120;
export const PRESET_SKILL_MAX_ATTEMPTS = 45;
export const PRESET_STAGE_MIN_ACCURACY = 85;
export const STAGE_ITEM_MIN_CORRECT = 8;
export const STAGE_PHRASE_MULTIPLIER = 3;
export const TOPIC_EXAM_QUESTION_COUNT = 30;
export const TOPIC_EXAM_MIN_ACCURACY = 90;

export function getActiveSkillPillarsForMode() {
  return ['speak'];
}

export function createEmptySkillsMap() {
  return {
    read: { correct: 0, total: 0 },
    write: { correct: 0, total: 0 },
    listen: { correct: 0, total: 0 },
    speak: { correct: 0, total: 0 }
  };
}

export function getStageSkillTargets(threshold = 20) {
  const safe = Math.max(4, Math.floor(Number(threshold) || 20));
  const base = Math.floor(safe / 4);
  const rem = safe % 4;
  return {
    read: base + (rem > 0 ? 1 : 0),
    write: base + (rem > 1 ? 1 : 0),
    listen: base + (rem > 2 ? 1 : 0),
    speak: base
  };
}

export function normalizeSkillsMap(rawSkills, fallbackCorrect = 0, fallbackTotal = 0, threshold = 32) {
  const map = createEmptySkillsMap();
  if (rawSkills && typeof rawSkills === 'object') {
    let anyData = false;
    SKILL_PILLARS.forEach((key) => {
      const src = rawSkills[key];
      if (src && typeof src === 'object') {
        const total = Math.max(0, Math.floor(Number(src.total) || 0));
        const correct = Math.min(total, Math.max(0, Math.floor(Number(src.correct) || 0)));
        map[key] = { correct, total };
        if (total > 0 || correct > 0) anyData = true;
      }
    });
    if (anyData) return map;
  }

  // Migrate legacy stageCorrect/stageTotal into Reading -> Writing -> Listening -> Speaking
  let remCorrect = Math.max(0, Math.floor(Number(fallbackCorrect) || 0));
  let remWrong = Math.max(0, Math.floor(Number(fallbackTotal) || 0) - remCorrect);
  const targets = getStageSkillTargets(threshold);
  SKILL_PILLARS.forEach((key) => {
    if (remCorrect <= 0 && remWrong <= 0) return;
    const takeCorrect = Math.min(remCorrect, targets[key]);
    remCorrect -= takeCorrect;
    const takeWrong = key === 'read' ? remWrong : 0;
    remWrong -= takeWrong;
    map[key] = { correct: takeCorrect, total: takeCorrect + takeWrong };
  });
  return map;
}

export function createDefaultProgressionConfig() {
  return {
    enabled: true,
    threshold: PRESET_STAGE_THRESHOLD,
    minAccuracy: PRESET_STAGE_MIN_ACCURACY
  };
}

export function createDefaultUnitProgress() {
  return {
    stageIndex: 0,
    stageCorrect: 0,
    stageTotal: 0,
    skills: createEmptySkillsMap(),
    stageSkills: {},
    stageRecentOutcomes: {},
    completedStages: [],
    skippedStages: [],
    recentOutcomes: []
  };
}

export function createDefaultCategoryProgress() {
  const map = {};
  for (const catId of CATEGORY_ORDER) {
    map[catId] = createDefaultUnitProgress();
  }
  return map;
}

export function isCategoryCompletedInMap(catId, categoryProgressMap) {
  const cat = CATEGORIES[catId];
  if (!cat || !cat.stages || cat.stages.length === 0) return false;
  const prog = categoryProgressMap?.[catId];
  if (!prog) return false;
  const completed = Array.isArray(prog.completedStages) ? prog.completedStages : [];
  return cat.stages.every((_, idx) => completed.includes(idx));
}

export function isCategoryUnlockedInMap(catId) {
  return Boolean(CATEGORIES[catId]);
}

export function getPreviousBlockingCategoryInMap(catId, categoryProgressMap) {
  const idx = CATEGORY_ORDER.indexOf(catId);
  for (let i = 0; i < idx; i++) {
    const prevId = CATEGORY_ORDER[i];
    if (!isCategoryCompletedInMap(prevId, categoryProgressMap)) {
      return CATEGORIES[prevId];
    }
  }
  return CATEGORIES[CATEGORY_ORDER[0]];
}

export function getHighestUnlockedCategoryIdInMap(categoryProgressMap) {
  for (let i = 0; i < CATEGORY_ORDER.length; i++) {
    const catId = CATEGORY_ORDER[i];
    if (
      isCategoryUnlockedInMap(catId, categoryProgressMap) &&
      !isCategoryCompletedInMap(catId, categoryProgressMap)
    ) {
      return catId;
    }
  }
  for (let i = CATEGORY_ORDER.length - 1; i >= 0; i--) {
    if (isCategoryUnlockedInMap(CATEGORY_ORDER[i], categoryProgressMap)) {
      return CATEGORY_ORDER[i];
    }
  }
  return CATEGORY_ORDER[0];
}

export function normalizeProgressionBundle(parsed, isSpeakOnly = true) {
  const defaultProgress = createDefaultCategoryProgress();
  const progressionConfig = createDefaultProgressionConfig();
  const activePillars = getActiveSkillPillarsForMode(isSpeakOnly);

  const categoryProgress = defaultProgress;
  const rawMap =
    parsed && parsed.categoryProgress && typeof parsed.categoryProgress === 'object'
      ? parsed.categoryProgress
      : null;

  for (const catId of CATEGORY_ORDER) {
    const maxIdx = Math.max(0, CATEGORIES[catId].stages.length - 1);
    const src =
      rawMap && rawMap[catId] && typeof rawMap[catId] === 'object'
        ? rawMap[catId]
        : catId === 'numbers' && parsed && parsed.progression && typeof parsed.progression === 'object'
          ? parsed.progression
          : null;

    if (src) {
      const stageIndex = Math.min(maxIdx, Math.max(0, Math.floor(Number(src.stageIndex) || 0)));
      const legacyTotal = Math.max(0, Math.floor(Number(src.stageTotal) || 0));
      const legacyCorrect = Math.min(legacyTotal, Math.max(0, Math.floor(Number(src.stageCorrect) || 0)));
      const skills = normalizeSkillsMap(
        src.skills,
        legacyCorrect,
        legacyTotal,
        progressionConfig.threshold
      );
      const stageCorrect = activePillars.reduce((s, k) => s + skills[k].correct, 0);
      const stageTotal = activePillars.reduce((s, k) => s + skills[k].total, 0);
      const stageSkills = {};
      if (src.stageSkills && typeof src.stageSkills === 'object') {
        Object.entries(src.stageSkills).forEach(([idxKey, val]) => {
          const nIdx = Number(idxKey);
          if (Number.isInteger(nIdx) && nIdx >= 0 && nIdx <= maxIdx) {
            stageSkills[idxKey] = normalizeSkillsMap(val, 0, 0, progressionConfig.threshold);
          }
        });
      }
      const completedSet = new Set();
      if (Array.isArray(src.completedStages)) {
        for (const idx of src.completedStages) {
          const nIdx = Number(idx);
          if (Number.isInteger(nIdx) && nIdx >= 0 && nIdx <= maxIdx) {
            completedSet.add(nIdx);
          }
        }
      } else {
        for (let i = 0; i < stageIndex; i++) {
          completedSet.add(i);
        }
      }
      const skippedSet = new Set();
      if (Array.isArray(src.skippedStages)) {
        for (const idx of src.skippedStages) {
          const nIdx = Number(idx);
          if (Number.isInteger(nIdx) && nIdx >= 0 && nIdx <= maxIdx && completedSet.has(nIdx)) {
            skippedSet.add(nIdx);
          }
        }
      }
      const stageRecentOutcomes = {};
      if (src.stageRecentOutcomes && typeof src.stageRecentOutcomes === 'object') {
        Object.entries(src.stageRecentOutcomes).forEach(([idxKey, val]) => {
          const nIdx = Number(idxKey);
          if (Number.isInteger(nIdx) && nIdx >= 0 && nIdx <= maxIdx && Array.isArray(val)) {
            stageRecentOutcomes[idxKey] = val.slice(-60).map((v) => Boolean(v));
          }
        });
      }
      const recentOutcomes = Array.isArray(src.recentOutcomes)
        ? src.recentOutcomes.slice(-60).map((v) => Boolean(v))
        : [];
      categoryProgress[catId] = {
        stageIndex,
        stageCorrect,
        stageTotal,
        skills,
        stageSkills,
        stageRecentOutcomes,
        completedStages: Array.from(completedSet).sort((a, b) => a - b),
        skippedStages: Array.from(skippedSet).sort((a, b) => a - b),
        recentOutcomes
      };
    }
  }

  let activeCategory =
    parsed && typeof parsed.activeCategory === 'string' && CATEGORIES[parsed.activeCategory]
      ? parsed.activeCategory
      : CATEGORY_ORDER[0];
  if (!isCategoryUnlockedInMap(activeCategory, categoryProgress)) {
    activeCategory = getHighestUnlockedCategoryIdInMap(categoryProgress);
  }

  return {
    activeCategory,
    progressionConfig,
    categoryProgress
  };
}
