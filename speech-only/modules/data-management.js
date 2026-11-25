import {
  CATEGORIES,
  CATEGORY_ORDER,
  NUMBER_MAX,
  NUMBER_MIN,
  SPANISH_NUMBERS,
  getItemsForCategory,
  getPhraseItemById
} from '../curriculum/index.js';
import {
  computeDailyTotalsFromCounts,
  getTopicAnswerTotal,
  updateDailyGoalUI
} from './data-tracking.js';
import {
  dataManagementBtn,
  dataMgmtCloseBtn,
  dataMgmtModalBackdropEl,
  deleteModalBackdropEl,
  deleteModalDescEl,
  exportDataBtn,
  importDataBtn,
  importDataInputEl,
  modalCancelBtn,
  modalConfirmBtn,
  moveDateBtn,
  moveDateCancelBtn,
  moveDateConfirmBtn,
  moveDateModalBackdropEl,
  moveDateModalDescEl,
  moveDateModalTitleEl,
  randomizeDataBtn,
  restoreSnapshotBtn,
  snapshotSelectEl,
  speedSelectEl,
  wipeCancelBtn,
  wipeConfirmBtn,
  wipeConfirmModalBackdropEl,
  wipeDataBtn,
  wipeTopicBtn,
  wipeTopicCancelBtn,
  wipeTopicConfirmBtn,
  wipeTopicConfirmModalBackdropEl,
  wipeTopicConfirmModalDescEl,
  wipeTopicConfirmModalTitleEl,
  wipeTopicSelectEl
} from './dom.js';
import {
  createDefaultCategoryProgress,
  createDefaultUnitProgress
} from './progression-core.js';
import {
  applyProfileToState,
  getActiveProfilePayload,
  getRollingSnapshots,
  isCategoryUnlocked,
  savePersistedData,
  state
} from './state.js';
import {
  STORAGE_KEY,
  createDefaultCounts,
  createDefaultItemEntry,
  createDefaultProfileData,
  isSkillStreaksMastered,
  loadPersistedData
} from './tracking-schema.js';
import {
  formatDateKeyLabel,
  getLocalDateKey,
  getPreviousDateKey
} from './utils.js';

let pendingDeleteItemKey = null;
let moveDateConfirmStep = 1;
let pendingWipeTopicId = null;

let dataMgmtHooks = {
  onCloseSettingsPopover: () => { },
  onPauseStudyTimer: () => { },
  onUpdateStudyTimerUI: () => { },
  onUpdateTopMetrics: () => { },
  onSyncPronunciationEngineUI: () => { },
  onSyncSpeechPreferencesUI: () => { },
  onSyncWeakDrillBannerUI: () => { },
  onSyncPanamaSettingsUI: () => { },
  onSyncDirectionUI: () => { },
  onSyncQuestionTypeUI: () => { },
  onRenderCategoryNav: () => { },
  onRenderPlayCategoryState: () => { },
  onSyncProgressionUI: () => { },
  onRenderPathView: () => { },
  onUpdateVolumeUI: () => { },
  onUpdateSfxUI: () => { },
  onSyncModeVisuals: () => { },
  onApplyTheme: () => { },
  onApplyBlurLocked: () => { },
  onBuildStatsTable: () => { },
  onLoadQuestion: () => { },
  onMaybeOpenNewTopicEducateModal: () => { },
  onEvaluateAllAchievements: () => { },
  onClearPathExpandedUnitId: () => { },
  onClearTimelineStages: () => { },
  onDeleteTimelineStagesForCategory: () => { },
  onGetProgressionSnapshot: () => null,
  onDismissTransientModals: () => { }
};

export function populateWipeTopicSelect() {
  if (!wipeTopicSelectEl) return;
  const prevVal = wipeTopicSelectEl.value;
  wipeTopicSelectEl.innerHTML = '';
  CATEGORY_ORDER.forEach((catId) => {
    const cat = CATEGORIES[catId];
    if (!cat) return;
    const opt = document.createElement('option');
    opt.value = catId;
    const totalAns = getTopicAnswerTotal(catId);
    const prog = state.categoryProgress && state.categoryProgress[catId];
    const hasStageProg =
      prog &&
      ((prog.completedStages && prog.completedStages.length > 0) ||
        (prog.stageTotal || 0) > 0);
    const suffix =
      totalAns > 0
        ? ` (${totalAns} ans)`
        : hasStageProg
          ? ' (in progress)'
          : '';
    opt.textContent = `${cat.label}${suffix}`;
    wipeTopicSelectEl.appendChild(opt);
  });
  const targetVal =
    prevVal && CATEGORIES[prevVal]
      ? prevVal
      : state.activeCategory && CATEGORIES[state.activeCategory]
        ? state.activeCategory
        : CATEGORY_ORDER[0];
  wipeTopicSelectEl.value = targetVal;
}

