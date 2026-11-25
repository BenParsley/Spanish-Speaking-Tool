import {
  CATEGORIES,
  CATEGORY_ORDER,
  NUMBER_MAX,
  NUMBER_MIN,
  PHRASE_ITEM_MAP,
  getSlotConfigForItem
} from '../curriculum/index.js';
import {
  SKILL_PILLARS,
  createDefaultCategoryProgress,
  createDefaultProgressionConfig,
  normalizeProgressionBundle
} from './progression-core.js';
import { getLocalDateKey } from './utils.js';

export const STORAGE_KEY = 'spanish_panama_speak_only_v1';
export const SNAPSHOTS_STORAGE_KEY = 'spanish_panama_speak_only_snapshots_v1';

export const MASTERY_REQUIRED_STREAK = 2;
export const MASTERY_MIN_ATTEMPTS = 10;
export const MASTERY_MIN_ACCURACY = 0.9;
export const MASTERY_BLOCK_MS = 3 * 86400000;
export const MASTERY_RETEST_REQUIRED_CORRECT = 3;

export const DAILY_CORRECT_GOAL = 75;
export const DAILY_TOTAL_GOAL = 150;
export const DAILY_TIME_GOAL_SECONDS = 30 * 60;

export function createDefaultSkillStreaks() {
  return { read: 0, write: 0, listen: 0, speak: 0 };
}

export function isItemMastered(entry) {
  if (!entry || typeof entry !== 'object') return false;
  const c = Math.max(0, Number(entry.correct) || 0);
  const inc = Math.max(0, Number(entry.incorrect) || 0);
  const total = c + inc;
  return total >= MASTERY_MIN_ATTEMPTS && c / total >= MASTERY_MIN_ACCURACY;
}

export function isItemBlocked(entry, now = Date.now()) {
  if (!entry || typeof entry !== 'object') return false;
  const blockedUntil = Number(entry.blockedUntil) || 0;
  return blockedUntil > now && isItemMastered(entry);
}

export function updateMasteryBlockState(entry, isCorrect, now = Date.now()) {
  if (!entry || typeof entry !== 'object') return;
  if (!isItemMastered(entry)) {
    entry.blockedUntil = 0;
    entry.retestCorrect = 0;
    return;
  }

  const blockedUntil = Number(entry.blockedUntil) || 0;
  if (blockedUntil === 0) {
    entry.blockedUntil = now + MASTERY_BLOCK_MS;
    entry.retestCorrect = 0;
    return;
  }

  if (now >= blockedUntil) {
    if (isCorrect) {
      entry.retestCorrect = Math.max(0, Math.floor(Number(entry.retestCorrect) || 0)) + 1;
      if (entry.retestCorrect >= MASTERY_RETEST_REQUIRED_CORRECT) {
        entry.blockedUntil = now + MASTERY_BLOCK_MS;
        entry.retestCorrect = 0;
      }
    } else {
      entry.retestCorrect = 0;
    }
  }
}

export function normalizeSkillStreaks(raw, fallbackCorrect = 0) {
  const s =
    raw && typeof raw === 'object'
      ? {
        read: Math.max(0, Math.floor(Number(raw.read) || 0)),
        write: Math.max(0, Math.floor(Number(raw.write) || 0)),
        listen: Math.max(0, Math.floor(Number(raw.listen) || 0)),
        speak: Math.max(0, Math.floor(Number(raw.speak) || 0))
      }
      : createDefaultSkillStreaks();

  const targetCorrect = Math.max(0, Math.floor(Number(fallbackCorrect) || 0));
  let currentSum = s.read + s.write + s.listen + s.speak;
  if (targetCorrect > currentSum) {
    const order = ['read', 'write', 'listen', 'speak'];
    while (currentSum < targetCorrect) {
      let minKey = order[0];
      for (let i = 1; i < order.length; i += 1) {
        if (s[order[i]] < s[minKey]) {
          minKey = order[i];
        }
      }
      s[minKey] += 1;
      currentSum += 1;
    }
  }
  return s;
}

export function isSkillStreaksMastered(streaks, fallbackCorrect = 0) {
  const s = normalizeSkillStreaks(streaks, fallbackCorrect);
  return (
    s.read >= MASTERY_REQUIRED_STREAK &&
    s.write >= MASTERY_REQUIRED_STREAK &&
    s.listen >= MASTERY_REQUIRED_STREAK &&
    s.speak >= MASTERY_REQUIRED_STREAK
  );
}

