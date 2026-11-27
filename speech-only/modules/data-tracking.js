import {
  CATEGORIES,
  CATEGORY_ORDER,
  CORE_NUMBER_COUNT,
  NUMBER_MAX,
  NUMBER_MIN,
  getItemsForCategory,
  getPhraseItemById
} from '../curriculum/index.js';
import {
  dailyGoalCountEl,
  dailyGoalFillEl,
  dailyGoalFooterEl,
  dailyGoalMilestoneEl,
  dailyGoalTimeCountEl,
  dailyGoalTimeFillEl
} from './dom.js';
import {
  getEntryForTarget,
  resolveActivePhraseItem,
  updateSrsForNumber,
  updateSrsForPhraseItem
} from './srs.js';
import { getQuestionSkillBucket, isTrackingDisabled, savePersistedData, state } from './state.js';
import { getTodayActiveSeconds, markStudyActivity } from './study-timer.js';
import {
  DAILY_CORRECT_GOAL,
  DAILY_TIME_GOAL_SECONDS,
  DAILY_TOTAL_GOAL,
  MASTERY_MIN_ATTEMPTS,
  computeDailyStatsFromCounts,
  computeDailyTotalsFromCounts,
  createDefaultItemEntry,
  isItemMastered,
  normalizeSeenSkills,
  normalizeSkillStreaks,
  updateMasteryBlockState
} from './tracking-schema.js';
import { formatDurationSeconds, getLocalDateKey, getPctTierClass } from './utils.js';

export {
  DAILY_CORRECT_GOAL,
  DAILY_TIME_GOAL_SECONDS,
  DAILY_TOTAL_GOAL,
  computeDailyStatsFromCounts,
  computeDailyTotalsFromCounts
};

let dailyGoalMilestoneTimer = null;
let last30mMilestoneDateKey = '';
let prevObservedGoalDateKey = '';
let prevObservedGoalSeconds = 0;

let trackingHooks = {
  onUpdateProgression: () => { },
  onEvaluateAchievements: () => { },
  onUpdateTopMetrics: () => { },
  onBuildStatsTable: () => { },
  onQuestionRecorded: () => { }
};

export function registerTrackingHooks(hooks = {}) {
  trackingHooks = { ...trackingHooks, ...hooks };
}

export function getCanonicalWordTrackingKey(catId, itemOrNum) {
  if (catId === 'numbers') {
    const n = Number(itemOrNum);
    if (!Number.isInteger(n) || n < NUMBER_MIN || n > NUMBER_MAX) return '';
    return `num:${n}`;
  }
  if (typeof itemOrNum === 'string') return itemOrNum.trim();
  if (itemOrNum && typeof itemOrNum === 'object' && itemOrNum.id) return String(itemOrNum.id);
  return '';
}

export function recordWordFirstShown(catId, itemOrNum, { save = true, dateKey = getLocalDateKey() } = {}) {
  if (isTrackingDisabled()) return false;
  const key = getCanonicalWordTrackingKey(catId, itemOrNum);
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  if (!state.wordFirstSeenDate || typeof state.wordFirstSeenDate !== 'object') {
    state.wordFirstSeenDate = {};
  }
  const prev = state.wordFirstSeenDate[key];
  if (prev && prev <= dateKey) return false;
  state.wordFirstSeenDate[key] = dateKey;
  if (save) savePersistedData();
  return true;
}

export function resolveWordUnitAndStage(trackingKey) {
  const key = String(trackingKey || '').trim();
  if (!key) return null;
  if (key.startsWith('num:')) {
    const cat = CATEGORIES.numbers;
    const stage0 = cat?.stages?.[0];
    const unitLabel = cat?.label || 'A1.3 Numbers & Time';
    const stageTitle = stage0?.shortTitle || 'Core Numbers 0–100';
    return {
      groupKey: 'numbers:0',
      catId: 'numbers',
      unitLabel,
      stageIndex: 0,
      stageNum: 1,
      stageTitle,
      stageLabel: `${unitLabel} — Stage 1: ${stageTitle}`
    };
  }
  const item = getPhraseItemById(key);
  if (!item) return null;
  const cat = CATEGORIES[item.categoryId];
  const unitLabel = cat?.label || item.categoryId;
  const stages = Array.isArray(cat?.stages) ? cat.stages : [];
  const rawIdx = stages.findIndex((s) => s.stageKey === item.stage);
  const stageIndex = rawIdx >= 0 ? rawIdx : 0;
  const stageObj = stages[stageIndex] || null;
  const stageNum = stageIndex + 1;
  const stageTitle = stageObj?.shortTitle || stageObj?.label || '';
  return {
    groupKey: `${item.categoryId}:${stageIndex}`,
    catId: item.categoryId,
    unitLabel,
    stageIndex,
    stageNum,
    stageTitle,
    stageLabel: stageTitle ? `${unitLabel} — Stage ${stageNum}: ${stageTitle}` : unitLabel
  };
}

