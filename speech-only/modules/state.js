import { CATEGORY_ORDER } from '../curriculum/index.js';
import {
  createDefaultCategoryProgress,
  createDefaultProgressionConfig,
  getActiveSkillPillarsForMode,
  getHighestUnlockedCategoryIdInMap,
  getPreviousBlockingCategoryInMap,
  isCategoryCompletedInMap,
  isCategoryUnlockedInMap
} from './progression-core.js';
import {
  SNAPSHOTS_STORAGE_KEY,
  STORAGE_KEY,
  createDefaultCounts,
  createDefaultJourneyRewards,
  createDefaultProfileData,
  loadPersistedData,
  normalizeProfileData
} from './tracking-schema.js';
import { getLocalDateKey } from './utils.js';

export const persisted = loadPersistedData();

export const state = {
  speakOnlyMode: true,
  trackingDisabled: false,
  activeView: 'play',      // 'play' | 'path' | 'stats'
  activeCategory: persisted.activeCategory,
  progressPaused: false,
  currentVoiceGender: 'female',
  questionType: 'speak',   // Permanently locked to Speech-Only
  direction: 'num-to-es',  // English/context cue -> Panamanian Spanish speech
  range: '0-100',
  currentNum: 42,
  answered: false,
  questionNumber: 1,
  streak: Number(persisted.streak) || 0,
  totalAnswered: Number(persisted.totalAnswered) || 0,
  totalCorrect: Number(persisted.totalCorrect) || 0,
  masteredSet: new Set(persisted.mastered),
  reviewSet: new Set(persisted.review),
  phraseMasteredSet: new Set(persisted.phraseMastered || []),
  phraseReviewSet: new Set(persisted.phraseReview || []),
  seenTopicGuides: new Set(persisted.seenTopicGuides || []),
  introducedItems: new Set(persisted.introducedItems || []),
  skippedIntroWords: new Set(persisted.skippedIntroWords || []),
  skippedIntroStages: new Set(persisted.skippedIntroStages || []),
  practicedStageItems: persisted.practicedStageItems || {},
  completedPracticeStages: new Set(persisted.completedPracticeStages || []),
  practiceQueueStageKey: '',
  practiceQueueIndex: 0,
  autoplay: persisted.autoplay,
  speed: persisted.speed,
  dailyGoal: persisted.dailyGoal,
  volume: persisted.volume,
  sfxVolume: persisted.sfxVolume,
  correctSound: persisted.correctSound,
  incorrectSound: persisted.incorrectSound,
  counts: persisted.counts,
  phraseCounts: persisted.phraseCounts || {},
  extensionCounts: persisted.extensionCounts || {},
  dailyPronunciation: persisted.dailyPronunciation || {},
  weakPhonemeCounts: persisted.weakPhonemeCounts || {},
  dailyCounts: persisted.dailyCounts,
  dailySessions: persisted.dailySessions || {},
  activityNotes: persisted.activityNotes,
  activityBarNotes: persisted.activityBarNotes,
  speechRate: persisted.speechRate,
  micDeviceId: persisted.micDeviceId || '',
  // Always start in Local Hybrid ('local') on page load/refresh; runtime switches stay in-memory only
  pronunciationEngine: 'local',
  handsFreeMode: false,
  handsFreeReadPrompt: persisted.handsFreeReadPrompt !== false,
  autoExportEnabled: persisted.autoExportEnabled !== false,
  autoExportPath: typeof persisted.autoExportPath === 'string' ? persisted.autoExportPath : '',
  autoExportQuestionCount: 0,
  weakDrillActive: false,
  polishDrillActive: false,
  revisionDrillActive: false,
  practiceMode: false,
  sessionQuestionSeq: 0,
  currentQuestionSkipRecorded: false,
  lastSkippedBaseKey: '',
  lastSkippedExpectedEs: '',
  recentSkipQuestionsByKey: {},
  skipCooldownUntilByKey: {},
  skipBanTierByKey: {},
  sessionStats: {
    startedAt: Date.now(),
    answered: 0,
    correct: 0,
    pronunciationSum: 0,
    pronunciationCount: 0,
    improvedItems: []
  },
  contextMode: persisted.contextMode,
  strictAccents: persisted.strictAccents,
  srs: persisted.srs,
  phraseSrs: persisted.phraseSrs || {},
  dailyActiveSeconds: persisted.dailyActiveSeconds,
  wordFirstSeenDate: persisted.wordFirstSeenDate || {},
  quantityScenarioMisses: persisted.quantityScenarioMisses || {},
  usedSlotOptionsByItem: persisted.usedSlotOptionsByItem || {},
  structureFillStats: persisted.structureFillStats || {},
  journeyRewards: persisted.journeyRewards || createDefaultJourneyRewards(),
  progressionConfig: persisted.progressionConfig,
  categoryProgress: persisted.categoryProgress,
  currentContext: null,
  currentItem: null,
  currentInstance: null,
  lastFillKeyByItem: {},
  selectedSlotChoices: {},
  usedExamQuantityScenarios: new Set(),
  usedExamQuantityStageKey: '',
  reviewFilterCat: persisted.activeCategory || CATEGORY_ORDER[0],
  dictationSequence: [],
  recordSortKey: 'number', // 'number' | 'correct' | 'incorrect' | 'pct' | 'mastery'
  recordSortDir: 'asc'     // 'asc' | 'desc'
};