export function populateRollingSnapshotsSelect() {
  if (!snapshotSelectEl) return;
  const snaps = getRollingSnapshots();
  snapshotSelectEl.innerHTML = '';
  if (snaps.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No snapshots yet';
    snapshotSelectEl.appendChild(opt);
    if (restoreSnapshotBtn) restoreSnapshotBtn.disabled = true;
    return;
  }
  snaps.forEach((sn) => {
    const opt = document.createElement('option');
    opt.value = sn.dateKey;
    opt.textContent = `${sn.dateKey} (${sn.totalAnswered} ans)`;
    snapshotSelectEl.appendChild(opt);
  });
  if (restoreSnapshotBtn) restoreSnapshotBtn.disabled = false;
}

export function restoreSelectedRollingSnapshot() {
  if (!snapshotSelectEl || !snapshotSelectEl.value) return;
  const snaps = getRollingSnapshots();
  const chosen = snaps.find((s) => s.dateKey === snapshotSelectEl.value);
  if (!chosen || !chosen.payload) return;
  dataMgmtHooks.onDismissTransientModals();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chosen.payload));
  const reloaded = loadPersistedData();
  state.speakOnlyMode = true;
  state.questionType = 'speak';
  state.direction = 'num-to-es';
  applyProfileToState(reloaded);
  state.scoringThreshold = reloaded.scoringThreshold;
  state.handsFreeVad = reloaded.handsFreeVad;
  state.handsFreeMode = false;
  state.handsFreeReadPrompt = reloaded.handsFreeReadPrompt !== false;
  state.handsFreeSilenceMs = reloaded.handsFreeSilenceMs;
  state.handsFreeIncorrectPolicy = reloaded.handsFreeIncorrectPolicy;
  state.handsFreeEarcons = reloaded.handsFreeEarcons !== false;
  state.handsFreeCooldownMs = reloaded.handsFreeCooldownMs;
  state.handsFreePauseOnStage = Boolean(reloaded.handsFreePauseOnStage);
  state.shadowingMode = reloaded.shadowingMode;
  state.pushToTalk = reloaded.pushToTalk !== false;
  state.ttsEngine = reloaded.ttsEngine;
  state.pronunciationEngine = reloaded.pronunciationEngine;
  state.practiceMode = false;
  state.weakDrillActive = false;
  state.polishDrillActive = false;
  state.practiceQueueStageKey = '';
  state.practiceQueueIndex = 0;
  state.currentItem = null;
  state.currentContext = null;
  savePersistedData();
  dataMgmtHooks.onPauseStudyTimer({ resetCarry: true });
  dataMgmtHooks.onSyncPronunciationEngineUI();
  dataMgmtHooks.onSyncSpeechPreferencesUI();
  dataMgmtHooks.onSyncWeakDrillBannerUI();
  dataMgmtHooks.onEvaluateAllAchievements({ silent: true });
  updateDailyGoalUI();
  dataMgmtHooks.onSyncPanamaSettingsUI();
  dataMgmtHooks.onSyncDirectionUI();
  dataMgmtHooks.onSyncQuestionTypeUI();
  dataMgmtHooks.onRenderCategoryNav();
  dataMgmtHooks.onRenderPlayCategoryState();
  dataMgmtHooks.onSyncProgressionUI();
  dataMgmtHooks.onRenderPathView();
  dataMgmtHooks.onUpdateTopMetrics();
  dataMgmtHooks.onBuildStatsTable(false);
  if (isCategoryUnlocked(state.activeCategory)) {
    dataMgmtHooks.onLoadQuestion();
  }
  closeDataMgmtModal();
}

export function openDataMgmtModal() {
  dataMgmtHooks.onCloseSettingsPopover();
  populateWipeTopicSelect();
  populateRollingSnapshotsSelect();
  dataMgmtModalBackdropEl.classList.remove('hidden');
}

export function closeDataMgmtModal() {
  dataMgmtModalBackdropEl.classList.add('hidden');
}

export function openWipeTopicConfirmModal() {
  const catId = wipeTopicSelectEl ? wipeTopicSelectEl.value : state.activeCategory;
  if (!catId || !CATEGORIES[catId]) return;
  pendingWipeTopicId = catId;
  const cat = CATEGORIES[catId];
  if (wipeTopicConfirmModalTitleEl) {
    wipeTopicConfirmModalTitleEl.textContent = `Delete ${cat.label} Data`;
  }
  if (wipeTopicConfirmModalDescEl) {
    const skillText = state.speakOnlyMode ? 'Speak mastery streaks' : '4-skill mastery streaks';
    wipeTopicConfirmModalDescEl.textContent = `Permanently clear all word stats, SRS scheduling, ${skillText}, and stage progress for ${cat.label}?`;
  }
  if (wipeTopicConfirmBtn) {
    wipeTopicConfirmBtn.textContent = `Delete ${cat.label}`;
  }
  closeDataMgmtModal();
  if (wipeTopicConfirmModalBackdropEl) {
    wipeTopicConfirmModalBackdropEl.classList.remove('hidden');
  }
}

