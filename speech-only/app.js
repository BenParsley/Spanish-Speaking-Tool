import {
  CATEGORIES,
  CATEGORY_ORDER,
  CURRICULUM_UNITS,
  QUANTITY_SCENARIOS,
  buildFilledEnglishExampleForItem,
  buildPhraseEnglishCandidates,
  buildPhraseSpanishCandidates,
  buildQuantityScenarioPhrase,
  buildQuestionContext,
  detectMatchedSlotOptionsInSpanish,
  detectQuantityScenarioFromSpanish,
  expandSpokenDigitsToSpanish,
  getActiveCategoryMeta,
  getDisplaySpanishForItem,
  getEnglishNumber,
  getFilledSpanishForItem,
  getItemsForCategory,
  getItemsForStage,
  getNumberMemoryTip,
  getPhraseMemoryTip,
  getSlotConfigForItem,
  getSpeakableSpanishForItem,
  getSpanishNumber,
  matchesSlotTemplateSpanish,
  normalizeExtensionSlug,
  normalizeWordToken,
  resolveDynamicQuestionInstance,
  tokenizeDisplaySpanishWithSlots,
  tokenizeSpanishWords
} from './curriculum/index.js';
import {
  clearAchievementQueue,
  evaluateAllAchievements,
  initAchievements
} from './modules/achievements.js';
import {
  checkZeroVolumePrompt,
  closeMutedAudioModal,
  initAudioModule,
  playCorrectSound,
  playFullAnswerBonusSound,
  playIncorrectSound,
  speakSpanish,
  speakSpanishWordByWord,
  stopAllSpanishSpeech,
  updateSfxUI,
  updateVolumeUI
} from './modules/audio.js';
import { closeBrowserWarningModal, initBrowserCheck } from './modules/browser-check.js';
import {
  recordOutcome,
  recordPronunciationAttempt,
  recordWordFirstShown,
  registerTrackingHooks,
  updateDailyGoalUI
} from './modules/data-tracking.js';
import {
  answerInputEl,
  audioControlsRowEl,
  categoryPlaceholderCardEl,
  dirEsToNumBtn,
  dirNumToEsBtn,
  feedbackBarEl,
  feedbackDrawerEl,
  fullAnswerRewardBannerEl,
  hintBtn,
  incorrectScreenMemoryTipEl,
  inputShellEl,
  memoryTipCardEl,
  micBtn,
  mutedAudioModalBackdropEl,
  navPlayBtn,
  navStatsBtn,
  pauseProgressBtn,
  placeholderCatDescEl,
  placeholderCatTitleEl,
  placeholderReturnBtn,
  placeholderStagesPreviewEl,
  placeholderTagEl,
  placeholderViewPathBtn,
  playActiveContentEl,
  promptStatPinEl,
  promptSubtextEl,
  promptValueEl,
  settingsPopoverEl,
  settingsToggleBtn,
  skipQuestionBtn,
  slotExampleCueEl,
  speakBtn,
  speakBtnLabel,
  speakCompareBtn,
  speakMeterTrackEl,
  speakSlowBtn,
  speedSelectEl,
  stageCardEl,
  stageProgressionHudEl,
  structurePatternCueEl,
  subjectCompleteModalBackdropEl,
  topicEducateModalBackdropEl,
  trackingToggleBtn,
  trackingToggleLabelEl,
  typeAnswerFeedbackEl,
  typeSectionEl,
  viewPathEl,
  viewPlayEl,
  viewStatsEl,
  voiceCancelBtn,
  voiceRedoBtn,
  weakDrillBannerEl,
  weakDrillBannerTextEl,
  weakDrillExitBtn
} from './modules/dom.js';
import {
  clearGuidebookJumpTimers,
  clearUntrackedGuidebookSession,
  closeCategoryDropdown,
  closeSkipStageModal,
  closeTopicEducateModal,
  closeWordIntroModal,
  getWordIntroDetails,
  initGuidebookModule,
  isWordEligibleForIntro,
  markWordIntroducedInHandsFree,
  maybeOpenNewTopicEducateModal,
  openWordIntroModal,
  renderCategoryNav,
  resetGuidebookState,
  syncTopicEducateButtonUI
} from './modules/guidebook.js';
import {
  handleHandsFreeAttempt1Fail,
  handleHandsFreeCaptureTooShort,
  handleHandsFreeIncorrectScreen,
  handleHandsFreeManualInteraction,
  handleHandsFreeMicEnded,
  handleHandsFreeNoSpeech,
  handleHandsFreePracticeResult,
  handleHandsFreeQuestionLoaded,
  handleHandsFreeScorerError,
  handleHandsFreeScoringStarted,
  handleHandsFreeSpeechOnset,
  handleHandsFreeStageComplete,
  handleHandsFreeVoiceCommand,
  handsFreeState,
  hideHandsFreeInlineIntro,
  initHandsFree,
  isHandsFreeActive,
  isHandsFreeBusy,
  isHandsFreeRunning,
  pauseHandsFreeSession,
  resumeHandsFreeSession,
  stopHandsFreeSession,
  syncHandsFreeUI,
  toggleHandsFreeMode
} from './modules/hands-free.js';
import {
  clearOpenTimelineStageKeys,
  closeUnitCogMenu,
  deleteTimelineStagesForCategory,
  focusUnitAndStageInPathView,
  registerPathViewHooks,
  renderPathView,
  setPathExpandedUnitId
} from './modules/path-view.js';
import {
  clearPendingProgressionModals,
  closeNextStagePreviewModal,
  closeReintroduceSkillModal,
  closeStageCompleteAwardModal,
  closeStageSeenModal,
  closeSubjectCompleteModal,
  closeTopicExamFailedModal,
  dismissStageProgressionModalsForHandsFree,
  getCategoryProgress,
  getProgressionSnapshot,
  getStageSeenProgress,
  initProgressionModule,
  isBlockingProgressionModalOpen,
  isTopicExamActive,
  syncProgressionUI,
  updateProgressionOnAnswer
} from './modules/progression.js';
import {
  PRESET_SKILL_MAX_ATTEMPTS,
  SKILL_META,
  SKILL_PILLARS
} from './modules/progression-core.js';
import {
  getDueSrsNumbers,
  getDueSrsPhraseIds,
  getPolishItemsForCategory,
  getPoolForPhraseCategory,
  getPoolForRange,
  getWeakItemsForCategory,
  pickWeightedFromPool,
  resolveActivePhraseItem
} from './modules/srs.js';
import {
  buildProgressExportPayload,
  getActiveSkillPillars,
  getHighestUnlockedCategoryId,
  getPreviousBlockingCategory,
  importProgressPayload,
  isCategoryUnlocked,
  isTrackingDisabled,
  persisted,
  savePersistedData,
  state
} from './modules/state.js';
import {
  buildStatsTable,
  initStatsView,
  registerStatsViewHooks,
  renderStatsAchievements,
  renderStatsCalendar,
  statsCalendarState,
  switchStatsSubView
} from './modules/stats-view.js';
import {
  closeSpeechConsole,
  closeSpeechErrorModal,
  isSpeechConsoleOpen,
  logSpeechEvent
} from './modules/speech-console.js';
import { initStudyTimer, markStudyActivity, pauseStudyTimerNow, updateStudyTimerUI } from './modules/study-timer.js';
import {
  escapeHtmlText,
  getPctTierClass,
  normalizePhraseEnglish,
  normalizePhraseSpanish,
  normalizeText,
  stripAccents
} from './modules/utils.js';
import {
  MAX_SPEAK_ATTEMPTS_BEFORE_NEXT,
  cancelActiveQuestionRecording,
  commitLocalPronunciationResult,
  detectVoiceCommand,
  getSoundCoachingTip,
  getSpokenWordAtIndex,
  initVoiceCapture,
  isLocalScorerActive,
  isVoiceSkipCommand,
  playLastSubmittedAudio,
  refreshMicDeviceList,
  renderPronunciationWordStripHTML,
  resetQuestionVoiceCapture,
  startVoiceCapture,
  stopActiveVoiceCapture,
  stopVoicePlayback,
  syncNextQuestionButtonUI,
  syncPronunciationEngineUI,
  voiceCaptureState
} from './modules/voice-capture.js';

const NEW_WORD_AUTO_SPEAK_DELAY_MS = 500;
let feedbackTimer = null;
let feedbackRemainingMs = 0;
let feedbackStartTime = 0;
let viewTransitionTimer = null;
let newWordAutoSpeakTimer = null;

function clearNewWordAutoSpeakTimer() {
  if (newWordAutoSpeakTimer !== null) {
    clearTimeout(newWordAutoSpeakTimer);
    newWordAutoSpeakTimer = null;
  }
}

function scheduleNewWordAutoSpeak(text) {
  clearNewWordAutoSpeakTimer();
  const target = String(text || '').trim();
  if (!target || Number(state.volume) <= 0) return;
  const scheduledQuestionNum = state.questionNumber;
  newWordAutoSpeakTimer = setTimeout(() => {
    newWordAutoSpeakTimer = null;
    if (state.activeView !== 'play' || state.answered) return;
    if (state.questionNumber !== scheduledQuestionNum) return;
    if (isHandsFreeRunning()) return;
    if (Number(state.volume) <= 0) return;
    speakSpanish(target);
  }, NEW_WORD_AUTO_SPEAK_DELAY_MS);
}

function clearFeedbackTimer() {
  if (feedbackTimer !== null) {
    clearTimeout(feedbackTimer);
    feedbackTimer = null;
  }
}

function syncTrackingDisabledUI() {
  const off = isTrackingDisabled();
  document.body.classList.toggle('is-tracking-disabled', off);
  if (trackingToggleBtn) {
    trackingToggleBtn.classList.toggle('is-tracking-disabled', off);
    trackingToggleBtn.setAttribute('aria-checked', String(off));
    trackingToggleBtn.title = off
      ? 'Debug Mode is ON — tracking is disabled and no changes are saved. Click to exit Debug Mode.'
      : 'Enable Debug Mode to use the website without affecting or tracking any changes';
  }
  if (trackingToggleLabelEl) {
    trackingToggleLabelEl.textContent = off ? 'On' : 'Off';
  }
}

function toggleTrackingDisabled() {
  const turningOff = !isTrackingDisabled();
  if (turningOff) {
    // Flush and stop any active study time accumulated before entering Developer Mode
    pauseStudyTimerNow({ resetCarry: true });
    clearUntrackedGuidebookSession();
    state.trackingDisabled = true;
    logSpeechEvent('DEV MODE', 'Debug Mode enabled — changes and progress will not be recorded or saved');
  } else {
    state.trackingDisabled = false;
    clearUntrackedGuidebookSession();
    enforcePracticeGateForCurrentStage();
    logSpeechEvent('DEV MODE', 'Debug Mode disabled — progress recording resumed');
  }
  syncTrackingDisabledUI();
  updateStudyTimerUI();
  updateDailyGoalUI();
  syncPracticeModeCardUI({ autoSpeak: false, preserveSlotChoice: true });
  updatePromptStatPin();
}

function closeSettingsPopover() {
  settingsPopoverEl.classList.add('hidden');
  settingsToggleBtn.classList.remove('active');
  settingsToggleBtn.setAttribute('aria-expanded', 'false');
}

function updateTopMetrics() {
  const isNumbers = state.activeCategory === 'numbers';

  if (!isNumbers && !['0-100', 'srs', 'mistakes'].includes(state.range)) {
    state.range = '0-100';
  }

  const reviewCount = isNumbers
    ? state.reviewSet.size
    : getItemsForCategory(state.activeCategory).filter((item) => state.phraseReviewSet.has(item.id)).length;
  if (state.range === 'mistakes' && reviewCount === 0) {
    state.range = '0-100';
  }

  const dueCount = isNumbers ? getDueSrsNumbers().length : getDueSrsPhraseIds(state.activeCategory).length;
  if (state.range === 'srs' && dueCount === 0) {
    state.range = '0-100';
  }
}

function getSelectedSlotChoiceForItem(item) {
  if (!item || !item.id || !state.selectedSlotChoices) return '';
  return String(state.selectedSlotChoices[item.id] || '').trim();
}

function getUsedSlotOptionsSetForItem(itemId) {
  if (!itemId || !state.usedSlotOptionsByItem || typeof state.usedSlotOptionsByItem !== 'object') {
    return new Set();
  }
  const list = state.usedSlotOptionsByItem[itemId];
  return new Set(Array.isArray(list) ? list : []);
}

function ensurePreselectedSlotOptionForItem(item, { resetIfExhausted = true } = {}) {
  if (!item || !item.id) return '';
  const slotCfg = getSlotConfigForItem(item);
  if (!slotCfg || slotCfg.slotType !== 'spanish_options' || !Array.isArray(slotCfg.options) || slotCfg.options.length === 0) {
    return '';
  }
  if (!state.usedSlotOptionsByItem || typeof state.usedSlotOptionsByItem !== 'object') {
    state.usedSlotOptionsByItem = {};
  }
  if (!state.selectedSlotChoices || typeof state.selectedSlotChoices !== 'object') {
    state.selectedSlotChoices = {};
  }

  let usedSet = getUsedSlotOptionsSetForItem(item.id);
  if (resetIfExhausted && usedSet.size >= slotCfg.options.length) {
    if (!isTrackingDisabled()) {
      delete state.usedSlotOptionsByItem[item.id];
      savePersistedData();
    }
    usedSet = new Set();
  }

  const current = getSelectedSlotChoiceForItem(item);
  const isCurrentValid = Boolean(
    current && slotCfg.options.some((opt) => opt.es === current) && !usedSet.has(current)
  );
  if (!isCurrentValid) {
    const firstUnused = slotCfg.options.find((opt) => !usedSet.has(opt.es)) || slotCfg.options[0];
    state.selectedSlotChoices[item.id] = firstUnused ? firstUnused.es : '';
  }
  return state.selectedSlotChoices[item.id] || '';
}

function markSlotOptionsUsedForItem(item, meta = {}) {
  if (isTrackingDisabled()) return [];
  if (!item || !item.id) return [];
  const slotCfg = getSlotConfigForItem(item);
  if (!slotCfg || slotCfg.slotType !== 'spanish_options' || !Array.isArray(slotCfg.options) || slotCfg.options.length === 0) {
    return [];
  }
  let matched = detectMatchedSlotOptionsInSpanish(item, meta.heard || '');
  if (matched.length === 0 && meta.scoredTargetEs) {
    matched = detectMatchedSlotOptionsInSpanish(item, meta.scoredTargetEs);
  }
  if (matched.length === 0) return [];

  if (!state.usedSlotOptionsByItem || typeof state.usedSlotOptionsByItem !== 'object') {
    state.usedSlotOptionsByItem = {};
  }
  const existing = Array.isArray(state.usedSlotOptionsByItem[item.id])
    ? state.usedSlotOptionsByItem[item.id]
    : [];
  const merged = Array.from(new Set([...existing, ...matched]));
  state.usedSlotOptionsByItem[item.id] = merged;
  savePersistedData();
  syncSlotOptionsDropdownUI({ preserveCurrentChoice: true });
  return matched;
}

function syncSlotExampleCueUI(item, slotCfg, chosen) {
  if (!slotExampleCueEl) return;
  if (
    !item ||
    !slotCfg ||
    slotCfg.slotType !== 'spanish_options' ||
    !Array.isArray(slotCfg.options) ||
    slotCfg.options.length === 0
  ) {
    slotExampleCueEl.innerHTML = '';
    slotExampleCueEl.classList.add('hidden');
    return;
  }
  const activeChoice = chosen || slotCfg.options[0]?.es || '';
  const exampleEn = buildFilledEnglishExampleForItem(item, activeChoice);
  const exampleEs = getFilledSpanishForItem(item, activeChoice);
  if (!exampleEn) {
    slotExampleCueEl.innerHTML = '';
    slotExampleCueEl.classList.add('hidden');
    return;
  }
  if (state.practiceMode) {
    slotExampleCueEl.innerHTML = `<span class="slot-example-badge">Optional Extension Example:</span> <span class="slot-example-phrase">"${escapeHtmlText(exampleEn)}"</span> <span class="slot-example-note">(${escapeHtmlText(exampleEs)}) · Only the base is required; add any valid extension for a bonus</span>`;
  } else {
    slotExampleCueEl.innerHTML = `<span class="slot-example-badge">Optional Extension Example:</span> <span class="slot-example-phrase">"${escapeHtmlText(exampleEn)}"</span> <span class="slot-example-note">· Only the base is required; include any valid Spanish extension for a bonus</span>`;
  }
  slotExampleCueEl.classList.remove('hidden');
}

function getActivePhraseData(explicitItem = null) {
  const item = explicitItem || (state.activeCategory !== 'numbers' ? resolveActivePhraseItem() : null);
  if (!item) return null;
  if (state.currentInstance && state.currentInstance.itemId === item.id) {
    return {
      ...item,
      es: state.currentInstance.es,
      altEs: state.currentInstance.altEs || [],
      en: state.currentInstance.en,
      altEn: state.currentInstance.altEn || []
    };
  }
  return item;
}

function buildSlotEnglishSegments(patternEn, placeholderText) {
  const pat = String(patternEn || '').trim();
  const ph = String(placeholderText || '').trim();
  if (!pat || !ph) return [];
  const token = '{en}';
  const idx = pat.indexOf(token);
  if (idx === -1) return [];
  const before = pat.slice(0, idx).trim();
  const after = pat.slice(idx + token.length).trim();
  const segs = [];
  if (before) {
    const trailComma = before.match(/^(.+?)(,)$/);
    if (trailComma) {
      segs.push({ text: trailComma[1].trim(), role: 'base' });
      segs.push({ text: trailComma[2], role: 'punct' });
    } else {
      segs.push({ text: before, role: 'base' });
    }
  }
  segs.push({ text: ph, role: 'extension' });
  if (after) {
    if (/^[?!.,;:]+$/.test(after)) {
      segs.push({ text: after, role: 'punct' });
    } else {
      segs.push({ text: after, role: 'base' });
    }
  }
  return segs;
}

function buildPersonalSlotEnglishSegments(enText) {
  const str = String(enText || '').trim();
  const m = str.match(/^(.*?)(\[[^\]]+\])(.*)$/);
  if (!m) return [];
  const segs = [];
  const before = m[1].trim();
  const ext = m[2].trim();
  const after = m[3].trim();
  if (before) segs.push({ text: before, role: 'base' });
  if (ext) segs.push({ text: ext, role: 'extension' });
  if (after) {
    segs.push({ text: after, role: /^[?!.,;:]+$/.test(after) ? 'punct' : 'base' });
  }
  return segs.some((s) => s.role === 'base') && segs.some((s) => s.role === 'extension') ? segs : [];
}