export function extractProfileSnapshotFromState() {
  return {
    mastered: Array.from(state.masteredSet),
    review: Array.from(state.reviewSet),
    phraseMastered: Array.from(state.phraseMasteredSet),
    phraseReview: Array.from(state.phraseReviewSet),
    seenTopicGuides: Array.from(state.seenTopicGuides || []),
    introducedItems: Array.from(state.introducedItems || []),
    skippedIntroWords: Array.from(state.skippedIntroWords || []),
    skippedIntroStages: Array.from(state.skippedIntroStages || []),
    practicedStageItems: state.practicedStageItems || {},
    completedPracticeStages: Array.from(state.completedPracticeStages || []),
    counts: state.counts,
    phraseCounts: state.phraseCounts,
    extensionCounts: state.extensionCounts || {},
    dailyPronunciation: state.dailyPronunciation || {},
    weakPhonemeCounts: state.weakPhonemeCounts || {},
    dailyCounts: state.dailyCounts,
    dailySessions: state.dailySessions || {},
    activityNotes: state.activityNotes,
    activityBarNotes: state.activityBarNotes,
    contextMode: state.contextMode,
    srs: state.srs,
    phraseSrs: state.phraseSrs,
    dailyActiveSeconds: state.dailyActiveSeconds,
    wordFirstSeenDate: state.wordFirstSeenDate || {},
    quantityScenarioMisses: state.quantityScenarioMisses || {},
    usedSlotOptionsByItem: state.usedSlotOptionsByItem || {},
    structureFillStats: state.structureFillStats || {},
    journeyRewards: state.journeyRewards || createDefaultJourneyRewards(),
    activeCategory: state.activeCategory,
    progressionConfig: state.progressionConfig,
    categoryProgress: state.categoryProgress,
    totalAnswered: state.totalAnswered,
    totalCorrect: state.totalCorrect,
    streak: state.streak
  };
}