export function closeWipeTopicConfirmModal() {
  pendingWipeTopicId = null;
  if (wipeTopicConfirmModalBackdropEl) {
    wipeTopicConfirmModalBackdropEl.classList.add('hidden');
  }
}

export function confirmWipeTopicData() {
  const catId = pendingWipeTopicId;
  if (!catId || !CATEGORIES[catId]) {
    closeWipeTopicConfirmModal();
    return;
  }

  dataMgmtHooks.onDismissTransientModals();

  if (catId === 'numbers') {
    state.counts = createDefaultCounts();
    state.srs = {};
    state.masteredSet.clear();
    state.reviewSet.clear();
    Array.from(state.introducedItems || []).forEach((k) => {
      if (String(k).startsWith('num:')) state.introducedItems.delete(k);
    });
    Array.from(state.skippedIntroWords || []).forEach((k) => {
      if (String(k).startsWith('num:')) state.skippedIntroWords.delete(k);
    });
    if (state.wordFirstSeenDate && typeof state.wordFirstSeenDate === 'object') {
      Object.keys(state.wordFirstSeenDate).forEach((k) => {
        if (String(k).startsWith('num:')) delete state.wordFirstSeenDate[k];
      });
    }
    state.quantityScenarioMisses = {};
  } else {
    getItemsForCategory(catId).forEach((item) => {
      if (state.phraseCounts) delete state.phraseCounts[item.id];
      if (state.phraseSrs) delete state.phraseSrs[item.id];
      state.phraseMasteredSet.delete(item.id);
      state.phraseReviewSet.delete(item.id);
      if (state.introducedItems) state.introducedItems.delete(item.id);
      if (state.skippedIntroWords) state.skippedIntroWords.delete(item.id);
      if (state.wordFirstSeenDate) delete state.wordFirstSeenDate[item.id];
      if (state.usedSlotOptionsByItem) delete state.usedSlotOptionsByItem[item.id];
      if (state.selectedSlotChoices) delete state.selectedSlotChoices[item.id];
      if (state.structureFillStats) delete state.structureFillStats[item.id];
      if (state.lastFillKeyByItem) delete state.lastFillKeyByItem[item.id];
    });
  }
  Array.from(state.skippedIntroStages || []).forEach((stageKey) => {
    if (String(stageKey).startsWith(`${catId}:`)) {
      state.skippedIntroStages.delete(stageKey);
    }
  });
  Array.from(state.completedPracticeStages || []).forEach((stageKey) => {
    if (String(stageKey).startsWith(`${catId}:`)) {
      state.completedPracticeStages.delete(stageKey);
    }
  });
  if (state.practicedStageItems && typeof state.practicedStageItems === 'object') {
    Object.keys(state.practicedStageItems).forEach((stageKey) => {
      if (String(stageKey).startsWith(`${catId}:`)) {
        delete state.practicedStageItems[stageKey];
      }
    });
  }

  if (state.extensionCounts && typeof state.extensionCounts === 'object') {
    Object.entries(state.extensionCounts).forEach(([extKey, rec]) => {
      if (rec?.catId === catId) {
        delete state.extensionCounts[extKey];
      }
    });
  }

  if (!state.categoryProgress || typeof state.categoryProgress !== 'object') {
    state.categoryProgress = createDefaultCategoryProgress();
  }
  state.categoryProgress[catId] = createDefaultUnitProgress();
  if (state.seenTopicGuides) {
    state.seenTopicGuides.delete(catId);
  }
  dataMgmtHooks.onDeleteTimelineStagesForCategory(catId);

  state.dailyCounts = computeDailyTotalsFromCounts(state.counts, {}, state.phraseCounts);

  if (!isCategoryUnlocked(state.activeCategory)) {
    const fallbackCat =
      [...CATEGORY_ORDER].reverse().find((id) => isCategoryUnlocked(id)) || CATEGORY_ORDER[0];
    state.activeCategory = fallbackCat;
  }
  if (state.activeCategory === catId) {
    state.currentItem = null;
    state.practiceMode = false;
    state.weakDrillActive = false;
    state.polishDrillActive = false;
    state.practiceQueueStageKey = '';
    state.practiceQueueIndex = 0;
  }

  savePersistedData();
  dataMgmtHooks.onSyncWeakDrillBannerUI();
  dataMgmtHooks.onEvaluateAllAchievements({ silent: true });
  dataMgmtHooks.onSyncPanamaSettingsUI();
  dataMgmtHooks.onSyncDirectionUI();
  dataMgmtHooks.onSyncQuestionTypeUI();
  dataMgmtHooks.onRenderCategoryNav();
  dataMgmtHooks.onRenderPlayCategoryState();
  dataMgmtHooks.onSyncProgressionUI();
  dataMgmtHooks.onRenderPathView();
  updateDailyGoalUI();
  dataMgmtHooks.onUpdateTopMetrics();
  dataMgmtHooks.onBuildStatsTable(false);
  dataMgmtHooks.onMaybeOpenNewTopicEducateModal(state.activeCategory);
  dataMgmtHooks.onLoadQuestion();
  closeWipeTopicConfirmModal();
}

