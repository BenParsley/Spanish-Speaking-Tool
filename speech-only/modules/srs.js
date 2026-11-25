import {
  CATEGORIES,
  NUMBER_MAX,
  NUMBER_MIN,
  PHRASE_ITEM_MAP,
  getItemsForCategory,
  getItemsForStage,
  getNumbersPoolForRange,
  getPhraseItemById
} from '../curriculum/index.js';
import { promptValueEl } from './dom.js';
import {
  MASTERY_MIN_ATTEMPTS,
  createDefaultSkillStreaks,
  isItemBlocked,
  isItemMastered,
  normalizeSeenSkills
} from './tracking-schema.js';
import { getActiveSkillPillars, getQuestionSkillBucket, state } from './state.js';
import { normalizePhraseEnglish, normalizePhraseSpanish } from './utils.js';

export const SRS_INTERVALS_DAYS = [0.002, 0.01, 0.04, 0.25, 1, 2.5, 6, 14];

export function getEntryForTarget(target) {
  if (typeof target === 'string') {
    return (
      state.phraseCounts[target] || {
        correct: 0,
        incorrect: 0,
        streaks: createDefaultSkillStreaks()
      }
    );
  }
  return (
    state.counts[target] || {
      correct: 0,
      incorrect: 0,
      streaks: createDefaultSkillStreaks()
    }
  );
}

export function getDueSrsNumbers(now = Date.now()) {
  const due = [];
  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n++) {
    const srsEntry = state.srs && state.srs[n];
    if (srsEntry && typeof srsEntry.nextDue === 'number' && srsEntry.nextDue <= now) {
      due.push(n);
    }
  }
  return due;
}

export function getDueSrsPhraseIds(catId = null, now = Date.now()) {
  const source = catId ? getItemsForCategory(catId) : Array.from(PHRASE_ITEM_MAP.values());
  const due = [];
  for (const item of source) {
    const srsEntry = state.phraseSrs && state.phraseSrs[item.id];
    if (srsEntry && typeof srsEntry.nextDue === 'number' && srsEntry.nextDue <= now) {
      due.push(item.id);
    }
  }
  return due;
}

export function updateSrsEntry(srsMap, key, isCorrect) {
  const now = Date.now();
  const prev = srsMap[key] || { reps: 0, lapses: 0, intervalDays: 0, nextDue: now };
  if (isCorrect) {
    const reps = (prev.reps || 0) + 1;
    const lapses = Math.max(0, Math.floor(Number(prev.lapses) || 0));
    const penaltyFactor = Math.max(0.35, Math.pow(0.75, lapses));
    const idx = Math.min(SRS_INTERVALS_DAYS.length - 1, reps - 1);
    const intervalDays = Number((SRS_INTERVALS_DAYS[idx] * penaltyFactor).toFixed(4));
    srsMap[key] = {
      reps,
      lapses,
      intervalDays,
      nextDue: now + intervalDays * 86400000
    };
  } else {
    const lapses = Math.max(0, Math.floor(Number(prev.lapses) || 0)) + 1;
    srsMap[key] = {
      reps: 0,
      lapses,
      intervalDays: 0,
      nextDue: now + 15000
    };
  }
}

export function updateSrsForNumber(n, isCorrect) {
  if (n < NUMBER_MIN || n > NUMBER_MAX) return;
  if (!state.srs || typeof state.srs !== 'object') {
    state.srs = {};
  }
  updateSrsEntry(state.srs, n, isCorrect);
}

export function updateSrsForPhraseItem(itemId, isCorrect) {
  if (!PHRASE_ITEM_MAP.has(itemId)) return;
  if (!state.phraseSrs || typeof state.phraseSrs !== 'object') {
    state.phraseSrs = {};
  }
  updateSrsEntry(state.phraseSrs, itemId, isCorrect);
}