function getActiveQuestionSplit() {
  if (state.activeCategory === 'numbers') {
    const ctx = state.currentContext;
    if (ctx?.hasExtension && ctx.baseEs && ctx.extensionEs) {
      return {
        hasExtension: true,
        trackExtensionInMastery: true,
        catId: 'numbers',
        itemId: state.currentNum,
        baseEs: ctx.baseEs,
        baseAltEs: Array.isArray(ctx.baseAltEs) ? ctx.baseAltEs : [ctx.baseEs],
        baseEn: ctx.baseEn || String(state.currentNum),
        enSegments: Array.isArray(ctx.enSegments) ? ctx.enSegments : [],
        extensionEs: ctx.extensionEs,
        extensionEn: ctx.extensionEn || ctx.extensionEs,
        extensionLabelEs: ctx.extensionLabelEs || ctx.extensionEs,
        extensionLabelEn: ctx.extensionLabelEn || ctx.extensionEn || ctx.extensionEs,
        extensionKey: ctx.extensionKey || `numbers::${normalizeExtensionSlug(ctx.extensionEs)}`,
        extensionGroup: ctx.extensionGroup || 'numbers',
        baseWordIndices: Array.isArray(ctx.baseWordIndices) ? ctx.baseWordIndices : [],
        extensionWordIndices: Array.isArray(ctx.extensionWordIndices) ? ctx.extensionWordIndices : []
      };
    }
    return { hasExtension: false };
  }

  const item = resolveActivePhraseItem();
  if (!item) return { hasExtension: false };

  // 1. Dynamic structure items across all 7 phrase units
  if (
    state.currentInstance &&
    state.currentInstance.itemId === item.id &&
    state.currentInstance.hasExtension &&
    state.currentInstance.baseEs &&
    state.currentInstance.extensionEs
  ) {
    const inst = state.currentInstance;
    return {
      hasExtension: true,
      trackExtensionInMastery: true,
      catId: state.activeCategory,
      itemId: item.id,
      baseEs: inst.baseEs,
      baseAltEs: Array.isArray(inst.baseAltEs) ? inst.baseAltEs : [inst.baseEs],
      baseEn: inst.baseEn || inst.en,
      enSegments: Array.isArray(inst.enSegments) ? inst.enSegments : [],
      extensionEs: inst.extensionEs,
      extensionEn: inst.extensionEn || inst.extensionEs,
      extensionLabelEs: inst.extensionEs,
      extensionLabelEn: inst.extensionEn || inst.extensionEs,
      extensionKey: inst.extensionKey || `${state.activeCategory}::${normalizeExtensionSlug(inst.extensionEs)}`,
      extensionGroup: inst.extensionBank || 'structure',
      baseWordIndices: Array.isArray(inst.baseWordIndices) ? inst.baseWordIndices : [],
      extensionWordIndices: Array.isArray(inst.extensionWordIndices) ? inst.extensionWordIndices : []
    };
  }

  // 2. Open-slot multi-option items (spanish_options)
  const slotCfg = getSlotConfigForItem(item);
  if (
    item.slotTemplate &&
    slotCfg?.slotType === 'spanish_options' &&
    Array.isArray(slotCfg.options) &&
    slotCfg.options.length > 0
  ) {
    const chosen = getSelectedSlotChoiceForItem(item) || slotCfg.options[0]?.es || '';
    const optObj = slotCfg.options.find((o) => o.es === chosen) || slotCfg.options[0];
    const fullEs = getFilledSpanishForItem(item, chosen);
    const fullWords = tokenizeSpanishWords(fullEs);
    const prefixList = Array.isArray(item.slotTemplate.prefixEs) ? item.slotTemplate.prefixEs : [];
    const suffixList = Array.isArray(item.slotTemplate.suffixEs) ? item.slotTemplate.suffixEs : [];
    const primaryPrefix = prefixList[0] || '';
    const prefixWordCount = tokenizeSpanishWords(primaryPrefix).length;
    const primarySuffix =
      suffixList.find((suf) =>
        normalizePhraseSpanish(fullEs).endsWith(normalizePhraseSpanish(suf))
      ) || '';
    const suffixWordCount = tokenizeSpanishWords(primarySuffix).length;
    if (prefixWordCount > 0 && prefixWordCount + suffixWordCount < fullWords.length) {
      const baseWordIndices = [];
      const extensionWordIndices = [];
      for (let i = 0; i < fullWords.length; i += 1) {
        if (i < prefixWordCount || i >= fullWords.length - suffixWordCount) {
          baseWordIndices.push(i);
        } else {
          extensionWordIndices.push(i);
        }
      }
      const baseEs = [primaryPrefix, primarySuffix].filter(Boolean).join(' ').trim();
      const baseAltEs = prefixList
        .map((p) => [p, primarySuffix].filter(Boolean).join(' ').trim())
        .filter(Boolean);
      const enSegments = buildSlotEnglishSegments(slotCfg.examplePatternEn, slotCfg.placeholder);
      const baseEn =
        enSegments.length > 0
          ? enSegments.filter((s) => s.role === 'base').map((s) => s.text).join(' ').trim()
          : item.en;
      return {
        hasExtension: true,
        trackExtensionInMastery: true,
        catId: state.activeCategory,
        itemId: item.id,
        baseEs,
        baseAltEs,
        baseEn,
        enSegments,
        extensionEs: optObj.es,
        extensionEn: optObj.en || optObj.es,
        extensionLabelEs: optObj.es,
        extensionLabelEn: optObj.en || optObj.es,
        extensionKey: `${state.activeCategory}::${normalizeExtensionSlug(optObj.es)}`,
        extensionGroup: 'slot_options',
        baseWordIndices,
        extensionWordIndices
      };
    }
  }

  // 3. Personal open-slot items (e.g., "me llamo [Your name]") — only base required, personal name optional bonus
  if (item.slotTemplate && slotCfg?.slotType === 'personal' && slotCfg.ttsStemEs) {
    const baseWords = tokenizeSpanishWords(slotCfg.ttsStemEs);
    const enSegments = buildPersonalSlotEnglishSegments(item.en);
    const baseEn =
      enSegments.length > 0
        ? enSegments.filter((s) => s.role === 'base').map((s) => s.text).join(' ').trim()
        : item.en;
    return {
      hasExtension: true,
      trackExtensionInMastery: false,
      catId: state.activeCategory,
      itemId: item.id,
      baseEs: slotCfg.ttsStemEs,
      baseAltEs: Array.isArray(item.slotTemplate.prefixEs) ? item.slotTemplate.prefixEs : [slotCfg.ttsStemEs],
      baseEn,
      enSegments,
      extensionEs: '__slot_any__',
      extensionEn: slotCfg.placeholder || '[Your answer]',
      extensionLabelEs: '',
      extensionLabelEn: slotCfg.placeholder || '[Your answer]',
      extensionKey: '',
      extensionGroup: 'personal',
      baseWordIndices: baseWords.map((_, i) => i),
      extensionWordIndices: []
    };
  }

  return { hasExtension: false };
}

function clearFullAnswerVisualReward() {
  const promptZoneEl = document.querySelector('.prompt-zone');
  if (stageCardEl) stageCardEl.classList.remove('is-full-answer-bonus');
  if (promptZoneEl) promptZoneEl.classList.remove('is-full-answer-bonus');
  if (inputShellEl) inputShellEl.classList.remove('is-full-answer-bonus');
  if (typeAnswerFeedbackEl) typeAnswerFeedbackEl.classList.remove('is-full-answer-bonus');
  if (feedbackDrawerEl) feedbackDrawerEl.classList.remove('is-full-answer-bonus');
  if (fullAnswerRewardBannerEl) {
    fullAnswerRewardBannerEl.innerHTML = '';
    fullAnswerRewardBannerEl.classList.add('hidden');
  }
}

function triggerFullAnswerVisualReward({
  extensionEs = '',
  extensionScore = null,
  trackedInMastery = true,
  isPractice = false
} = {}) {
  playFullAnswerBonusSound();
  const promptZoneEl = document.querySelector('.prompt-zone');
  if (stageCardEl) stageCardEl.classList.add('is-full-answer-bonus');
  if (promptZoneEl) promptZoneEl.classList.add('is-full-answer-bonus');
  if (inputShellEl) inputShellEl.classList.add('is-full-answer-bonus');
  if (typeAnswerFeedbackEl) typeAnswerFeedbackEl.classList.add('is-full-answer-bonus');
  if (feedbackDrawerEl) feedbackDrawerEl.classList.add('is-full-answer-bonus');

  if (fullAnswerRewardBannerEl) {
    const extChipText = extensionEs
      ? `+ ${extensionEs}${Number.isFinite(Number(extensionScore)) ? ` · ${Math.round(Number(extensionScore))}%` : ''}`
      : '+ Extension Included';
    const trackedBit =
      trackedInMastery && !isPractice
        ? '<span class="full-answer-reward-tracked">· Tracked in Mastery</span>'
        : '';
    fullAnswerRewardBannerEl.innerHTML = `
      <span class="full-answer-reward-star" aria-hidden="true">★</span>
      <span class="full-answer-reward-title">Full Answer Bonus!</span>
      <span class="full-answer-reward-chip">${escapeHtmlText(extChipText)}</span>
      ${trackedBit}
    `;
    fullAnswerRewardBannerEl.classList.remove('hidden');
    // Restart animation cleanly
    fullAnswerRewardBannerEl.style.animation = 'none';
    void fullAnswerRewardBannerEl.offsetWidth;
    fullAnswerRewardBannerEl.style.animation = '';
  }
}

function renderPromptValueWithSplit(fallbackText, { allowSplit = true } = {}) {
  if (!promptValueEl) return;
  const split = allowSplit ? getActiveQuestionSplit() : { hasExtension: false };
  const hasVisualSplit = Boolean(
    allowSplit &&
    split?.hasExtension &&
    Array.isArray(split.enSegments) &&
    split.enSegments.length > 0
  );

  if (hasVisualSplit) {
    promptValueEl.classList.add('has-ext-split');
    promptValueEl.innerHTML = split.enSegments
      .map((seg) => {
        if (seg.role === 'extension') {
          return `<span class="prompt-part-ext" title="Optional variant — include for a bonus reward">${escapeHtmlText(seg.text)}</span>`;
        }
        if (seg.role === 'punct') {
          return `<span class="prompt-part-punct">${escapeHtmlText(seg.text)}</span>`;
        }
        return `<span class="prompt-part-base">${escapeHtmlText(seg.text)}</span>`;
      })
      .join(' ');
  } else {
    promptValueEl.classList.remove('has-ext-split');
    promptValueEl.textContent = String(fallbackText || '');
  }
}

function resolveSpokenExtensionInfo(heard = '', scoredTargetEs = '') {
  if (state.activeCategory === 'numbers' && state.currentContext?.isQuantity) {
    const detId =
      detectQuantityScenarioFromSpanish(heard, state.currentNum) ||
      detectQuantityScenarioFromSpanish(scoredTargetEs, state.currentNum);
    if (!detId) return null;
    const sc = QUANTITY_SCENARIOS.find((s) => s.id === detId);
    if (!sc) return null;
    return {
      key: `numbers::${sc.id}`,
      catId: 'numbers',
      es: sc.pluralEs,
      en: sc.pluralEn,
      group: 'numbers_quantities'
    };
  }
  if (state.activeCategory !== 'numbers') {
    const item = resolveActivePhraseItem();
    const slotCfg = item ? getSlotConfigForItem(item) : null;
    if (slotCfg?.slotType === 'spanish_options' && Array.isArray(slotCfg.options)) {
      const matched = detectMatchedSlotOptionsInSpanish(item, heard || scoredTargetEs || '');
      if (matched.length > 0) {
        const opt = slotCfg.options.find((o) => o.es === matched[0]);
        if (opt) {
          return {
            key: `${state.activeCategory}::${normalizeExtensionSlug(opt.es)}`,
            catId: state.activeCategory,
            es: opt.es,
            en: opt.en || opt.es,
            group: 'slot_options'
          };
        }
      }
    }
  }
  return null;
}

function recordStructureFillOutcome(isCorrect, meta = {}) {
  if (isTrackingDisabled()) return;
  if (meta.skipped || state.activeCategory === 'numbers') return;
  const inst = state.currentInstance;
  if (!inst || !inst.isDynamic || !inst.itemId || !inst.fillKey) return;
  // When a dynamic structure has an optional extension, only track the fill variation if the user included it
  if (inst.hasExtension && meta.extensionIncluded === false) return;
  if (!state.structureFillStats || typeof state.structureFillStats !== 'object') {
    state.structureFillStats = {};
  }
  if (!state.structureFillStats[inst.itemId] || typeof state.structureFillStats[inst.itemId] !== 'object') {
    state.structureFillStats[inst.itemId] = {};
  }
  const prev = state.structureFillStats[inst.itemId][inst.fillKey] || { c: 0, i: 0 };
  const extCorrect = inst.hasExtension && meta.extensionRating ? Boolean(meta.extensionRating.isCorrect) : isCorrect;
  state.structureFillStats[inst.itemId][inst.fillKey] = {
    c: Math.max(0, Number(prev.c) || 0) + (extCorrect ? 1 : 0),
    i: Math.max(0, Number(prev.i) || 0) + (extCorrect ? 0 : 1)
  };
}

function syncStructurePatternCueUI() {
  const varBtn = document.getElementById('practice-new-variation-btn');
  const inst =
    state.activeCategory !== 'numbers' &&
    state.currentInstance &&
    state.currentInstance.isDynamic &&
    state.currentInstance.itemId === state.currentItem?.id
      ? state.currentInstance
      : null;

  if (varBtn) {
    varBtn.classList.toggle('hidden', !(state.practiceMode && inst && inst.variationCount > 1));
  }
  if (!structurePatternCueEl) return;
  if (state.practiceMode && inst && inst.patternEs) {
    const countBit = inst.variationCount > 1 ? ` · ${inst.variationCount} dynamic scenarios` : '';
    structurePatternCueEl.innerHTML = `<span class="structure-pattern-badge">Structure:</span> <span class="structure-pattern-text">${escapeHtmlText(inst.patternEs)}</span><span class="structure-pattern-count">${escapeHtmlText(countBit)}</span>`;
    structurePatternCueEl.classList.remove('hidden');
  } else {
    structurePatternCueEl.innerHTML = '';
    structurePatternCueEl.classList.add('hidden');
  }
}

function cycleDynamicVariationInPractice() {
  if (!state.practiceMode || state.activeCategory === 'numbers' || !state.currentItem?.structure) return;
  const item = state.currentItem;
  const prevKey = state.currentInstance?.fillKey || state.lastFillKeyByItem?.[item.id] || '';
  const nextInst = resolveDynamicQuestionInstance(item, {
    fillStatsByItem: state.structureFillStats,
    recentFillKey: prevKey
  });
  if (!nextInst) return;
  state.currentInstance = nextInst;
  if (!state.lastFillKeyByItem || typeof state.lastFillKeyByItem !== 'object') {
    state.lastFillKeyByItem = {};
  }
  state.lastFillKeyByItem[item.id] = nextInst.fillKey;
  renderPromptValueWithSplit(nextInst.en, { allowSplit: true });
  renderPracticeSpanishWords(nextInst.es);
  syncStructurePatternCueUI();
  if (Number(state.volume) > 0) {
    speakSpanish(nextInst.es);
  }
}

function getDisplaySpanishForCurrentQuestion() {
  if (state.activeCategory !== 'numbers') {
    const activeData = getActivePhraseData();
    if (!activeData) return '';
    return getDisplaySpanishForItem(activeData, getSelectedSlotChoiceForItem(activeData));
  }
  return getSpokenTextForCurrentQuestion();
}

function getSpokenTextForCurrentQuestion() {
  if (state.activeCategory !== 'numbers') {
    const activeData = getActivePhraseData();
    if (!activeData) return '';
    return getSpeakableSpanishForItem(activeData, getSelectedSlotChoiceForItem(activeData));
  }
  if (state.questionType === 'dictation' && state.dictationSequence.length > 0) {
    return state.dictationSequence.map((n) => getSpanishNumber(n)).join(', ');
  }
  if (state.currentContext && state.currentContext.spokenEs) {
    return state.currentContext.spokenEs;
  }
  return getSpanishNumber(state.currentNum);
}

function updatePromptStatPin() {
  if (!promptStatPinEl) return;
  if (state.activeCategory === 'numbers' && state.questionType === 'dictation') {
    promptStatPinEl.classList.add('hidden');
    return;
  }

  let entry = null;
  if (state.activeCategory !== 'numbers') {
    const item = state.currentItem;
    if (!item) {
      promptStatPinEl.classList.add('hidden');
      return;
    }
    entry = state.phraseCounts?.[item.id] || null;
  } else if (state.currentNum >= 0 && state.currentNum <= 100) {
    entry = state.counts?.[state.currentNum] || null;
  }

  const correct = Math.max(0, Number(entry?.correct) || 0);
  const incorrect = Math.max(0, Number(entry?.incorrect) || 0);
  const total = correct + incorrect;

  if (incorrect < 5) {
    promptStatPinEl.classList.add('hidden');
    return;
  }

  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  promptStatPinEl.classList.remove('hidden', 'is-new', 'is-good', 'is-mid', 'is-bad', 'is-bad-warn', 'is-critical');
  promptStatPinEl.textContent = `Struggling · ${pct}% (${incorrect} missed)`;
  promptStatPinEl.classList.add('is-critical');
  promptStatPinEl.title = `${correct}/${total} correct (${pct}% · ${incorrect} missed)`;
}

function syncQuestionTypeUI() {
  const snap = getProgressionSnapshot(state.activeCategory);
  if (snap.isUnlocked) {
    state.questionType = snap.phaseQuestionType;
    state.direction = snap.phaseDirection;
  }

  const isSpeakMode = state.questionType === 'speak';
  if (micBtn) {
    micBtn.classList.toggle('hidden', !isSpeakMode);
  }
  if (speakMeterTrackEl) {
    speakMeterTrackEl.classList.toggle('hidden', !isSpeakMode);
  }
  if (voiceRedoBtn) {
    voiceRedoBtn.classList.toggle('hidden', !isSpeakMode);
  }
  if (voiceCancelBtn) {
    voiceCancelBtn.classList.toggle(
      'hidden',
      !isSpeakMode || voiceCaptureState.activeMode !== 'question'
    );
  }
  if (speakCompareBtn) {
    speakCompareBtn.classList.toggle(
      'hidden',
      !isSpeakMode || voiceCaptureState.speakCloseAttemptCount < 2
    );
  }
  if (answerInputEl) {
    answerInputEl.classList.toggle('hidden', isSpeakMode);
  }
  if (inputShellEl) {
    inputShellEl.classList.toggle('is-speak-mode', isSpeakMode);
    if (!isSpeakMode) {
      inputShellEl.classList.remove('has-spoken-audio', 'is-recording');
    }
  }
}

function finalizeLoadedQuestionPrompt({
  inputMode = 'text',
  shouldShowIntro = false,
  introTarget = null,
  stageIndex = 0,
  isAudioQuestion = false,
  isSpeakQuestion = false
}) {
  typeSectionEl.classList.remove('hidden');
  inputShellEl.classList.remove('correct', 'incorrect');
  answerInputEl.value = '';
  answerInputEl.disabled = false;
  syncNextQuestionButtonUI();
  answerInputEl.inputMode = inputMode;
  updatePromptStatPin();
  updateMemoryTipUI();
  updateSrsDueBadge();
  syncWeakDrillBannerUI();
  const hfActive = isHandsFreeRunning() && state.activeView === 'play';
  syncPracticeModeCardUI({ autoSpeak: !shouldShowIntro && !hfActive });
  if (hfActive) {
    const introDetails =
      shouldShowIntro && introTarget !== null
        ? getWordIntroDetails(state.activeCategory, stageIndex, introTarget)
        : null;
    handleHandsFreeQuestionLoaded({ shouldShowIntro, introDetails });
    return;
  }
  if (shouldShowIntro && introTarget !== null) {
    openWordIntroModal(
      getWordIntroDetails(state.activeCategory, stageIndex, introTarget),
      { playAudioOnClose: isAudioQuestion || Boolean(state.practiceMode) }
    );
  } else if (state.practiceMode && state.activeView === 'play') {
    // Practice Mode already displays Spanish + audio controls and auto-speaks above
  } else if (!isSpeakQuestion) {
    setTimeout(() => answerInputEl.focus(), 15);
  }
}

function getQuantityScenarioMissCount(scenarioId) {
  if (!scenarioId) return 0;
  const recorded = Math.max(0, Number(state.quantityScenarioMisses?.[scenarioId]) || 0);
  const isCurrentActiveScenario =
    state.activeCategory === 'numbers' &&
    state.currentContext?.isQuantity &&
    state.currentContext.quantityScenarioId === scenarioId;
  const currentRoundMisses = isCurrentActiveScenario
    ? Math.max(0, Number(voiceCaptureState.attemptCount) || 0) +
      (voiceCaptureState.retryRoundUsed ? MAX_SPEAK_ATTEMPTS_BEFORE_NEXT : 0)
    : 0;
  return recorded + currentRoundMisses;
}