export function openWipeConfirmModal() {
  closeDataMgmtModal();
  wipeConfirmModalBackdropEl.classList.remove('hidden');
}

export function closeWipeConfirmModal() {
  wipeConfirmModalBackdropEl.classList.add('hidden');
}

export function confirmWipeData() {
  dataMgmtHooks.onDismissTransientModals();
  applyProfileToState(createDefaultProfileData());
  state.speakOnlyMode = true;
  state.questionType = 'speak';
  state.direction = 'num-to-es';
  state.currentItem = null;
  state.currentContext = null;
  state.dictationSequence = [];
  state.answered = false;
  state.progressPaused = false;
  state.usedShow = false;
  state.practiceMode = false;
  state.weakDrillActive = false;
  state.polishDrillActive = false;
  state.practiceQueueStageKey = '';
  state.practiceQueueIndex = 0;
  state.sessionStats = {
    startedAt: Date.now(),
    answered: 0,
    correct: 0,
    pronunciationSum: 0,
    pronunciationCount: 0,
    improvedItems: []
  };
  dataMgmtHooks.onClearPathExpandedUnitId();
  dataMgmtHooks.onClearTimelineStages();
  if (state.progressionConfig && state.progressionConfig.enabled) {
    const resetSnap = dataMgmtHooks.onGetProgressionSnapshot(state.activeCategory);
    if (resetSnap) {
      state.direction = resetSnap.phaseDirection;
      state.questionType = resetSnap.phaseQuestionType;
    }
    state.contextMode = CATEGORIES.numbers.stages[0].contextMode;
  }
  dataMgmtHooks.onPauseStudyTimer({ resetCarry: true });
  savePersistedData();
  dataMgmtHooks.onSyncSpeechPreferencesUI();
  dataMgmtHooks.onSyncWeakDrillBannerUI();
  dataMgmtHooks.onSyncPanamaSettingsUI();
  dataMgmtHooks.onSyncDirectionUI();
  dataMgmtHooks.onSyncQuestionTypeUI();
  dataMgmtHooks.onRenderCategoryNav();
  dataMgmtHooks.onRenderPlayCategoryState();
  dataMgmtHooks.onSyncProgressionUI();
  dataMgmtHooks.onRenderPathView();
  updateDailyGoalUI();
  dataMgmtHooks.onUpdateTopMetrics();
  dataMgmtHooks.onBuildStatsTable(false);
  dataMgmtHooks.onMaybeOpenNewTopicEducateModal(state.activeCategory);
  dataMgmtHooks.onLoadQuestion();
  closeWipeConfirmModal();
}