export function computeDailyNewWordsMap(
  countsObj = state.counts,
  phraseCountsObj = state.phraseCounts,
  wordFirstSeenObj = state.wordFirstSeenDate
) {
  const earliestByItem = {};
  const workedCountsByDate = {};

  const consider = (key, dk) => {
    if (!key || typeof dk !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dk)) return;
    if (!earliestByItem[key] || dk < earliestByItem[key]) {
      earliestByItem[key] = dk;
    }
  };

  const addStageActivity = (targetMap, dk, itemKey, amount = 1) => {
    const info = resolveWordUnitAndStage(itemKey);
    if (!info) return;
    if (!targetMap[dk]) targetMap[dk] = {};
    if (!targetMap[dk][info.groupKey]) {
      targetMap[dk][info.groupKey] = { ...info, count: 0 };
    }
    targetMap[dk][info.groupKey].count += amount;
  };

  if (wordFirstSeenObj && typeof wordFirstSeenObj === 'object') {
    Object.entries(wordFirstSeenObj).forEach(([key, dk]) => consider(key, dk));
  }

  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n += 1) {
    const entry = countsObj?.[n];
    if (!entry || !entry.byDate || typeof entry.byDate !== 'object') continue;
    for (const [dk, val] of Object.entries(entry.byDate)) {
      const total =
        typeof val === 'object' && val !== null
          ? (Number(val.correct) || 0) + (Number(val.incorrect) || 0)
          : Number(val) || 0;
      if (total > 0) {
        consider(`num:${n}`, dk);
        addStageActivity(workedCountsByDate, dk, `num:${n}`, total);
      }
    }
  }

  if (phraseCountsObj && typeof phraseCountsObj === 'object') {
    Object.entries(phraseCountsObj).forEach(([id, entry]) => {
      if (!entry || !entry.byDate || typeof entry.byDate !== 'object') return;
      for (const [dk, val] of Object.entries(entry.byDate)) {
        const total =
          typeof val === 'object' && val !== null
            ? (Number(val.correct) || 0) + (Number(val.incorrect) || 0)
            : Number(val) || 0;
        if (total > 0) {
          consider(id, dk);
          addStageActivity(workedCountsByDate, dk, id, total);
        }
      }
    });
  }

  const byDate = {};
  const newStagesMap = {};
  const itemKeys = Object.keys(earliestByItem);
  itemKeys.forEach((key) => {
    const dk = earliestByItem[key];
    byDate[dk] = (byDate[dk] || 0) + 1;
    addStageActivity(newStagesMap, dk, key, 1);
  });

  const toSortedLists = (mapObj) => {
    const out = {};
    Object.entries(mapObj).forEach(([dk, groups]) => {
      out[dk] = Object.values(groups).sort(
        (a, b) => b.count - a.count || a.stageLabel.localeCompare(b.stageLabel)
      );
    });
    return out;
  };

  return {
    byDate,
    stagesByDate: toSortedLists(newStagesMap),
    workedStagesByDate: toSortedLists(workedCountsByDate),
    totalUniqueSeen: itemKeys.length
  };
}

export function forEachCategoryEntry(catId, callback) {
  if (catId === 'numbers') {
    for (let n = NUMBER_MIN; n <= NUMBER_MAX; n += 1) {
      callback(n, state.counts?.[n] || null);
    }
    return;
  }
  getItemsForCategory(catId).forEach((item) => {
    callback(item.id, state.phraseCounts?.[item.id] || null);
  });
}

export function sumEntryForDates(entry, dateList) {
  if (!entry) return { correct: 0, incorrect: 0 };
  if (!dateList) {
    return {
      correct: Number(entry.correct) || 0,
      incorrect: Number(entry.incorrect) || 0
    };
  }
  let c = 0;
  let inc = 0;
  for (const dateKey of dateList) {
    const d = entry.byDate && entry.byDate[dateKey];
    if (d) {
      c += Number(d.correct) || 0;
      inc += Number(d.incorrect) || 0;
    }
  }
  return { correct: c, incorrect: inc };
}