export function computeItemSrsWeight(target, now = Date.now(), activeSkillBucket = null) {
  const isPhrase = typeof target === 'string';
  const entry = getEntryForTarget(target);
  const correct = Math.max(0, Number(entry.correct) || 0);
  const incorrect = Math.max(0, Number(entry.incorrect) || 0);
  const total = correct + incorrect;
  const seen = normalizeSeenSkills(entry.seenSkills, entry.streaks);
  const unseenSkillCount = getActiveSkillPillars().filter((k) => !seen[k]).length;
  const srsEntry = isPhrase
    ? state.phraseSrs && state.phraseSrs[target]
    : state.srs && state.srs[target];
  const inReview = isPhrase
    ? state.phraseReviewSet.has(target)
    : state.reviewSet.has(target);
  const mastered = isItemMastered(entry);

  let weight = 10;

  // Focus on finishing the Words Seen list (especially for the active skill)
  if (activeSkillBucket && !seen[activeSkillBucket]) {
    weight *= 3.8;
  }
  if (unseenSkillCount > 0) {
    weight *= 1 + unseenSkillCount * 0.28;
  }
  if (total === 0) {
    weight *= 1.5;
  }

  if (inReview) {
    weight *= 2.4;
  }

  // Offer words that have been wrong multiple times or mostly wrong more often,
  // but cap the boost so one stubborn word never locks the learner in a back-to-back loop.
  if (total > 0) {
    const missRate = incorrect / total;
    weight *= 1 + missRate * 2.2 + Math.min(incorrect, 5) * 0.2;
    if (incorrect >= 3 && correct <= incorrect) {
      weight *= 1.25;
    }
  }

  if (!srsEntry) {
    weight *= 2.3;
  } else if (typeof srsEntry.nextDue === 'number' && now >= srsEntry.nextDue) {
    const overdueHours = Math.max(0, (now - srsEntry.nextDue) / 3600000);
    const lapsesBoost = Math.min(2.0, Math.max(0, Number(srsEntry.lapses) || 0) * 0.35);
    weight *= 2.2 + Math.min(2.0, overdueHours * 0.4) + lapsesBoost;
  } else if (typeof srsEntry.nextDue === 'number') {
    const intervalMs = Math.max(60000, (Number(srsEntry.intervalDays) || 0.01) * 86400000);
    const remainingRatio = Math.min(1, Math.max(0, (srsEntry.nextDue - now) / intervalMs));
    weight *= Math.max(0.18, 1 - 0.78 * remainingRatio);
  }

  if (mastered) {
    weight *= 0.2;
  } else if (total < MASTERY_MIN_ATTEMPTS) {
    weight *= 1 + (MASTERY_MIN_ATTEMPTS - total) * 0.12;
  }

  return Math.min(120, Math.max(0.5, weight));
}

const recentPickedKeys = [];

export function pickWeightedFromPool(pool, getKeyFn, excludeKey = null) {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  if (pool.length === 1) return pool[0];
  const candidates =
    excludeKey !== null && excludeKey !== undefined
      ? pool.filter((item) => getKeyFn(item) !== excludeKey)
      : pool;
  const activePool = candidates.length > 0 ? candidates : pool;
  const now = Date.now();
  const skillBucket = getQuestionSkillBucket();
  // Apply a short cooldown penalty to the last 2–3 asked items when pool has >= 5 items
  // so no single struggling word can ping-pong every other turn.
  const recentWindow = activePool.length >= 5 ? recentPickedKeys.slice(-3) : [];
  const weights = activePool.map((item) => {
    const k = getKeyFn(item);
    let w = computeItemSrsWeight(k, now, skillBucket);
    const recIdx = recentWindow.indexOf(k);
    if (recIdx >= 0) {
      w *= recIdx === recentWindow.length - 1 ? 0.08 : 0.22;
    }
    return Math.max(0.1, w);
  });
  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  let chosen = null;
  if (totalWeight <= 0) {
    chosen = activePool[Math.floor(Math.random() * activePool.length)];
  } else {
    let r = Math.random() * totalWeight;
    for (let i = 0; i < activePool.length; i += 1) {
      r -= weights[i];
      if (r <= 0) {
        chosen = activePool[i];
        break;
      }
    }
    if (!chosen) chosen = activePool[activePool.length - 1];
  }
  if (chosen) {
    const chosenKey = getKeyFn(chosen);
    recentPickedKeys.push(chosenKey);
    if (recentPickedKeys.length > 6) recentPickedKeys.shift();
  }
  return chosen;
}

function isWeakEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  const c = Math.max(0, Number(entry.correct) || 0);
  const inc = Math.max(0, Number(entry.incorrect) || 0);
  const total = c + inc;
  if (total === 0) return false;
  const pct = (c / total) * 100;
  const pCount = Math.max(0, Number(entry.pronunciationCount) || 0);
  const pAvg = pCount > 0 ? (Number(entry.pronunciationSum) || 0) / pCount : 100;
  return inc >= 2 || pct < 75 || (pCount > 0 && pAvg < 85);
}

function isPolishPronunciationEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  const pCount = Math.max(0, Number(entry.pronunciationCount) || 0);
  if (pCount === 0) return false;
  const pAvg = Math.round((Number(entry.pronunciationSum) || 0) / pCount);
  const improveCnt = Math.max(0, Number(entry.pronunciationImproveCount) || 0);
  return (pAvg > 80 && pAvg < 90) || (improveCnt > 0 && pAvg < 90);
}

export function getPolishItemsForCategory(catId = state.activeCategory) {
  if (catId === 'numbers') {
    const nums = [];
    for (let n = NUMBER_MIN; n <= NUMBER_MAX; n += 1) {
      if (isPolishPronunciationEntry(state.counts?.[n])) nums.push(n);
    }
    return nums;
  }
  return getItemsForCategory(catId).filter((item) => isPolishPronunciationEntry(state.phraseCounts?.[item.id]));
}