export function randomizeLast30DaysData() {
  const counts = createDefaultCounts();
  const phraseCounts = {};
  const mastered = new Set();
  const review = new Set();
  const phraseMastered = new Set();
  const phraseReview = new Set();
  const activeSeconds = {};
  const dailySessions = {};
  const dailyPronunciation = {};
  const wordFirstSeenDate = {};
  const firstTopicItems = getItemsForCategory(CATEGORY_ORDER[0]);
  const now = new Date();

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const d = new Date(now);
    d.setDate(now.getDate() - dayOffset);
    const dateKey = getLocalDateKey(d);
    const questionsToday = 6 + Math.floor(Math.random() * 17); // 6 to 22 questions
    const secsToday = questionsToday * (6 + Math.floor(Math.random() * 7));
    activeSeconds[dateKey] = secsToday;
    const sessStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0, 0).getTime();
    dailySessions[dateKey] = [{ start: sessStart, end: sessStart + secsToday * 1000 }];
    const progressFactor = (29 - dayOffset) / 29;
    const targetAccuracy = Math.min(0.95, Math.max(0.45, 0.55 + progressFactor * 0.3 + (Math.random() - 0.5) * 0.2));
    const avgPron = Math.min(98, Math.max(72, Math.round(76 + progressFactor * 16 + (Math.random() - 0.5) * 8)));
    dailyPronunciation[dateKey] = { sum: avgPron * questionsToday, count: questionsToday };

    for (let q = 0; q < questionsToday; q++) {
      const isCorrect = Math.random() < targetAccuracy;
      if (q % 3 === 0 && firstTopicItems.length > 0) {
        const sampleItem = firstTopicItems[Math.floor(Math.random() * firstTopicItems.length)];
        if (!wordFirstSeenDate[sampleItem.id]) {
          wordFirstSeenDate[sampleItem.id] = dateKey;
        }
        if (!phraseCounts[sampleItem.id]) {
          phraseCounts[sampleItem.id] = { correct: 0, incorrect: 0, byDate: {} };
        }
        if (!phraseCounts[sampleItem.id].byDate[dateKey]) {
          phraseCounts[sampleItem.id].byDate[dateKey] = { correct: 0, incorrect: 0 };
        }
        if (isCorrect) {
          phraseCounts[sampleItem.id].correct += 1;
          phraseCounts[sampleItem.id].byDate[dateKey].correct += 1;
        } else {
          phraseCounts[sampleItem.id].incorrect += 1;
          phraseCounts[sampleItem.id].byDate[dateKey].incorrect += 1;
        }
      } else {
        const n = Math.floor(Math.random() * (NUMBER_MAX - NUMBER_MIN + 1)) + NUMBER_MIN;
        if (!wordFirstSeenDate[`num:${n}`]) {
          wordFirstSeenDate[`num:${n}`] = dateKey;
        }
        if (!counts[n].byDate[dateKey]) {
          counts[n].byDate[dateKey] = { correct: 0, incorrect: 0 };
        }
        if (isCorrect) {
          counts[n].correct += 1;
          counts[n].byDate[dateKey].correct += 1;
        } else {
          counts[n].incorrect += 1;
          counts[n].byDate[dateKey].incorrect += 1;
        }
      }
    }
  }

  const assignRandomizedEntryStats = (entry, key, masteredSet, reviewSet) => {
    const c = entry.correct;
    const inc = entry.incorrect;
    const perSkill = Math.max(0, Math.floor((c - inc) / 4));
    entry.streaks = {
      read: Math.min(5, perSkill),
      write: Math.min(5, perSkill),
      listen: Math.min(5, perSkill),
      speak: Math.min(5, perSkill)
    };
    if (c + inc > 0) {
      if (inc > 0 && c <= inc) {
        reviewSet.add(key);
      } else if (isSkillStreaksMastered(entry.streaks)) {
        masteredSet.add(key);
      }
    }
  };

  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n++) {
    assignRandomizedEntryStats(counts[n], n, mastered, review);
  }

  Object.entries(phraseCounts).forEach(([id, entry]) => {
    assignRandomizedEntryStats(entry, id, phraseMastered, phraseReview);
  });

  state.counts = counts;
  state.phraseCounts = phraseCounts;
  state.extensionCounts = {
    'greetings::vecina': {
      key: 'greetings::vecina',
      catId: 'greetings',
      es: 'vecina',
      en: 'neighbor (f.)',
      group: 'greeting_people',
      correct: 8,
      incorrect: 2,
      byDate: {},
      pronunciationSum: 860,
      pronunciationCount: 10,
      pronunciationImproveCount: 2
    },
    'greetings::amigo': {
      key: 'greetings::amigo',
      catId: 'greetings',
      es: 'amigo',
      en: 'my friend',
      group: 'greeting_people',
      correct: 10,
      incorrect: 0,
      byDate: {},
      pronunciationSum: 940,
      pronunciationCount: 10,
      pronunciationImproveCount: 0
    },
    'numbers::empanadas': {
      key: 'numbers::empanadas',
      catId: 'numbers',
      es: 'empanadas',
      en: 'empanadas',
      group: 'numbers_quantities',
      correct: 7,
      incorrect: 3,
      byDate: {},
      pronunciationSum: 820,
      pronunciationCount: 10,
      pronunciationImproveCount: 3
    }
  };
  state.masteredSet = mastered;
  state.reviewSet = review;
  state.phraseMasteredSet = phraseMastered;
  state.phraseReviewSet = phraseReview;
  state.dailyActiveSeconds = activeSeconds;
  state.dailySessions = dailySessions;
  state.dailyPronunciation = dailyPronunciation;
  state.wordFirstSeenDate = wordFirstSeenDate;
  state.dailyCounts = computeDailyTotalsFromCounts(counts, {}, phraseCounts);
  savePersistedData();
  dataMgmtHooks.onEvaluateAllAchievements({ silent: true });
  dataMgmtHooks.onUpdateStudyTimerUI();
  updateDailyGoalUI();
  dataMgmtHooks.onUpdateTopMetrics();
  dataMgmtHooks.onSyncProgressionUI();
  dataMgmtHooks.onRenderPathView();
  dataMgmtHooks.onBuildStatsTable(false);
  closeDataMgmtModal();
}

export function openMoveDateModal() {
  dataMgmtHooks.onCloseSettingsPopover();
  closeDataMgmtModal();
  moveDateConfirmStep = 1;
  const prevKey = getPreviousDateKey();
  moveDateModalTitleEl.textContent = 'Move Data to Previous Date';
  moveDateModalDescEl.textContent = `Are you sure you want to move all existing answered question data to ${formatDateKeyLabel(prevKey)}?`;
  moveDateConfirmBtn.textContent = 'Continue';
  moveDateModalBackdropEl.classList.remove('hidden');
}

export function closeMoveDateModal() {
  moveDateConfirmStep = 1;
  moveDateModalBackdropEl.classList.add('hidden');
}