export function createDefaultSeenSkills() {
  return { read: false, write: false, listen: false, speak: false };
}

export function normalizeSeenSkills(rawSeen, streaks = null) {
  const res = createDefaultSeenSkills();
  SKILL_PILLARS.forEach((k) => {
    if (rawSeen && typeof rawSeen === 'object' && rawSeen[k]) {
      res[k] = true;
    } else if (streaks && typeof streaks === 'object' && (Number(streaks[k]) || 0) > 0) {
      res[k] = true;
    }
  });
  return res;
}

export function createDefaultItemEntry() {
  return {
    correct: 0,
    incorrect: 0,
    skipped: 0,
    banCount: 0,
    byDate: {},
    streaks: createDefaultSkillStreaks(),
    seenSkills: createDefaultSeenSkills(),
    blockedUntil: 0,
    retestCorrect: 0,
    pronunciationSum: 0,
    pronunciationCount: 0,
    pronunciationImproveCount: 0
  };
}

export function createDefaultCounts() {
  const counts = {};
  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n++) {
    counts[n] = createDefaultItemEntry();
  }
  return counts;
}

export function computeDailyStatsFromCounts(countsObj, fallbackDaily = {}, phraseCountsObj = {}) {
  const stats = {};
  let hasByDate = false;

  const mergeEntryByDate = (entry) => {
    if (entry && entry.byDate && typeof entry.byDate === 'object') {
      for (const [dateKey, val] of Object.entries(entry.byDate)) {
        const dc =
          typeof val === 'object' && val !== null
            ? Number(val.correct) || 0
            : Number(val) || 0;
        const dinc =
          typeof val === 'object' && val !== null ? Number(val.incorrect) || 0 : 0;
        const total = dc + dinc;
        if (total > 0) {
          hasByDate = true;
          if (!stats[dateKey]) {
            stats[dateKey] = { correct: 0, incorrect: 0, total: 0 };
          }
          stats[dateKey].correct += dc;
          stats[dateKey].incorrect += dinc;
          stats[dateKey].total += total;
        }
      }
    }
  };

  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n++) {
    mergeEntryByDate(countsObj?.[n]);
  }
  if (phraseCountsObj && typeof phraseCountsObj === 'object') {
    Object.values(phraseCountsObj).forEach(mergeEntryByDate);
  }

  if (!hasByDate && fallbackDaily && typeof fallbackDaily === 'object') {
    for (const [dateKey, count] of Object.entries(fallbackDaily)) {
      const c = Number(count) || 0;
      if (c > 0) {
        stats[dateKey] = { correct: c, incorrect: 0, total: c };
      }
    }
  }

  return stats;
}

export function computeDailyTotalsFromCounts(countsObj, fallbackDaily = {}, phraseCountsObj = {}) {
  const stats = computeDailyStatsFromCounts(countsObj, fallbackDaily, phraseCountsObj);
  const totals = {};
  for (const [dateKey, s] of Object.entries(stats)) {
    totals[dateKey] = s.total;
  }
  return totals;
}

export function normalizePhraseCounts(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const normalized = {};
  Object.entries(raw).forEach(([itemId, entry]) => {
    if (!PHRASE_ITEM_MAP.has(itemId) || !entry || typeof entry !== 'object') return;
    const correct = Math.max(0, Math.floor(Number(entry.correct) || 0));
    const incorrect = Math.max(0, Math.floor(Number(entry.incorrect) || 0));
    const skipped = Math.max(0, Math.floor(Number(entry.skipped) || 0));
    const banCount = Math.max(0, Math.floor(Number(entry.banCount) || 0));
    const streaks = normalizeSkillStreaks(entry.streaks, correct);
    const seenSkills = normalizeSeenSkills(entry.seenSkills, streaks);
    const blockedUntil = Math.max(0, Number(entry.blockedUntil) || 0);
    const retestCorrect = Math.max(0, Math.floor(Number(entry.retestCorrect) || 0));
    const pronunciationSum = Math.max(0, Number(entry.pronunciationSum) || 0);
    const pronunciationCount = Math.max(0, Math.floor(Number(entry.pronunciationCount) || 0));
    const pronunciationImproveCount = Math.max(0, Math.floor(Number(entry.pronunciationImproveCount) || 0));
    const byDate = {};
    if (entry.byDate && typeof entry.byDate === 'object') {
      Object.entries(entry.byDate).forEach(([dateKey, dVal]) => {
        if (!dVal || typeof dVal !== 'object') return;
        const dc = Math.max(0, Math.floor(Number(dVal.correct) || 0));
        const dinc = Math.max(0, Math.floor(Number(dVal.incorrect) || 0));
        if (dc + dinc > 0) {
          byDate[dateKey] = { correct: dc, incorrect: dinc };
        }
      });
    }
    if (
      correct + incorrect + skipped + banCount > 0 ||
      Object.keys(byDate).length > 0 ||
      streaks.read + streaks.write + streaks.listen + streaks.speak > 0 ||
      SKILL_PILLARS.some((k) => seenSkills[k]) ||
      pronunciationCount > 0
    ) {
      normalized[itemId] = {
        correct,
        incorrect,
        skipped,
        banCount,
        byDate,
        streaks,
        seenSkills,
        blockedUntil,
        retestCorrect,
        pronunciationSum,
        pronunciationCount,
        pronunciationImproveCount
      };
    }
  });
  return normalized;
}