function recordQuantityScenarioMiss(scenarioId = '') {
  if (isTrackingDisabled()) return;
  const id =
    scenarioId ||
    (state.activeCategory === 'numbers' && state.currentContext?.isQuantity
      ? state.currentContext.quantityScenarioId
      : '');
  if (!id || state.practiceMode) return;
  if (!state.quantityScenarioMisses || typeof state.quantityScenarioMisses !== 'object') {
    state.quantityScenarioMisses = {};
  }
  state.quantityScenarioMisses[id] = Math.max(0, Number(state.quantityScenarioMisses[id]) || 0) + 1;
}

function getCurrentItemIncorrectCount() {
  let recorded = 0;
  if (state.activeCategory !== 'numbers') {
    const item = state.currentItem;
    if (item) {
      recorded = Math.max(0, Number(state.phraseCounts?.[item.id]?.incorrect) || 0);
    }
  } else if (state.currentNum >= 0 && state.currentNum <= 100) {
    recorded = Math.max(0, Number(state.counts?.[state.currentNum]?.incorrect) || 0);
  }
  const currentRoundMisses =
    Math.max(0, Number(voiceCaptureState.attemptCount) || 0) +
    (voiceCaptureState.retryRoundUsed ? MAX_SPEAK_ATTEMPTS_BEFORE_NEXT : 0);
  const itemMisses = recorded + currentRoundMisses;
  if (state.activeCategory === 'numbers' && state.currentContext?.isQuantity) {
    return Math.max(itemMisses, getQuantityScenarioMissCount(state.currentContext.quantityScenarioId));
  }
  return itemMisses;
}

function getMemoryTipForCurrentQuestion() {
  if (state.activeCategory !== 'numbers') {
    return getPhraseMemoryTip(state.currentItem);
  }
  return getNumberMemoryTip(state.currentNum, state.currentContext);
}

function renderMemoryTipHTML(tipText, missCount) {
  return `<span class="memory-tip-badge">💡 Recommended Memory Trick · Missed ${missCount}×</span><span>${escapeHtmlText(tipText)}</span>`;
}

function updateMemoryTipUI() {
  if (!memoryTipCardEl) return;
  memoryTipCardEl.innerHTML = '';
  memoryTipCardEl.classList.add('hidden');
}

const SKIP_COOLDOWN_WINDOW = 30;
const SKIP_COOLDOWN_COUNT = 2;
const SKIP_COOLDOWN_FIRST_BAN = 10;
const SKIP_COOLDOWN_EXTRA_BAN = 15;

function normalizeSkipExpectedEs(text) {
  return stripAccents(normalizePhraseSpanish(String(text || ''))).trim();
}

function getSkipCooldownKeyForCurrentQuestion() {
  if (state.activeCategory === 'numbers') {
    return `numbers:${state.currentNum}`;
  }
  const activeItem = resolveActivePhraseItem();
  return activeItem ? `${state.activeCategory}:${activeItem.id}` : '';
}

function isItemOnSkipCooldown(itemKey) {
  if (!itemKey || !state.skipCooldownUntilByKey) return false;
  const untilSeq = Number(state.skipCooldownUntilByKey[itemKey]) || 0;
  return untilSeq > (Number(state.sessionQuestionSeq) || 0);
}

function incrementPersistentBanCount(itemKey) {
  if (isTrackingDisabled() || !itemKey) return;
  if (itemKey.startsWith('numbers:')) {
    const n = Number(itemKey.slice('numbers:'.length));
    if (Number.isInteger(n) && state.counts?.[n]) {
      state.counts[n].banCount = Math.max(0, Math.floor(Number(state.counts[n].banCount) || 0)) + 1;
    }
  } else {
    const itemId = itemKey.includes(':') ? itemKey.split(':').slice(1).join(':') : itemKey;
    if (itemId && state.phraseCounts?.[itemId]) {
      state.phraseCounts[itemId].banCount = Math.max(0, Math.floor(Number(state.phraseCounts[itemId].banCount) || 0)) + 1;
    }
  }
}

function recordSkipForCooldown(itemKey) {
  if (!itemKey) return 0;
  if (!state.recentSkipQuestionsByKey || typeof state.recentSkipQuestionsByKey !== 'object') {
    state.recentSkipQuestionsByKey = {};
  }
  if (!state.skipCooldownUntilByKey || typeof state.skipCooldownUntilByKey !== 'object') {
    state.skipCooldownUntilByKey = {};
  }
  if (!state.skipBanTierByKey || typeof state.skipBanTierByKey !== 'object') {
    state.skipBanTierByKey = {};
  }
  const seq = Number(state.sessionQuestionSeq) || 0;
  const prevTier = Math.max(0, Number(state.skipBanTierByKey[itemKey]) || 0);
  const recent = Array.isArray(state.recentSkipQuestionsByKey[itemKey])
    ? state.recentSkipQuestionsByKey[itemKey].filter((q) => q >= seq - SKIP_COOLDOWN_WINDOW)
    : [];
  recent.push(seq);

  // If this base question already triggered a 10-question ban earlier (tier >= 1),
  // a 3rd+ skip bans it for an additional 15 questions (10 + 15 = 25 questions).
  if (prevTier >= 1) {
    const banLen = SKIP_COOLDOWN_FIRST_BAN + SKIP_COOLDOWN_EXTRA_BAN;
    state.skipBanTierByKey[itemKey] = prevTier + 1;
    state.skipCooldownUntilByKey[itemKey] = seq + banLen;
    state.recentSkipQuestionsByKey[itemKey] = [];
    incrementPersistentBanCount(itemKey);
    return banLen;
  }

  if (recent.length >= SKIP_COOLDOWN_COUNT) {
    state.skipBanTierByKey[itemKey] = 1;
    state.skipCooldownUntilByKey[itemKey] = seq + SKIP_COOLDOWN_FIRST_BAN;
    state.recentSkipQuestionsByKey[itemKey] = [];
    incrementPersistentBanCount(itemKey);
    return SKIP_COOLDOWN_FIRST_BAN;
  }

  state.recentSkipQuestionsByKey[itemKey] = recent;
  return 0;
}

function getActivePracticeStageKey(catId = state.activeCategory) {
  const snap = getProgressionSnapshot(catId);
  const stagePart = snap.stage?.stageKey || `s${snap.stageIndex}`;
  return `${catId}:${stagePart}`;
}

function getPracticeSequenceForStage(catId = state.activeCategory) {
  const snap = getProgressionSnapshot(catId);
  if (catId !== 'numbers') {
    const stageItems = getItemsForStage(catId, snap.stageIndex);
    return stageItems.length > 0 ? stageItems : getItemsForCategory(catId);
  }
  const rawNumPool = getPoolForRange(state.range);
  const nonCooldownNumPool = rawNumPool.filter((n) => !isItemOnSkipCooldown(`numbers:${n}`));
  const pool = nonCooldownNumPool.length > 0 ? nonCooldownNumPool : rawNumPool;
  if (pool.length <= 10) return pool;
  const curated = [];
  const targetCount = 10;
  for (let i = 0; i < targetCount; i += 1) {
    const idx = Math.round((i * (pool.length - 1)) / (targetCount - 1));
    const val = pool[idx];
    if (!curated.includes(val)) curated.push(val);
  }
  return curated;
}

function getPracticeItemKey(catId, entry) {
  if (catId === 'numbers') return `num:${entry}`;
  return entry?.id || '';
}

function getCurrentPracticeItemKey() {
  if (state.activeCategory === 'numbers') return `num:${state.currentNum}`;
  return state.currentItem?.id || '';
}

function getPracticeStageProgress(catId = state.activeCategory) {
  const stageKey = getActivePracticeStageKey(catId);
  const sequence = getPracticeSequenceForStage(catId);
  const validKeys = new Set(sequence.map((entry) => getPracticeItemKey(catId, entry)).filter(Boolean));
  const rawList = Array.isArray(state.practicedStageItems?.[stageKey])
    ? state.practicedStageItems[stageKey]
    : [];
  const practicedSet = new Set(rawList.filter((k) => validKeys.has(k)));
  const totalCount = validKeys.size;
  const doneCount = practicedSet.size;
  const isComplete = Boolean(
    state.completedPracticeStages?.has(stageKey) || (totalCount > 0 && doneCount >= totalCount)
  );
  return { stageKey, sequence, practicedSet, doneCount, totalCount, isComplete };
}

function enforcePracticeGateForCurrentStage() {
  if (isTopicExamActive()) {
    state.practiceMode = false;
    return;
  }
  if (isTrackingDisabled()) return;
  if (state.weakDrillActive || state.polishDrillActive) return;
  const prog = getPracticeStageProgress(state.activeCategory);
  if (!prog.isComplete) {
    state.practiceMode = true;
  }
}

function markCurrentPracticeItemCompleted() {
  if (isTrackingDisabled()) return { justCompleted: false };
  if (!state.practiceMode) return { justCompleted: false };
  const prog = getPracticeStageProgress(state.activeCategory);
  const itemKey = getCurrentPracticeItemKey();
  if (!itemKey || prog.totalCount === 0) return { justCompleted: false };

  const wasComplete = prog.isComplete;
  if (!state.practicedStageItems || typeof state.practicedStageItems !== 'object') {
    state.practicedStageItems = {};
  }
  const nextSet = new Set(prog.practicedSet);
  nextSet.add(itemKey);
  state.practicedStageItems[prog.stageKey] = Array.from(nextSet);

  const nowComplete = nextSet.size >= prog.totalCount;
  if (nowComplete) {
    if (!(state.completedPracticeStages instanceof Set)) {
      state.completedPracticeStages = new Set(state.completedPracticeStages || []);
    }
    state.completedPracticeStages.add(prog.stageKey);
  }
  savePersistedData();
  syncPracticeModeCardUI({ autoSpeak: false, preserveSlotChoice: true });
  return { justCompleted: !wasComplete && nowComplete };
}

function renderPracticeSpanishWords(text, activeWordIdx = -1) {
  if (!promptSubtextEl) return;
  const tokens = tokenizeDisplaySpanishWithSlots(text);
  if (tokens.length === 0) {
    promptSubtextEl.innerHTML = '';
    return;
  }
  const split = getActiveQuestionSplit();
  const useSplitClasses = Boolean(split?.hasExtension && Array.isArray(split.baseWordIndices) && split.baseWordIndices.length > 0);
  const baseIdxSet = useSplitClasses ? new Set(split.baseWordIndices.map(Number)) : null;
  const extIdxSet = useSplitClasses ? new Set((split.extensionWordIndices || []).map(Number)) : null;
  let spanishWordCounter = 0;
  let html = '';
  tokens.forEach((tok, tokIdx) => {
    const prefix = tokIdx > 0 && tok.type !== 'punct' ? ' ' : '';
    if (tok.type === 'slot') {
      html += `${prefix}<span class="slot-placeholder-chip" title="Optional extension — include for a bonus reward">${escapeHtmlText(tok.text)}</span>`;
      return;
    }
    if (tok.type === 'punct') {
      html += `<span class="slot-punct">${escapeHtmlText(tok.text)}</span>`;
      return;
    }
    const idx = spanishWordCounter;
    spanishWordCounter += 1;
    const activeCls = idx === activeWordIdx ? ' practice-word-active' : '';
    const roleCls = useSplitClasses
      ? (extIdxSet?.has(idx) ? ' is-ext-word' : baseIdxSet?.has(idx) ? ' is-base-word' : '')
      : '';
    const roleNote = roleCls === ' is-ext-word' ? ' (Optional extension)' : roleCls === ' is-base-word' ? ' (Required base)' : '';
    html += `${prefix}<button type="button" class="practice-word-btn${roleCls}${activeCls}" data-practice-word="${escapeHtmlText(tok.spoken)}" title="Click to hear &quot;${escapeHtmlText(tok.spoken)}&quot;${roleNote}">${escapeHtmlText(tok.text)}</button>`;
  });
  promptSubtextEl.innerHTML = html;
}

function getActiveExamQuantityStageKey() {
  if (state.activeCategory !== 'numbers') return '';
  const prog = getCategoryProgress('numbers');
  return `numbers:s${prog.stageIndex}`;
}

function resetExamQuantityScenarioPool() {
  if (!(state.usedExamQuantityScenarios instanceof Set)) {
    state.usedExamQuantityScenarios = new Set();
  } else {
    state.usedExamQuantityScenarios.clear();
  }
  state.usedExamQuantityStageKey = getActiveExamQuantityStageKey();
}

function syncExamQuantityScenarioPool() {
  if (!(state.usedExamQuantityScenarios instanceof Set)) {
    state.usedExamQuantityScenarios = new Set(state.usedExamQuantityScenarios || []);
  }
  const currentKey = getActiveExamQuantityStageKey();
  if (
    state.usedExamQuantityStageKey !== currentKey ||
    state.usedExamQuantityScenarios.size >= QUANTITY_SCENARIOS.length
  ) {
    state.usedExamQuantityScenarios.clear();
    state.usedExamQuantityStageKey = currentKey;
  }
}

function markExamQuantityScenarioUsed(meta = {}) {
  if (isTrackingDisabled()) return;
  if (state.practiceMode || state.activeCategory !== 'numbers' || !state.currentContext?.isQuantity) {
    return;
  }
  if (meta.extensionIncluded === false) return;
  syncExamQuantityScenarioPool();
  const detected =
    detectQuantityScenarioFromSpanish(meta.scoredTargetEs || '', state.currentNum) ||
    detectQuantityScenarioFromSpanish(meta.heard || '', state.currentNum) ||
    (meta.extensionIncluded ? state.currentContext.quantityScenarioId : '') ||
    '';
  if (detected) {
    state.usedExamQuantityScenarios.add(detected);
    syncSlotOptionsDropdownUI();
  }
}

function recordGradedOutcome(isCorrect, meta = {}) {
  if (isTrackingDisabled()) return;
  if (isCorrect) {
    markExamQuantityScenarioUsed(meta);
    if (state.activeCategory !== 'numbers') {
      markSlotOptionsUsedForItem(resolveActivePhraseItem(), meta);
    }
  } else if (!meta.skipped) {
    recordQuantityScenarioMiss();
  }
  recordStructureFillOutcome(isCorrect, meta);
  recordOutcome(isCorrect, meta);
  if (!isCorrect && !meta.skipped) {
    syncSlotOptionsDropdownUI();
  }
}

function syncSlotOptionsDropdownUI({ preserveCurrentChoice = false } = {}) {
  const barEl = document.getElementById('slot-options-bar');
  const labelEl = document.getElementById('slot-options-label');
  const selectEl = document.getElementById('slot-options-select');
  if (!barEl || !selectEl) return;

  if (
    state.activeCategory === 'numbers' &&
    state.currentContext?.isQuantity &&
    Array.isArray(state.currentContext.quantityScenarios) &&
    state.currentContext.quantityScenarios.length > 0
  ) {
    syncSlotExampleCueUI(null, null, '');
    const scenarios = state.currentContext.quantityScenarios;
    const isExam = !state.practiceMode;
    const usedSet =
      isExam && state.usedExamQuantityScenarios instanceof Set
        ? state.usedExamQuantityScenarios
        : new Set();
    const activeId = state.currentContext.quantityScenarioId || scenarios[0].id;
    const num = state.currentNum;
    const remainingCount = scenarios.filter((sc) => !usedSet.has(sc.id)).length;
    if (labelEl) {
      labelEl.textContent = isExam
        ? `Quantity topic (${remainingCount}/${scenarios.length} left — once per exam):`
        : `Quantity topic (${scenarios.length} options — pick any):`;
    }
    selectEl.innerHTML = scenarios
      .map((sc) => {
        const phrase = buildQuantityScenarioPhrase(num, sc);
        const genderTag = sc.gender === 'f' ? 'fem' : 'masc';
        const isUsed = isExam && usedSet.has(sc.id);
        const showTranslationHint = isExam && getQuantityScenarioMissCount(sc.id) >= 3;
        const baseLabel = showTranslationHint
          ? `${phrase.nounEn} — ${phrase.nounEs} (${genderTag})`
          : phrase.nounEn;
        const optionLabel = isUsed ? `${baseLabel} · Used` : baseLabel;
        const disabledAttr = isUsed ? ' disabled class="is-used-option"' : '';
        const selectedAttr = sc.id === activeId ? ' selected' : '';
        return `<option value="${escapeHtmlText(sc.id)}"${disabledAttr}${selectedAttr}>${escapeHtmlText(optionLabel)}</option>`;
      })
      .join('');
    selectEl.value = activeId;
    barEl.classList.remove('hidden');
    return;
  }

  const item = state.activeCategory !== 'numbers' ? resolveActivePhraseItem() : null;
  const slotCfg = item ? getSlotConfigForItem(item) : null;
  const hasDropdown = Boolean(slotCfg && slotCfg.slotType === 'spanish_options' && slotCfg.options.length > 0);
  if (!hasDropdown) {
    syncSlotExampleCueUI(null, null, '');
    barEl.classList.add('hidden');
    selectEl.innerHTML = '';
    return;
  }

  const chosen = preserveCurrentChoice
    ? (getSelectedSlotChoiceForItem(item) || ensurePreselectedSlotOptionForItem(item, { resetIfExhausted: false }))
    : ensurePreselectedSlotOptionForItem(item, { resetIfExhausted: true });
  const usedSet = getUsedSlotOptionsSetForItem(item.id);
  const hardExam = isTopicExamActive();
  const remainingCount = slotCfg.options.filter((opt) => !usedSet.has(opt.es)).length;
  if (labelEl) {
    labelEl.textContent = hardExam
      ? `Exam options (${remainingCount}/${slotCfg.options.length} left · English only, any Spanish answer accepted):`
      : `${slotCfg.dropdownLabel || '15 common Spanish answers'} (${remainingCount}/${slotCfg.options.length} left · any answer accepted):`;
  }

  const optsHTML = slotCfg.options
    .map((opt) => {
      const isUsed = usedSet.has(opt.es);
      const baseLabel = hardExam ? `${opt.en}` : `${opt.es} — ${opt.en}`;
      const optionLabel = isUsed ? `${baseLabel} · Used` : baseLabel;
      const disabledAttr = isUsed ? ' disabled class="is-used-option"' : '';
      const selectedAttr = chosen === opt.es ? ' selected' : '';
      return `<option value="${escapeHtmlText(opt.es)}"${disabledAttr}${selectedAttr}>${escapeHtmlText(optionLabel)}</option>`;
    })
    .join('');
  selectEl.innerHTML = optsHTML;
  selectEl.value = chosen;
  barEl.classList.remove('hidden');
  syncSlotExampleCueUI(item, slotCfg, chosen);
}