export function confirmMoveDataToPreviousDate() {
  const prevKey = getPreviousDateKey();
  if (moveDateConfirmStep === 1) {
    moveDateConfirmStep = 2;
    moveDateModalTitleEl.textContent = 'Final Confirmation';
    moveDateModalDescEl.textContent = `This will overwrite all current date entries and assign every answered question to ${formatDateKeyLabel(prevKey)}. This cannot be undone. Are you completely sure?`;
    moveDateConfirmBtn.textContent = 'Yes, Move All Data';
    return;
  }

  const collapseEntryByDate = (entry) => {
    if (!entry || typeof entry !== 'object') return;
    const c = Number(entry.correct) || 0;
    const inc = Number(entry.incorrect) || 0;
    entry.byDate = c + inc > 0 ? { [prevKey]: { correct: c, incorrect: inc } } : {};
  };

  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n++) {
    collapseEntryByDate(state.counts[n]);
  }
  Object.values(state.phraseCounts || {}).forEach(collapseEntryByDate);
  const movedSecs = Object.values(state.dailyActiveSeconds || {}).reduce(
    (sum, v) => sum + (Number(v) || 0),
    0
  );
  state.dailyActiveSeconds = movedSecs > 0 ? { [prevKey]: Math.floor(movedSecs) } : {};

  let pronSum = 0;
  let pronCount = 0;
  Object.values(state.dailyPronunciation || {}).forEach((rec) => {
    pronSum += Number(rec?.sum) || 0;
    pronCount += Number(rec?.count) || 0;
  });
  state.dailyPronunciation = pronCount > 0 ? { [prevKey]: { sum: pronSum, count: pronCount } } : {};

  const allSessions = Object.values(state.dailySessions || {}).flat().filter(Boolean);
  state.dailySessions = allSessions.length > 0 ? { [prevKey]: allSessions } : {};

  if (state.wordFirstSeenDate && typeof state.wordFirstSeenDate === 'object') {
    const movedFirstSeen = {};
    Object.keys(state.wordFirstSeenDate).forEach((k) => {
      movedFirstSeen[k] = prevKey;
    });
    state.wordFirstSeenDate = movedFirstSeen;
  }

  if (state.journeyRewards && typeof state.journeyRewards === 'object') {
    const hasMovedActivity =
      movedSecs > 0 ||
      Object.values(state.counts || {}).some((e) => (Number(e?.correct) || 0) + (Number(e?.incorrect) || 0) > 0) ||
      Object.values(state.phraseCounts || {}).some((e) => (Number(e?.correct) || 0) + (Number(e?.incorrect) || 0) > 0);
    state.journeyRewards.activeDaysHistory = hasMovedActivity ? [prevKey] : [];
    state.journeyRewards.lastActiveDateKey = hasMovedActivity ? prevKey : '';
    state.journeyRewards.thirtyMinGoalDates = movedSecs >= 1800 ? [prevKey] : [];
  }

  state.dailyCounts = computeDailyTotalsFromCounts(state.counts, {}, state.phraseCounts);
  savePersistedData();
  dataMgmtHooks.onEvaluateAllAchievements({ silent: true });
  dataMgmtHooks.onUpdateStudyTimerUI();
  updateDailyGoalUI();
  dataMgmtHooks.onRenderPathView();
  dataMgmtHooks.onBuildStatsTable(false);
  closeMoveDateModal();
}