export function normalizePhraseSrs(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const normalized = {};
  Object.entries(raw).forEach(([itemId, entry]) => {
    if (!PHRASE_ITEM_MAP.has(itemId) || !entry || typeof entry !== 'object') return;
    normalized[itemId] = {
      reps: Math.max(0, Math.floor(Number(entry.reps) || 0)),
      lapses: Math.max(0, Math.floor(Number(entry.lapses) || 0)),
      intervalDays: Math.max(0, Number(entry.intervalDays) || 0),
      nextDue: Number(entry.nextDue) || Date.now()
    };
  });
  return normalized;
}

export function normalizeDailyActiveSeconds(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const normalized = {};
  Object.entries(raw).forEach(([dateKey, value]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
    const secs = Math.max(0, Math.floor(Number(value) || 0));
    if (secs > 0) normalized[dateKey] = secs;
  });
  return normalized;
}

export function normalizeWordFirstSeenDate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const normalized = {};
  Object.entries(raw).forEach(([itemKey, dateKey]) => {
    if (typeof itemKey !== 'string' || !itemKey) return;
    if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
    if (itemKey.startsWith('num:')) {
      const n = Number(itemKey.slice(4));
      if (!Number.isInteger(n) || n < NUMBER_MIN || n > NUMBER_MAX) return;
      normalized[itemKey] = dateKey;
    } else if (PHRASE_ITEM_MAP.has(itemKey)) {
      normalized[itemKey] = dateKey;
    }
  });
  return normalized;
}

export const JOURNEY_REWARDS_VERSION = 2;

export function createDefaultJourneyRewards() {
  return {
    version: JOURNEY_REWARDS_VERSION,
    learnerName: '',
    equippedTitleId: 'first_spark',
    unlocked: {},
    activeDaysHistory: [],
    thirtyMinGoalDates: [],
    weekendDaysPlayed: [],
    morningDaysPlayed: [],
    eveningDaysPlayed: [],
    comebackCount: 0,
    comebackWordsCleared: 0,
    crispSpeechCount: 0,
    bestCombo: 0,
    lastActiveDateKey: ''
  };
}