function syncPracticeModeCardUI({ autoSpeak = false, preserveSlotChoice = false } = {}) {
  const bar = document.getElementById('practice-controls-bar');
  const hardExam = isTopicExamActive();
  if (hardExam && state.practiceMode) {
    state.practiceMode = false;
  }
  const on = Boolean(!hardExam && state.practiceMode);
  const prog = getPracticeStageProgress(state.activeCategory);
  const locked = !hardExam && !isTrackingDisabled() && !prog.isComplete;

  if (bar) {
    bar.classList.toggle('hidden', !on);
  }
  syncSlotOptionsDropdownUI({ preserveCurrentChoice: preserveSlotChoice });
  syncStructurePatternCueUI();
  if (promptSubtextEl) {
    if (on) {
      const displaySpanish = getDisplaySpanishForCurrentQuestion();
      renderPracticeSpanishWords(displaySpanish);
      promptSubtextEl.classList.add('is-practice-spanish');
      promptSubtextEl.classList.toggle('hidden', !displaySpanish);
    } else {
      promptSubtextEl.innerHTML = '';
      promptSubtextEl.classList.remove('is-practice-spanish');
      promptSubtextEl.classList.add('hidden');
    }
  }
  syncNextQuestionButtonUI();
  updateMemoryTipUI();
  if (on && !state.answered && typeAnswerFeedbackEl) {
    const item = state.activeCategory !== 'numbers' ? resolveActivePhraseItem() : null;
    const slotCfg = item ? getSlotConfigForItem(item) : null;
    if (!locked) {
      typeAnswerFeedbackEl.textContent =
        'Practice complete! Click Next Word → to start the Graded Test.';
    } else if (slotCfg?.slotType === 'personal') {
      typeAnswerFeedbackEl.textContent = `Practice (${prog.doneCount}/${prog.totalCount}) · Say the Spanish words + ${slotCfg.placeholder}, or click Next Word →`;
    } else if (slotCfg?.slotType === 'spanish_options') {
      typeAnswerFeedbackEl.textContent = `Practice (${prog.doneCount}/${prog.totalCount}) · Pre-selected example ready — say it or any valid answer / combination, then click Next Word →`;
    } else {
      typeAnswerFeedbackEl.textContent = `Practice (${prog.doneCount}/${prog.totalCount}) · Listen, click any word, or speak — then click Next Word →`;
    }
    typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning');
    typeAnswerFeedbackEl.classList.add('is-transcript');
  } else if (!on && !state.answered && typeAnswerFeedbackEl) {
    const item = state.activeCategory !== 'numbers' ? resolveActivePhraseItem() : null;
    const slotCfg = item ? getSlotConfigForItem(item) : null;
    if (slotCfg?.slotType === 'personal') {
      typeAnswerFeedbackEl.textContent = `Only the base is required — add ${slotCfg.placeholder} at the end for a full-answer bonus.`;
      typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning');
      typeAnswerFeedbackEl.classList.add('is-transcript');
    } else if (slotCfg?.slotType === 'spanish_options') {
      typeAnswerFeedbackEl.textContent = `Only the base is required — add any valid Spanish extension for ${slotCfg.placeholder} for a bonus.`;
      typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning');
      typeAnswerFeedbackEl.classList.add('is-transcript');
    }
  }
  if (on && autoSpeak && state.activeView === 'play' && Number(state.volume) > 0) {
    const spanish = getSpokenTextForCurrentQuestion();
    if (spanish) scheduleNewWordAutoSpeak(spanish);
  }
}

function updateSrsDueBadge() {
  // Due counter removed from HUD
}

function getRevisionDrillItems() {
  const list = [];
  CATEGORY_ORDER.forEach((catId) => {
    if (!CATEGORIES[catId]) return;
    if (catId === 'numbers') {
      for (let n = 0; n <= 100; n += 1) {
        const entry = state.counts?.[n];
        const c = Math.max(0, Number(entry?.correct) || 0);
        const inc = Math.max(0, Number(entry?.incorrect) || 0);
        const total = c + inc;
        if (total === 0) continue;
        const pct = Math.round((c / total) * 100);
        if (pct < 75) {
          list.push({ catId, num: n, item: null, key: `numbers:${n}`, pct, incorrect: inc });
        }
      }
    } else {
      getItemsForCategory(catId).forEach((item) => {
        const entry = state.phraseCounts?.[item.id];
        const c = Math.max(0, Number(entry?.correct) || 0);
        const inc = Math.max(0, Number(entry?.incorrect) || 0);
        const total = c + inc;
        if (total === 0) return;
        const pct = Math.round((c / total) * 100);
        if (pct < 75) {
          list.push({ catId, num: null, item, key: `${catId}:${item.id}`, pct, incorrect: inc });
        }
      });
    }
  });
  list.sort((a, b) => a.pct - b.pct || b.incorrect - a.incorrect);
  return list;
}

function syncWeakDrillBannerUI() {
  if (!weakDrillBannerEl) return;
  if (state.revisionDrillActive) {
    const revList = getRevisionDrillItems();
    if (revList.length === 0) {
      state.revisionDrillActive = false;
    } else {
      weakDrillBannerEl.classList.remove('hidden');
      if (weakDrillBannerTextEl) {
        weakDrillBannerTextEl.textContent = `Revision Drill (<75%) · ${revList.length} word${revList.length === 1 ? '' : 's'} remaining`;
      }
      return;
    }
  }
  if (state.polishDrillActive) {
    const polishList = getPolishItemsForCategory(state.activeCategory);
    if (polishList.length === 0) {
      state.polishDrillActive = false;
    } else {
      weakDrillBannerEl.classList.remove('hidden');
      if (weakDrillBannerTextEl) {
        weakDrillBannerTextEl.textContent = `Polish Pronunciation Drill (81–89%) · ${polishList.length} item${polishList.length === 1 ? '' : 's'} queued`;
      }
      return;
    }
  }
  const weakList = getWeakItemsForCategory(state.activeCategory);
  if (state.weakDrillActive && weakList.length === 0) {
    state.weakDrillActive = false;
  }
  weakDrillBannerEl.classList.toggle('hidden', !state.weakDrillActive);
  if (state.weakDrillActive && weakDrillBannerTextEl) {
    weakDrillBannerTextEl.textContent = `Struggling Words Drill · ${weakList.length} item${weakList.length === 1 ? '' : 's'} queued`;
  }
}

function syncSpeechPreferencesUI() {
  syncHandsFreeUI();
}

let currentIncorrectDisplayText = '';

function renderIncorrectSpanishWords(text, activeWordIdx = -1) {
  const answerEl = document.getElementById('incorrect-screen-answer');
  const hintEl = document.getElementById('incorrect-screen-word-hint');
  if (!answerEl) return;
  const tokens = tokenizeDisplaySpanishWithSlots(text);
  if (tokens.length === 0) {
    answerEl.textContent = String(text || '');
    if (hintEl) hintEl.classList.add('hidden');
    return;
  }
  const split = getActiveQuestionSplit();
  const useSplitClasses = Boolean(split?.hasExtension && Array.isArray(split.baseWordIndices) && split.baseWordIndices.length > 0);
  const baseIdxSet = useSplitClasses ? new Set(split.baseWordIndices.map(Number)) : null;
  const extIdxSet = useSplitClasses ? new Set((split.extensionWordIndices || []).map(Number)) : null;
  let spanishWordCounter = 0;
  let html = '';
  tokens.forEach((tok, tokIdx) => {
    const prefix = tokIdx > 0 && tok.type !== 'punct' ? ' ' : '';
    if (tok.type === 'slot') {
      html += `${prefix}<span class="slot-placeholder-chip" title="Optional extension">${escapeHtmlText(tok.text)}</span>`;
      return;
    }
    if (tok.type === 'punct') {
      html += `<span class="slot-punct">${escapeHtmlText(tok.text)}</span>`;
      return;
    }
    const idx = spanishWordCounter;
    spanishWordCounter += 1;
    const activeCls = idx === activeWordIdx ? ' practice-word-active' : '';
    const roleCls = useSplitClasses
      ? (extIdxSet?.has(idx) ? ' is-ext-word' : baseIdxSet?.has(idx) ? ' is-base-word' : '')
      : '';
    html += `${prefix}<button type="button" class="practice-word-btn incorrect-word-btn${roleCls}${activeCls}" data-incorrect-word="${escapeHtmlText(tok.spoken)}" title="Click to hear &quot;${escapeHtmlText(tok.spoken)}&quot;">${escapeHtmlText(tok.text)}</button>`;
  });
  answerEl.innerHTML = html;
  if (hintEl) {
    hintEl.classList.toggle('hidden', spanishWordCounter === 0);
  }
}

function hideIncorrectScreen() {
  const stageBodyEl = document.getElementById('stage-body');
  const panelEl = document.getElementById('incorrect-screen-panel');
  const wasVisible = Boolean(panelEl && !panelEl.classList.contains('hidden'));
  if (wasVisible) {
    stopAllSpanishSpeech();
  }
  if (panelEl) panelEl.classList.add('hidden');
  if (stageBodyEl) stageBodyEl.classList.remove('hidden');
}

function showIncorrectScreen(details = {}) {
  clearFeedbackTimer();
  const stageBodyEl = document.getElementById('stage-body');
  const panelEl = document.getElementById('incorrect-screen-panel');
  if (!panelEl) return;

  const badgeEl = document.getElementById('incorrect-screen-badge');
  const promptEl = document.getElementById('incorrect-screen-prompt');
  const detailEl = document.getElementById('incorrect-screen-detail');
  const phonemesEl = document.getElementById('incorrect-screen-phonemes');
  const playMineBtn = document.getElementById('incorrect-screen-play-mine-btn');
  const retryBtn = document.getElementById('incorrect-screen-retry-btn');

  const hardExam = isTopicExamActive();
  const canRetry = Boolean(!hardExam && details.canRetry && !voiceCaptureState.retryRoundUsed);
  if (badgeEl) {
    badgeEl.textContent = hardExam
      ? 'Exam · Incorrect (1 of 1 Try)'
      : canRetry
        ? `Incorrect · ${MAX_SPEAK_ATTEMPTS_BEFORE_NEXT} of ${MAX_SPEAK_ATTEMPTS_BEFORE_NEXT} Attempts`
        : 'Incorrect · Final Attempt Used';
  }
  if (promptEl) {
    promptEl.textContent = promptValueEl?.textContent || '';
  }
  currentIncorrectDisplayText =
    getDisplaySpanishForCurrentQuestion() || details.expectedEs || getCorrectAnswerDisplay();
  renderIncorrectSpanishWords(currentIncorrectDisplayText);
  if (detailEl) {
    if (details.wrongWord) {
      detailEl.textContent = details.heardTranslation
        ? `Last attempt: you said "${details.heardTranslation}".`
        : 'Last attempt: different word detected.';
    } else if (Number.isFinite(Number(details.score))) {
      detailEl.textContent = details.tipText
        ? `Last score: ${details.score}/100 — ${details.tipText}`
        : `Last score: ${details.score}/100`;
    } else {
      detailEl.textContent = canRetry
        ? '2 attempts used. You can try again for 2 more tries or continue to the next question.'
        : 'Final retry used. Listen to the correct Spanish and continue when ready.';
    }
  }
  if (incorrectScreenMemoryTipEl) {
    incorrectScreenMemoryTipEl.innerHTML = '';
    incorrectScreenMemoryTipEl.classList.add('hidden');
  }
  if (phonemesEl) {
    const charDetails = Array.isArray(details.charDetails) ? details.charDetails : [];
    if (charDetails.length > 0) {
      phonemesEl.innerHTML = renderPronunciationWordStripHTML(charDetails);
      phonemesEl.classList.remove('hidden');
    } else {
      phonemesEl.innerHTML = '';
      phonemesEl.classList.add('hidden');
    }
  }
  if (playMineBtn) {
    playMineBtn.textContent = 'Play Mine';
    playMineBtn.classList.toggle('hidden', !details.hasRecordedAudio);
  }
  if (retryBtn) {
    retryBtn.classList.toggle('hidden', !canRetry);
  }

  if (stageBodyEl) stageBodyEl.classList.add('hidden');
  panelEl.classList.remove('hidden');
}

function startRetryRoundFromIncorrectScreen() {
  if (voiceCaptureState.retryRoundUsed) return;
  voiceCaptureState.retryRoundUsed = true;
  voiceCaptureState.pendingIncorrectCommit = false;
  state.answered = false;
  if (answerInputEl) {
    answerInputEl.disabled = false;
    answerInputEl.value = '';
  }
  resetQuestionVoiceCapture({ resetAttempts: true, resetRetry: false });
  hideIncorrectScreen();
  updateMemoryTipUI();
  syncSlotOptionsDropdownUI();
  if (inputShellEl) {
    inputShellEl.classList.remove('incorrect', 'correct', 'has-spoken-audio', 'is-recording');
  }
  if (typeAnswerFeedbackEl) {
    typeAnswerFeedbackEl.textContent = 'Retry round (2 tries remaining) — speak clearly!';
    typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-transcript');
    typeAnswerFeedbackEl.classList.add('is-warning');
  }
  if (isHandsFreeRunning()) {
    handleHandsFreeQuestionLoaded({ shouldShowIntro: false, introDetails: null });
  }
}

function continueFromIncorrectScreen() {
  if (voiceCaptureState.pendingIncorrectCommit) {
    const failedMeta = voiceCaptureState.lastFailedMeta || {};
    voiceCaptureState.pendingIncorrectCommit = false;
    recordGradedOutcome(false, {
      ...failedMeta,
      pronunciationAlreadyRecorded: Boolean(failedMeta.pronunciationAlreadyRecorded)
    });
  }
  advanceQuestion();
}

function loadQuestion() {
  clearFeedbackTimer();
  clearNewWordAutoSpeakTimer();
  stopAllSpanishSpeech();
  hideIncorrectScreen();
  hideHandsFreeInlineIntro();

  state.sessionQuestionSeq = (Number(state.sessionQuestionSeq) || 0) + 1;
  state.currentQuestionSkipRecorded = false;
  const avoidSkipKey = state.lastSkippedBaseKey || '';
  const avoidSkipExpectedEs = state.lastSkippedExpectedEs || '';
  state.lastSkippedBaseKey = '';
  state.lastSkippedExpectedEs = '';

  const matchesJustSkipped = (key, esText) => {
    if (avoidSkipKey && key === avoidSkipKey) return true;
    if (avoidSkipExpectedEs && esText && normalizeSkipExpectedEs(esText) === avoidSkipExpectedEs) return true;
    return false;
  };

  let revisionTarget = null;
  if (state.revisionDrillActive) {
    const revList = getRevisionDrillItems();
    if (revList.length === 0) {
      state.revisionDrillActive = false;
      syncWeakDrillBannerUI();
    } else {
      const prevKey =
        state.activeCategory === 'numbers'
          ? `numbers:${state.currentNum}`
          : `${state.activeCategory}:${state.currentItem?.id || ''}`;
      const nonCooldownRev = revList.filter((r) => !isItemOnSkipCooldown(r.key));
      const baseRevPool = nonCooldownRev.length > 0 ? nonCooldownRev : revList;
      const nonSkippedRev = baseRevPool.filter((r) => !matchesJustSkipped(r.key, r.item ? r.item.es : getSpanishNumber(r.num)));
      const usableRev = nonSkippedRev.length > 0 ? nonSkippedRev : baseRevPool;
      const candidates = usableRev.length > 1 ? usableRev.filter((r) => r.key !== prevKey) : usableRev;
      revisionTarget = candidates[Math.floor(Math.random() * candidates.length)] || usableRev[0];
      if (revisionTarget && revisionTarget.catId) {
        state.activeCategory = revisionTarget.catId;
      }
    }
  }

  if (!isCategoryUnlocked(state.activeCategory)) return;

  const snap = getProgressionSnapshot(state.activeCategory);
  if (state.activeCategory === 'numbers' && snap.stage.contextMode) {
    state.contextMode = snap.stage.contextMode;
  }
  enforcePracticeGateForCurrentStage();
  state.speakOnlyMode = true;
  state.questionType = 'speak';
  state.direction = 'num-to-es';
  state.answered = false;
  state.progressPaused = false;
  state.usedShow = false;

  resetQuestionVoiceCapture();
  clearFullAnswerVisualReward();
  voiceCaptureState.speakCloseAttemptCount = 0;
  syncQuestionTypeUI();
  syncDirectionUI();

  if (answerInputEl) {
    answerInputEl.placeholder = 'Type your answer...';
  }
  feedbackDrawerEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect');
  feedbackBarEl.style.transition = 'none';
  feedbackBarEl.style.width = '0%';
  pauseProgressBtn.classList.add('hidden');
  pauseProgressBtn.classList.remove('is-invisible', 'is-paused');
  pauseProgressBtn.textContent = 'Pause';
  typeAnswerFeedbackEl.textContent = 'Feedback bar';
  typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning', 'is-transcript');

  const isNumToEs = state.direction === 'num-to-es';
  const isAudioQuestion = state.questionType === 'audio';
  const isSpeakQuestion = state.questionType === 'speak';
  const isDictation = state.activeCategory === 'numbers' && state.questionType === 'dictation';

  if (state.activeCategory !== 'numbers') {
    const rawPool = getPoolForPhraseCategory(state.activeCategory, state.range);
    if (rawPool.length === 0) return;
    const nonCooldownPool = rawPool.filter((it) => !isItemOnSkipCooldown(`${state.activeCategory}:${it.id}`));
    const cdPool = nonCooldownPool.length > 0 ? nonCooldownPool : rawPool;
    const nonJustSkippedPool = cdPool.filter((it) => !matchesJustSkipped(`${state.activeCategory}:${it.id}`, it.es));
    const pool = nonJustSkippedPool.length > 0 ? nonJustSkippedPool : cdPool;

    let nextItem = null;
    if (revisionTarget && revisionTarget.item) {
      nextItem = revisionTarget.item;
    } else if (state.practiceMode && !state.weakDrillActive && !state.polishDrillActive) {
      const prog = getPracticeStageProgress(state.activeCategory);
      const seq = prog.sequence.length > 0 ? prog.sequence : pool;
      if (state.practiceQueueStageKey !== prog.stageKey) {
        state.practiceQueueStageKey = prog.stageKey;
        const firstUnpracticed = seq.findIndex(
          (it) => !prog.practicedSet.has(getPracticeItemKey(state.activeCategory, it))
        );
        state.practiceQueueIndex = firstUnpracticed >= 0 ? firstUnpracticed : 0;
      }
      nextItem = seq[state.practiceQueueIndex % seq.length] || pool[0];
    } else {
      const excludeId =
        pool.length > 1 && state.currentItem ? state.currentItem.id : null;
      nextItem =
        pickWeightedFromPool(pool, (item) => item.id, excludeId) || pool[0];
    }

    state.currentItem = nextItem;
    state.currentContext = null;
    state.dictationSequence = [];
    state.currentVoiceGender = Math.random() < 0.5 ? 'male' : 'female';
    if (nextItem.structure) {
      const prevFillKey = state.lastFillKeyByItem?.[nextItem.id] || '';
      const resolvedInst = resolveDynamicQuestionInstance(nextItem, {
        fillStatsByItem: state.structureFillStats,
        recentFillKey: prevFillKey
      });
      state.currentInstance = resolvedInst;
      if (resolvedInst) {
        if (!state.lastFillKeyByItem || typeof state.lastFillKeyByItem !== 'object') {
          state.lastFillKeyByItem = {};
        }
        state.lastFillKeyByItem[nextItem.id] = resolvedInst.fillKey;
      }
    } else {
      state.currentInstance = null;
    }
    const activeData = getActivePhraseData(nextItem);
    ensurePreselectedSlotOptionForItem(nextItem, { resetIfExhausted: true });
    recordWordFirstShown(state.activeCategory, nextItem);

    const shouldShowIntro = false;
    if (isAudioQuestion) {
      promptValueEl.classList.add('hidden');
      if (promptSubtextEl) promptSubtextEl.classList.add('hidden');
      audioControlsRowEl.classList.remove('hidden');
      speakBtnLabel.textContent = 'Play Audio';
      if (!shouldShowIntro && state.activeView === 'play' && 'speechSynthesis' in window) {
        speakSpanish(getSpokenTextForCurrentQuestion());
      }
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      audioControlsRowEl.classList.add('hidden');
      promptValueEl.classList.remove('hidden');
      if (isSpeakQuestion) {
        renderPromptValueWithSplit(activeData.en, { allowSplit: true });
        promptValueEl.classList.remove('is-spanish');
        if (promptSubtextEl) promptSubtextEl.classList.add('hidden');
      } else {
        renderPromptValueWithSplit(isNumToEs ? activeData.en : activeData.es, { allowSplit: isNumToEs });
        promptValueEl.classList.toggle('is-spanish', !isNumToEs);
        if (promptSubtextEl) promptSubtextEl.classList.add('hidden');
      }
      promptValueEl.classList.toggle('is-phrase', true);
      promptValueEl.classList.remove('is-context', 'is-hundreds');
    }

    finalizeLoadedQuestionPrompt({
      inputMode: 'text',
      shouldShowIntro,
      introTarget: nextItem,
      stageIndex: snap.stageIndex,
      isAudioQuestion,
      isSpeakQuestion
    });
    return;
  }

  state.currentItem = null;
  state.currentInstance = null;
  const rawNumPool = getPoolForRange(state.range);
  const nonCooldownNumPool = rawNumPool.filter((n) => !isItemOnSkipCooldown(`numbers:${n}`));
  const cdNumPool = nonCooldownNumPool.length > 0 ? nonCooldownNumPool : rawNumPool;
  const nonJustSkippedNumPool = cdNumPool.filter((n) => !matchesJustSkipped(`numbers:${n}`, getSpanishNumber(n)));
  const pool = nonJustSkippedNumPool.length > 0 ? nonJustSkippedNumPool : cdNumPool;
  let nextNum = 0;
  if (revisionTarget && typeof revisionTarget.num === 'number') {
    nextNum = revisionTarget.num;
  } else if (state.practiceMode && !state.weakDrillActive && !state.polishDrillActive) {
    const prog = getPracticeStageProgress('numbers');
    const seq = prog.sequence.length > 0 ? prog.sequence : pool;
    if (state.practiceQueueStageKey !== prog.stageKey) {
      state.practiceQueueStageKey = prog.stageKey;
      const firstUnpracticed = seq.findIndex(
        (n) => !prog.practicedSet.has(getPracticeItemKey('numbers', n))
      );
      state.practiceQueueIndex = firstUnpracticed >= 0 ? firstUnpracticed : 0;
    }
    nextNum = seq[state.practiceQueueIndex % seq.length] ?? pool[0] ?? 0;
  } else {
    const excludeNum = pool.length > 1 ? state.currentNum : null;
    nextNum =
      pickWeightedFromPool(pool, (n) => n, excludeNum) ?? pool[0] ?? 0;
  }
  state.currentNum = nextNum;
  state.currentVoiceGender = Math.random() < 0.5 ? 'male' : 'female';
  if (!state.practiceMode) {
    syncExamQuantityScenarioPool();
  }
  const excludedScenarioIds =
    !state.practiceMode && state.usedExamQuantityScenarios instanceof Set
      ? Array.from(state.usedExamQuantityScenarios)
      : [];
  state.currentContext = buildQuestionContext(nextNum, state.contextMode, { excludedScenarioIds });
  recordWordFirstShown('numbers', nextNum);

  if (isDictation) {
    const seqPool = pool.filter((x) => x <= 100);
    const src = seqPool.length >= 3 ? seqPool : Array.from({ length: 101 }, (_, i) => i);
    const n2 = src[Math.floor(Math.random() * src.length)];
    const n3 = src[Math.floor(Math.random() * src.length)];
    state.dictationSequence = [nextNum > 100 ? nextNum % 100 : nextNum, n2, n3];
  } else {
    state.dictationSequence = [];
  }

  const shouldShowNumIntro = false;

  if (isAudioQuestion || isDictation) {
    promptValueEl.classList.add('hidden');
    if (promptSubtextEl) promptSubtextEl.classList.add('hidden');
    audioControlsRowEl.classList.remove('hidden');
    speakBtnLabel.textContent = isDictation ? 'Play Sequence' : 'Play Audio';
    if (
      !shouldShowNumIntro &&
      state.activeView === 'play' &&
      isCategoryUnlocked(state.activeCategory) &&
      'speechSynthesis' in window
    ) {
      speakSpanish(getSpokenTextForCurrentQuestion());
    }
  } else {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    audioControlsRowEl.classList.add('hidden');
    promptValueEl.classList.remove('hidden');
    if (isSpeakQuestion) {
      renderPromptValueWithSplit(state.currentContext.promptEn, { allowSplit: true });
      promptValueEl.classList.remove('is-spanish');
      if (promptSubtextEl) promptSubtextEl.classList.add('hidden');
    } else {
      const promptText = isNumToEs ? state.currentContext.promptEn : state.currentContext.promptEs;
      renderPromptValueWithSplit(promptText, { allowSplit: isNumToEs });
      promptValueEl.classList.toggle('is-spanish', !isNumToEs);
      if (promptSubtextEl) promptSubtextEl.classList.add('hidden');
    }
    promptValueEl.classList.remove('is-phrase');
    promptValueEl.classList.toggle('is-context', state.currentContext.isContext);
    promptValueEl.classList.toggle('is-hundreds', !state.currentContext.isContext && (isNumToEs || isSpeakQuestion) && nextNum >= 100);
  }

  const isTimeMode =
    state.currentContext.isContext &&
    (state.currentContext.resolvedMode || state.contextMode) === 'time';

  finalizeLoadedQuestionPrompt({
    inputMode: isDictation || (!isAudioQuestion && !isSpeakQuestion && !isNumToEs && !isTimeMode) ? 'numeric' : 'text',
    shouldShowIntro: shouldShowNumIntro,
    introTarget: nextNum,
    stageIndex: snap.stageIndex,
    isAudioQuestion,
    isSpeakQuestion
  });
}