export async function exportBrowserData({ usePicker = true } = {}) {
  const activeProfile = getActiveProfilePayload();
  const payload = {
    appMode: 'speech-only',
    exportedAt: new Date().toISOString(),
    ...activeProfile,
    speakOnlyMode: true,
    theme: state.theme,
    blurLockedContent: state.blurLockedContent,
    autoplay: state.autoplay,
    speed: state.speed,
    dailyGoal: state.dailyGoal,
    volume: state.volume,
    sfxVolume: state.sfxVolume,
    correctSound: state.correctSound,
    incorrectSound: state.incorrectSound,
    speechRate: state.speechRate,
    micDeviceId: state.micDeviceId,
    strictAccents: state.strictAccents,
    pronunciationEngine: state.pronunciationEngine,
    scoringThreshold: state.scoringThreshold,
    handsFreeVad: state.handsFreeVad,
    handsFreeReadPrompt: state.handsFreeReadPrompt !== false,
    handsFreeSilenceMs: state.handsFreeSilenceMs,
    handsFreeIncorrectPolicy: state.handsFreeIncorrectPolicy,
    handsFreeEarcons: state.handsFreeEarcons !== false,
    handsFreeCooldownMs: state.handsFreeCooldownMs,
    handsFreePauseOnStage: Boolean(state.handsFreePauseOnStage),
    shadowingMode: state.shadowingMode,
    pushToTalk: state.pushToTalk !== false,
    ttsEngine: state.ttsEngine
  };

  const jsonText = JSON.stringify(payload, null, 2);
  const suggestedName = `panamanian-spanish-speech-only-backup-${getLocalDateKey()}.json`;

  if (usePicker && typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: 'JSON Backup File',
            accept: { 'application/json': ['.json'] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(jsonText);
      await writable.close();
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') {
        return;
      }
      // Fall back to standard download if picker fails (e.g. file:// restrictions)
    }
  }

  const blob = new Blob([jsonText], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function importBrowserData(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      (!parsed.counts &&
        !parsed.phraseCounts &&
        !parsed.mastered &&
        !parsed.phraseMastered &&
        !parsed.dailyCounts &&
        !parsed.categoryProgress &&
        !parsed.dailyActiveSeconds &&
        !parsed.standardProfile &&
        !parsed.speakOnlyProfile)
    ) {
      window.alert('Invalid backup file. Please select a valid Panamanian Spanish Learning Tool JSON export.');
      return;
    }

    dataMgmtHooks.onDismissTransientModals();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    const reloaded = loadPersistedData();

    state.speakOnlyMode = true;
    state.questionType = 'speak';
    state.direction = 'num-to-es';
    applyProfileToState(reloaded);
    state.theme = reloaded.theme;
    state.blurLockedContent = reloaded.blurLockedContent !== false;
    state.autoplay = reloaded.autoplay;
    state.speed = reloaded.speed;
    state.dailyGoal = reloaded.dailyGoal;
    state.volume = reloaded.volume;
    state.sfxVolume = reloaded.sfxVolume;
    state.correctSound = reloaded.correctSound;
    state.incorrectSound = reloaded.incorrectSound;
    state.speechRate = reloaded.speechRate;
    state.micDeviceId = reloaded.micDeviceId || '';
    state.strictAccents = reloaded.strictAccents;
    state.pronunciationEngine = reloaded.pronunciationEngine;
    state.scoringThreshold = reloaded.scoringThreshold;
    state.handsFreeVad = reloaded.handsFreeVad;
    state.handsFreeMode = false;
    state.handsFreeReadPrompt = reloaded.handsFreeReadPrompt !== false;
    state.handsFreeSilenceMs = reloaded.handsFreeSilenceMs;
    state.handsFreeIncorrectPolicy = reloaded.handsFreeIncorrectPolicy;
    state.handsFreeEarcons = reloaded.handsFreeEarcons !== false;
    state.handsFreeCooldownMs = reloaded.handsFreeCooldownMs;
    state.handsFreePauseOnStage = Boolean(reloaded.handsFreePauseOnStage);
    state.shadowingMode = reloaded.shadowingMode;
    state.pushToTalk = reloaded.pushToTalk !== false;
    state.ttsEngine = reloaded.ttsEngine;
    state.practiceMode = false;
    state.weakDrillActive = false;
    state.polishDrillActive = false;
    state.practiceQueueStageKey = '';
    state.practiceQueueIndex = 0;
    state.currentItem = null;
    state.currentContext = null;
    if (state.progressionConfig.enabled) {
      const numProg = state.categoryProgress.numbers;
      const stages = CATEGORIES.numbers.stages;
      const activeStage = stages[numProg.stageIndex] || stages[0];
      state.contextMode = activeStage.contextMode;
    }

    savePersistedData();
    dataMgmtHooks.onPauseStudyTimer({ resetCarry: true });
    dataMgmtHooks.onSyncPronunciationEngineUI();
    dataMgmtHooks.onSyncSpeechPreferencesUI();
    dataMgmtHooks.onSyncWeakDrillBannerUI();
    dataMgmtHooks.onEvaluateAllAchievements({ silent: true });
    updateDailyGoalUI();
    speedSelectEl.value = String(state.speed);
    dataMgmtHooks.onSyncPanamaSettingsUI();
    dataMgmtHooks.onSyncDirectionUI();
    dataMgmtHooks.onSyncQuestionTypeUI();
    dataMgmtHooks.onRenderCategoryNav();
    dataMgmtHooks.onRenderPlayCategoryState();
    dataMgmtHooks.onSyncProgressionUI();
    dataMgmtHooks.onRenderPathView();
    dataMgmtHooks.onUpdateVolumeUI();
    dataMgmtHooks.onUpdateSfxUI();
    dataMgmtHooks.onSyncModeVisuals();
    dataMgmtHooks.onApplyTheme();
    dataMgmtHooks.onApplyBlurLocked();
    dataMgmtHooks.onUpdateTopMetrics();
    dataMgmtHooks.onBuildStatsTable(false);
    if (isCategoryUnlocked(state.activeCategory)) {
      dataMgmtHooks.onLoadQuestion();
    }
    dataMgmtHooks.onCloseSettingsPopover();
  } catch {
    window.alert('Could not read backup file. Please ensure it is valid JSON.');
  } finally {
    importDataInputEl.value = '';
  }
}