export function normalizeJourneyRewards(raw) {
  const def = createDefaultJourneyRewards();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return def;
  if (Number(raw.version) !== JOURNEY_REWARDS_VERSION) {
    // Discard all legacy achievement data and start clean on v2
    return def;
  }
  const cleanDates = (arr) =>
    Array.isArray(arr)
      ? Array.from(new Set(arr.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)))).sort()
      : [];
  const unlocked = {};
  if (raw.unlocked && typeof raw.unlocked === 'object' && !Array.isArray(raw.unlocked)) {
    Object.entries(raw.unlocked).forEach(([id, entry]) => {
      if (!id || !entry || typeof entry !== 'object') return;
      const lvl = Math.min(5, Math.max(1, Math.floor(Number(entry.level) || 1)));
      const levelDates = {};
      if (entry.levelDates && typeof entry.levelDates === 'object') {
        Object.entries(entry.levelDates).forEach(([k, v]) => {
          if (typeof v === 'string') levelDates[k] = v;
        });
      }
      unlocked[id] = {
        level: lvl,
        unlockedAt: typeof entry.unlockedAt === 'string' ? entry.unlockedAt : new Date().toISOString(),
        dateKey: typeof entry.dateKey === 'string' ? entry.dateKey : '',
        levelDates
      };
    });
  }
  return {
    version: JOURNEY_REWARDS_VERSION,
    learnerName: typeof raw.learnerName === 'string' ? raw.learnerName.trim().slice(0, 28) : '',
    equippedTitleId: typeof raw.equippedTitleId === 'string' && raw.equippedTitleId ? raw.equippedTitleId : 'first_spark',
    unlocked,
    activeDaysHistory: cleanDates(raw.activeDaysHistory),
    thirtyMinGoalDates: cleanDates(raw.thirtyMinGoalDates),
    weekendDaysPlayed: cleanDates(raw.weekendDaysPlayed),
    morningDaysPlayed: cleanDates(raw.morningDaysPlayed),
    eveningDaysPlayed: cleanDates(raw.eveningDaysPlayed),
    comebackCount: Math.max(0, Math.floor(Number(raw.comebackCount) || 0)),
    comebackWordsCleared: Math.max(0, Math.floor(Number(raw.comebackWordsCleared) || 0)),
    crispSpeechCount: Math.max(0, Math.floor(Number(raw.crispSpeechCount) || 0)),
    bestCombo: Math.max(0, Math.floor(Number(raw.bestCombo) || 0)),
    lastActiveDateKey:
      typeof raw.lastActiveDateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.lastActiveDateKey)
        ? raw.lastActiveDateKey
        : ''
  };
}

export function normalizeSeenTopicGuides(raw) {
  if (!Array.isArray(raw)) return [];
  const valid = new Set();
  raw.forEach((id) => {
    if (typeof id === 'string' && CATEGORIES[id]) {
      valid.add(id);
    }
  });
  return Array.from(valid);
}

export function createDefaultProfileData() {
  return {
    mastered: [],
    review: [],
    phraseMastered: [],
    phraseReview: [],
    seenTopicGuides: [],
    introducedItems: [],
    skippedIntroWords: [],
    skippedIntroStages: [],
    practicedStageItems: {},
    completedPracticeStages: [],
    counts: createDefaultCounts(),
    phraseCounts: {},
    extensionCounts: {},
    dailyPronunciation: {},
    weakPhonemeCounts: {},
    dailyCounts: {},
    dailySessions: {},
    activityNotes: {},
    activityBarNotes: {},
    contextMode: 'bare',
    srs: {},
    phraseSrs: {},
    dailyActiveSeconds: {},
    wordFirstSeenDate: {},
    quantityScenarioMisses: {},
    usedSlotOptionsByItem: {},
    structureFillStats: {},
    journeyRewards: createDefaultJourneyRewards(),
    activeCategory: CATEGORY_ORDER[0],
    progressionConfig: createDefaultProgressionConfig(),
    categoryProgress: createDefaultCategoryProgress(),
    totalAnswered: 0,
    totalCorrect: 0,
    streak: 0
  };
}

export function normalizeCountsMap(rawCounts, fallbackDateKey) {
  const counts = createDefaultCounts();
  let migrated = false;
  if (!rawCounts || typeof rawCounts !== 'object') {
    return { counts, migrated };
  }
  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n++) {
    const entry = rawCounts[n];
    if (!entry || typeof entry !== 'object') continue;
    const c = Number(entry.correct) || 0;
    const inc = Number(entry.incorrect) || 0;
    const totalForNum = c + inc;
    const byDate = {};
    let datedSum = 0;

    if (entry.byDate && typeof entry.byDate === 'object') {
      for (const [dKey, dVal] of Object.entries(entry.byDate)) {
        const dc =
          typeof dVal === 'object' && dVal !== null
            ? Number(dVal.correct) || 0
            : Number(dVal) || 0;
        const dinc =
          typeof dVal === 'object' && dVal !== null ? Number(dVal.incorrect) || 0 : 0;
        if (dc + dinc > 0) {
          byDate[dKey] = { correct: dc, incorrect: dinc };
          datedSum += dc + dinc;
        }
      }
    }

    if (totalForNum > datedSum) {
      const diff = totalForNum - datedSum;
      const prev = byDate[fallbackDateKey] || { correct: 0, incorrect: 0 };
      byDate[fallbackDateKey] = {
        correct: prev.correct + diff,
        incorrect: prev.incorrect
      };
      migrated = true;
    }

    const normalizedStreaks = normalizeSkillStreaks(entry.streaks, c);
    counts[n] = {
      correct: c,
      incorrect: inc,
      skipped: Math.max(0, Math.floor(Number(entry.skipped) || 0)),
      banCount: Math.max(0, Math.floor(Number(entry.banCount) || 0)),
      byDate,
      streaks: normalizedStreaks,
      seenSkills: normalizeSeenSkills(entry.seenSkills, normalizedStreaks),
      blockedUntil: Math.max(0, Number(entry.blockedUntil) || 0),
      retestCorrect: Math.max(0, Math.floor(Number(entry.retestCorrect) || 0)),
      pronunciationSum: Math.max(0, Number(entry.pronunciationSum) || 0),
      pronunciationCount: Math.max(0, Math.floor(Number(entry.pronunciationCount) || 0)),
      pronunciationImproveCount: Math.max(0, Math.floor(Number(entry.pronunciationImproveCount) || 0))
    };
  }
  return { counts, migrated };
}