export function applyProfileToState(profile) {
  const src = profile || createDefaultProfileData();
  state.masteredSet = new Set(src.mastered || []);
  state.reviewSet = new Set(src.review || []);
  state.phraseMasteredSet = new Set(src.phraseMastered || []);
  state.phraseReviewSet = new Set(src.phraseReview || []);
  state.seenTopicGuides = new Set(src.seenTopicGuides || []);
  state.introducedItems = new Set(src.introducedItems || []);
  state.skippedIntroWords = new Set(src.skippedIntroWords || []);
  state.skippedIntroStages = new Set(src.skippedIntroStages || []);
  state.practicedStageItems = src.practicedStageItems && typeof src.practicedStageItems === 'object' ? { ...src.practicedStageItems } : {};
  state.completedPracticeStages = new Set(src.completedPracticeStages || []);
  state.practiceQueueStageKey = '';
  state.practiceQueueIndex = 0;
  state.counts = src.counts || createDefaultCounts();
  state.phraseCounts = src.phraseCounts || {};
  state.extensionCounts =
    src.extensionCounts && typeof src.extensionCounts === 'object'
      ? Object.fromEntries(
          Object.entries(src.extensionCounts).map(([k, rec]) => [
            k,
            rec && typeof rec === 'object'
              ? { ...rec, byDate: rec.byDate ? { ...rec.byDate } : {} }
              : rec
          ])
        )
      : {};
  state.dailyPronunciation = src.dailyPronunciation || {};
  state.weakPhonemeCounts = src.weakPhonemeCounts || {};
  state.dailyCounts = src.dailyCounts || {};
  state.dailySessions = src.dailySessions || {};
  state.activityNotes = src.activityNotes || {};
  state.activityBarNotes = src.activityBarNotes || {};
  state.contextMode = src.contextMode || 'bare';
  state.srs = src.srs || {};
  state.phraseSrs = src.phraseSrs || {};
  state.dailyActiveSeconds = src.dailyActiveSeconds || {};
  state.wordFirstSeenDate = src.wordFirstSeenDate && typeof src.wordFirstSeenDate === 'object' ? { ...src.wordFirstSeenDate } : {};
  state.quantityScenarioMisses =
    src.quantityScenarioMisses && typeof src.quantityScenarioMisses === 'object'
      ? { ...src.quantityScenarioMisses }
      : {};
  state.usedSlotOptionsByItem =
    src.usedSlotOptionsByItem && typeof src.usedSlotOptionsByItem === 'object'
      ? Object.fromEntries(
          Object.entries(src.usedSlotOptionsByItem).map(([k, arr]) => [
            k,
            Array.isArray(arr) ? [...arr] : []
          ])
        )
      : {};
  state.selectedSlotChoices = {};
  state.structureFillStats =
    src.structureFillStats && typeof src.structureFillStats === 'object'
      ? Object.fromEntries(
          Object.entries(src.structureFillStats).map(([k, fMap]) => [
            k,
            fMap && typeof fMap === 'object' ? { ...fMap } : {}
          ])
        )
      : {};
  state.currentInstance = null;
  state.lastFillKeyByItem = {};
  state.journeyRewards = src.journeyRewards || createDefaultJourneyRewards();
  state.activeCategory = src.activeCategory || CATEGORY_ORDER[0];
  state.progressionConfig = src.progressionConfig || createDefaultProgressionConfig();
  state.categoryProgress = src.categoryProgress || createDefaultCategoryProgress();
  state.totalAnswered = Math.max(0, Number(src.totalAnswered) || 0);
  state.totalCorrect = Math.max(0, Number(src.totalCorrect) || 0);
  state.streak = Math.max(0, Number(src.streak) || 0);
  state.reviewFilterCat = state.activeCategory || CATEGORY_ORDER[0];
}

export function getActiveProfilePayload() {
  return extractProfileSnapshotFromState();
}

let lastSnapshotSavedAt = 0;

function saveRollingDailySnapshot(payloadObj) {
  const now = Date.now();
  if (now - lastSnapshotSavedAt < 60000) return;
  lastSnapshotSavedAt = now;
  try {
    const raw = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const safeMap = map && typeof map === 'object' && !Array.isArray(map) ? map : {};
    const todayKey = getLocalDateKey();
    safeMap[todayKey] = {
      savedAt: new Date(now).toISOString(),
      totalAnswered: Number(payloadObj.totalAnswered) || 0,
      payload: payloadObj
    };
    const keys = Object.keys(safeMap).sort();
    while (keys.length > 7) {
      const oldest = keys.shift();
      delete safeMap[oldest];
    }
    localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(safeMap));
  } catch {
    // Ignore snapshot storage quota errors
  }
}

export function isTrackingDisabled() {
  return Boolean(state.trackingDisabled);
}

export function buildProgressExportPayload() {
  const activeProfile = getActiveProfilePayload();
  return {
    appMode: 'speech-only',
    exportedAt: new Date().toISOString(),
    ...activeProfile,
    speakOnlyMode: true,
    autoplay: state.autoplay,
    speed: state.speed,
    dailyGoal: state.dailyGoal,
    volume: state.volume,
    sfxVolume: state.sfxVolume,
    correctSound: state.correctSound,
    incorrectSound: state.incorrectSound,
    speechRate: state.speechRate,
    micDeviceId: state.micDeviceId,
    pronunciationEngine: 'local',
    handsFreeReadPrompt: state.handsFreeReadPrompt !== false,
    autoExportEnabled: state.autoExportEnabled !== false,
    autoExportPath: typeof state.autoExportPath === 'string' ? state.autoExportPath.trim() : '',
    strictAccents: state.strictAccents
  };
}