export function openDeleteModal(itemKey) {
  pendingDeleteItemKey = itemKey;
  if (typeof itemKey === 'string') {
    const item = getPhraseItemById(itemKey);
    const label = item ? `"${item.es}" (${item.en})` : itemKey;
    deleteModalDescEl.textContent = `Are you sure you want to delete the Correct, Incorrect, and Correct % data for ${label}?`;
  } else {
    deleteModalDescEl.textContent = `Are you sure you want to delete the Correct, Incorrect, and Correct % data for ${itemKey} (${SPANISH_NUMBERS[itemKey]})?`;
  }
  deleteModalBackdropEl.classList.remove('hidden');
}

export function closeDeleteModal() {
  pendingDeleteItemKey = null;
  deleteModalBackdropEl.classList.add('hidden');
}

export function confirmDeleteRow() {
  if (pendingDeleteItemKey === null) return;
  const key = pendingDeleteItemKey;
  if (typeof key === 'string') {
    delete state.phraseCounts[key];
    delete state.phraseSrs[key];
    state.phraseMasteredSet.delete(key);
    state.phraseReviewSet.delete(key);
  } else {
    state.counts[key] = createDefaultItemEntry();
    if (state.srs) delete state.srs[key];
    state.masteredSet.delete(key);
    state.reviewSet.delete(key);
  }
  state.dailyCounts = computeDailyTotalsFromCounts(state.counts, {}, state.phraseCounts);
  savePersistedData();
  dataMgmtHooks.onUpdateTopMetrics();
  dataMgmtHooks.onBuildStatsTable(false);
  closeDeleteModal();
}

export function initDataManagement(hooks = {}) {
  dataMgmtHooks = { ...dataMgmtHooks, ...hooks };

  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeDeleteModal);
  if (modalConfirmBtn) modalConfirmBtn.addEventListener('click', confirmDeleteRow);
  if (deleteModalBackdropEl) {
    deleteModalBackdropEl.addEventListener('click', (e) => {
      if (e.target === deleteModalBackdropEl) {
        closeDeleteModal();
      }
    });
  }

  if (dataManagementBtn) dataManagementBtn.addEventListener('click', openDataMgmtModal);
  if (dataMgmtCloseBtn) dataMgmtCloseBtn.addEventListener('click', closeDataMgmtModal);
  if (dataMgmtModalBackdropEl) {
    dataMgmtModalBackdropEl.addEventListener('click', (e) => {
      if (e.target === dataMgmtModalBackdropEl) {
        closeDataMgmtModal();
      }
    });
  }

  if (moveDateBtn) moveDateBtn.addEventListener('click', openMoveDateModal);
  if (exportDataBtn) exportDataBtn.addEventListener('click', () => exportBrowserData());
  if (importDataBtn) importDataBtn.addEventListener('click', () => importDataInputEl.click());
  if (importDataInputEl) {
    importDataInputEl.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        importBrowserData(file);
        closeDataMgmtModal();
      }
    });
  }
  if (randomizeDataBtn) randomizeDataBtn.addEventListener('click', randomizeLast30DaysData);
  if (restoreSnapshotBtn) {
    restoreSnapshotBtn.addEventListener('click', restoreSelectedRollingSnapshot);
  }
  if (wipeTopicBtn) {
    wipeTopicBtn.addEventListener('click', openWipeTopicConfirmModal);
  }
  if (wipeTopicCancelBtn) {
    wipeTopicCancelBtn.addEventListener('click', closeWipeTopicConfirmModal);
  }
  if (wipeTopicConfirmBtn) {
    wipeTopicConfirmBtn.addEventListener('click', confirmWipeTopicData);
  }
  if (wipeTopicConfirmModalBackdropEl) {
    wipeTopicConfirmModalBackdropEl.addEventListener('click', (e) => {
      if (e.target === wipeTopicConfirmModalBackdropEl) {
        closeWipeTopicConfirmModal();
      }
    });
  }
  if (wipeDataBtn) wipeDataBtn.addEventListener('click', openWipeConfirmModal);
  if (wipeCancelBtn) wipeCancelBtn.addEventListener('click', closeWipeConfirmModal);
  if (wipeConfirmBtn) wipeConfirmBtn.addEventListener('click', confirmWipeData);
  if (wipeConfirmModalBackdropEl) {
    wipeConfirmModalBackdropEl.addEventListener('click', (e) => {
      if (e.target === wipeConfirmModalBackdropEl) {
        closeWipeConfirmModal();
      }
    });
  }

  if (moveDateCancelBtn) moveDateCancelBtn.addEventListener('click', closeMoveDateModal);
  if (moveDateConfirmBtn) moveDateConfirmBtn.addEventListener('click', confirmMoveDataToPreviousDate);
  if (moveDateModalBackdropEl) {
    moveDateModalBackdropEl.addEventListener('click', (e) => {
      if (e.target === moveDateModalBackdropEl) {
        closeMoveDateModal();
      }
    });
  }
}