export function normalizeProfileData(parsed, { isSpeakOnly = false, todayKey, yesterdayKey } = {}) {
  if (!parsed || typeof parsed !== 'object') {
    return { profile: createDefaultProfileData(), migrated: false };
  }
  const pastDailyKeys =
    parsed.dailyCounts && typeof parsed.dailyCounts === 'object'
      ? Object.keys(parsed.dailyCounts).filter(
        (k) => k < todayKey && (Number(parsed.dailyCounts[k]) || 0) > 0
      )
      : [];
  const legacyFallbackDateKey =
    pastDailyKeys.length > 0 ? pastDailyKeys[0] : yesterdayKey;

  const { counts, migrated } = normalizeCountsMap(parsed.counts, legacyFallbackDateKey);
  const phraseCounts = normalizePhraseCounts(parsed.phraseCounts);
  const strictMastered = [];
  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n++) {
    if (isItemMastered(counts[n])) {
      strictMastered.push(n);
    }
  }
  const strictPhraseMastered = Object.keys(phraseCounts).filter(
    (id) => PHRASE_ITEM_MAP.has(id) && isItemMastered(phraseCounts[id])
  );
  const dailyCounts = computeDailyTotalsFromCounts(counts, parsed.dailyCounts, phraseCounts);
  const filterStrings = (arr) =>
    Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  const normalizePracticedStageItems = (rawMap) => {
    if (!rawMap || typeof rawMap !== 'object' || Array.isArray(rawMap)) return {};
    const out = {};
    Object.entries(rawMap).forEach(([stageKey, list]) => {
      if (typeof stageKey !== 'string' || !Array.isArray(list)) return;
      out[stageKey] = Array.from(new Set(list.map((x) => String(x)).filter(Boolean)));
    });
    return out;
  };

  const normalizeDailySessions = (raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out = {};
    Object.entries(raw).forEach(([dk, list]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dk) || !Array.isArray(list)) return;
      const cleaned = list
        .filter((s) => s && typeof s === 'object' && Number.isFinite(Number(s.start)))
        .map((s) => {
          const start = Math.floor(Number(s.start));
          const end = Math.max(start, Math.floor(Number(s.end) || start));
          return { start, end };
        });
      if (cleaned.length > 0) out[dk] = cleaned;
    });
    return out;
  };

  const normalizeUsedSlotOptionsByItem = (rawMap) => {
    if (!rawMap || typeof rawMap !== 'object' || Array.isArray(rawMap)) return {};
    const out = {};
    Object.entries(rawMap).forEach(([itemId, list]) => {
      if (!Array.isArray(list)) return;
      const item = PHRASE_ITEM_MAP.get(itemId);
      const cfg = item ? getSlotConfigForItem(item) : null;
      if (!cfg || cfg.slotType !== 'spanish_options' || !Array.isArray(cfg.options)) return;
      const validSet = new Set(cfg.options.map((o) => o.es));
      const cleaned = Array.from(new Set(list.filter((v) => typeof v === 'string' && validSet.has(v))));
      if (cleaned.length > 0) {
        out[itemId] = cleaned;
      }
    });
    return out;
  };

  const normalizeStructureFillStats = (rawMap) => {
    if (!rawMap || typeof rawMap !== 'object' || Array.isArray(rawMap)) return {};
    const out = {};
    Object.entries(rawMap).forEach(([itemId, fillMap]) => {
      if (!PHRASE_ITEM_MAP.has(itemId) || !fillMap || typeof fillMap !== 'object' || Array.isArray(fillMap)) return;
      const cleanedItem = {};
      Object.entries(fillMap).forEach(([fillKey, rec]) => {
        if (!fillKey || !rec || typeof rec !== 'object') return;
        const c = Math.max(0, Math.floor(Number(rec.c) || 0));
        const i = Math.max(0, Math.floor(Number(rec.i) || 0));
        if (c > 0 || i > 0) {
          cleanedItem[fillKey] = { c, i };
        }
      });
      if (Object.keys(cleanedItem).length > 0) {
        out[itemId] = cleanedItem;
      }
    });
    return out;
  };

  const normalizeExtensionCounts = (rawMap) => {
    if (!rawMap || typeof rawMap !== 'object' || Array.isArray(rawMap)) return {};
    const out = {};
    Object.entries(rawMap).forEach(([extKey, entry]) => {
      if (!extKey || !entry || typeof entry !== 'object') return;
      const catId = typeof entry.catId === 'string' && CATEGORIES[entry.catId] ? entry.catId : '';
      const es = typeof entry.es === 'string' ? entry.es.trim() : '';
      const en = typeof entry.en === 'string' ? entry.en.trim() : '';
      if (!catId || !es) return;
      const correct = Math.max(0, Math.floor(Number(entry.correct) || 0));
      const incorrect = Math.max(0, Math.floor(Number(entry.incorrect) || 0));
      const pronunciationSum = Math.max(0, Number(entry.pronunciationSum) || 0);
      const pronunciationCount = Math.max(0, Math.floor(Number(entry.pronunciationCount) || 0));
      const pronunciationImproveCount = Math.max(0, Math.floor(Number(entry.pronunciationImproveCount) || 0));
      const byDate = {};
      if (entry.byDate && typeof entry.byDate === 'object') {
        Object.entries(entry.byDate).forEach(([dateKey, dVal]) => {
          if (!dVal || typeof dVal !== 'object') return;
          const dc = Math.max(0, Math.floor(Number(dVal.correct) || 0));
          const dinc = Math.max(0, Math.floor(Number(dVal.incorrect) || 0));
          if (dc + dinc > 0) byDate[dateKey] = { correct: dc, incorrect: dinc };
        });
      }
      if (correct + incorrect > 0 || pronunciationCount > 0) {
        out[extKey] = {
          key: extKey,
          catId,
          es,
          en: en || es,
          group: typeof entry.group === 'string' ? entry.group : '',
          correct,
          incorrect,
          byDate,
          pronunciationSum,
          pronunciationCount,
          pronunciationImproveCount
        };
      }
    });
    return out;
  };

  return {
    migrated,
    profile: {
      mastered: strictMastered,
      review: Array.isArray(parsed.review) ? parsed.review : [],
      phraseMastered: strictPhraseMastered,
      phraseReview: Array.isArray(parsed.phraseReview)
        ? parsed.phraseReview.filter((id) => PHRASE_ITEM_MAP.has(id))
        : [],
      seenTopicGuides: normalizeSeenTopicGuides(parsed.seenTopicGuides),
      introducedItems: filterStrings(parsed.introducedItems),
      skippedIntroWords: filterStrings(parsed.skippedIntroWords),
      skippedIntroStages: filterStrings(parsed.skippedIntroStages),
      practicedStageItems: normalizePracticedStageItems(parsed.practicedStageItems),
      completedPracticeStages: Array.from(new Set(filterStrings(parsed.completedPracticeStages))),
      counts,
      phraseCounts,
      extensionCounts: normalizeExtensionCounts(parsed.extensionCounts),
      dailyPronunciation:
        parsed.dailyPronunciation && typeof parsed.dailyPronunciation === 'object'
          ? parsed.dailyPronunciation
          : {},
      weakPhonemeCounts:
        parsed.weakPhonemeCounts && typeof parsed.weakPhonemeCounts === 'object'
          ? parsed.weakPhonemeCounts
          : {},
      dailyCounts,
      dailySessions: normalizeDailySessions(parsed.dailySessions),
      activityNotes:
        parsed.activityNotes && typeof parsed.activityNotes === 'object' ? parsed.activityNotes : {},
      activityBarNotes:
        parsed.activityBarNotes && typeof parsed.activityBarNotes === 'object'
          ? parsed.activityBarNotes
          : {},
      contextMode:
        typeof parsed.contextMode === 'string' &&
          ['bare', 'prices', 'time', 'age', 'mixed'].includes(parsed.contextMode)
          ? parsed.contextMode
          : 'bare',
      srs: parsed.srs && typeof parsed.srs === 'object' ? parsed.srs : {},
      phraseSrs: normalizePhraseSrs(parsed.phraseSrs),
      dailyActiveSeconds: normalizeDailyActiveSeconds(parsed.dailyActiveSeconds),
      wordFirstSeenDate: normalizeWordFirstSeenDate(parsed.wordFirstSeenDate),
      quantityScenarioMisses:
        parsed.quantityScenarioMisses && typeof parsed.quantityScenarioMisses === 'object' && !Array.isArray(parsed.quantityScenarioMisses)
          ? Object.fromEntries(
              Object.entries(parsed.quantityScenarioMisses)
                .filter(([k, v]) => typeof k === 'string' && k.trim() && Number(v) > 0)
                .map(([k, v]) => [k.trim(), Math.floor(Number(v))])
            )
          : {},
      usedSlotOptionsByItem: normalizeUsedSlotOptionsByItem(parsed.usedSlotOptionsByItem),
      structureFillStats: normalizeStructureFillStats(parsed.structureFillStats),
      journeyRewards: normalizeJourneyRewards(parsed.journeyRewards),
      totalAnswered: Math.max(0, Math.floor(Number(parsed.totalAnswered) || 0)),
      totalCorrect: Math.max(0, Math.floor(Number(parsed.totalCorrect) || 0)),
      streak: Math.max(0, Math.floor(Number(parsed.streak) || 0)),
      ...normalizeProgressionBundle(parsed, isSpeakOnly)
    }
  };
}