export function getWeakItemsForCategory(catId = state.activeCategory) {
  if (catId === 'numbers') {
    const weakNums = [];
    for (let n = NUMBER_MIN; n <= NUMBER_MAX; n += 1) {
      if (isWeakEntry(state.counts?.[n])) weakNums.push(n);
    }
    return weakNums;
  }
  return getItemsForCategory(catId).filter((item) => isWeakEntry(state.phraseCounts?.[item.id]));
}

export function getPoolForPhraseCategory(catId, rangeKey) {
  const catItems = getItemsForCategory(catId);
  if (catItems.length === 0) return [];

  const filterBlocked = (items) => {
    const now = Date.now();
    const unblocked = items.filter(
      (item) => !isItemBlocked(state.phraseCounts && state.phraseCounts[item.id], now)
    );
    return unblocked.length > 0 ? unblocked : items;
  };

  if (state.polishDrillActive) {
    const polishItems = catItems.filter((item) => isPolishPronunciationEntry(state.phraseCounts?.[item.id]));
    if (polishItems.length > 0) return polishItems;
  }

  if (state.weakDrillActive) {
    const weakItems = catItems.filter((item) => isWeakEntry(state.phraseCounts?.[item.id]));
    if (weakItems.length > 0) return weakItems;
  }

  if (rangeKey === 'srs') {
    const dueIds = getDueSrsPhraseIds(catId);
    const dueItems = dueIds.map((id) => getPhraseItemById(id)).filter(Boolean);
    if (dueItems.length > 0) return filterBlocked(dueItems);
  }

  if (rangeKey === 'mistakes') {
    const reviewItems = catItems.filter((item) => state.phraseReviewSet.has(item.id));
    if (reviewItems.length > 0) return filterBlocked(reviewItems);
  }

  if (state.progressionConfig && state.progressionConfig.enabled) {
    const prog = state.categoryProgress && state.categoryProgress[catId];
    const stageIdx = prog ? prog.stageIndex : 0;
    const stage = CATEGORIES[catId]?.stages?.[stageIdx];
    if (stage?.isExam) {
      return catItems;
    }
    const stageItems = getItemsForStage(catId, stageIdx);
    if (stageItems.length > 0) return filterBlocked(stageItems);
  }

  return filterBlocked(catItems);
}

export function getPoolForRange(rangeKey) {
  if (state.polishDrillActive) {
    const polishNums = getPolishItemsForCategory('numbers');
    if (polishNums.length > 0) return polishNums;
  }
  if (state.weakDrillActive) {
    const weakNums = getWeakItemsForCategory('numbers');
    if (weakNums.length > 0) return weakNums;
  }
  const pool = getNumbersPoolForRange(rangeKey, {
    dueNumbers: rangeKey === 'srs' ? getDueSrsNumbers() : [],
    reviewNumbers: rangeKey === 'mistakes' ? Array.from(state.reviewSet) : []
  });
  const now = Date.now();
  const unblocked = pool.filter((n) => !isItemBlocked(state.counts && state.counts[n], now));
  return unblocked.length > 0 ? unblocked : pool;
}

export function resolveActivePhraseItem() {
  if (state.activeCategory === 'numbers') return null;
  const catItems = getItemsForCategory(state.activeCategory);
  if (catItems.length === 0) return null;

  const currentValid =
    state.currentItem && catItems.some((it) => it.id === state.currentItem.id);

  if (
    typeof promptValueEl !== 'undefined' &&
    promptValueEl &&
    !promptValueEl.classList.contains('hidden')
  ) {
    const visibleRaw = String(promptValueEl.textContent || '').trim();
    if (visibleRaw) {
      const normEs = normalizePhraseSpanish(visibleRaw);
      const normEn = normalizePhraseEnglish(visibleRaw);
      if (
        currentValid &&
        ((state.currentInstance &&
          state.currentInstance.itemId === state.currentItem.id &&
          (normalizePhraseSpanish(state.currentInstance.es) === normEs ||
            normalizePhraseEnglish(state.currentInstance.en) === normEn)) ||
          normalizePhraseSpanish(state.currentItem.es) === normEs ||
          normalizePhraseEnglish(state.currentItem.en) === normEn)
      ) {
        return state.currentItem;
      }
      const matched = catItems.find(
        (it) =>
          normalizePhraseSpanish(it.es) === normEs ||
          normalizePhraseEnglish(it.en) === normEn
      );
      if (matched) {
        state.currentItem = matched;
        return matched;
      }
    }
  }

  if (currentValid) {
    return state.currentItem;
  }

  const pool = getPoolForPhraseCategory(state.activeCategory, state.range);
  const fallback = (pool.length > 0 ? pool[0] : catItems[0]) || null;
  state.currentItem = fallback;
  return fallback;
}