function getListenEnglishDisplay() {
  if (state.activeCategory !== 'numbers') {
    const item = getActivePhraseData();
    return item ? item.en : '';
  }
  if (state.currentContext && state.currentContext.isContext) {
    return state.currentContext.answerEn || state.currentContext.promptEn || '';
  }
  return String(state.currentNum);
}

function getCorrectAnswerDisplay() {
  const isListen = state.questionType === 'audio';
  const formatListen = (esText) => {
    if (!isListen || !esText) return esText;
    const enText = getListenEnglishDisplay();
    return enText ? `${esText} — ${enText}` : esText;
  };

  if (state.activeCategory !== 'numbers') {
    const item = getActivePhraseData();
    if (!item) return '';
    const displayEs = getDisplaySpanishForItem(item, getSelectedSlotChoiceForItem(item));
    if (isListen) return formatListen(displayEs);
    if (state.questionType === 'speak') return displayEs;
    return state.direction === 'num-to-es' ? displayEs : item.en;
  }
  if (state.questionType === 'dictation' && state.dictationSequence.length > 0) {
    return state.dictationSequence.join(' ');
  }
  if (state.currentContext && state.currentContext.isContext) {
    if (isListen) return formatListen(state.currentContext.answerEs);
    return state.questionType === 'speak' || state.direction === 'num-to-es'
      ? state.currentContext.answerEs
      : state.currentContext.answerEn;
  }
  const expectedEs = getSpanishNumber(state.currentNum);
  if (isListen) return formatListen(expectedEs);
  if (state.questionType === 'speak' || state.direction === 'num-to-es') {
    return expectedEs;
  }
  return String(state.currentNum);
}

function startFeedbackProgressBar(isCorrect) {
  clearFeedbackTimer();
  feedbackDrawerEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect');
  feedbackDrawerEl.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');
  state.progressPaused = false;
  pauseProgressBtn.textContent = 'Pause';
  pauseProgressBtn.classList.remove('hidden', 'is-invisible', 'is-paused');

  feedbackBarEl.style.transition = 'none';
  feedbackBarEl.style.width = '0%';
  void feedbackBarEl.offsetWidth;

  feedbackRemainingMs = state.speed * 1000;
  feedbackStartTime = performance.now();
  feedbackBarEl.style.transition = `width ${feedbackRemainingMs}ms linear`;
  feedbackBarEl.style.width = '100%';

  feedbackTimer = setTimeout(() => {
    feedbackTimer = null;
    advanceQuestion();
  }, feedbackRemainingMs);
}

function handlePauseProgressClick() {
  if (!state.answered || (!feedbackTimer && !state.progressPaused)) return;
  if (!state.progressPaused) {
    state.progressPaused = true;
    pauseProgressBtn.textContent = 'Resume';
    pauseProgressBtn.classList.add('is-paused');
    clearFeedbackTimer();
    const elapsed = performance.now() - feedbackStartTime;
    feedbackRemainingMs = Math.max(50, feedbackRemainingMs - elapsed);
    const computedWidth = window.getComputedStyle(feedbackBarEl).width;
    feedbackBarEl.style.transition = 'none';
    feedbackBarEl.style.width = computedWidth;
  } else {
    state.progressPaused = false;
    pauseProgressBtn.textContent = 'Pause';
    pauseProgressBtn.classList.remove('is-paused');
    feedbackStartTime = performance.now();
    void feedbackBarEl.offsetWidth;
    feedbackBarEl.style.transition = `width ${feedbackRemainingMs}ms linear`;
    feedbackBarEl.style.width = '100%';
    feedbackTimer = setTimeout(() => {
      feedbackTimer = null;
      advanceQuestion();
    }, feedbackRemainingMs);
  }
}

function checkCandidateAnswer(rawCand) {
  const raw = String(rawCand || '');
  let isCorrect = false;
  let accentWarning = false;
  let typedSpanish =
    state.direction === 'num-to-es' ||
    state.questionType === 'speak' ||
    state.questionType === 'audio';

  if (state.activeCategory !== 'numbers') {
    const item = getActivePhraseData();
    if (!item) {
      return { isCorrect: false, accentWarning: false, typedSpanish };
    }
    const esCandidates = buildPhraseSpanishCandidates(item);
    const enCandidates = buildPhraseEnglishCandidates(item);
    const userEsClean = normalizePhraseSpanish(raw);
    const userEnClean = normalizePhraseEnglish(raw);

    if (state.questionType === 'audio') {
      if (esCandidates.includes(userEsClean)) {
        typedSpanish = true;
        isCorrect = true;
      } else if (esCandidates.some((cand) => stripAccents(userEsClean) === stripAccents(cand))) {
        typedSpanish = true;
        accentWarning = true;
        isCorrect = !state.strictAccents;
      } else if (enCandidates.includes(userEnClean)) {
        isCorrect = true;
      }
    } else if (state.direction === 'num-to-es' || state.questionType === 'speak') {
      typedSpanish = true;
      if (esCandidates.includes(userEsClean)) {
        isCorrect = true;
      } else if (esCandidates.some((cand) => stripAccents(userEsClean) === stripAccents(cand))) {
        if (state.strictAccents) {
          isCorrect = false;
          accentWarning = true;
        } else {
          isCorrect = true;
          accentWarning = true;
        }
      } else if (item.slotTemplate && matchesSlotTemplateSpanish(raw, item.slotTemplate)) {
        isCorrect = true;
      }
    } else if (enCandidates.includes(userEnClean)) {
      isCorrect = true;
    }
  } else {
    const ctx = state.currentContext || buildQuestionContext(state.currentNum, state.contextMode);
    const expectedEs = ctx.answerEs || getSpanishNumber(state.currentNum);
    const expectedEn = getEnglishNumber(state.currentNum);
    const isTimeCtx = ctx.isContext && (ctx.resolvedMode || state.contextMode) === 'time';

    const matchesNumberEn = (inputStr) => {
      const clean = normalizeText(inputStr);
      const cleanNoHyphen = clean.replace(/-/g, ' ');
      const expectedEnClean = normalizeText(expectedEn).replace(/-/g, ' ');
      const promptEnClean = normalizeText(ctx.promptEn || '').replace(/^\$/, '').trim();
      const answerEnClean = normalizeText(ctx.answerEn || '').replace(/^\$/, '').trim();
      const userNoDollar = clean.replace(/^\$/, '').trim();

      if (isTimeCtx) {
        const cleanTime = clean.replace(/^0(\d:)/, '$1');
        return (
          cleanTime === normalizeText(ctx.answerEn) ||
          cleanTime === normalizeText(ctx.promptEn)
        );
      }

      const numericMatch = userNoDollar.match(/^(\d+)(?:\s+[a-z\s]+)?$/i);
      const parsedDirect = Number(userNoDollar);
      if (Number.isInteger(parsedDirect) && userNoDollar !== '' && parsedDirect === state.currentNum) {
        return true;
      }
      if (
        cleanNoHyphen === expectedEnClean ||
        userNoDollar === promptEnClean ||
        userNoDollar === answerEnClean
      ) {
        return true;
      }
      if (numericMatch && Number(numericMatch[1]) === state.currentNum && ctx.isContext) {
        return true;
      }
      return false;
    };

    if (state.questionType === 'dictation') {
      const tokens = raw.trim().split(/[\s,.-]+/).filter(Boolean).map(Number);
      const seq = state.dictationSequence;
      if (
        tokens.length === seq.length &&
        tokens.every((val, i) => Number.isInteger(val) && val === seq[i])
      ) {
        isCorrect = true;
      }
    } else if (state.questionType === 'audio') {
      const userClean = normalizeText(raw);
      const expectedClean = normalizeText(expectedEs);
      const spokenEsClean = ctx.spokenEs ? normalizeText(ctx.spokenEs) : '';
      const altEsList = [
        expectedClean,
        spokenEsClean,
        ...(ctx.altAnswersEs || []).map(normalizeText)
      ].filter(Boolean);

      if (
        altEsList.includes(userClean) ||
        (state.currentNum === 100 && userClean === 'ciento')
      ) {
        typedSpanish = true;
        isCorrect = true;
      } else if (altEsList.some((cand) => stripAccents(userClean) === stripAccents(cand))) {
        typedSpanish = true;
        accentWarning = true;
        isCorrect = !state.strictAccents;
      } else if (matchesNumberEn(raw)) {
        isCorrect = true;
      }
    } else if (
      state.direction === 'num-to-es' ||
      state.questionType === 'speak'
    ) {
      typedSpanish = true;
      const userClean = normalizeText(raw);
      const expectedClean = normalizeText(expectedEs);
      const spokenEsClean = ctx.spokenEs ? normalizeText(ctx.spokenEs) : '';
      const altEsList = [
        expectedClean,
        spokenEsClean,
        ...(ctx.altAnswersEs || []).map(normalizeText)
      ].filter(Boolean);

      if (
        altEsList.includes(userClean) ||
        (state.currentNum === 100 && userClean === 'ciento')
      ) {
        isCorrect = true;
      } else if (altEsList.some((cand) => stripAccents(userClean) === stripAccents(cand))) {
        if (state.strictAccents) {
          isCorrect = false;
          accentWarning = true;
        } else {
          isCorrect = true;
          accentWarning = true;
        }
      }
    } else {
      isCorrect = matchesNumberEn(raw);
    }
  }

  return { isCorrect, accentWarning, typedSpanish };
}