export function createDefaultPersistedData() {
  const speakOnly = createDefaultProfileData();
  return {
    ...speakOnly,
    speakOnlyMode: true,
    autoplay: true,
    speed: 1,
    dailyGoal: DAILY_CORRECT_GOAL,
    volume: 1,
    sfxVolume: 0.7,
    correctSound: '1',
    incorrectSound: '1',
    speechRate: 1,
    micDeviceId: '',
    pronunciationEngine: 'local',
    handsFreeReadPrompt: true,
    strictAccents: false,
    needsInitialSave: false
  };
}

export function loadPersistedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultPersistedData();
    }
    const parsed = JSON.parse(raw);
    const parsedSpeed = Number(parsed.speed);
    const parsedVolume = Number(parsed.volume);
    const parsedSfxVolume = Number(parsed.sfxVolume);

    const now = new Date();
    const todayKey = getLocalDateKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayKey = getLocalDateKey(yesterday);

    const rawSpeakOnly =
      parsed.speakOnlyProfile && typeof parsed.speakOnlyProfile === 'object'
        ? parsed.speakOnlyProfile
        : parsed;

    const spkRes = normalizeProfileData(rawSpeakOnly, {
      isSpeakOnly: true,
      todayKey,
      yesterdayKey
    });

    return {
      ...spkRes.profile,
      speakOnlyMode: true,
      autoplay: parsed.autoplay !== false,
      speed: !Number.isNaN(parsedSpeed) && parsedSpeed > 0 ? parsedSpeed : 1,
      volume:
        !Number.isNaN(parsedVolume) && parsed.volume !== undefined
          ? Math.min(1, Math.max(0, parsedVolume))
          : 1,
      sfxVolume:
        !Number.isNaN(parsedSfxVolume) && parsed.sfxVolume !== undefined
          ? Math.min(1, Math.max(0, parsedSfxVolume))
          : 0.7,
      correctSound:
        typeof parsed.correctSound === 'string' && /^([1-9]|10|11)$/.test(parsed.correctSound)
          ? parsed.correctSound
          : '1',
      incorrectSound:
        typeof parsed.incorrectSound === 'string' && /^[1-9]$|^10$/.test(parsed.incorrectSound)
          ? parsed.incorrectSound
          : '1',
      dailyGoal: DAILY_CORRECT_GOAL,
      speechRate: 1,
      micDeviceId: typeof parsed.micDeviceId === 'string' ? parsed.micDeviceId : '',
      pronunciationEngine: 'local',
      handsFreeReadPrompt: parsed.handsFreeReadPrompt !== false,
      strictAccents: false,
      needsInitialSave: spkRes.migrated
    };
  } catch {
    return createDefaultPersistedData();
  }
}