export function resetAllProgressData() {
  const fresh = createDefaultProfileData();
  applyProfileToState(fresh);
  state.weakDrillActive = false;
  state.polishDrillActive = false;
  state.revisionDrillActive = false;
  state.practiceMode = false;
  state.sessionQuestionSeq = 0;
  state.currentQuestionSkipRecorded = false;
  state.lastSkippedBaseKey = '';
  state.lastSkippedExpectedEs = '';
  state.recentSkipQuestionsByKey = {};
  state.skipCooldownUntilByKey = {};
  state.skipBanTierByKey = {};
  state.autoExportQuestionCount = 0;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SNAPSHOTS_STORAGE_KEY);
  } catch {
    // Ignore storage removal errors
  }
  if (!state.trackingDisabled) {
    savePersistedData();
  }
  return true;
}

export function importProgressPayload(rawObj) {
  if (!rawObj || typeof rawObj !== 'object' || Array.isArray(rawObj)) {
    return { ok: false, error: 'Invalid JSON backup format.' };
  }
  const rawProfile =
    rawObj.speakOnlyProfile && typeof rawObj.speakOnlyProfile === 'object'
      ? rawObj.speakOnlyProfile
      : rawObj;
  const hasProgressKeys =
    'counts' in rawProfile ||
    'phraseCounts' in rawProfile ||
    'categoryProgress' in rawProfile ||
    'dailyCounts' in rawProfile;
  if (!hasProgressKeys) {
    return { ok: false, error: 'File does not contain valid progress data.' };
  }

  const now = new Date();
  const todayKey = getLocalDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);
  const normalized = normalizeProfileData(rawProfile, {
    isSpeakOnly: true,
    todayKey,
    yesterdayKey
  });

  applyProfileToState(normalized.profile);
  if (typeof rawObj.autoplay === 'boolean') state.autoplay = rawObj.autoplay;
  if (Number.isFinite(Number(rawObj.speed)) && Number(rawObj.speed) > 0) state.speed = Number(rawObj.speed);
  if (Number.isFinite(Number(rawObj.dailyGoal)) && Number(rawObj.dailyGoal) > 0) state.dailyGoal = Number(rawObj.dailyGoal);
  if (Number.isFinite(Number(rawObj.volume))) state.volume = Math.min(1, Math.max(0, Number(rawObj.volume)));
  if (Number.isFinite(Number(rawObj.sfxVolume))) state.sfxVolume = Math.min(1, Math.max(0, Number(rawObj.sfxVolume)));
  if (rawObj.correctSound !== undefined) state.correctSound = String(rawObj.correctSound);
  if (rawObj.incorrectSound !== undefined) state.incorrectSound = String(rawObj.incorrectSound);
  if (typeof rawObj.handsFreeReadPrompt === 'boolean') state.handsFreeReadPrompt = rawObj.handsFreeReadPrompt;
  if (typeof rawObj.autoExportEnabled === 'boolean') state.autoExportEnabled = rawObj.autoExportEnabled;
  if (typeof rawObj.autoExportPath === 'string') state.autoExportPath = rawObj.autoExportPath.trim();
  if (typeof rawObj.strictAccents === 'boolean') state.strictAccents = rawObj.strictAccents;

  if (!state.trackingDisabled) {
    savePersistedData();
  }
  return { ok: true, totalAnswered: Number(state.totalAnswered) || 0 };
}

export function savePersistedData() {
  if (state.trackingDisabled) return;
  try {
    const payload = buildProgressExportPayload();
    delete payload.exportedAt;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    if ((Number(payload.totalAnswered) || 0) > 0) {
      saveRollingDailySnapshot(payload);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function getActiveSkillPillars() {
  return getActiveSkillPillarsForMode(true);
}

export function isCategoryCompleted(catId) {
  return isCategoryCompletedInMap(catId, state?.categoryProgress || null);
}

export function isCategoryUnlocked(catId, categoryProgressMap = null) {
  return isCategoryUnlockedInMap(catId, categoryProgressMap || state?.categoryProgress || null);
}

export function getPreviousBlockingCategory(catId, categoryProgressMap = null) {
  return getPreviousBlockingCategoryInMap(catId, categoryProgressMap || state?.categoryProgress || null);
}

export function getHighestUnlockedCategoryId(categoryProgressMap = null) {
  return getHighestUnlockedCategoryIdInMap(categoryProgressMap || state?.categoryProgress || null);
}

export function getQuestionSkillBucket() {
  return 'speak';
}

export function isVocabItemProficient(entry) {
  if (!entry || typeof entry !== 'object') return false;
  const correct = Math.max(0, Number(entry.correct) || 0);
  const incorrect = Math.max(0, Number(entry.incorrect) || 0);
  return correct >= 12 && correct + incorrect > 16;
}