function evaluateTypedAnswer({ voiceAlternatives = null } = {}) {
  if (state.answered) {
    handlePauseProgressClick();
    return;
  }
  if (state.usedShow) {
    advanceQuestion();
    return;
  }

  const raw = answerInputEl.value;
  if (!raw.trim() && (!Array.isArray(voiceAlternatives) || voiceAlternatives.length === 0)) {
    answerInputEl.focus();
    return;
  }

  state.answered = true;
  answerInputEl.disabled = true;
  hintBtn.disabled = true;
  if (micBtn) micBtn.disabled = true;
  if (voiceRedoBtn) voiceRedoBtn.disabled = true;

  const candidateList = [];
  if (raw.trim()) candidateList.push(raw.trim());
  if (Array.isArray(voiceAlternatives)) {
    voiceAlternatives.forEach((alt) => {
      const trimmed = String(alt || '').trim();
      if (trimmed && !candidateList.includes(trimmed)) {
        candidateList.push(trimmed);
      }
      const expanded = expandSpokenDigitsToSpanish(trimmed);
      if (expanded && !candidateList.includes(expanded)) {
        candidateList.push(expanded);
      }
    });
  } else if (state.questionType === 'speak') {
    const expanded = expandSpokenDigitsToSpanish(raw.trim());
    if (expanded && !candidateList.includes(expanded)) {
      candidateList.push(expanded);
    }
  }

  let bestResult = { isCorrect: false, accentWarning: false, typedSpanish: state.direction === 'num-to-es' };
  for (const cand of candidateList) {
    const res = checkCandidateAnswer(cand);
    if (res.isCorrect && !res.accentWarning) {
      bestResult = res;
      if (cand !== raw.trim()) {
        answerInputEl.value = cand;
      }
      break;
    }
    if (res.isCorrect && !bestResult.isCorrect) {
      bestResult = res;
      if (cand !== raw.trim()) {
        answerInputEl.value = cand;
      }
    } else if (res.accentWarning && !bestResult.isCorrect && !bestResult.accentWarning) {
      bestResult = res;
    }
  }

  let isCorrect = bestResult.isCorrect;
  const accentWarning = bestResult.accentWarning;
  const typedSpanish = bestResult.typedSpanish;

  const displayAns = getCorrectAnswerDisplay();
  const spokenEs = getSpokenTextForCurrentQuestion();

  // Base-only rating for Browser STT in Speak mode: only require the base for pass/fail!
  // If the user ALSO includes the extension, track it in the mastery table and grant the full-answer visual reward.
  let browserExtensionRating = null;
  let browserExtensionIncluded = false;
  let browserFullAnswerBonus = false;
  let browserBonusExtLabel = '';
  const activeSplit = state.questionType === 'speak' ? getActiveQuestionSplit() : { hasExtension: false };
  if (state.questionType === 'speak' && activeSplit.hasExtension) {
    const normCandStr = (s) => stripAccents(normalizePhraseSpanish(s || ''));
    const baseCands = [activeSplit.baseEs, ...(activeSplit.baseAltEs || [])]
      .map(normCandStr)
      .filter(Boolean);
    const isAnySlotExt = activeSplit.extensionEs === '__slot_any__';
    const extNorm = isAnySlotExt ? '' : normCandStr(activeSplit.extensionEs);
    let baseMatched = Boolean(isCorrect);
    let extMatched = false;
    let extAttemptedWrong = false;
    let resolvedSpokenExt = null;
    const activeSlotTemplate = state.activeCategory !== 'numbers' ? resolveActivePhraseItem()?.slotTemplate : null;

    for (const cand of candidateList) {
      const cNorm = normCandStr(cand);
      if (!cNorm) continue;
      const padded = ` ${cNorm} `;
      const matchedBase = baseCands.find((bc) => cNorm === bc || padded.includes(` ${bc} `));
      if (!baseMatched && matchedBase) {
        baseMatched = true;
      }
      if (activeSlotTemplate && matchesSlotTemplateSpanish(cand, activeSlotTemplate)) {
        baseMatched = true;
        extMatched = true;
      }
      const spokenExt = resolveSpokenExtensionInfo(cand, '');
      if (spokenExt) {
        extMatched = true;
        resolvedSpokenExt = spokenExt;
      } else if (extNorm && (cNorm === extNorm || padded.includes(` ${extNorm} `))) {
        extMatched = true;
      } else if (matchedBase && !isAnySlotExt) {
        const leftover = cNorm.replace(matchedBase, ' ').replace(/\s+/g, ' ').trim();
        if (leftover.length > 0) {
          extAttemptedWrong = true;
        }
      }
    }
    isCorrect = baseMatched;
    browserExtensionIncluded = Boolean(extMatched);
    browserFullAnswerBonus = Boolean(baseMatched && extMatched);
    browserBonusExtLabel =
      resolvedSpokenExt?.es ||
      (isAnySlotExt ? '' : (activeSplit.extensionLabelEs || activeSplit.extensionEs));

    // Track extension in Mastery Table whenever the user included it OR attempted an incorrect variant after the base
    const shouldTrackExt = Boolean(
      !state.practiceMode &&
      activeSplit.trackExtensionInMastery !== false &&
      (browserExtensionIncluded || (baseMatched && extAttemptedWrong && activeSplit.extensionKey))
    );
    if (shouldTrackExt) {
      browserExtensionRating = {
        key: resolvedSpokenExt?.key || activeSplit.extensionKey,
        catId: resolvedSpokenExt?.catId || activeSplit.catId,
        es: resolvedSpokenExt?.es || activeSplit.extensionLabelEs || activeSplit.extensionEs,
        en: resolvedSpokenExt?.en || activeSplit.extensionLabelEn || activeSplit.extensionEn,
        group: resolvedSpokenExt?.group || activeSplit.extensionGroup || '',
        isCorrect: Boolean(extMatched),
        score: null,
        needsImprovement: false
      };
    }
  }

  if (state.questionType === 'speak') {
    const detectedCmd = candidateList
      .map((cand) => detectVoiceCommand(cand, spokenEs, []))
      .find(Boolean);
    if (detectedCmd && detectedCmd !== 'skip') {
      state.answered = false;
      answerInputEl.disabled = false;
      answerInputEl.value = '';
      if (micBtn) {
        micBtn.disabled = false;
        micBtn.classList.remove('is-submit', 'is-recording');
      }
      if (voiceRedoBtn) voiceRedoBtn.disabled = true;
      voiceCaptureState.hasSpokenAudio = false;
      voiceCaptureState.questionAlternatives = [];
      syncNextQuestionButtonUI();
      handleHandsFreeVoiceCommand(detectedCmd, { heard: raw.trim(), expectedEs: spokenEs });
      return;
    }
  }

  if (
    state.questionType === 'speak' &&
    candidateList.some((cand) => isVoiceSkipCommand(cand, spokenEs))
  ) {
    if (state.practiceMode) {
      state.answered = false;
      speakSpanish(spokenEs);
      advancePracticeNextWord();
      return;
    }
    state.answered = true;
    answerInputEl.disabled = true;
    if (micBtn) {
      micBtn.disabled = true;
      micBtn.classList.remove('is-submit', 'is-recording');
    }
    if (voiceRedoBtn) voiceRedoBtn.disabled = true;
    syncNextQuestionButtonUI();
    recordOutcome(false, { skipped: true });
    logSpeechEvent(
      'COMMIT',
      `Browser STT voice command SKIP detected — pronouncing "${spokenEs}" and advancing.`,
      { engine: 'browser', skipped: true, rawInput: raw, expectedEs: spokenEs },
      'info'
    );
    inputShellEl.classList.remove('has-spoken-audio', 'is-recording', 'correct', 'incorrect');
    typeAnswerFeedbackEl.textContent = `Skipped — "${spokenEs || displayAns}"`;
    typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning', 'is-transcript');
    typeAnswerFeedbackEl.classList.add('is-warning');
    speakSpanish(spokenEs);
    startFeedbackProgressBar(false);
    return;
  }

  // Keep Practice Mode strictly ungraded when using Browser Speech-to-Text
  if (state.practiceMode) {
    const matchedCandidateText = answerInputEl.value.trim() || raw.trim();
    state.answered = false;
    answerInputEl.disabled = false;
    answerInputEl.value = '';
    hintBtn.disabled = false;
    voiceCaptureState.hasSpokenAudio = false;
    voiceCaptureState.questionAlternatives = [];
    if (inputShellEl) {
      inputShellEl.classList.remove('has-spoken-audio', 'is-recording', 'correct', 'incorrect');
      inputShellEl.classList.add(isCorrect ? 'correct' : 'incorrect');
    }
    if (micBtn) {
      micBtn.disabled = false;
      micBtn.classList.remove('is-submit', 'is-recording');
    }
    const micLbl = document.getElementById('mic-btn-label');
    if (micLbl) micLbl.textContent = 'Speak Again';
    if (voiceRedoBtn) voiceRedoBtn.disabled = true;
    syncNextQuestionButtonUI();

    if (isCorrect && browserFullAnswerBonus) {
      triggerFullAnswerVisualReward({
        extensionEs: browserBonusExtLabel,
        extensionScore: null,
        trackedInMastery: false,
        isPractice: true
      });
      if (state.activeCategory !== 'numbers') {
        markSlotOptionsUsedForItem(resolveActivePhraseItem(), {
          heard: raw.trim(),
          scoredTargetEs: matchedCandidateText
        });
      }
    } else if (isCorrect) {
      playCorrectSound();
      if (state.activeCategory !== 'numbers' && browserExtensionIncluded) {
        markSlotOptionsUsedForItem(resolveActivePhraseItem(), {
          heard: raw.trim(),
          scoredTargetEs: matchedCandidateText
        });
      }
    } else {
      playIncorrectSound();
    }
    markStudyActivity();
    const practiceRes = markCurrentPracticeItemCompleted();
    evaluateAllAchievements({ recordActivity: true });

    if (typeAnswerFeedbackEl) {
      const heardBit = raw.trim() ? `Heard "${raw.trim()}"` : 'Spoken';
      typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning', 'is-transcript');
      if (isCorrect && browserFullAnswerBonus) {
        typeAnswerFeedbackEl.textContent = `★ Practice · Correct! · Full Answer Bonus (${heardBit}) — Click Next Word →`;
        typeAnswerFeedbackEl.classList.add('is-correct', 'is-full-answer-bonus');
      } else if (isCorrect) {
        typeAnswerFeedbackEl.textContent = `Practice · Correct! (${heardBit}) — Speak again or click Next Word →`;
        typeAnswerFeedbackEl.classList.add('is-correct');
      } else {
        typeAnswerFeedbackEl.textContent = `Practice · ${heardBit} — Listen & try again or click Next Word →`;
        typeAnswerFeedbackEl.classList.add('is-incorrect');
      }
    }
    logSpeechEvent(
      'PRACTICE',
      `Practice (ungraded Browser STT) · isCorrect=${isCorrect} · raw="${raw.trim()}" · expected="${spokenEs}"`,
      { engine: 'browser', practiceMode: true, isCorrect, rawInput: raw, expectedEs: spokenEs },
      'info'
    );
    if (isHandsFreeRunning()) {
      handleHandsFreePracticeResult({
        isCorrect,
        expectedEs: spokenEs,
        justCompleted: Boolean(practiceRes?.justCompleted)
      });
    }
    return;
  }

  if (!isCorrect && state.questionType === 'speak') {
    voiceCaptureState.attemptCount += 1;
    updateMemoryTipUI();
    syncSlotOptionsDropdownUI();
    voiceCaptureState.lastFailedMeta = {
      extensionIncluded: Boolean(browserExtensionIncluded),
      ...(browserExtensionRating ? { extensionRating: browserExtensionRating } : {})
    };
    voiceCaptureState.hasSpokenAudio = false;
    voiceCaptureState.questionAlternatives = [];
    answerInputEl.value = '';

    const hardExam = isTopicExamActive();
    const maxAttempts = hardExam ? 1 : MAX_SPEAK_ATTEMPTS_BEFORE_NEXT;
    const attemptNum = voiceCaptureState.attemptCount;
    const reachedMaxAttempts = attemptNum >= maxAttempts;

    playIncorrectSound();

    if (reachedMaxAttempts) {
      state.answered = true;
      answerInputEl.disabled = true;
      if (micBtn) {
        micBtn.disabled = true;
        micBtn.classList.remove('is-submit', 'is-recording');
      }
      if (voiceRedoBtn) voiceRedoBtn.disabled = true;
      syncNextQuestionButtonUI();
      const canRetry = !hardExam && !voiceCaptureState.retryRoundUsed;
      if (canRetry) {
        voiceCaptureState.pendingIncorrectCommit = true;
      } else {
        voiceCaptureState.pendingIncorrectCommit = false;
        recordGradedOutcome(false, {
          extensionIncluded: Boolean(browserExtensionIncluded),
          ...(browserExtensionRating ? { extensionRating: browserExtensionRating } : {})
        });
      }
      logSpeechEvent(
        'COMMIT',
        `Browser STT attempt ${attemptNum}/${MAX_SPEAK_ATTEMPTS_BEFORE_NEXT}: FAIL (showing Incorrect Screen, canRetry=${canRetry}) · raw="${raw.trim()}"`,
        {
          engine: 'browser',
          isCorrect: false,
          rawInput: raw,
          voiceAlternatives,
          expectedDisplay: displayAns,
          spokenEs,
          attemptCount: attemptNum,
          canRetry,
          showIncorrectScreen: true
        },
        'warn'
      );
      showIncorrectScreen({
        expectedEs: spokenEs || displayAns,
        heard: raw.trim(),
        wrongWord: false,
        canRetry,
        hasRecordedAudio: Boolean(voiceCaptureState.lastSubmittedAudioUrl)
      });
      if (isHandsFreeRunning()) {
        handleHandsFreeIncorrectScreen({
          expectedEs: spokenEs || displayAns,
          canRetry,
          retryRoundUsed: voiceCaptureState.retryRoundUsed,
          wrongWord: false,
          score: 0
        });
      } else {
        speakSpanish(spokenEs);
      }
      return;
    }

    state.answered = false;
    answerInputEl.disabled = false;
    if (micBtn) {
      micBtn.disabled = false;
      micBtn.classList.remove('is-submit', 'is-recording');
    }
    const micLbl = document.getElementById('mic-btn-label');
    if (micLbl) micLbl.textContent = 'Speak Again';
    if (voiceRedoBtn) voiceRedoBtn.disabled = true;
    syncNextQuestionButtonUI();

    logSpeechEvent(
      'ATTEMPT',
      `Browser STT attempt ${attemptNum}/${MAX_SPEAK_ATTEMPTS_BEFORE_NEXT}: FAIL · raw="${raw.trim()}"`,
      {
        engine: 'browser',
        isCorrect: false,
        rawInput: raw,
        voiceAlternatives,
        expectedDisplay: displayAns,
        spokenEs,
        attemptCount: attemptNum,
        remainingAttempts: MAX_SPEAK_ATTEMPTS_BEFORE_NEXT - attemptNum
      },
      'warn'
    );

    inputShellEl.classList.remove('has-spoken-audio', 'is-recording', 'correct');
    inputShellEl.classList.add('incorrect');
    const postActionsEl = document.getElementById('post-speak-actions');
    const playMineBtnEl = document.getElementById('play-my-audio-btn');
    if (playMineBtnEl) {
      playMineBtnEl.classList.toggle('hidden', !voiceCaptureState.lastSubmittedAudioUrl);
    }
    if (postActionsEl) {
      postActionsEl.classList.remove('hidden');
    }
    const attemptTag = `Attempt ${attemptNum}/${MAX_SPEAK_ATTEMPTS_BEFORE_NEXT}`;
    typeAnswerFeedbackEl.textContent = `${attemptTag} · Incorrect · Listen & try again!`;
    typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning', 'is-transcript');
    typeAnswerFeedbackEl.classList.add('is-incorrect');
    if (isHandsFreeRunning()) {
      handleHandsFreeAttempt1Fail({
        expectedEs: spokenEs,
        score: 0,
        wrongWord: false
      });
    } else {
      speakSpanish(spokenEs);
    }
    return;
  }

  const strictClean = Boolean(isCorrect && !accentWarning && typedSpanish);
  recordGradedOutcome(isCorrect, {
    strictClean,
    heard: raw.trim(),
    scoredTargetEs: answerInputEl.value.trim() || raw.trim(),
    extensionIncluded: Boolean(browserExtensionIncluded),
    fullAnswerBonus: Boolean(browserFullAnswerBonus),
    ...(browserExtensionRating ? { extensionRating: browserExtensionRating } : {})
  });
  if (state.questionType === 'speak') {
    logSpeechEvent(
      'COMMIT',
      `Browser STT verdict: ${isCorrect ? (browserFullAnswerBonus ? 'PASS (FULL ANSWER BONUS)' : 'PASS') : 'FAIL'} · raw="${raw.trim()}"`,
      {
        engine: 'browser',
        isCorrect,
        accentWarning,
        rawInput: raw,
        voiceAlternatives,
        expectedDisplay: displayAns,
        spokenEs,
        strictClean,
        extensionIncluded: Boolean(browserExtensionIncluded),
        fullAnswerBonus: Boolean(browserFullAnswerBonus)
      },
      isCorrect ? 'info' : 'warn'
    );
  }
  if (isCorrect && browserFullAnswerBonus) {
    triggerFullAnswerVisualReward({
      extensionEs: browserBonusExtLabel,
      extensionScore: null,
      trackedInMastery: Boolean(browserExtensionRating),
      isPractice: false
    });
  } else if (isCorrect) {
    playCorrectSound();
  } else {
    playIncorrectSound();
  }
  inputShellEl.classList.add(isCorrect ? 'correct' : 'incorrect');
  if (isCorrect && browserFullAnswerBonus) {
    inputShellEl.classList.add('is-full-answer-bonus');
  }
  if (state.questionType === 'speak') {
    if (isCorrect && browserFullAnswerBonus) {
      const extTag = browserBonusExtLabel ? ` (+ "${browserBonusExtLabel}")` : '';
      typeAnswerFeedbackEl.textContent = `★ Correct! · Full Answer Bonus${extTag}`;
    } else if (isCorrect && activeSplit.hasExtension) {
      typeAnswerFeedbackEl.textContent = 'Correct! · Base answered';
    } else {
      typeAnswerFeedbackEl.textContent = isCorrect ? 'Correct' : 'Incorrect';
    }
  } else {
    typeAnswerFeedbackEl.textContent = accentWarning
      ? `${displayAns} (watch tilde)`
      : displayAns;
  }
  typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning', 'is-transcript');
  typeAnswerFeedbackEl.classList.add(
    isCorrect ? (accentWarning ? 'is-warning' : 'is-correct') : 'is-incorrect'
  );
  if (isCorrect && browserFullAnswerBonus) {
    typeAnswerFeedbackEl.classList.add('is-full-answer-bonus');
  }
  if (state.questionType !== 'speak' || !isCorrect) {
    speakSpanish(spokenEs);
  }

  startFeedbackProgressBar(isCorrect);
}

function advancePracticeNextWord() {
  if (voiceCaptureState.activeMode === 'question') {
    voiceCaptureState.cancelPendingRecording = true;
    stopActiveVoiceCapture();
  }
  markStudyActivity();
  const practiceRes = markCurrentPracticeItemCompleted();
  evaluateAllAchievements({ recordActivity: true });
  const progAfter = getPracticeStageProgress(state.activeCategory);
  if (practiceRes?.justCompleted || (!isTrackingDisabled() && progAfter.isComplete)) {
    state.practiceMode = false;
    hideIncorrectScreen();
    state.answered = false;
    resetExamQuantityScenarioPool();
    syncPracticeModeCardUI({ autoSpeak: false });
    advanceQuestion();
    return;
  }
  state.practiceQueueIndex += 1;
  advanceQuestion();
}

function skipCurrentQuestion() {
  if (state.practiceMode) {
    advancePracticeNextWord();
    return;
  }
  if (state.answered) return;
  if (voiceCaptureState.activeMode === 'question') {
    voiceCaptureState.cancelPendingRecording = true;
    stopActiveVoiceCapture();
  }
  voiceCaptureState.requestToken += 1;
  voiceCaptureState.questionAudioBlob = null;
  voiceCaptureState.questionLocalResult = null;
  voiceCaptureState.hasSpokenAudio = false;
  voiceCaptureState.isScoring = false;
  const spokenEs = getSpokenTextForCurrentQuestion();
  const displayAns = getCorrectAnswerDisplay();
  state.answered = true;
  if (answerInputEl) answerInputEl.disabled = true;
  if (hintBtn) hintBtn.disabled = true;
  if (micBtn) {
    micBtn.disabled = true;
    micBtn.classList.remove('is-submit', 'is-recording');
  }
  if (voiceRedoBtn) voiceRedoBtn.disabled = true;
  if (skipQuestionBtn) skipQuestionBtn.disabled = true;
  syncNextQuestionButtonUI();

  const skipKey = getSkipCooldownKeyForCurrentQuestion();
  state.lastSkippedBaseKey = skipKey;
  state.lastSkippedExpectedEs = normalizeSkipExpectedEs(spokenEs || displayAns);
  // Deduplicate multiple skips within the same question attempt (including retry round)
  if (!state.currentQuestionSkipRecorded) {
    state.currentQuestionSkipRecorded = true;
    voiceCaptureState.pendingIncorrectCommit = false;
    recordOutcome(false, { skipped: true });
    recordSkipForCooldown(skipKey);
    savePersistedData();
  }
  updateMemoryTipUI();
  logSpeechEvent(
    'COMMIT',
    `Skip button clicked — pronouncing "${spokenEs}" and advancing.`,
    { engine: 'button', skipped: true, expectedEs: spokenEs },
    'info'
  );
  if (inputShellEl) {
    inputShellEl.classList.remove('has-spoken-audio', 'is-recording', 'correct', 'incorrect');
  }
  if (typeAnswerFeedbackEl) {
    typeAnswerFeedbackEl.textContent = `Skipped — "${spokenEs || displayAns}"`;
    typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning', 'is-transcript', 'is-analyzing');
    typeAnswerFeedbackEl.classList.add('is-warning');
  }
  speakSpanish(spokenEs);
  startFeedbackProgressBar(false);
}

function showCorrectAnswer() {
  if (state.practiceMode) {
    advancePracticeNextWord();
    return;
  }
  if (state.answered) return;
  if (voiceCaptureState.attemptCount < MAX_SPEAK_ATTEMPTS_BEFORE_NEXT) return;

  if (voiceCaptureState.activeMode === 'question') {
    voiceCaptureState.cancelPendingRecording = true;
    stopActiveVoiceCapture();
  }

  const failedMeta = voiceCaptureState.lastFailedMeta || {};
  state.answered = true;
  state.usedShow = true;
  answerInputEl.disabled = true;
  hintBtn.disabled = true;
  if (micBtn) micBtn.disabled = true;
  if (voiceRedoBtn) voiceRedoBtn.disabled = true;

  recordGradedOutcome(false, failedMeta);
  advanceQuestion();
}

function advanceQuestion() {
  if (isBlockingProgressionModalOpen()) return;
  state.questionNumber += 1;
  loadQuestion();
}

function renderPlayCategoryState() {
  const cat = getActiveCategoryMeta(state.activeCategory);
  const isUnlocked = isCategoryUnlocked(cat.id);

  if (stageProgressionHudEl) {
    stageProgressionHudEl.classList.toggle('hidden', !isUnlocked);
  }
  if (playActiveContentEl) {
    playActiveContentEl.classList.toggle('hidden', !isUnlocked);
  }
  if (categoryPlaceholderCardEl) {
    categoryPlaceholderCardEl.classList.toggle('hidden', isUnlocked);
  }

  if (!isUnlocked) {
    clearFeedbackTimer();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    const blockingCat = getPreviousBlockingCategory(cat.id);
    const unlockCat = CATEGORIES[getHighestUnlockedCategoryId()];
    if (placeholderTagEl) placeholderTagEl.textContent = 'Locked Subject';
    if (placeholderCatTitleEl) placeholderCatTitleEl.textContent = `${cat.label} is Locked`;
    if (placeholderCatDescEl) {
      placeholderCatDescEl.textContent = `Complete every stage in ${blockingCat.label} to unlock ${cat.label}. (${CATEGORY_ORDER.map((id) => CATEGORIES[id].label).join(' → ')})`;
    }
    if (placeholderReturnBtn) {
      placeholderReturnBtn.textContent = `Continue ${unlockCat.label} →`;
    }
    if (placeholderStagesPreviewEl) {
      placeholderStagesPreviewEl.innerHTML = cat.stages
        .map(
          (st) => `
          <div class="placeholder-stage-row">
            <span class="placeholder-stage-name">${escapeHtmlText(st.label)}</span>
            <span class="placeholder-stage-sub">${escapeHtmlText(st.desc)}</span>
          </div>
        `
        )
        .join('');
    }
  }
}

function syncPanamaSettingsUI() {
  if (state.progressionConfig && state.progressionConfig.enabled) {
    const numProg = getCategoryProgress('numbers');
    const currentStage = CATEGORIES.numbers.stages[numProg.stageIndex] || CATEGORIES.numbers.stages[0];
    state.contextMode = currentStage.contextMode;
  }
}

function syncDirectionUI() {
  const isGuidedOn = true;
  if (isCategoryUnlocked(state.activeCategory)) {
    const snap = getProgressionSnapshot(state.activeCategory);
    state.direction = snap.phaseDirection;
  }
  const isNumToEs = state.direction === 'num-to-es';
  if (dirNumToEsBtn) {
    dirNumToEsBtn.classList.toggle('active', isNumToEs);
    dirNumToEsBtn.setAttribute('aria-pressed', String(isNumToEs));
    dirNumToEsBtn.disabled = isGuidedOn;
    dirNumToEsBtn.title = 'Controlled by Learning Path (Write / Speak)';
  }
  if (dirEsToNumBtn) {
    dirEsToNumBtn.classList.toggle('active', !isNumToEs);
    dirEsToNumBtn.setAttribute('aria-pressed', String(!isNumToEs));
    dirEsToNumBtn.disabled = isGuidedOn;
    dirEsToNumBtn.title = 'Controlled by Learning Path (Read / Listen)';
  }
}