export function getStatsForScope(dateScope = null) {
  const perNum = {};
  const perPhrase = {};
  const perCategory = {};
  CATEGORY_ORDER.forEach((catId) => {
    perCategory[catId] = { correct: 0, incorrect: 0, total: 0 };
  });

  let totalCorrect = 0;
  let totalIncorrect = 0;
  const dateList = Array.isArray(dateScope)
    ? dateScope
    : dateScope
      ? [dateScope]
      : null;

  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n++) {
    const { correct: c, incorrect: inc } = sumEntryForDates(state.counts[n], dateList);
    if (c + inc > 0) {
      perNum[n] = { correct: c, incorrect: inc, total: c + inc };
      perCategory.numbers.correct += c;
      perCategory.numbers.incorrect += inc;
      perCategory.numbers.total += c + inc;
      totalCorrect += c;
      totalIncorrect += inc;
    }
  }

  Object.entries(state.phraseCounts || {}).forEach(([itemId, entry]) => {
    const item = getPhraseItemById(itemId);
    if (!item || !entry) return;
    const { correct: c, incorrect: inc } = sumEntryForDates(entry, dateList);
    if (c + inc > 0) {
      perPhrase[itemId] = { item, correct: c, incorrect: inc, total: c + inc };
      const bucket = perCategory[item.categoryId];
      if (bucket) {
        bucket.correct += c;
        bucket.incorrect += inc;
        bucket.total += c + inc;
      }
      totalCorrect += c;
      totalIncorrect += inc;
    }
  });

  return {
    perNum,
    perPhrase,
    perCategory,
    totalCorrect,
    totalIncorrect,
    grandTotal: totalCorrect + totalIncorrect
  };
}

export function getTodayGoalStats() {
  const todayKey = getLocalDateKey();
  const dailyStats = computeDailyStatsFromCounts(state.counts, state.dailyCounts, state.phraseCounts);
  const today = dailyStats[todayKey] || { correct: 0, incorrect: 0, total: 0 };
  const correctGoal = DAILY_CORRECT_GOAL;
  const totalGoal = DAILY_TOTAL_GOAL;
  const timeGoalSeconds = DAILY_TIME_GOAL_SECONDS;
  const todayCorrect = Number(today.correct) || 0;
  const todayTotal = Number(today.total) || 0;
  const todaySeconds = getTodayActiveSeconds();
  const isTimeGoalReached = todaySeconds >= timeGoalSeconds;
  const isGoalReached = todayCorrect >= correctGoal || todayTotal >= totalGoal;
  return {
    todayCorrect,
    todayTotal,
    todaySeconds,
    correctGoal,
    totalGoal,
    timeGoalSeconds,
    isTimeGoalReached,
    isGoalReached
  };
}