function syncSpeakOnlyModeUI() {
  state.speakOnlyMode = true;
  document.body.classList.add('is-speak-only');
}

function syncModeVisuals() {
  const isPlayView = state.activeView === 'play';
  const isStatsView = state.activeView === 'stats';

  navPlayBtn.classList.toggle('active', isPlayView);
  navPlayBtn.setAttribute('aria-pressed', String(isPlayView));
  navStatsBtn.classList.toggle('active', isStatsView);
  navStatsBtn.setAttribute('aria-pressed', String(isStatsView));
  renderCategoryNav();
}

const VIEW_PANE_MAP = {
  play: viewPlayEl,
  path: viewPathEl,
  stats: viewStatsEl
};

function switchView(targetView) {
  if (!VIEW_PANE_MAP[targetView]) return;
  if (state.activeView === targetView) {
    syncModeVisuals();
    return;
  }
  state.activeView = targetView;

  const isPlay = targetView === 'play';
  syncModeVisuals();

  if (viewTransitionTimer !== null) {
    clearTimeout(viewTransitionTimer);
    viewTransitionTimer = null;
  }

  const incomingEl = VIEW_PANE_MAP[targetView];
  const outgoingEls = Object.entries(VIEW_PANE_MAP)
    .filter(([key, el]) => key !== targetView && el)
    .map(([, el]) => el);

  if (!isPlay) {
    pauseHandsFreeSession('manual-interaction');
    pauseStudyTimerNow();
    clearFeedbackTimer();
    clearNewWordAutoSpeakTimer();
    resetQuestionVoiceCapture();
    stopActiveVoiceCapture();
    stopVoicePlayback('all');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    dismissTransientModalsForModeSwitch({ stopHandsFree: false });
  }

  outgoingEls.forEach((el) => el.classList.remove('is-visible'));

  viewTransitionTimer = setTimeout(() => {
    viewTransitionTimer = null;
    outgoingEls.forEach((el) => el.classList.add('hidden'));
    incomingEl.classList.remove('hidden');
    void incomingEl.offsetWidth;
    incomingEl.classList.add('is-visible');

    if (targetView === 'stats') {
      switchStatsSubView('calendar', { immediate: true });
    } else if (targetView === 'path') {
      renderPathView();
    } else {
      renderPlayCategoryState();
      syncProgressionUI();
      if (isCategoryUnlocked(state.activeCategory)) {
        maybeOpenNewTopicEducateModal(state.activeCategory);
        const snap = getProgressionSnapshot(state.activeCategory);
        const missingQuestion =
          (state.activeCategory !== 'numbers' && !resolveActivePhraseItem()) ||
          (state.activeCategory === 'numbers' && !state.currentContext) ||
          state.questionType !== snap.phaseQuestionType ||
          state.direction !== snap.phaseDirection;
        if (state.answered || missingQuestion) {
          advanceQuestion();
        } else if (state.questionType !== 'speak') {
          answerInputEl.focus();
        }
      }
    }
  }, 180);
}

function switchCategory(catId) {
  if (!CATEGORIES[catId]) return;
  const changed = state.activeCategory !== catId;
  state.activeCategory = catId;
  state.reviewFilterCat = catId;
  if (changed) {
    state.currentItem = null;
    state.currentContext = null;
    state.practiceMode = false;
    state.practiceQueueStageKey = '';
    state.practiceQueueIndex = 0;
    resetExamQuantityScenarioPool();
  }
  setPathExpandedUnitId(catId);
  const isUnlocked = isCategoryUnlocked(catId);

  if (isUnlocked) {
    const snap = getProgressionSnapshot(catId);
    if (catId === 'numbers' && snap.stage.contextMode) {
      state.contextMode = snap.stage.contextMode;
    }
    state.direction = snap.phaseDirection;
    state.questionType = snap.phaseQuestionType;
  }

  syncQuestionTypeUI();
  syncPanamaSettingsUI();
  syncDirectionUI();
  updateTopMetrics();
  renderPlayCategoryState();
  syncModeVisuals();
  syncProgressionUI();
  savePersistedData();

  const needsQuestionLoad =
    changed ||
    (catId !== 'numbers' && !state.currentItem) ||
    (catId === 'numbers' && !state.currentContext);
  if (isUnlocked) {
    maybeOpenNewTopicEducateModal(catId);
  }
  if (isUnlocked && needsQuestionLoad) {
    loadQuestion();
  }
}

function dismissTransientModalsForModeSwitch({ stopHandsFree = true } = {}) {
  if (stopHandsFree) {
    stopHandsFreeSession();
  }
  clearGuidebookJumpTimers();
  closeSettingsPopover();
  closeCategoryDropdown();
  closeSkipStageModal();
  resetGuidebookState();
  clearPendingProgressionModals();
  clearAchievementQueue();
}