export function computeStudyStreak() {
  const activeDates = new Set();
  for (const [k, v] of Object.entries(state.dailyCounts || {})) {
    if ((Number(v) || 0) > 0) activeDates.add(k);
  }
  for (const [k, v] of Object.entries(state.dailyActiveSeconds || {})) {
    if ((Number(v) || 0) > 0) activeDates.add(k);
  }
  if (activeDates.size === 0) return 0;

  const cursor = new Date();
  const todayKey = getLocalDateKey(cursor);
  if (!activeDates.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (activeDates.has(getLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function updateDailyGoalUI({ triggerMilestone = false } = {}) {
  const todayKey = getLocalDateKey();
  const {
    todayCorrect,
    todayTotal,
    todaySeconds,
    correctGoal,
    totalGoal,
    timeGoalSeconds,
    isTimeGoalReached,
    isGoalReached
  } = getTodayGoalStats();
  const correctPct = (todayCorrect / correctGoal) * 100;
  const totalPct = (todayTotal / totalGoal) * 100;
  const pct = Math.min(100, Math.max(correctPct, totalPct));
  const timePct = Math.min(100, (todaySeconds / timeGoalSeconds) * 100);
  const timeGoalMins = Math.round(timeGoalSeconds / 60);

  if (dailyGoalCountEl) {
    dailyGoalCountEl.textContent = `${todayCorrect} / ${correctGoal} correct · ${todayTotal} / ${totalGoal} total`;
  }
  if (dailyGoalFillEl) {
    dailyGoalFillEl.style.width = `${pct}%`;
  }
  if (dailyGoalTimeCountEl) {
    dailyGoalTimeCountEl.textContent = `${formatDurationSeconds(todaySeconds)} / ${timeGoalMins}m${isTimeGoalReached ? ' ✓' : ''}`;
    dailyGoalTimeCountEl.classList.toggle('is-time-complete', isTimeGoalReached);
  }
  if (dailyGoalTimeFillEl) {
    dailyGoalTimeFillEl.style.width = `${timePct}%`;
    dailyGoalTimeFillEl.classList.toggle('is-time-complete', isTimeGoalReached);
  }

  const combinedPct = Math.max(pct, timePct);
  const tier =
    isGoalReached || isTimeGoalReached || combinedPct >= 100
      ? '4'
      : combinedPct >= 75
        ? '3'
        : combinedPct >= 50
          ? '2'
          : combinedPct >= 25
            ? '1'
            : '0';
  if (dailyGoalFooterEl) {
    dailyGoalFooterEl.setAttribute('data-tier', tier);
  }

  if (prevObservedGoalDateKey !== todayKey) {
    prevObservedGoalDateKey = todayKey;
    prevObservedGoalSeconds = todaySeconds;
    if (isTimeGoalReached) {
      last30mMilestoneDateKey = todayKey;
    }
  }
  const justHit30m =
    isTimeGoalReached &&
    last30mMilestoneDateKey !== todayKey &&
    prevObservedGoalSeconds < timeGoalSeconds;
  prevObservedGoalSeconds = todaySeconds;
  const hitGoalExact = todayCorrect === correctGoal || todayTotal === totalGoal;
  if (justHit30m) {
    last30mMilestoneDateKey = todayKey;
  }
  if (
    justHit30m ||
    (triggerMilestone && todayTotal > 0 && (hitGoalExact || todayTotal % 10 === 0))
  ) {
    if (dailyGoalMilestoneTimer !== null) {
      clearTimeout(dailyGoalMilestoneTimer);
      dailyGoalMilestoneTimer = null;
    }
    if (dailyGoalMilestoneEl) {
      dailyGoalMilestoneEl.textContent = justHit30m
        ? `${timeGoalMins}m Daily Time Goal Reached!`
        : hitGoalExact
          ? `Goal Reached (${todayCorrect} correct · ${todayTotal} total)`
          : `${todayTotal} Milestone`;
    }
    if (dailyGoalFooterEl) {
      dailyGoalFooterEl.classList.remove('is-milestone');
      void dailyGoalFooterEl.offsetWidth;
      dailyGoalFooterEl.classList.add('is-milestone');
      dailyGoalMilestoneTimer = setTimeout(() => {
        dailyGoalFooterEl.classList.remove('is-milestone');
        dailyGoalMilestoneTimer = null;
      }, 1150);
    }
  }
}

export function getTopicAnswerTotal(catId) {
  let sum = 0;
  forEachCategoryEntry(catId, (_, entry) => {
    if (entry) {
      sum += (Number(entry.correct) || 0) + (Number(entry.incorrect) || 0);
    }
  });
  return sum;
}

export function getTopicPracticedSummary(catId) {
  if (catId === 'numbers') {
    let practiced = 0;
    for (let n = NUMBER_MIN; n <= NUMBER_MAX; n += 1) {
      const entry = state.counts?.[n];
      if (entry && (Number(entry.correct) || 0) + (Number(entry.incorrect) || 0) > 0) {
        practiced += 1;
      }
    }
    return { practiced, total: CORE_NUMBER_COUNT };
  }
  const items = getItemsForCategory(catId);
  let practiced = 0;
  items.forEach((item) => {
    const entry = state.phraseCounts?.[item.id];
    if (entry && (Number(entry.correct) || 0) + (Number(entry.incorrect) || 0) > 0) {
      practiced += 1;
    }
  });
  return { practiced, total: items.length };
}

export function getConfidenceTierInfo(target) {
  const entry = getEntryForTarget(target);
  const c = Math.max(0, Number(entry.correct) || 0);
  const inc = Math.max(0, Number(entry.incorrect) || 0);
  const total = c + inc;

  if (total === 0) {
    return { rank: 0, label: '0/10', cls: 'is-none' };
  }
  if (isItemMastered(entry)) {
    return { rank: 4, label: 'Mastered', cls: 'is-good' };
  }
  const pct = Math.round((c / total) * 100);
  if (pct >= 75) {
    return {
      rank: 2 + Math.min(0.99, c / MASTERY_MIN_ATTEMPTS),
      label: `${c}/${total} (${pct}%)`,
      cls: 'is-mid'
    };
  }
  return {
    rank: 1 + Math.min(0.99, pct / 100),
    label: `${c}/${total} (${pct}%)`,
    cls: 'is-bad'
  };
}

export function getWordPronunciationInfo(entry) {
  const count = Math.max(0, Math.floor(Number(entry?.pronunciationCount) || 0));
  if (count === 0) {
    return {
      avg: -1,
      count: 0,
      text: '—',
      statusTag: '',
      needsImprovement: false,
      tierCls: 'is-none',
      title: 'No spoken audio graded yet'
    };
  }
  const sum = Math.max(0, Number(entry?.pronunciationSum) || 0);
  const avg = Math.min(100, Math.max(0, Math.round(sum / count)));
  const improveCount = Math.max(0, Math.floor(Number(entry?.pronunciationImproveCount) || 0));
  const tierCls = avg >= 90 ? 'is-good' : avg > 80 ? 'is-mid' : 'is-bad';
  let statusTag = '';
  let needsImprovement = false;
  if (avg <= 80) {
    statusTag = 'Needs practice';
    needsImprovement = true;
  } else if (avg < 90 || improveCount > 0) {
    statusTag = 'Could be improved';
    needsImprovement = true;
  }
  const improveNote = improveCount > 0 ? ` · ${improveCount} flagged "could be improved"` : '';
  return {
    avg,
    count,
    text: `${avg}%`,
    statusTag,
    needsImprovement,
    tierCls,
    title: `Average pronunciation: ${avg}% across ${count} spoken attempt${count === 1 ? '' : 's'}${improveNote}`
  };
}

export function getOverallPronunciationStats(filterCat = 'all') {
  let sum = 0;
  let count = 0;
  let wordsScored = 0;
  let improveWords = 0;

  const accumulate = (entry) => {
    const cnt = Math.max(0, Math.floor(Number(entry?.pronunciationCount) || 0));
    if (cnt <= 0) return;
    const s = Math.max(0, Number(entry?.pronunciationSum) || 0);
    sum += s;
    count += cnt;
    wordsScored += 1;
    const info = getWordPronunciationInfo(entry);
    if (info.needsImprovement) improveWords += 1;
  };

  if (filterCat === 'all') {
    CATEGORY_ORDER.forEach((catId) => {
      forEachCategoryEntry(catId, (_, entry) => accumulate(entry));
    });
  } else {
    forEachCategoryEntry(filterCat, (_, entry) => accumulate(entry));
  }

  return {
    avg: count > 0 ? Math.min(100, Math.max(0, Math.round(sum / count))) : -1,
    count,
    wordsScored,
    improveWords
  };
}

export function ensureExtensionEntry(extensionRating) {
  if (!extensionRating || !extensionRating.key || !extensionRating.catId || !extensionRating.es) {
    return null;
  }
  if (!state.extensionCounts || typeof state.extensionCounts !== 'object') {
    state.extensionCounts = {};
  }
  const key = String(extensionRating.key);
  if (!state.extensionCounts[key]) {
    state.extensionCounts[key] = {
      key,
      catId: extensionRating.catId,
      es: String(extensionRating.es).trim(),
      en: String(extensionRating.en || extensionRating.es).trim(),
      group: String(extensionRating.group || ''),
      correct: 0,
      incorrect: 0,
      byDate: {},
      pronunciationSum: 0,
      pronunciationCount: 0,
      pronunciationImproveCount: 0
    };
  }
  return state.extensionCounts[key];
}

export function recordExtensionPronunciationSample(extensionRating) {
  if (isTrackingDisabled()) return;
  if (!extensionRating || typeof extensionRating.score !== 'number' || !Number.isFinite(extensionRating.score)) {
    return;
  }
  const entry = ensureExtensionEntry(extensionRating);
  if (!entry) return;
  const clamped = Math.min(100, Math.max(0, Math.round(extensionRating.score)));
  entry.pronunciationSum = (Number(entry.pronunciationSum) || 0) + clamped;
  entry.pronunciationCount = (Number(entry.pronunciationCount) || 0) + 1;
  if (extensionRating.needsImprovement) {
    entry.pronunciationImproveCount = (Number(entry.pronunciationImproveCount) || 0) + 1;
  }
}

export function recordExtensionOutcome(extensionRating, { pronunciationAlreadyRecorded = false } = {}) {
  if (isTrackingDisabled()) return;
  const entry = ensureExtensionEntry(extensionRating);
  if (!entry) return;
  const todayKey = getLocalDateKey();
  if (!entry.byDate || typeof entry.byDate !== 'object') {
    entry.byDate = {};
  }
  if (!entry.byDate[todayKey]) {
    entry.byDate[todayKey] = { correct: 0, incorrect: 0 };
  }
  if (extensionRating.isCorrect) {
    entry.correct = (Number(entry.correct) || 0) + 1;
    entry.byDate[todayKey].correct += 1;
  } else {
    entry.incorrect = (Number(entry.incorrect) || 0) + 1;
    entry.byDate[todayKey].incorrect += 1;
  }
  if (!pronunciationAlreadyRecorded) {
    recordExtensionPronunciationSample(extensionRating);
  }
}

export function recordPronunciationAttempt(
  pronunciationScore,
  { needsImprovement = false, weakChars = null, charDetails = null, extensionRating = null } = {}
) {
  if (isTrackingDisabled()) return;
  if (typeof pronunciationScore !== 'number' || !Number.isFinite(pronunciationScore)) return;
  const clampedScore = Math.min(100, Math.max(0, Math.round(pronunciationScore)));
  const todayKey = getLocalDateKey();

  if (!state.dailyPronunciation || typeof state.dailyPronunciation !== 'object') {
    state.dailyPronunciation = {};
  }
  if (!state.dailyPronunciation[todayKey]) {
    state.dailyPronunciation[todayKey] = { sum: 0, count: 0 };
  }
  state.dailyPronunciation[todayKey].sum += clampedScore;
  state.dailyPronunciation[todayKey].count += 1;

  if (Array.isArray(charDetails) && charDetails.length > 0) {
    if (!state.weakPhonemeCounts || typeof state.weakPhonemeCounts !== 'object') {
      state.weakPhonemeCounts = {};
    }
    charDetails.forEach((c) => {
      const ch = String(c?.ch || '').trim().toLowerCase();
      const sc = Number(c?.score);
      if (!ch || !/[a-záéíóúñü]/i.test(ch) || !Number.isFinite(sc)) return;
      if (!state.weakPhonemeCounts[ch]) {
        state.weakPhonemeCounts[ch] = { misses: 0, scoreSum: 0, count: 0 };
      }
      state.weakPhonemeCounts[ch].scoreSum += Math.min(100, Math.max(0, Math.round(sc)));
      state.weakPhonemeCounts[ch].count += 1;
      if (sc < 85) {
        state.weakPhonemeCounts[ch].misses += 1;
      }
    });
  } else if (Array.isArray(weakChars) && weakChars.length > 0) {
    if (!state.weakPhonemeCounts || typeof state.weakPhonemeCounts !== 'object') {
      state.weakPhonemeCounts = {};
    }
    weakChars.forEach((rawCh) => {
      const ch = String(rawCh || '').trim().toLowerCase();
      if (!ch || !/[a-záéíóúñü]/i.test(ch)) return;
      if (!state.weakPhonemeCounts[ch]) {
        state.weakPhonemeCounts[ch] = { misses: 0, scoreSum: 0, count: 0 };
      }
      state.weakPhonemeCounts[ch].misses += 1;
      state.weakPhonemeCounts[ch].count += 1;
      state.weakPhonemeCounts[ch].scoreSum += 65;
    });
  }

  let entry = null;
  if (state.activeCategory === 'numbers') {
    if (state.currentNum >= NUMBER_MIN && state.currentNum <= NUMBER_MAX) {
      if (!state.counts[state.currentNum]) {
        state.counts[state.currentNum] = createDefaultItemEntry();
      }
      entry = state.counts[state.currentNum];
    }
  } else {
    const activeItem = resolveActivePhraseItem();
    if (activeItem) {
      if (!state.phraseCounts[activeItem.id]) {
        state.phraseCounts[activeItem.id] = createDefaultItemEntry();
      }
      entry = state.phraseCounts[activeItem.id];
    }
  }

  if (entry) {
    entry.pronunciationSum = (Number(entry.pronunciationSum) || 0) + clampedScore;
    entry.pronunciationCount = (Number(entry.pronunciationCount) || 0) + 1;
    if (needsImprovement) {
      entry.pronunciationImproveCount = (Number(entry.pronunciationImproveCount) || 0) + 1;
    }
  }

  if (state.sessionStats) {
    state.sessionStats.pronunciationSum += clampedScore;
    state.sessionStats.pronunciationCount += 1;
  }

  if (extensionRating) {
    recordExtensionPronunciationSample(extensionRating);
  }

  savePersistedData();
  trackingHooks.onBuildStatsTable(false);
}

export function getWordTrophyInfo(correct, incorrect) {
  const c = Math.max(0, Number(correct) || 0);
  const inc = Math.max(0, Number(incorrect) || 0);
  const total = c + inc;
  if (total < 10) {
    const label =
      total === 0
        ? 'No attempts yet'
        : `Need ${10 - total} more attempt${10 - total === 1 ? '' : 's'} for a trophy (${total}/10)`;
    return { tierCls: 'is-none', label, pct: -1 };
  }
  const pct = Math.round((c / total) * 100);
  if (pct === 100) {
    return { tierCls: 'is-gold', label: `Gold Trophy · 100% (${c}/${total})`, pct };
  }
  if (pct >= 80) {
    return { tierCls: 'is-silver', label: `Silver Trophy · ${pct}% (${c}/${total})`, pct };
  }
  if (pct >= 60) {
    return { tierCls: 'is-bronze', label: `Bronze Trophy · ${pct}% (${c}/${total})`, pct };
  }
  return { tierCls: 'is-low', label: `Needs Practice · ${pct}% (${c}/${total})`, pct };
}

export function applyOutcomeToItemEntry({
  countsMap,
  key,
  masteredSet,
  reviewSet,
  updateSrsFn,
  isCorrect,
  skipped = false,
  skillBucket,
  todayKey,
  pronunciationScore,
  pronunciationNeedsImprovement = false,
  pronunciationAlreadyRecorded = false
}) {
  if (!countsMap[key]) {
    countsMap[key] = createDefaultItemEntry();
  }
  const entry = countsMap[key];
  if (skipped) {
    entry.skipped = Math.max(0, Math.floor(Number(entry.skipped) || 0)) + 1;
  }
  entry.streaks = normalizeSkillStreaks(entry.streaks, entry.correct);
  entry.seenSkills = normalizeSeenSkills(entry.seenSkills, entry.streaks);
  entry.seenSkills[skillBucket] = true;
  if (!entry.byDate) {
    entry.byDate = {};
  }
  if (!entry.byDate[todayKey]) {
    entry.byDate[todayKey] = { correct: 0, incorrect: 0 };
  }

  let clearedReviewItem = false;
  if (isCorrect) {
    clearedReviewItem = reviewSet.has(key);
    state.totalCorrect += 1;
    state.streak += 1;
    entry.streaks[skillBucket] += 1;
    entry.correct += 1;
    entry.byDate[todayKey].correct += 1;
    reviewSet.delete(key);
  } else {
    state.streak = 0;
    reviewSet.add(key);
    entry.incorrect += 1;
    entry.byDate[todayKey].incorrect += 1;
  }

  updateMasteryBlockState(entry, isCorrect);
  if (
    !pronunciationAlreadyRecorded &&
    typeof pronunciationScore === 'number' &&
    Number.isFinite(pronunciationScore)
  ) {
    const clampedScore = Math.min(100, Math.max(0, Math.round(pronunciationScore)));
    entry.pronunciationSum = (Number(entry.pronunciationSum) || 0) + clampedScore;
    entry.pronunciationCount = (Number(entry.pronunciationCount) || 0) + 1;
    if (pronunciationNeedsImprovement) {
      entry.pronunciationImproveCount = (Number(entry.pronunciationImproveCount) || 0) + 1;
    }
  }
  if (isItemMastered(entry)) {
    masteredSet.add(key);
  } else {
    masteredSet.delete(key);
  }
  entry.confidence = getConfidenceTierInfo(key).label;
  updateSrsFn(key, isCorrect);
  return clearedReviewItem;
}

export function recordOutcome(
  isCorrect,
  {
    strictClean = false,
    pronunciationScore = null,
    pronunciationNeedsImprovement = false,
    pronunciationAlreadyRecorded = false,
    weakChars = null,
    charDetails = null,
    extensionRating = null,
    extensionPronunciationAlreadyRecorded = false,
    skipped = false
  } = {}
) {
  if (isTrackingDisabled()) return;
  markStudyActivity();
  state.totalAnswered += 1;
  const todayKey = getLocalDateKey();

  if (
    !pronunciationAlreadyRecorded &&
    typeof pronunciationScore === 'number' &&
    Number.isFinite(pronunciationScore)
  ) {
    const clampedScore = Math.min(100, Math.max(0, Math.round(pronunciationScore)));
    if (!state.dailyPronunciation || typeof state.dailyPronunciation !== 'object') {
      state.dailyPronunciation = {};
    }
    if (!state.dailyPronunciation[todayKey]) {
      state.dailyPronunciation[todayKey] = { sum: 0, count: 0 };
    }
    state.dailyPronunciation[todayKey].sum += clampedScore;
    state.dailyPronunciation[todayKey].count += 1;
  }

  if (!pronunciationAlreadyRecorded && Array.isArray(charDetails) && charDetails.length > 0) {
    if (!state.weakPhonemeCounts || typeof state.weakPhonemeCounts !== 'object') {
      state.weakPhonemeCounts = {};
    }
    charDetails.forEach((c) => {
      const ch = String(c?.ch || '').trim().toLowerCase();
      const sc = Number(c?.score);
      if (!ch || !/[a-záéíóúñü]/i.test(ch) || !Number.isFinite(sc)) return;
      if (!state.weakPhonemeCounts[ch]) {
        state.weakPhonemeCounts[ch] = { misses: 0, scoreSum: 0, count: 0 };
      }
      state.weakPhonemeCounts[ch].scoreSum += Math.min(100, Math.max(0, Math.round(sc)));
      state.weakPhonemeCounts[ch].count += 1;
      if (sc < 85) {
        state.weakPhonemeCounts[ch].misses += 1;
      }
    });
  } else if (!pronunciationAlreadyRecorded && Array.isArray(weakChars) && weakChars.length > 0) {
    if (!state.weakPhonemeCounts || typeof state.weakPhonemeCounts !== 'object') {
      state.weakPhonemeCounts = {};
    }
    weakChars.forEach((rawCh) => {
      const ch = String(rawCh || '').trim().toLowerCase();
      if (!ch || !/[a-záéíóúñü]/i.test(ch)) return;
      if (!state.weakPhonemeCounts[ch]) {
        state.weakPhonemeCounts[ch] = { misses: 0, scoreSum: 0, count: 0 };
      }
      state.weakPhonemeCounts[ch].misses += 1;
      state.weakPhonemeCounts[ch].count += 1;
      state.weakPhonemeCounts[ch].scoreSum += 65;
    });
  }

  let clearedReviewItem = false;
  let itemLabelForSession = '';
  let hadPriorMiss = false;
  let hadThreePlusMisses = false;
  const skillBucket = getQuestionSkillBucket();

  if (state.activeCategory === 'numbers') {
    itemLabelForSession = String(state.currentNum);
    if (state.currentNum >= NUMBER_MIN && state.currentNum <= NUMBER_MAX) {
      const priorMisses = Number(state.counts?.[state.currentNum]?.incorrect) || 0;
      hadPriorMiss = priorMisses > 0;
      hadThreePlusMisses = priorMisses >= 3;
      clearedReviewItem = applyOutcomeToItemEntry({
        countsMap: state.counts,
        key: state.currentNum,
        masteredSet: state.masteredSet,
        reviewSet: state.reviewSet,
        updateSrsFn: updateSrsForNumber,
        isCorrect,
        skipped,
        skillBucket,
        todayKey,
        pronunciationScore,
        pronunciationNeedsImprovement,
        pronunciationAlreadyRecorded
      });
    } else if (isCorrect) {
      state.totalCorrect += 1;
      state.streak += 1;
    } else {
      state.streak = 0;
    }
  } else {
    const activeItem = resolveActivePhraseItem();
    if (activeItem) {
      itemLabelForSession = activeItem.es;
      const priorMisses = Number(state.phraseCounts?.[activeItem.id]?.incorrect) || 0;
      hadPriorMiss = priorMisses > 0;
      hadThreePlusMisses = priorMisses >= 3;
      clearedReviewItem = applyOutcomeToItemEntry({
        countsMap: state.phraseCounts,
        key: activeItem.id,
        masteredSet: state.phraseMasteredSet,
        reviewSet: state.phraseReviewSet,
        updateSrsFn: updateSrsForPhraseItem,
        isCorrect,
        skipped,
        skillBucket,
        todayKey,
        pronunciationScore,
        pronunciationNeedsImprovement,
        pronunciationAlreadyRecorded
      });
    }
  }

  if (state.sessionStats) {
    state.sessionStats.answered += 1;
    if (isCorrect) state.sessionStats.correct += 1;
    if (
      !pronunciationAlreadyRecorded &&
      typeof pronunciationScore === 'number' &&
      Number.isFinite(pronunciationScore)
    ) {
      state.sessionStats.pronunciationSum += Math.min(100, Math.max(0, Math.round(pronunciationScore)));
      state.sessionStats.pronunciationCount += 1;
    }
    if (
      isCorrect &&
      (clearedReviewItem || hadPriorMiss) &&
      itemLabelForSession &&
      !state.sessionStats.improvedItems.includes(itemLabelForSession)
    ) {
      state.sessionStats.improvedItems.push(itemLabelForSession);
    }
  }

  if (extensionRating && !skipped) {
    recordExtensionOutcome(extensionRating, {
      pronunciationAlreadyRecorded: Boolean(extensionPronunciationAlreadyRecorded)
    });
  }

  trackingHooks.onUpdateProgression(isCorrect);
  trackingHooks.onEvaluateAchievements({
    isCorrect,
    pronunciationScore,
    hadThreePlusMisses,
    currentStreak: state.streak
  });
  state.dailyCounts = computeDailyTotalsFromCounts(state.counts, state.dailyCounts, state.phraseCounts);
  savePersistedData();
  updateDailyGoalUI({ triggerMilestone: true });
  trackingHooks.onUpdateTopMetrics();
  trackingHooks.onBuildStatsTable(false);
  trackingHooks.onQuestionRecorded();
}