function wireAppEventListeners() {
  settingsToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = settingsPopoverEl.classList.toggle('hidden');
    settingsToggleBtn.classList.toggle('active', !isHidden);
    settingsToggleBtn.setAttribute('aria-expanded', String(!isHidden));
    if (!isHidden) {
      handleHandsFreeManualInteraction('manual-interaction');
      refreshMicDeviceList();
    }
  });

  settingsPopoverEl.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.addEventListener('click', () => {
    if (!settingsPopoverEl.classList.contains('hidden')) {
      closeSettingsPopover();
    }
    closeCategoryDropdown();
    closeUnitCogMenu();
    if (statsCalendarState.pickerOpen) {
      statsCalendarState.pickerOpen = false;
      renderStatsCalendar();
    }
  });

  if (placeholderViewPathBtn) {
    placeholderViewPathBtn.addEventListener('click', () => {
      switchView('path');
    });
  }

  if (placeholderReturnBtn) {
    placeholderReturnBtn.addEventListener('click', () => {
      switchCategory(getHighestUnlockedCategoryId());
    });
  }

  speedSelectEl.addEventListener('change', (e) => {
    const val = Number(e.target.value);
    if (!Number.isNaN(val) && val > 0) {
      state.speed = val;
      savePersistedData();
    }
  });

  speakBtn.addEventListener('click', () => {
    if (state.questionType !== 'audio' && state.questionType !== 'dictation') return;
    if (checkZeroVolumePrompt()) return;
    speakSpanish(getSpokenTextForCurrentQuestion());
  });

  speakSlowBtn.addEventListener('click', () => {
    if (state.questionType !== 'audio' && state.questionType !== 'dictation') return;
    if (checkZeroVolumePrompt()) return;
    speakSpanish(getSpokenTextForCurrentQuestion(), 0.68);
  });

  hintBtn.addEventListener('click', showCorrectAnswer);
  if (skipQuestionBtn) {
    skipQuestionBtn.addEventListener('click', skipCurrentQuestion);
  }
  pauseProgressBtn.addEventListener('click', handlePauseProgressClick);

  navPlayBtn.addEventListener('click', () => {
    if (state.activeView !== 'play') {
      switchView('play');
    } else {
      syncModeVisuals();
    }
  });
  navStatsBtn.addEventListener('click', () => switchView('stats'));

  if (trackingToggleBtn) {
    trackingToggleBtn.addEventListener('click', () => {
      toggleTrackingDisabled();
    });
  }

  document.getElementById('practice-hear-btn')?.addEventListener('click', () => {
    handleHandsFreeManualInteraction('manual-interaction');
    if (checkZeroVolumePrompt()) return;
    speakSpanish(getSpokenTextForCurrentQuestion());
  });

  document.getElementById('practice-hear-slow-btn')?.addEventListener('click', () => {
    handleHandsFreeManualInteraction('manual-interaction');
    if (checkZeroVolumePrompt()) return;
    speakSpanish(getSpokenTextForCurrentQuestion(), 0.75);
  });

  document.getElementById('practice-hear-words-btn')?.addEventListener('click', () => {
    handleHandsFreeManualInteraction('manual-interaction');
    if (checkZeroVolumePrompt()) return;
    const spokenText = getSpokenTextForCurrentQuestion();
    const displayText = getDisplaySpanishForCurrentQuestion();
    if (!spokenText) return;
    speakSpanishWordByWord(spokenText, {
      pauseMs: 650,
      rateOverride: 0.85,
      onWordStart: (activeIdx) => {
        if (!promptSubtextEl || !state.practiceMode) return;
        renderPracticeSpanishWords(displayText, activeIdx);
      },
      onDone: () => {
        if (promptSubtextEl && state.practiceMode) {
          renderPracticeSpanishWords(getDisplaySpanishForCurrentQuestion());
        }
      }
    });
  });

  document.getElementById('slot-options-select')?.addEventListener('change', (e) => {
    const val = String(e.target.value || '').trim();
    if (state.activeCategory === 'numbers' && state.currentContext?.isQuantity) {
      const isExam = !state.practiceMode;
      const usedSet =
        isExam && state.usedExamQuantityScenarios instanceof Set
          ? state.usedExamQuantityScenarios
          : new Set();
      if (isExam && usedSet.has(val)) {
        e.target.value = state.currentContext.quantityScenarioId || '';
        return;
      }
      state.currentContext = buildQuestionContext(state.currentNum, state.contextMode, {
        quantityScenarioId: val,
        excludedScenarioIds: isExam ? Array.from(usedSet) : []
      });
      if (promptValueEl && state.questionType === 'speak') {
        renderPromptValueWithSplit(state.currentContext.promptEn, { allowSplit: true });
      }
      if (state.practiceMode) {
        renderPracticeSpanishWords(getDisplaySpanishForCurrentQuestion());
        if (Number(state.volume) > 0) {
          speakSpanish(getSpokenTextForCurrentQuestion());
        }
      } else {
        updateMemoryTipUI();
      }
      return;
    }

    const item = state.activeCategory !== 'numbers' ? resolveActivePhraseItem() : null;
    if (!item || !item.id) return;
    const slotCfg = getSlotConfigForItem(item);
    const usedSet = getUsedSlotOptionsSetForItem(item.id);
    if (val && usedSet.has(val)) {
      e.target.value = getSelectedSlotChoiceForItem(item);
      return;
    }
    if (!state.selectedSlotChoices || typeof state.selectedSlotChoices !== 'object') {
      state.selectedSlotChoices = {};
    }
    state.selectedSlotChoices[item.id] = val;
    syncSlotExampleCueUI(item, slotCfg, val);
    if (state.practiceMode) {
      renderPracticeSpanishWords(getDisplaySpanishForCurrentQuestion());
      if (val && Number(state.volume) > 0) {
        speakSpanish(getSpokenTextForCurrentQuestion());
      }
    } else if (!isTopicExamActive() && val && Number(state.volume) > 0) {
      speakSpanish(val);
    }
  });

  if (promptSubtextEl) {
    promptSubtextEl.addEventListener('click', (e) => {
      if (!state.practiceMode) return;
      const wordBtn = e.target.closest('.practice-word-btn');
      if (!wordBtn) return;
      const word = wordBtn.dataset.practiceWord || wordBtn.textContent || '';
      if (!word) return;
      if (checkZeroVolumePrompt()) return;
      promptSubtextEl.querySelectorAll('.practice-word-btn.practice-word-active').forEach((el) => {
        el.classList.remove('practice-word-active');
      });
      wordBtn.classList.add('practice-word-active');
      speakSpanish(word, 0.85);
      setTimeout(() => {
        wordBtn.classList.remove('practice-word-active');
      }, 900);
    });
  }

  document.getElementById('practice-new-variation-btn')?.addEventListener('click', () => {
    handleHandsFreeManualInteraction('manual-interaction');
    cycleDynamicVariationInPractice();
  });

  document.getElementById('practice-next-btn')?.addEventListener('click', () => {
    advancePracticeNextWord();
  });

  if (weakDrillExitBtn) {
    weakDrillExitBtn.addEventListener('click', () => {
      state.weakDrillActive = false;
      state.polishDrillActive = false;
      state.revisionDrillActive = false;
      syncWeakDrillBannerUI();
      loadQuestion();
    });
  }

  // Progress Export / Import JSON inside Settings -> Developer Tools
  const exportProgressBtn = document.getElementById('export-progress-btn');
  const importProgressBtn = document.getElementById('import-progress-btn');
  const importProgressFileInput = document.getElementById('import-progress-file-input');
  const progressBackupStatusEl = document.getElementById('progress-backup-status');

  const setBackupStatus = (msg, isError = false) => {
    if (!progressBackupStatusEl) return;
    progressBackupStatusEl.textContent = msg;
    progressBackupStatusEl.style.color = isError ? 'var(--danger)' : 'var(--success)';
  };

  if (exportProgressBtn) {
    exportProgressBtn.addEventListener('click', () => {
      try {
        const payload = buildProgressExportPayload();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `panamanian-spanish-progress-${getLocalDateKey()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setBackupStatus('Progress exported.');
      } catch {
        setBackupStatus('Export failed.', true);
      }
    });
  }

  if (importProgressBtn && importProgressFileInput) {
    importProgressBtn.addEventListener('click', () => {
      importProgressFileInput.value = '';
      importProgressFileInput.click();
    });
    importProgressFileInput.addEventListener('change', async () => {
      const file = importProgressFileInput.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const res = importProgressPayload(parsed);
        if (!res.ok) {
          setBackupStatus(res.error || 'Invalid backup file.', true);
          return;
        }
        state.weakDrillActive = false;
        state.polishDrillActive = false;
        state.revisionDrillActive = false;
        if (!isCategoryUnlocked(state.activeCategory)) {
          state.activeCategory = getHighestUnlockedCategoryId();
        }
        state.reviewFilterCat = state.activeCategory;
        if (speedSelectEl) speedSelectEl.value = String(state.speed);
        syncPanamaSettingsUI();
        syncSpeechPreferencesUI();
        syncWeakDrillBannerUI();
        updateDailyGoalUI();
        renderCategoryNav();
        renderPlayCategoryState();
        syncProgressionUI();
        renderPathView();
        renderStatsCalendar();
        if (state.activeView === 'play') {
          loadQuestion();
        }
        setBackupStatus(`Imported (${res.totalAnswered} answers).`);
      } catch {
        setBackupStatus('Could not read JSON file.', true);
      }
    });
  }

  function isAnyLearnOverlayOpen() {
    const overlayIds = [
      'topic-educate-modal-backdrop',
      'speech-error-modal-backdrop',
      'reintroduce-skill-modal-backdrop',
      'skip-stage-modal-backdrop',
      'stage-complete-award-modal-backdrop',
      'next-stage-preview-modal-backdrop',
      'topic-exam-failed-modal-backdrop',
      'browser-warning-modal-backdrop',
      'subject-complete-modal-backdrop',
      'muted-audio-modal-backdrop',
      'word-intro-modal-backdrop',
      'stage-seen-modal-backdrop',
      'settings-popover',
      'incorrect-screen-panel'
    ];
    return overlayIds.some((id) => {
      const el = document.getElementById(id);
      return Boolean(el && !el.classList.contains('hidden'));
    });
  }

  // In Learn mode, force Enter to ONLY activate "Next Word →" and never any other button or function.
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Enter') return;
      if (state.activeView !== 'play') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!isCategoryUnlocked(state.activeCategory)) return;
      if (isAnyLearnOverlayOpen()) return;
      const nextWordBtn = document.getElementById('practice-next-btn');
      const practiceBarEl = document.getElementById('practice-controls-bar');
      if (
        state.practiceMode &&
        nextWordBtn &&
        !nextWordBtn.disabled &&
        practiceBarEl &&
        !practiceBarEl.classList.contains('hidden')
      ) {
        advancePracticeNextWord();
      }
    },
    true
  );

  document.addEventListener('keydown', (e) => {
    if (
      topicEducateModalBackdropEl &&
      !topicEducateModalBackdropEl.classList.contains('hidden')
    ) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeTopicEducateModal({ markSeen: true });
      }
      return;
    }

    const openModalClosers = [
      { el: document.getElementById('speech-error-modal-backdrop'), close: closeSpeechErrorModal },
      { el: document.getElementById('reintroduce-skill-modal-backdrop'), close: closeReintroduceSkillModal },
      { el: document.getElementById('skip-stage-modal-backdrop'), close: closeSkipStageModal },
      { el: document.getElementById('stage-complete-award-modal-backdrop'), close: closeStageCompleteAwardModal },
      { el: document.getElementById('next-stage-preview-modal-backdrop'), close: closeNextStagePreviewModal },
      { el: document.getElementById('topic-exam-failed-modal-backdrop'), close: closeTopicExamFailedModal },
      { el: document.getElementById('browser-warning-modal-backdrop'), close: closeBrowserWarningModal },
      { el: subjectCompleteModalBackdropEl, close: closeSubjectCompleteModal },
      { el: mutedAudioModalBackdropEl, close: closeMutedAudioModal },
      { el: document.getElementById('word-intro-modal-backdrop'), close: () => closeWordIntroModal({ skipStage: false }) },
      { el: document.getElementById('stage-seen-modal-backdrop'), close: closeStageSeenModal },
      { el: settingsPopoverEl, close: closeSettingsPopover }
    ];
    for (const { el, close } of openModalClosers) {
      if (el && !el.classList.contains('hidden')) {
        if (e.key === 'Escape') {
          e.preventDefault();
          close();
        }
        return;
      }
    }

    if (
      e.key === 'Escape' &&
      !state.answered &&
      (voiceCaptureState.activeMode === 'question' || state.pttSpaceHeld)
    ) {
      e.preventDefault();
      if (state.pttSpaceHeld) {
        state.pttSpaceHeld = false;
        state.pttCancelledByEsc = true;
      }
      cancelActiveQuestionRecording('Pressed Escape while recording');
      if (isHandsFreeRunning()) {
        handleHandsFreeVoiceCommand('cancel', { expectedEs: getSpokenTextForCurrentQuestion() });
      }
      return;
    }

    if (e.key === 'Escape' && isHandsFreeRunning()) {
      e.preventDefault();
      pauseHandsFreeSession('user');
      return;
    }

    if (e.key === 'Escape' && closeUnitCogMenu()) {
      e.preventDefault();
      return;
    }

    if (e.key === 'Escape' && isSpeechConsoleOpen()) {
      e.preventDefault();
      closeSpeechConsole();
      return;
    }

    if (state.activeView !== 'play' || !isCategoryUnlocked(state.activeCategory)) return;

    if (e.altKey && !e.ctrlKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      toggleHandsFreeMode();
      return;
    }

    const ALT_ACCENT_MAP = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', n: 'ñ', y: 'ü' };
    if (
      e.altKey &&
      !e.ctrlKey &&
      !state.answered &&
      document.activeElement === answerInputEl &&
      ALT_ACCENT_MAP[e.key.toLowerCase()]
    ) {
      e.preventDefault();
      const ch = ALT_ACCENT_MAP[e.key.toLowerCase()];
      const start = answerInputEl.selectionStart ?? answerInputEl.value.length;
      const end = answerInputEl.selectionEnd ?? answerInputEl.value.length;
      const current = answerInputEl.value;
      answerInputEl.value = current.slice(0, start) + ch + current.slice(end);
      answerInputEl.setSelectionRange(start + 1, start + 1);
      return;
    }

    if (e.altKey && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      if (!state.answered && state.questionType === 'speak') {
        startVoiceCapture('question');
      }
      return;
    }

    if (e.altKey && e.key.toLowerCase() === 's') {
      if (
        state.questionType !== 'audio' &&
        state.questionType !== 'dictation' &&
        state.questionType !== 'speak'
      ) {
        return;
      }
      e.preventDefault();
      const incorrectPanelEl = document.getElementById('incorrect-screen-panel');
      const isIncorrectVisible = Boolean(incorrectPanelEl && !incorrectPanelEl.classList.contains('hidden'));
      const canRevealSpanish =
        state.questionType !== 'speak' ||
        state.practiceMode ||
        state.answered ||
        isIncorrectVisible ||
        (!isTopicExamActive() && (voiceCaptureState.attemptCount > 0 || voiceCaptureState.retryRoundUsed));
      if (!canRevealSpanish) {
        if (typeAnswerFeedbackEl) {
          typeAnswerFeedbackEl.textContent = isTopicExamActive()
            ? 'Spanish audio is locked during the Hard Topic Exam.'
            : 'Try Attempt 1 first before hearing Spanish.';
          typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-transcript');
          typeAnswerFeedbackEl.classList.add('is-warning');
        }
        return;
      }
      if (checkZeroVolumePrompt()) return;
      speakSpanish(getSpokenTextForCurrentQuestion(), e.shiftKey ? 0.68 : null);
      return;
    }

    // Spacebar in Hands-Free Mode: finish active speech immediately, or Pause/Resume Hands-Free
    if (
      (e.key === ' ' || e.code === 'Space') &&
      !e.repeat &&
      isHandsFreeActive() &&
      document.activeElement?.tagName !== 'INPUT' &&
      document.activeElement?.tagName !== 'TEXTAREA' &&
      document.activeElement?.tagName !== 'SELECT'
    ) {
      e.preventDefault();
      if (voiceCaptureState.activeMode === 'question' && handsFreeState.phase === 'recording') {
        stopActiveVoiceCapture({ fromVad: true });
      } else if (handsFreeState.phase === 'paused') {
        resumeHandsFreeSession();
      } else {
        pauseHandsFreeSession('user');
      }
      return;
    }

    if ((e.key === ' ' || e.code === 'Space') && state.answered) {
      const incorrectPanelEl = document.getElementById('incorrect-screen-panel');
      if (incorrectPanelEl && !incorrectPanelEl.classList.contains('hidden')) {
        return;
      }
      e.preventDefault();
      handlePauseProgressClick();
      return;
    }

    // Push-to-Talk: Hold Space to record, release Space to stop & score (Esc cancels without submitting)
    if (
      (e.key === ' ' || e.code === 'Space') &&
      !e.repeat &&
      !state.pttCancelledByEsc &&
      !state.answered &&
      !isAnyLearnOverlayOpen() &&
      state.questionType === 'speak' &&
      !voiceCaptureState.isScoring &&
      document.activeElement?.tagName !== 'INPUT' &&
      document.activeElement?.tagName !== 'TEXTAREA' &&
      document.activeElement?.tagName !== 'SELECT'
    ) {
      e.preventDefault();
      if (voiceCaptureState.activeMode !== 'question') {
        state.pttSpaceHeld = true;
        startVoiceCapture('question');
      }
      return;
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.code === 'Space') {
      if (state.pttCancelledByEsc) {
        state.pttCancelledByEsc = false;
        e.preventDefault();
        return;
      }
      if (state.pttSpaceHeld) {
        state.pttSpaceHeld = false;
        if (voiceCaptureState.activeMode === 'question') {
          e.preventDefault();
          stopActiveVoiceCapture();
        }
      }
    }
  });

  window.addEventListener('blur', () => {
    state.pttCancelledByEsc = false;
    if (state.pttSpaceHeld) {
      state.pttSpaceHeld = false;
      if (voiceCaptureState.activeMode === 'question') {
        stopActiveVoiceCapture();
      }
    }
  });
}

function initApp() {
  if (CURRICULUM_UNITS.length === 0) return;

  initAudioModule({
    getSpokenText: getSpokenTextForCurrentQuestion
  });

  initStudyTimer({
    onAchievementCheck: () => evaluateAllAchievements(),
    onTimeTick: () => updateDailyGoalUI()
  });

  initAchievements({
    onRenderPathView: () => {
      if (state.activeView === 'stats' && statsCalendarState.subView === 'achievements') {
        renderStatsAchievements();
      }
    }
  });

  initGuidebookModule({
    onCloseSettingsPopover: closeSettingsPopover,
    getSpokenText: getSpokenTextForCurrentQuestion,
    isHandsFreeRunning: isHandsFreeRunning,
    onOpenGuidebookView: () => {
      switchView('path');
    },
    onOpenGuidebookToCurrentStage: () => {
      const snap = getProgressionSnapshot(state.activeCategory);
      focusUnitAndStageInPathView(state.activeCategory, snap ? snap.stageIndex : 0);
      if (state.activeView === 'path') {
        renderPathView();
      } else {
        switchView('path');
      }
    },
    onAfterSkipStage: (result) => {
      if (result?.unlockedNextUnitId) {
        setPathExpandedUnitId(result.unlockedNextUnitId);
      }
      renderPathView();
    },
    onSlotChoiceChanged: () => {
      syncSlotOptionsDropdownUI();
      if (state.practiceMode) {
        renderPracticeSpanishWords(getDisplaySpanishForCurrentQuestion());
      }
    }
  });

  initProgressionModule({
    onRenderCategoryNav: renderCategoryNav,
    onRenderPathView: renderPathView,
    onRenderPlayCategoryState: renderPlayCategoryState,
    onSyncTopicEducateButtonUI: syncTopicEducateButtonUI,
    onSyncQuestionTypeUI: syncQuestionTypeUI,
    onSyncDirectionUI: syncDirectionUI,
    onLoadQuestion: loadQuestion,
    onSwitchCategory: switchCategory,
    onSwitchView: switchView,
    onStageSelected: ({ catId }) => {
      setPathExpandedUnitId(catId);
      resetExamQuantityScenarioPool();
      syncPanamaSettingsUI();
      updateTopMetrics();
      syncModeVisuals();
      syncWeakDrillBannerUI();
    },
    onHandsFreeStageComplete: handleHandsFreeStageComplete,
    onHandsFreeExamFailed: () => {
      pauseHandsFreeSession(
        'stage-complete',
        'Topic Exam finished below 90% — review your score and click Retake Exam.'
      );
    }
  });

  initHandsFree({
    getSpokenText: getSpokenTextForCurrentQuestion,
    getDisplayText: getDisplaySpanishForCurrentQuestion,
    getCurrentPromptMeta: () => ({
      categoryId: state.activeCategory,
      num: state.currentNum,
      context: state.currentContext,
      item: getActivePhraseData(),
      isPractice: Boolean(state.practiceMode),
      isExamStage: isTopicExamActive(),
      quantityMissCount:
        state.activeCategory === 'numbers' && state.currentContext?.isQuantity
          ? getQuantityScenarioMissCount(state.currentContext.quantityScenarioId)
          : 0
    }),
    isPlayViewUnlocked: () => state.activeView === 'play' && isCategoryUnlocked(state.activeCategory),
    onMarkWordIntroduced: markWordIntroducedInHandsFree,
    onStartRetryRound: startRetryRoundFromIncorrectScreen,
    onContinueFromIncorrect: continueFromIncorrectScreen,
    onSkipQuestion: skipCurrentQuestion,
    onPracticeAdvance: advancePracticeNextWord,
    onEnterGradedFromPractice: () => {
      state.practiceMode = false;
      hideIncorrectScreen();
      state.answered = false;
      resetExamQuantityScenarioPool();
      syncPracticeModeCardUI({ autoSpeak: false });
      loadQuestion();
    },
    onDismissStageModals: dismissStageProgressionModalsForHandsFree,
    onUpdateVolumeUI: updateVolumeUI,
    onSyncSpeechPreferencesUI: syncSpeechPreferencesUI
  });

  registerTrackingHooks({
    onUpdateProgression: updateProgressionOnAnswer,
    onEvaluateAchievements: (outcomeMeta) => evaluateAllAchievements({ outcome: outcomeMeta, recordActivity: true }),
    onUpdateTopMetrics: updateTopMetrics,
    onBuildStatsTable: buildStatsTable
  });

  initVoiceCapture({
    onEvaluateTypedAnswer: evaluateTypedAnswer,
    getSpokenText: getSpokenTextForCurrentQuestion,
    getDisplayText: getDisplaySpanishForCurrentQuestion,
    getExpectedSpanishAlternatives: () => {
      if (state.activeCategory !== 'numbers') {
        const item = getActivePhraseData();
        return item ? buildPhraseSpanishCandidates(item) : [];
      }
      const ctx = state.currentContext || buildQuestionContext(state.currentNum, state.contextMode);
      return [
        ctx.answerEs,
        ctx.spokenEs,
        ...(ctx.altAnswersEs || []),
        state.currentNum === 100 ? 'ciento' : ''
      ].filter(Boolean);
    },
    getSlotTemplate: () => {
      if (state.activeCategory === 'numbers') return null;
      return resolveActivePhraseItem()?.slotTemplate || null;
    },
    getQuestionSplit: getActiveQuestionSplit,
    resolveSpokenExtensionInfo: resolveSpokenExtensionInfo,
    onPracticeItemSpoken: (meta = {}) => {
      markStudyActivity();
      if (meta?.isCorrect && state.activeCategory !== 'numbers') {
        markSlotOptionsUsedForItem(resolveActivePhraseItem(), meta);
      }
      const res = markCurrentPracticeItemCompleted();
      evaluateAllAchievements({ recordActivity: true });
      return res;
    },
    onPracticeAdvance: () => {
      advancePracticeNextWord();
    },
    onAttemptFailed: () => {
      updateMemoryTipUI();
      syncSlotOptionsDropdownUI();
    },
    matchesExpectedSpanish: (heardText) => {
      const raw = String(heardText || '').trim();
      if (!raw) return false;
      if (checkCandidateAnswer(raw).isCorrect) return true;
      const expanded = expandSpokenDigitsToSpanish(raw);
      return Boolean(expanded && expanded !== raw && checkCandidateAnswer(expanded).isCorrect);
    },
    onRecordOutcome: recordGradedOutcome,
    onRecordPronunciationAttempt: recordPronunciationAttempt,
    onPlayCorrectSound: playCorrectSound,
    onPlayIncorrectSound: playIncorrectSound,
    onFullAnswerReward: triggerFullAnswerVisualReward,
    onClearFullAnswerReward: clearFullAnswerVisualReward,
    onStartFeedbackProgressBar: startFeedbackProgressBar,
    onPauseFeedbackForPlayback: () => {
      if (state.answered && !state.progressPaused) {
        handlePauseProgressClick();
      }
    },
    onShowIncorrectScreen: showIncorrectScreen,
    isHandsFreeRunning: isHandsFreeRunning,
    onHandsFreeSpeechOnset: handleHandsFreeSpeechOnset,
    onHandsFreeScoringStarted: handleHandsFreeScoringStarted,
    onHandsFreeAttempt1Fail: handleHandsFreeAttempt1Fail,
    onHandsFreeIncorrectScreen: handleHandsFreeIncorrectScreen,
    onHandsFreePracticeResult: handleHandsFreePracticeResult,
    onHandsFreeVoiceCommand: handleHandsFreeVoiceCommand,
    onHandsFreeNoSpeech: handleHandsFreeNoSpeech,
    onHandsFreeCaptureTooShort: handleHandsFreeCaptureTooShort,
    onHandsFreeScorerError: handleHandsFreeScorerError,
    onHandsFreeMicEnded: handleHandsFreeMicEnded,
    onManualVoiceAction: () => handleHandsFreeManualInteraction('manual-interaction'),
    isHardTopicExamActive: () => isTopicExamActive()
  });

  document.getElementById('incorrect-screen-next-btn')?.addEventListener('click', () => {
    continueFromIncorrectScreen();
  });
  document.getElementById('incorrect-screen-retry-btn')?.addEventListener('click', () => {
    startRetryRoundFromIncorrectScreen();
  });
  document.getElementById('incorrect-screen-play-spanish-btn')?.addEventListener('click', () => {
    handleHandsFreeManualInteraction('manual-interaction');
    if (checkZeroVolumePrompt()) return;
    speakSpanish(getSpokenTextForCurrentQuestion());
  });
  document.getElementById('incorrect-screen-play-slow-btn')?.addEventListener('click', () => {
    handleHandsFreeManualInteraction('manual-interaction');
    if (checkZeroVolumePrompt()) return;
    speakSpanish(getSpokenTextForCurrentQuestion(), 0.75);
  });
  document.getElementById('incorrect-screen-play-words-btn')?.addEventListener('click', () => {
    handleHandsFreeManualInteraction('manual-interaction');
    if (checkZeroVolumePrompt()) return;
    const spokenText = getSpokenTextForCurrentQuestion() || currentIncorrectDisplayText;
    const displayText = currentIncorrectDisplayText || getDisplaySpanishForCurrentQuestion();
    if (!spokenText) return;
    speakSpanishWordByWord(spokenText, {
      pauseMs: 650,
      rateOverride: 0.85,
      onWordStart: (activeIdx) => {
        const panelEl = document.getElementById('incorrect-screen-panel');
        if (!panelEl || panelEl.classList.contains('hidden')) return;
        renderIncorrectSpanishWords(displayText, activeIdx);
      },
      onDone: () => {
        const panelEl = document.getElementById('incorrect-screen-panel');
        if (!panelEl || panelEl.classList.contains('hidden')) return;
        renderIncorrectSpanishWords(currentIncorrectDisplayText || getDisplaySpanishForCurrentQuestion());
      }
    });
  });
  document.getElementById('incorrect-screen-answer')?.addEventListener('click', (e) => {
    const wordBtn = e.target.closest('.incorrect-word-btn');
    if (!wordBtn) return;
    const word = wordBtn.dataset.incorrectWord || wordBtn.textContent || '';
    if (!word) return;
    if (checkZeroVolumePrompt()) return;
    const answerEl = document.getElementById('incorrect-screen-answer');
    answerEl?.querySelectorAll('.incorrect-word-btn.practice-word-active').forEach((el) => {
      el.classList.remove('practice-word-active');
    });
    wordBtn.classList.add('practice-word-active');
    speakSpanish(word, 0.85);
    setTimeout(() => {
      wordBtn.classList.remove('practice-word-active');
    }, 900);
  });
  document.getElementById('incorrect-screen-play-mine-btn')?.addEventListener('click', (e) => {
    playLastSubmittedAudio(e.currentTarget);
  });
  document.getElementById('incorrect-screen-phonemes')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.phoneme-chip[data-sound]');
    if (!chip) return;
    const sound = chip.dataset.sound || chip.textContent || '';
    const detailEl = document.getElementById('incorrect-screen-detail');
    if (detailEl) {
      detailEl.textContent = `Sound "${sound}": ${getSoundCoachingTip(sound)}`;
    }
    if (!checkZeroVolumePrompt()) {
      const wordWrap = chip.closest('.pron-word[data-word-index]');
      const spokenPhrase = getSpokenTextForCurrentQuestion();
      const targetWord = wordWrap
        ? getSpokenWordAtIndex(spokenPhrase, wordWrap.dataset.wordIndex)
        : '';
      speakSpanish(targetWord || spokenPhrase, 0.75);
    }
  });

  initStatsView();
  registerPathViewHooks({
    onPracticeUnit: (unitId) => {
      state.weakDrillActive = false;
      state.polishDrillActive = false;
      state.revisionDrillActive = false;
      switchView('play');
      switchCategory(unitId);
    },
    onStartRevisionDrill: () => {
      const revList = getRevisionDrillItems();
      if (revList.length === 0) return;
      state.weakDrillActive = false;
      state.polishDrillActive = false;
      state.practiceMode = false;
      state.revisionDrillActive = true;
      switchView('play');
      syncWeakDrillBannerUI();
      loadQuestion();
    }
  });
  registerStatsViewHooks({
    onStartWeakDrill: () => {
      const targetCat =
        state.reviewFilterCat && state.reviewFilterCat !== 'all' && isCategoryUnlocked(state.reviewFilterCat)
          ? state.reviewFilterCat
          : state.activeCategory;
      switchView('play');
      if (targetCat !== state.activeCategory && isCategoryUnlocked(targetCat)) {
        switchCategory(targetCat);
      }
      state.practiceMode = false;
      state.polishDrillActive = false;
      state.weakDrillActive = true;
      syncWeakDrillBannerUI();
      loadQuestion();
    },
    onStartPolishDrill: () => {
      const targetCat =
        state.reviewFilterCat && state.reviewFilterCat !== 'all' && isCategoryUnlocked(state.reviewFilterCat)
          ? state.reviewFilterCat
          : state.activeCategory;
      switchView('play');
      if (targetCat !== state.activeCategory && isCategoryUnlocked(targetCat)) {
        switchCategory(targetCat);
      }
      state.practiceMode = false;
      state.weakDrillActive = false;
      state.polishDrillActive = true;
      syncWeakDrillBannerUI();
      loadQuestion();
    }
  });

  wireAppEventListeners();

  if (persisted.needsInitialSave) {
    savePersistedData();
  }
  syncSpeakOnlyModeUI();
  syncTrackingDisabledUI();
  if (!isCategoryUnlocked(state.activeCategory)) {
    state.activeCategory = getHighestUnlockedCategoryId();
  }
  state.reviewFilterCat = state.activeCategory;
  speedSelectEl.value = String(state.speed);
  if (state.progressionConfig && state.progressionConfig.enabled) {
    const numProg = getCategoryProgress('numbers');
    const activeNumStage = CATEGORIES.numbers.stages[numProg.stageIndex] || CATEGORIES.numbers.stages[0];
    state.contextMode = activeNumStage.contextMode;
    const initSnap = getProgressionSnapshot(state.activeCategory);
    state.direction = initSnap.phaseDirection;
    state.questionType = initSnap.phaseQuestionType;
  }
  syncPanamaSettingsUI();
  syncSpeechPreferencesUI();
  updateSrsDueBadge();
  syncWeakDrillBannerUI();
  refreshMicDeviceList();
  renderCategoryNav();
  renderPlayCategoryState();
  evaluateAllAchievements({ silent: true });
  syncProgressionUI();
  renderPathView();
  syncQuestionTypeUI();
  syncDirectionUI();
  updateVolumeUI();
  updateSfxUI();
  updateStudyTimerUI();
  updateDailyGoalUI();
  syncModeVisuals();
  updateTopMetrics();
  buildStatsTable();
  renderStatsCalendar();
  if (isCategoryUnlocked(state.activeCategory)) {
    maybeOpenNewTopicEducateModal(state.activeCategory);
    loadQuestion();
  }
  initBrowserCheck();
  initLiveReloadWatcher();
  initDisableCopyAndSelection();
}

function initDisableCopyAndSelection() {
  document.addEventListener('copy', (e) => {
    e.preventDefault();
  });
  document.addEventListener('cut', (e) => {
    e.preventDefault();
  });
  document.addEventListener('selectstart', (e) => {
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
  });
  document.addEventListener('keydown', (e) => {
    const key = String(e.key || '').toLowerCase();
    const tag = e.target?.tagName;
    if ((e.ctrlKey || e.metaKey) && key === 'a' && (tag === 'INPUT' || tag === 'TEXTAREA')) {
      return;
    }
    if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'a'].includes(key)) {
      e.preventDefault();
    }
  });
}

function initLiveReloadWatcher() {
  const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!isLocalHost || location.port !== '8001') return;

  let baselineVersion = null;
  let pendingReload = false;
  let timerId = null;

  const poll = async () => {
    try {
      const res = await fetch('/__reload', { cache: 'no-store' });
      if (!res.ok) {
        if (timerId) clearInterval(timerId);
        return;
      }
      const data = await res.json();
      const ver = String(data?.version || '');
      if (!ver) return;
      if (baselineVersion === null) {
        baselineVersion = ver;
        return;
      }
      if (ver !== baselineVersion) {
        pendingReload = true;
      }
      if (pendingReload && !voiceCaptureState.activeMode && !voiceCaptureState.isScoring && !isHandsFreeBusy()) {
        window.location.reload();
      }
    } catch {
      // Ignore transient disconnects during server restart
    }
  };

  poll();
  timerId = setInterval(poll, 1500);
}

initApp();
