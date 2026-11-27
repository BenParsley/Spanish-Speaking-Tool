import {
  CATEGORIES,
  CATEGORY_ORDER,
  NUMBER_MAX,
  NUMBER_MIN,
  SPANISH_NUMBERS,
  getActiveCategoryMeta,
  getItemsForStage,
  getNextCategoryInOrder,
  getNumbersStageVocabRows,
  getSlotConfigForItem,
  getStructureVariationCount
} from '../curriculum/index.js';
import {
  dailyGoalFooterEl,
  dailyGoalMilestoneEl,
  hudProgressionFillEl,
  hudStageTitleEl,
  stageProgressionHudEl,
  subjectCompleteDescEl,
  subjectCompleteModalBackdropEl,
  subjectCompleteNextBtn,
  subjectCompleteStayBtn,
  subjectCompleteTitleEl
} from './dom.js';
import {
  PRESET_SKILL_MAX_ATTEMPTS,
  PRESET_STAGE_THRESHOLD,
  PRESET_VOLUME_MULTIPLIER,
  PRESET_WINDOW_MULTIPLIER,
  SKILL_META,
  SKILL_PILLARS,
  STAGE_ITEM_MIN_CORRECT,
  STAGE_PHRASE_MULTIPLIER,
  TOPIC_EXAM_MIN_ACCURACY,
  TOPIC_EXAM_QUESTION_COUNT,
  createDefaultProgressionConfig,
  createEmptySkillsMap,
  getNumbersStageEffectiveItemCount,
  getStageSkillTargets,
  normalizeProgressionConfig,
  normalizeSkillsMap
} from './progression-core.js';
import {
  getActiveSkillPillars,
  getHighestUnlockedCategoryId,
  getPreviousBlockingCategory,
  isCategoryCompleted,
  isCategoryUnlocked,
  isTrackingDisabled,
  isVocabItemProficient,
  savePersistedData,
  state
} from './state.js';
import { normalizeSeenSkills } from './tracking-schema.js';
import { escapeHtmlText } from './utils.js';

let pendingSubjectNextId = null;
let pendingAwardFollowup = null;
let pendingReintroduceSkillKey = null;
let progressionMilestoneTimer = null;

function flashProgressionMilestone(message) {
  if (!dailyGoalMilestoneEl || !dailyGoalFooterEl || !message) return;
  if (progressionMilestoneTimer !== null) {
    clearTimeout(progressionMilestoneTimer);
    progressionMilestoneTimer = null;
  }
  dailyGoalMilestoneEl.textContent = message;
  dailyGoalFooterEl.classList.remove('is-milestone');
  void dailyGoalFooterEl.offsetWidth;
  dailyGoalFooterEl.classList.add('is-milestone');
  progressionMilestoneTimer = setTimeout(() => {
    dailyGoalFooterEl.classList.remove('is-milestone');
    progressionMilestoneTimer = null;
  }, 1500);
}

let progressionHooks = {
  onRenderCategoryNav: () => { },
  onRenderPathView: () => { },
  onRenderPlayCategoryState: () => { },
  onSyncTopicEducateButtonUI: () => { },
  onSyncQuestionTypeUI: () => { },
  onSyncDirectionUI: () => { },
  onLoadQuestion: () => { },
  onSwitchCategory: () => { },
  onSwitchView: () => { },
  onStageSelected: () => { },
  onHandsFreeStageComplete: () => false,
  onHandsFreeExamFailed: () => { }
};

export function registerProgressionHooks(hooks = {}) {
  progressionHooks = { ...progressionHooks, ...hooks };
}

export function getCategoryProgress(catId = state.activeCategory) {
  const cat = getActiveCategoryMeta(catId);
  if (!state.categoryProgress[cat.id]) {
    state.categoryProgress[cat.id] = {
      stageIndex: 0,
      stageCorrect: 0,
      stageTotal: 0,
      skills: createEmptySkillsMap(),
      stageSkills: {},
      completedStages: [],
      skippedStages: []
    };
  }
  const prog = state.categoryProgress[cat.id];
  if (!Array.isArray(prog.skippedStages)) {
    prog.skippedStages = [];
  }
  if (!prog.skills) {
    const threshold = state.progressionConfig?.threshold || PRESET_STAGE_THRESHOLD;
    prog.skills = normalizeSkillsMap(
      null,
      prog.stageCorrect || 0,
      prog.stageTotal || 0,
      threshold
    );
  }
  if (!prog.stageSkills || typeof prog.stageSkills !== 'object') {
    prog.stageSkills = {};
  }
  if (!prog.stageRecentOutcomes || typeof prog.stageRecentOutcomes !== 'object') {
    prog.stageRecentOutcomes = {};
  }
  return prog;
}

export function getStageSeenProgress(catId, stageIndex) {
  const activePillars = getActiveSkillPillars();
  if (catId === 'numbers') {
    if (stageIndex !== 0) {
      return { seenCount: 0, totalCount: 0 };
    }
    let seenCount = 0;
    for (let n = NUMBER_MIN; n <= NUMBER_MAX; n += 1) {
      const entry = state.counts?.[n];
      const seen = normalizeSeenSkills(entry?.seenSkills, entry?.streaks);
      if (activePillars.every((k) => seen[k])) {
        seenCount += 1;
      }
    }
    return { seenCount, totalCount: NUMBER_MAX - NUMBER_MIN + 1 };
  }
  const items = getItemsForStage(catId, stageIndex);
  if (!items || items.length === 0) {
    return { seenCount: 0, totalCount: 0 };
  }
  let seenCount = 0;
  items.forEach((item) => {
    const entry = state.phraseCounts?.[item.id];
    const seen = normalizeSeenSkills(entry?.seenSkills, entry?.streaks);
    if (activePillars.every((k) => seen[k])) {
      seenCount += 1;
    }
  });
  return { seenCount, totalCount: items.length };
}

export function getStageMasteryStatus(catId, stageIndex) {
  const { seenCount, totalCount } = getStageSeenProgress(catId, stageIndex);
  const seenComplete = totalCount === 0 || seenCount >= totalCount;
  return { seenCount, totalCount, seenComplete };
}

export function getStageItemCorrectProgress(catId, stageIndex) {
  if (catId === 'numbers') {
    return { hasItems: false, totalItems: 0, readyItems: 0, remainingItems: 0, allReady: true };
  }
  const items = getItemsForStage(catId, stageIndex);
  if (!items || items.length === 0) {
    return { hasItems: false, totalItems: 0, readyItems: 0, remainingItems: 0, allReady: true };
  }
  let readyItems = 0;
  items.forEach((item) => {
    const c = Math.max(0, Number(state.phraseCounts?.[item.id]?.correct) || 0);
    if (c >= STAGE_ITEM_MIN_CORRECT) {
      readyItems += 1;
    }
  });
  const totalItems = items.length;
  const remainingItems = Math.max(0, totalItems - readyItems);
  return {
    hasItems: true,
    totalItems,
    readyItems,
    remainingItems,
    allReady: remainingItems === 0
  };
}

export function getStageVocabRows(catId, stageIndex) {
  if (catId !== 'numbers') {
    const items = getItemsForStage(catId, stageIndex);
    return items.map((item) => {
      const entry = state.phraseCounts?.[item.id];
      const correct = Math.max(0, Number(entry?.correct) || 0);
      const total = correct + Math.max(0, Number(entry?.incorrect) || 0);
      const varCount = item.structure ? getStructureVariationCount(item) : 0;
      const slotCfg = !item.structure ? getSlotConfigForItem(item) : null;
      const optCount = slotCfg?.slotType === 'spanish_options' ? (slotCfg.options?.length || 0) : 0;
      let practicedVariations = 0;
      let variationCount = 0;
      let variationKind = null;
      if (varCount > 1) {
        variationCount = varCount;
        variationKind = 'structure';
        const fStats = state.structureFillStats?.[item.id] || {};
        practicedVariations = Object.values(fStats).filter(
          (st) => (Number(st?.c) || 0) + (Number(st?.i) || 0) > 0
        ).length;
      } else if (optCount > 1) {
        variationCount = optCount;
        variationKind = 'options';
        const usedArr = Array.isArray(state.usedSlotOptionsByItem?.[item.id]) ? state.usedSlotOptionsByItem[item.id] : [];
        practicedVariations = usedArr.length;
      }
      return {
        itemId: item.id,
        item,
        introKey: item.id,
        es: item.structure?.patternEs || item.es,
        en:
          varCount > 1
            ? (item.structure?.patternEn || item.en)
            : item.en,
        variationCount,
        practicedVariations,
        variationKind,
        isProficient: isVocabItemProficient(entry),
        correct,
        total
      };
    });
  }

  return getNumbersStageVocabRows(stageIndex, {
    counts: state.counts,
    isProficientFn: isVocabItemProficient
  });
}

export function getProgressionSnapshot(catId = state.activeCategory) {
  const category = getActiveCategoryMeta(catId);
  const progress = getCategoryProgress(category.id);
  const config = state.progressionConfig || createDefaultProgressionConfig();
  const isUnlocked = isCategoryUnlocked(category.id);
  const blockingCat = !isUnlocked ? getPreviousBlockingCategory(category.id) : null;
  const stages = category.stages;
  const totalStages = stages.length;
  const stageIndex = Math.min(totalStages - 1, Math.max(0, progress.stageIndex));
  const stage = stages[stageIndex] || stages[0];
  const stageNum = stageIndex + 1;
  const isFinalStage = stageIndex >= totalStages - 1;
  const nextStage = !isFinalStage ? stages[stageIndex + 1] : null;
  const nextSubject = getNextCategoryInOrder(category.id);
  const stageWordCount =
    category.id === 'numbers'
      ? getNumbersStageEffectiveItemCount(stageIndex)
      : getItemsForStage(category.id, stageIndex).length;
  const isExamStage = Boolean(stage?.isExam);
  const safeCfg = normalizeProgressionConfig(config);
  const topicOverride = safeCfg.perTopicOverrides?.[category.id] || null;
  const minAccuracy = isExamStage
    ? TOPIC_EXAM_MIN_ACCURACY
    : (topicOverride?.minAccuracy ?? safeCfg.minAccuracy);
  const volumeMult = topicOverride?.volumeMultiplier ?? safeCfg.volumeMultiplier ?? PRESET_VOLUME_MULTIPLIER;
  const windowMult = topicOverride?.windowMultiplier ?? safeCfg.windowMultiplier ?? PRESET_WINDOW_MULTIPLIER;
  const baseTargets = getStageSkillTargets(safeCfg.threshold);
  const isSpeakOnly = Boolean(state.speakOnlyMode);
  const activePillars = getActiveSkillPillars(isSpeakOnly);

  const rawRecent = Array.isArray(progress.recentOutcomes) ? progress.recentOutcomes : [];
  const skills = {};
  activePillars.concat(SKILL_PILLARS.filter((k) => !activePillars.includes(k))).forEach((key) => {
    const raw = progress.skills && progress.skills[key] ? progress.skills[key] : { correct: 0, total: 0 };
    const total = Math.max(0, Math.floor(Number(raw.total) || 0));
    const correct = Math.min(total, Math.max(0, Math.floor(Number(raw.correct) || 0)));
    const target = isExamStage
      ? TOPIC_EXAM_QUESTION_COUNT
      : stageWordCount > 0
        ? Math.max(8, Math.round(stageWordCount * volumeMult))
        : baseTargets[key];
    const rollingWindowSize = isExamStage
      ? TOPIC_EXAM_QUESTION_COUNT
      : stageWordCount > 0
        ? Math.max(8, Math.round(stageWordCount * windowMult))
        : Math.max(12, Math.round(baseTargets[key] * 0.75));
    const maxAttempts = isExamStage
      ? TOPIC_EXAM_QUESTION_COUNT
      : Math.max(30, target + 15);
    // Always evaluate regular stage accuracy on the recent rolling window whenever recent outcomes exist
    const useRolling = !isExamStage && rawRecent.length > 0;
    const rollingWin = useRolling ? rawRecent.slice(-rollingWindowSize) : [];
    const rollingCorrect = useRolling ? rollingWin.filter(Boolean).length : correct;
    const rollingTotal = useRolling ? rollingWin.length : total;
    const acc = rollingTotal > 0 ? (rollingCorrect / rollingTotal) * 100 : 0;
    const accRounded = Math.round(acc);
    const accuracyMet = isExamStage
      ? total >= TOPIC_EXAM_QUESTION_COUNT && acc >= TOPIC_EXAM_MIN_ACCURACY
      : rollingTotal > 0 && acc >= minAccuracy;
    const proficient = isExamStage ? accuracyMet : correct >= target && accuracyMet;
    const requiredCorrectForExam = Math.ceil((TOPIC_EXAM_MIN_ACCURACY / 100) * TOPIC_EXAM_QUESTION_COUNT);
    const correctRemaining = isExamStage
      ? Math.max(0, requiredCorrectForExam - correct)
      : Math.max(0, target - correct);
    let consecutiveNeededForAcc = 0;
    if (!isExamStage && rollingTotal > 0 && acc < minAccuracy) {
      if (useRolling) {
        const sim = rollingWin.slice();
        while (consecutiveNeededForAcc < rollingWindowSize) {
          consecutiveNeededForAcc += 1;
          sim.push(true);
          if (sim.length > rollingWindowSize) sim.shift();
          const sc = sim.filter(Boolean).length;
          if ((sc / sim.length) * 100 >= minAccuracy) break;
        }
      } else {
        consecutiveNeededForAcc = Math.max(
          1,
          Math.ceil((minAccuracy * total - 100 * correct) / (100 - minAccuracy))
        );
      }
    }
    const streakNeeded = isExamStage
      ? Math.max(0, TOPIC_EXAM_QUESTION_COUNT - total)
      : proficient
        ? 0
        : Math.max(correctRemaining, consecutiveNeededForAcc);
    const pct = proficient
      ? 100
      : isExamStage
        ? Math.min(99, Math.round((total / TOPIC_EXAM_QUESTION_COUNT) * 100))
        : Math.min(95, Math.round((correct / Math.max(1, target)) * 100));

    skills[key] = {
      key,
      label: SKILL_META[key].label,
      shortLabel: SKILL_META[key].shortLabel,
      correct,
      total,
      target,
      maxAttempts,
      acc,
      accRounded,
      useRolling,
      rollingWindowSize,
      stageItemCount: stageWordCount,
      accuracyMet,
      proficient,
      correctRemaining,
      consecutiveNeededForAcc,
      streakNeeded,
      pct
    };
  });

  const threshold = activePillars.reduce((sum, key) => sum + skills[key].target, 0);
  const targets = activePillars.reduce((acc, key) => {
    acc[key] = skills[key].target;
    return acc;
  }, {});

  const stageCorrect = activePillars.reduce((sum, key) => sum + skills[key].correct, 0);
  const stageTotal = activePillars.reduce((sum, key) => sum + skills[key].total, 0);
  const effectiveCorrect = activePillars.reduce(
    (sum, key) =>
      sum + (skills[key].proficient ? skills[key].target : Math.min(skills[key].correct, skills[key].target)),
    0
  );
  const primarySkill = skills[activePillars[0]] || skills.speak;
  const acc = !isExamStage && primarySkill?.useRolling
    ? primarySkill.acc
    : stageTotal > 0 ? (stageCorrect / stageTotal) * 100 : 0;
  const accRounded = Math.round(acc);
  const examComplete = Boolean(isExamStage && stageTotal >= TOPIC_EXAM_QUESTION_COUNT);
  const examPassed = Boolean(examComplete && acc >= TOPIC_EXAM_MIN_ACCURACY);
  const examFailed = Boolean(examComplete && !examPassed);
  const accuracyMet = isExamStage ? examPassed : stageTotal > 0 && acc >= minAccuracy;
  const allSkillsProficient = activePillars.every((key) => skills[key].proficient);
  const itemGate = getStageItemCorrectProgress(category.id, stageIndex);
  const canCompleteStage = allSkillsProficient;

  const completedStages = Array.isArray(progress.completedStages) ? progress.completedStages : [];
  const isCompletedFinal =
    isUnlocked &&
    isFinalStage &&
    (completedStages.includes(stageIndex) || canCompleteStage);

  const turnStart = Number.isInteger(progress.skillTurn)
    ? ((progress.skillTurn % activePillars.length) + activePillars.length) % activePillars.length
    : stageTotal % activePillars.length;

  let activeSkillKey = activePillars[turnStart];
  if (!isCompletedFinal) {
    for (let offset = 0; offset < activePillars.length; offset += 1) {
      const candidateKey = activePillars[(turnStart + offset) % activePillars.length];
      if (!skills[candidateKey].proficient) {
        activeSkillKey = candidateKey;
        break;
      }
    }
  }
  const activeSkill = skills[activeSkillKey];
  const activeMeta = SKILL_META[activeSkillKey];
  const activeIdx = Math.max(0, activePillars.indexOf(activeSkillKey));
  const phaseNum = activeIdx + 1;
  const phaseShort = activeMeta.shortLabel;
  const phaseLabel = `Step ${phaseNum}/${activePillars.length}: ${activeMeta.label}`;
  const phaseDirection =
    activeSkillKey === 'read' || activeSkillKey === 'listen' ? 'es-to-num' : 'num-to-es';
  const phaseQuestionType =
    activeSkillKey === 'speak'
      ? 'speak'
      : activeSkillKey === 'listen'
        ? category.id === 'numbers' && stageIndex === 0 && skills.listen.total % 3 === 2
          ? 'dictation'
          : 'audio'
        : 'text';

  const correctRemaining = Math.max(0, threshold - effectiveCorrect);
  const correctPct = isCompletedFinal || canCompleteStage
    ? 100
    : isExamStage
      ? Math.min(99, Math.round((stageTotal / TOPIC_EXAM_QUESTION_COUNT) * 100))
      : Math.min(99, Math.round((effectiveCorrect / Math.max(1, threshold)) * 100));

  let tone = 'normal';
  let hudReqText = '';
  let detailedReqText = '';

  if (!isUnlocked) {
    tone = 'warn';
    const blockerName = blockingCat ? blockingCat.label : 'previous unit';
    hudReqText = `Locked · Complete ${blockerName}`;
    detailedReqText = `Locked. Complete ${blockerName} first.`;
  } else if (isCompletedFinal) {
    tone = 'done';
    hudReqText = `Unit complete · ${stageCorrect}/${stageTotal} (${accRounded}%)`;
    detailedReqText = nextSubject
      ? `Completed. ${nextSubject.label} is unlocked.`
      : 'All 8 CEFR A1 units complete.';
  } else if (isExamStage) {
    const neededCorrect = Math.ceil((TOPIC_EXAM_MIN_ACCURACY / 100) * TOPIC_EXAM_QUESTION_COUNT);
    const unlockTarget = nextSubject ? nextSubject.label : 'A1 Certificate';
    tone = examFailed || (stageTotal > 0 && acc < TOPIC_EXAM_MIN_ACCURACY) ? 'warn' : 'normal';
    hudReqText = `To pass Final Exam & unlock ${unlockTarget}: ${neededCorrect}/${TOPIC_EXAM_QUESTION_COUNT} correct (≥${TOPIC_EXAM_MIN_ACCURACY}%) · Now ${stageCorrect}/${stageTotal} (${accRounded}%)`;
    detailedReqText = `Final Exam across all stages · ${TOPIC_EXAM_QUESTION_COUNT} questions, 1 try each, no hints · ${TOPIC_EXAM_MIN_ACCURACY}% required.`;
  } else {
    const nextStageLabel = nextStage
      ? nextStage.isExam
        ? 'Final Exam'
        : `Stage ${stageNum + 1} (${nextStage.shortTitle})`
      : nextSubject
        ? nextSubject.label
        : 'A1 Cert';
    const accLabel = activeSkill.useRolling
      ? `recent accuracy (last ${activeSkill.rollingWindowSize})`
      : 'accuracy';

    if (correctRemaining > 0 && (stageTotal === 0 || accuracyMet)) {
      tone = 'normal';
      const accBit = stageTotal > 0 ? ` · ${accRounded}% / ${minAccuracy}% ✓` : ` & ≥${minAccuracy}% ${accLabel}`;
      hudReqText = `To unlock ${nextStageLabel}: ${correctRemaining} more correct (${activeSkill.correct}/${activeSkill.target})${accBit}`;
    } else if (activeSkill.correctRemaining === 0 && !activeSkill.accuracyMet) {
      tone = 'warn';
      hudReqText = `To unlock ${nextStageLabel}: ${activeSkill.target}/${activeSkill.target} correct ✓ · Need ≥${minAccuracy}% ${accLabel} (now ${activeSkill.accRounded}% — ${activeSkill.consecutiveNeededForAcc} more right)`;
    } else {
      tone = 'warn';
      hudReqText = `To unlock ${nextStageLabel}: ${correctRemaining} more correct (${activeSkill.correct}/${activeSkill.target}) & ≥${minAccuracy}% ${accLabel} (now ${activeSkill.accRounded}%)`;
    }

    detailedReqText = isSpeakOnly
      ? `Speak-Only · Current: ${activeMeta.label} (${activeSkill.correct}/${activeSkill.target}).`
      : `Rotating Read → Write → Listen → Speak · Current: ${activeMeta.label} (${activeSkill.correct}/${activeSkill.target}).`;
  }

  return {
    category,
    progress,
    config,
    isUnlocked,
    blockingCat,
    stages,
    totalStages,
    stageIndex,
    stageNum,
    stage,
    nextStage,
    nextSubject,
    isFinalStage,
    isExamStage,
    examComplete,
    examPassed,
    examFailed,
    examQuestionCount: TOPIC_EXAM_QUESTION_COUNT,
    isCompletedFinal,
    threshold,
    minAccuracy,
    targets,
    skills,
    activeSkillKey,
    activeSkill,
    allSkillsProficient,
    itemGate,
    canCompleteStage,
    phaseNum,
    phaseShort,
    phaseLabel,
    phaseDirection,
    phaseQuestionType,
    stageCorrect,
    stageTotal,
    effectiveCorrect,
    acc,
    accRounded,
    correctRemaining,
    correctPct,
    accuracyMet,
    tone,
    hudReqText,
    detailedReqText
  };
}

export function isTopicExamActive(catId = state.activeCategory) {
  const snap = getProgressionSnapshot(catId);
  return Boolean(snap.isUnlocked && snap.isExamStage && !snap.isCompletedFinal);
}

export function getA1OverallProgress() {
  let completedUnits = 0;
  let completedStages = 0;
  let totalStages = 0;
  const activePillars = getActiveSkillPillars();
  const skillDoneStages = { read: 0, write: 0, listen: 0, speak: 0 };

  CATEGORY_ORDER.forEach((catId) => {
    const cat = CATEGORIES[catId];
    if (!cat) return;
    const stageCount = cat.stages.length;
    totalStages += stageCount;
    if (isCategoryCompleted(catId)) {
      completedUnits += 1;
      completedStages += stageCount;
      activePillars.forEach((k) => {
        skillDoneStages[k] += stageCount;
      });
    } else if (isCategoryUnlocked(catId)) {
      const prog = getCategoryProgress(catId);
      const completedSet = new Set(Array.isArray(prog.completedStages) ? prog.completedStages : []);
      const doneCount = Math.min(stageCount, completedSet.size);
      completedStages += doneCount;
      const snap = getProgressionSnapshot(catId);
      activePillars.forEach((k) => {
        const currentDone = !completedSet.has(snap.stageIndex) && snap.skills[k]?.proficient ? 1 : 0;
        skillDoneStages[k] += Math.min(stageCount, doneCount + currentDone);
      });
    }
  });

  const pct = totalStages > 0 ? Math.min(100, Math.round((completedStages / totalStages) * 100)) : 0;
  return {
    completedUnits,
    totalUnits: CATEGORY_ORDER.length,
    completedStages,
    totalStages,
    pct,
    skillDoneStages
  };
}

export function syncProgressionUI() {
  const activeSnap = getProgressionSnapshot();

  const examBannerEl = document.getElementById('topic-exam-banner');
  if (examBannerEl) {
    const showExamBanner = Boolean(
      activeSnap.isUnlocked && activeSnap.isExamStage && !activeSnap.isCompletedFinal
    );
    examBannerEl.classList.toggle('hidden', !showExamBanner);
    if (showExamBanner) {
      const neededCorrect = Math.ceil((TOPIC_EXAM_MIN_ACCURACY / 100) * TOPIC_EXAM_QUESTION_COUNT);
      const qCount = Math.min(activeSnap.stageTotal, TOPIC_EXAM_QUESTION_COUNT);
      const scoreBit =
        activeSnap.stageTotal > 0
          ? `Score: ${activeSnap.stageCorrect}/${activeSnap.stageTotal} (${activeSnap.accRounded}%)`
          : `Score: 0/0`;
      examBannerEl.textContent = `Hard Topic Exam · Question ${qCount}/${TOPIC_EXAM_QUESTION_COUNT} · ${scoreBit} · ${TOPIC_EXAM_MIN_ACCURACY}% (${neededCorrect}+) required · 1 attempt · No hints`;
      examBannerEl.classList.toggle(
        'is-danger',
        activeSnap.stageTotal > 0 && activeSnap.acc < TOPIC_EXAM_MIN_ACCURACY
      );
    }
  }

  if (stageProgressionHudEl && activeSnap.isUnlocked) {
    const formattedTopicTitle = String(activeSnap.category.label || '').replace(/^(A\d+\.\d+)\s+/, '$1 - ');
    const stageShort = activeSnap.stage?.shortTitle || activeSnap.stage?.label || `Stage ${activeSnap.stageNum}`;
    hudStageTitleEl.textContent = `${formattedTopicTitle} · ${activeSnap.isExamStage ? stageShort : `Stage ${activeSnap.stageNum}: ${stageShort}`}`;
    hudStageTitleEl.title = 'Click to open Guidebook and switch freely to any stage';
    hudStageTitleEl.removeAttribute('aria-expanded');
    if (hudProgressionFillEl) {
      hudProgressionFillEl.style.width = `${activeSnap.correctPct}%`;
    }
  }

  progressionHooks.onRenderCategoryNav();
  progressionHooks.onRenderPathView();
  progressionHooks.onSyncTopicEducateButtonUI(state.activeCategory);
}

export function openSubjectCompleteModal(completedCatId) {
  if (!subjectCompleteModalBackdropEl) return;
  const completedCat = CATEGORIES[completedCatId];
  const nextCat = getNextCategoryInOrder(completedCatId);
  pendingSubjectNextId = nextCat ? nextCat.id : null;

  if (nextCat) {
    if (subjectCompleteTitleEl) {
      subjectCompleteTitleEl.textContent = `${completedCat.label} Complete`;
    }
    if (subjectCompleteDescEl) {
      subjectCompleteDescEl.textContent = `${completedCat.label} finished. ${nextCat.label} is unlocked.`;
    }
    if (subjectCompleteNextBtn) {
      subjectCompleteNextBtn.textContent = `Start ${nextCat.label} →`;
      subjectCompleteNextBtn.classList.remove('hidden');
    }
    if (subjectCompleteStayBtn) {
      subjectCompleteStayBtn.textContent = 'Keep Practicing';
    }
  } else {
    if (subjectCompleteTitleEl) {
      subjectCompleteTitleEl.textContent = 'CEFR A1 Complete';
    }
    if (subjectCompleteDescEl) {
      subjectCompleteDescEl.textContent =
        'All 8 Panamanian Spanish A1 units complete.';
    }
    if (subjectCompleteNextBtn) {
      subjectCompleteNextBtn.classList.add('hidden');
    }
    if (subjectCompleteStayBtn) {
      subjectCompleteStayBtn.textContent = 'Continue';
    }
  }

  subjectCompleteModalBackdropEl.classList.remove('hidden');
}

export function isBlockingProgressionModalOpen() {
  const awardEl = document.getElementById('stage-complete-award-modal-backdrop');
  const nextEl = document.getElementById('next-stage-preview-modal-backdrop');
  const examFailEl = document.getElementById('topic-exam-failed-modal-backdrop');
  return Boolean(
    (awardEl && !awardEl.classList.contains('hidden')) ||
    (nextEl && !nextEl.classList.contains('hidden')) ||
    (examFailEl && !examFailEl.classList.contains('hidden')) ||
    (subjectCompleteModalBackdropEl && !subjectCompleteModalBackdropEl.classList.contains('hidden'))
  );
}

export function openTopicExamFailedModal({
  catId,
  stageLabel,
  stageCorrect,
  stageTotal,
  accRounded
}) {
  const backdropEl = document.getElementById('topic-exam-failed-modal-backdrop');
  const titleEl = document.getElementById('topic-exam-failed-title');
  const descEl = document.getElementById('topic-exam-failed-desc');
  const statsEl = document.getElementById('topic-exam-failed-stats');
  if (!backdropEl) return;

  const catLabel = CATEGORIES[catId]?.label || 'this topic';
  const neededCorrect = Math.ceil((TOPIC_EXAM_MIN_ACCURACY / 100) * TOPIC_EXAM_QUESTION_COUNT);
  if (titleEl) {
    titleEl.textContent = `${stageLabel || 'Topic Exam'} Not Passed`;
  }
  if (descEl) {
    descEl.textContent = `You scored ${stageCorrect}/${stageTotal} (${accRounded}%). You need at least ${TOPIC_EXAM_MIN_ACCURACY}% (${neededCorrect}/${TOPIC_EXAM_QUESTION_COUNT}) to pass ${catLabel} and unlock the next unit.`;
  }
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stage-award-stat-card">
        <span class="stage-award-stat-label">Your Score</span>
        <span class="stage-award-stat-value">${accRounded}%</span>
      </div>
      <div class="stage-award-stat-card">
        <span class="stage-award-stat-label">Correct</span>
        <span class="stage-award-stat-value">${stageCorrect}/${stageTotal}</span>
      </div>
      <div class="stage-award-stat-card">
        <span class="stage-award-stat-label">Required</span>
        <span class="stage-award-stat-value">${TOPIC_EXAM_MIN_ACCURACY}% (${neededCorrect}+)</span>
      </div>
    `;
  }
  backdropEl.classList.remove('hidden');
  if (typeof progressionHooks.onHandsFreeExamFailed === 'function') {
    progressionHooks.onHandsFreeExamFailed({ catId, stageCorrect, stageTotal, accRounded });
  }
}

export function closeTopicExamFailedModal() {
  const backdropEl = document.getElementById('topic-exam-failed-modal-backdrop');
  if (backdropEl) backdropEl.classList.add('hidden');
}

export function retakeTopicExam() {
  const catId = state.activeCategory;
  if (!CATEGORIES[catId] || !isCategoryUnlocked(catId)) return;
  const prog = getCategoryProgress(catId);
  prog.skills = createEmptySkillsMap();
  prog.stageCorrect = 0;
  prog.stageTotal = 0;
  prog.skillTurn = 0;
  prog.recentOutcomes = [];
  state.answered = false;
  savePersistedData();
  closeTopicExamFailedModal();
  syncProgressionUI();
  progressionHooks.onSyncQuestionTypeUI();
  progressionHooks.onSyncDirectionUI();
  progressionHooks.onLoadQuestion();
}

export function closeSubjectCompleteModal({ reloadQuestion = true } = {}) {
  pendingSubjectNextId = null;
  if (subjectCompleteModalBackdropEl) {
    subjectCompleteModalBackdropEl.classList.add('hidden');
  }
  if (
    reloadQuestion &&
    state.activeView === 'play' &&
    isCategoryUnlocked(state.activeCategory) &&
    state.answered
  ) {
    state.questionNumber += 1;
    progressionHooks.onLoadQuestion();
  }
}

export function openStageSeenModal() {
  const backdropEl = document.getElementById('stage-seen-modal-backdrop');
  const titleEl = document.getElementById('stage-seen-modal-title');
  const subtitleEl = document.getElementById('stage-seen-modal-subtitle');
  const bodyEl = document.getElementById('stage-seen-modal-body');
  if (!backdropEl || !bodyEl) return;

  const snap = getProgressionSnapshot(state.activeCategory);
  if (!snap.isUnlocked) return;

  const activePillars = getActiveSkillPillars();
  const entries = [];
  if (state.activeCategory === 'numbers') {
    if (snap.stageIndex === 0) {
      for (let n = NUMBER_MIN; n <= NUMBER_MAX; n += 1) {
        const entry = state.counts?.[n];
        const seen = normalizeSeenSkills(entry?.seenSkills, entry?.streaks);
        entries.push({
          es: SPANISH_NUMBERS[n],
          en: String(n),
          seen,
          allSeen: activePillars.every((k) => seen[k])
        });
      }
    }
  } else {
    getItemsForStage(state.activeCategory, snap.stageIndex).forEach((item) => {
      const entry = state.phraseCounts?.[item.id];
      const seen = normalizeSeenSkills(entry?.seenSkills, entry?.streaks);
      entries.push({
        es: item.es,
        en: item.en,
        seen,
        allSeen: activePillars.every((k) => seen[k])
      });
    });
  }

  if (entries.length === 0) return;
  const seenTotal = entries.filter((e) => e.allSeen).length;
  if (titleEl) {
    titleEl.textContent = `${snap.stage.shortTitle} · Words Seen`;
  }
  if (subtitleEl) {
    subtitleEl.textContent = state.speakOnlyMode
      ? `${seenTotal} of ${entries.length} seen in Speak.`
      : `${seenTotal} of ${entries.length} seen in all 4 skills (Read, Write, Listen & Speak).`;
  }

  const skillLetters = [
    { key: 'read', letter: 'R', label: 'Read' },
    { key: 'write', letter: 'W', label: 'Write' },
    { key: 'listen', letter: 'L', label: 'Listen' },
    { key: 'speak', letter: 'S', label: 'Speak' }
  ].filter((sk) => activePillars.includes(sk.key));

  bodyEl.innerHTML = entries
    .map((item) => {
      const chipsHTML = skillLetters
        .map(
          (sk) =>
            `<span class="stage-seen-chip${item.seen[sk.key] ? ' is-hit' : ''}" title="${sk.label}: ${item.seen[sk.key] ? 'Seen' : 'Not yet seen'}">${sk.letter}</span>`
        )
        .join('');
      return `
        <div class="stage-seen-row${item.allSeen ? ' is-seen' : ''}">
          <div class="stage-seen-word">
            <span class="stage-seen-es">${escapeHtmlText(item.es)}</span>
            <span class="stage-seen-en">${escapeHtmlText(item.en)}</span>
          </div>
          <div class="stage-seen-skills" aria-label="Skills seen">${chipsHTML}</div>
        </div>
      `;
    })
    .join('');

  bodyEl.scrollTop = 0;
  backdropEl.classList.remove('hidden');
}

export function closeStageSeenModal() {
  const backdropEl = document.getElementById('stage-seen-modal-backdrop');
  if (backdropEl) backdropEl.classList.add('hidden');
}

export function openReintroduceSkillModal(skillKey) {
  const meta = SKILL_META[skillKey];
  const backdropEl = document.getElementById('reintroduce-skill-modal-backdrop');
  const titleEl = document.getElementById('reintroduce-skill-modal-title');
  const descEl = document.getElementById('reintroduce-skill-modal-desc');
  const confirmBtn = document.getElementById('reintroduce-skill-confirm-btn');
  if (!meta || !backdropEl) return;

  pendingReintroduceSkillKey = skillKey;
  if (titleEl) titleEl.textContent = `Re-introduce ${meta.label}?`;
  if (descEl) {
    descEl.textContent = `Unlocking ${meta.label} will reset its progress for the current stage so you can practice it again. This will delay advancing to the next stage.`;
  }
  if (confirmBtn) confirmBtn.textContent = `Unlock ${meta.shortLabel}`;
  backdropEl.classList.remove('hidden');
}

export function closeReintroduceSkillModal() {
  pendingReintroduceSkillKey = null;
  const backdropEl = document.getElementById('reintroduce-skill-modal-backdrop');
  if (backdropEl) backdropEl.classList.add('hidden');
}

export function confirmReintroduceSkill() {
  const skillKey = pendingReintroduceSkillKey;
  closeReintroduceSkillModal();
  if (isTrackingDisabled()) return;
  const activePillars = getActiveSkillPillars();
  if (!skillKey || !activePillars.includes(skillKey)) return;

  const catId = state.activeCategory;
  if (!CATEGORIES[catId] || !isCategoryUnlocked(catId)) return;
  const prog = getCategoryProgress(catId);
  if (!prog.skills) {
    prog.skills = createEmptySkillsMap();
  }
  prog.skills[skillKey] = { correct: 0, total: 0 };
  prog.stageCorrect = activePillars.reduce((sum, k) => sum + (prog.skills[k]?.correct || 0), 0);
  prog.stageTotal = activePillars.reduce((sum, k) => sum + (prog.skills[k]?.total || 0), 0);
  prog.skillTurn = Math.max(0, activePillars.indexOf(skillKey));
  if (Array.isArray(prog.completedStages)) {
    prog.completedStages = prog.completedStages.filter((idx) => idx !== prog.stageIndex);
  }
  if (Array.isArray(prog.skippedStages)) {
    prog.skippedStages = prog.skippedStages.filter((idx) => idx !== prog.stageIndex);
  }

  savePersistedData();
  progressionHooks.onSyncQuestionTypeUI();
  progressionHooks.onSyncDirectionUI();
  syncProgressionUI();
  progressionHooks.onRenderPathView();
  progressionHooks.onLoadQuestion();
}

export function openStageCompleteAwardModal({
  catId,
  stageLabel,
  stageCorrect,
  stageTotal,
  accRounded,
  skills,
  seenCount,
  totalCount,
  nextStageIndex = null,
  isFinalStage = false,
  isExamStage = false
}) {
  const backdropEl = document.getElementById('stage-complete-award-modal-backdrop');
  const titleEl = document.getElementById('stage-award-title');
  const subtitleEl = document.getElementById('stage-award-subtitle');
  const statsEl = document.getElementById('stage-award-stats');
  const skillsEl = document.getElementById('stage-award-skills');
  const continueBtn = document.getElementById('stage-award-continue-btn');
  if (!backdropEl) return;

  const activePillars = getActiveSkillPillars();
  pendingAwardFollowup = { catId, nextStageIndex, isFinalStage };
  if (titleEl) {
    titleEl.textContent = isExamStage ? `${stageLabel} Passed!` : `${stageLabel} Complete!`;
  }
  if (subtitleEl) {
    subtitleEl.textContent = isExamStage
      ? `Hard Topic Exam passed (${accRounded}% ≥ ${TOPIC_EXAM_MIN_ACCURACY}% required)!`
      : state.speakOnlyMode
        ? 'Speaking skill is complete.'
        : 'All 4 skills (Reading, Writing, Listening & Speaking) are complete.';
  }
  if (statsEl) {
    const seenVal = totalCount > 0 ? `${seenCount}/${totalCount}` : '—';
    statsEl.innerHTML = `
      <div class="stage-award-stat-card">
        <span class="stage-award-stat-label">Accuracy</span>
        <span class="stage-award-stat-value">${accRounded}%</span>
      </div>
      <div class="stage-award-stat-card">
        <span class="stage-award-stat-label">Correct</span>
        <span class="stage-award-stat-value">${stageCorrect}/${stageTotal}</span>
      </div>
      <div class="stage-award-stat-card">
        <span class="stage-award-stat-label">Words Seen</span>
        <span class="stage-award-stat-value">${seenVal}</span>
      </div>
    `;
  }
  if (skillsEl && skills) {
    skillsEl.classList.toggle('is-single-skill', activePillars.length === 1);
    skillsEl.innerHTML = activePillars.map((k) => {
      const sk = skills[k];
      return `
        <div class="stage-award-skill-chip">
          <span class="stage-award-skill-name">${escapeHtmlText(SKILL_META[k].shortLabel)} ✓</span>
          <span class="stage-award-skill-meta">${sk.correct}/${sk.total}</span>
        </div>
      `;
    }).join('');
  }
  if (continueBtn) {
    continueBtn.textContent = nextStageIndex !== null ? 'See New Words →' : 'Continue →';
  }
  backdropEl.classList.remove('hidden');

  if (typeof progressionHooks.onHandsFreeStageComplete === 'function') {
    const nextStageMeta = nextStageIndex !== null ? CATEGORIES[catId]?.stages?.[nextStageIndex] : null;
    const nextUnitMeta = isFinalStage ? getNextCategoryInOrder(catId) : null;
    progressionHooks.onHandsFreeStageComplete({
      catId,
      stageLabel,
      nextStageIndex,
      nextStageLabel: nextStageMeta?.shortTitle || nextStageMeta?.label || '',
      isFinalStage,
      nextUnitId: nextUnitMeta?.id || '',
      nextUnitLabel: nextUnitMeta?.label || ''
    });
  }
}

export function dismissStageProgressionModalsForHandsFree() {
  const awardEl = document.getElementById('stage-complete-award-modal-backdrop');
  if (awardEl && !awardEl.classList.contains('hidden')) {
    closeStageCompleteAwardModal();
  }
  const nextEl = document.getElementById('next-stage-preview-modal-backdrop');
  if (nextEl && !nextEl.classList.contains('hidden')) {
    closeNextStagePreviewModal();
    return;
  }
  if (subjectCompleteModalBackdropEl && !subjectCompleteModalBackdropEl.classList.contains('hidden')) {
    const nextId = pendingSubjectNextId || getHighestUnlockedCategoryId();
    closeSubjectCompleteModal({ reloadQuestion: false });
    if (nextId && CATEGORIES[nextId] && isCategoryUnlocked(nextId)) {
      progressionHooks.onSwitchCategory(nextId);
      progressionHooks.onSwitchView('play');
    } else if (state.activeView === 'play' && isCategoryUnlocked(state.activeCategory)) {
      state.questionNumber += 1;
      progressionHooks.onLoadQuestion();
    }
  }
}

export function closeStageCompleteAwardModal() {
  const backdropEl = document.getElementById('stage-complete-award-modal-backdrop');
  if (backdropEl) backdropEl.classList.add('hidden');
  const followup = pendingAwardFollowup;
  pendingAwardFollowup = null;
  if (followup?.nextStageIndex !== null && followup?.nextStageIndex !== undefined) {
    openNextStagePreviewModal(followup.catId, followup.nextStageIndex);
    return;
  }
  if (followup?.isFinalStage) {
    openSubjectCompleteModal(followup.catId);
    return;
  }
  if (state.activeView === 'play' && isCategoryUnlocked(state.activeCategory) && state.answered) {
    state.questionNumber += 1;
    progressionHooks.onLoadQuestion();
  }
}

export function openNextStagePreviewModal(catId, stageIndex) {
  const backdropEl = document.getElementById('next-stage-preview-modal-backdrop');
  const titleEl = document.getElementById('next-stage-preview-title');
  const subtitleEl = document.getElementById('next-stage-preview-subtitle');
  const bodyEl = document.getElementById('next-stage-preview-body');
  const startBtnEl = document.getElementById('next-stage-preview-start-btn');
  if (!backdropEl || !bodyEl) return;

  const stage = CATEGORIES[catId]?.stages?.[stageIndex];
  if (stage?.isExam) {
    const neededCorrect = Math.ceil((TOPIC_EXAM_MIN_ACCURACY / 100) * TOPIC_EXAM_QUESTION_COUNT);
    if (titleEl) titleEl.textContent = stage.label;
    if (subtitleEl) {
      subtitleEl.textContent = `Cumulative final exam across every stage of ${CATEGORIES[catId]?.label || 'this topic'}.`;
    }
    bodyEl.innerHTML = `
      <ul class="exam-briefing-list">
        <li><strong>${TOPIC_EXAM_QUESTION_COUNT} Questions</strong> drawn from all stages and dynamic scenarios in this topic.</li>
        <li><strong>${TOPIC_EXAM_MIN_ACCURACY}% Required to Pass</strong> (${neededCorrect} or more correct out of ${TOPIC_EXAM_QUESTION_COUNT}).</li>
        <li><strong>1 Attempt per Question</strong> — no second tries and no retry rounds.</li>
        <li><strong>No Practice Mode, No Hints, No Shadowing</strong> — Spanish translations are hidden until after you answer.</li>
        <li>Score below ${TOPIC_EXAM_MIN_ACCURACY}% and you must retake the full exam to unlock the next unit.</li>
      </ul>
    `;
    if (startBtnEl) startBtnEl.textContent = 'Start Hard Exam →';
    bodyEl.scrollTop = 0;
    backdropEl.classList.remove('hidden');
    return;
  }

  const rows = getStageVocabRows(catId, stageIndex) || [];
  if (titleEl) {
    titleEl.textContent = stage ? `${stage.label}` : 'Unlocked Next Stage';
  }
  if (subtitleEl) {
    subtitleEl.textContent = stage?.desc
      ? `${stage.desc} (${rows.length} new words & phrases)`
      : `${rows.length} new words & phrases unlocked.`;
  }
  if (startBtnEl) startBtnEl.textContent = 'Start Stage →';
  bodyEl.innerHTML = rows
    .map(
      (r) => `
      <div class="stage-seen-row">
        <div class="stage-seen-word">
          <span class="stage-seen-es">${escapeHtmlText(r.es)}</span>
          <span class="stage-seen-en">${escapeHtmlText(r.en)}</span>
        </div>
      </div>
    `
    )
    .join('');
  bodyEl.scrollTop = 0;
  backdropEl.classList.remove('hidden');
}

export function closeNextStagePreviewModal() {
  const backdropEl = document.getElementById('next-stage-preview-modal-backdrop');
  if (backdropEl) backdropEl.classList.add('hidden');
  if (state.activeView === 'play' && isCategoryUnlocked(state.activeCategory)) {
    if (state.answered) {
      state.questionNumber += 1;
    }
    progressionHooks.onLoadQuestion();
  }
}

export function clearPendingProgressionModals() {
  closeStageSeenModal();
  closeReintroduceSkillModal();
  closeTopicExamFailedModal();
  closeSubjectCompleteModal({ reloadQuestion: false });
  pendingAwardFollowup = null;
  const awardEl = document.getElementById('stage-complete-award-modal-backdrop');
  if (awardEl) awardEl.classList.add('hidden');
  const nextStageEl = document.getElementById('next-stage-preview-modal-backdrop');
  if (nextStageEl) nextStageEl.classList.add('hidden');
}

export function updateProgressionOnAnswer(isCorrect) {
  if (isTrackingDisabled()) return;
  const catId = state.activeCategory;
  if (!CATEGORIES[catId] || !isCategoryUnlocked(catId)) return;
  const cfg = state.progressionConfig;
  const prog = getCategoryProgress(catId);
  const stages = CATEGORIES[catId].stages;
  if (!cfg || !prog || !stages || stages.length === 0) return;

  const prevSnap = getProgressionSnapshot(catId);
  const activePillars = getActiveSkillPillars();
  const activeSkillKey = prevSnap.activeSkillKey;
  const activeIdx = activePillars.indexOf(activeSkillKey);

  if (!prog.skills) {
    prog.skills = normalizeSkillsMap(null, prog.stageCorrect || 0, prog.stageTotal || 0, cfg.threshold);
  }
  if (!prog.stageSkills || typeof prog.stageSkills !== 'object') {
    prog.stageSkills = {};
  }

  prog.skills[activeSkillKey].total =
    Math.max(0, Number(prog.skills[activeSkillKey].total) || 0) + 1;
  if (isCorrect) {
    prog.skills[activeSkillKey].correct =
      Math.max(0, Number(prog.skills[activeSkillKey].correct) || 0) + 1;
  }
  if (!Array.isArray(prog.recentOutcomes)) {
    prog.recentOutcomes = [];
  }
  prog.recentOutcomes.push(Boolean(isCorrect));
  if (prog.recentOutcomes.length > 60) {
    prog.recentOutcomes = prog.recentOutcomes.slice(-60);
  }

  prog.skillTurn = (Math.max(0, activeIdx) + 1) % activePillars.length;
  prog.stageCorrect = activePillars.reduce((sum, key) => sum + (prog.skills[key]?.correct || 0), 0);
  prog.stageTotal = activePillars.reduce((sum, key) => sum + (prog.skills[key]?.total || 0), 0);

  const postSnap = getProgressionSnapshot(catId);
  const completedSet = new Set(Array.isArray(prog.completedStages) ? prog.completedStages : []);
  const wasAlreadyCompleted = completedSet.has(prog.stageIndex);

  if (postSnap.canCompleteStage && !wasAlreadyCompleted) {
    const wasFinalCompleted =
      prog.stageIndex >= stages.length - 1 && completedSet.has(prog.stageIndex);

    if (!completedSet.has(prog.stageIndex)) {
      completedSet.add(prog.stageIndex);
      prog.completedStages = Array.from(completedSet).sort((a, b) => a - b);
    }

    prog.stageSkills[prog.stageIndex] = activePillars.reduce((acc, key) => {
      acc[key] = {
        correct: postSnap.skills[key].correct,
        total: postSnap.skills[key].total
      };
      return acc;
    }, {});
    if (!prog.stageRecentOutcomes || typeof prog.stageRecentOutcomes !== 'object') {
      prog.stageRecentOutcomes = {};
    }
    prog.stageRecentOutcomes[prog.stageIndex] = Array.isArray(prog.recentOutcomes)
      ? prog.recentOutcomes.slice(-60)
      : [];

    const completedStageIdx = prog.stageIndex;
    const completedStageLabel = stages[completedStageIdx]?.label || `Stage ${completedStageIdx + 1}`;
    const completedSeen = getStageSeenProgress(catId, completedStageIdx);

    if (prog.stageIndex < stages.length - 1) {
      prog.stageIndex += 1;
      const savedNextSkills = prog.stageSkills[prog.stageIndex];
      prog.skills = savedNextSkills
        ? normalizeSkillsMap(savedNextSkills, 0, 0, cfg.threshold)
        : createEmptySkillsMap();
      prog.skillTurn = 0;
      prog.stageCorrect = activePillars.reduce((sum, key) => sum + (prog.skills[key]?.correct || 0), 0);
      prog.stageTotal = activePillars.reduce((sum, key) => sum + (prog.skills[key]?.total || 0), 0);
      prog.recentOutcomes = Array.isArray(prog.stageRecentOutcomes[prog.stageIndex])
        ? prog.stageRecentOutcomes[prog.stageIndex].slice(-60)
        : [];
      const nextStage = stages[prog.stageIndex];
      const nextStageSnap = getProgressionSnapshot(catId);

      flashProgressionMilestone(`Unlocked: ${nextStage.label} (${nextStageSnap.phaseShort})`);

      openStageCompleteAwardModal({
        catId,
        stageLabel: completedStageLabel,
        stageCorrect: postSnap.stageCorrect,
        stageTotal: postSnap.stageTotal,
        accRounded: postSnap.accRounded,
        skills: postSnap.skills,
        seenCount: completedSeen.seenCount,
        totalCount: completedSeen.totalCount,
        nextStageIndex: prog.stageIndex,
        isFinalStage: false
      });
    } else {
      if (!wasFinalCompleted) {
        openStageCompleteAwardModal({
          catId,
          stageLabel: completedStageLabel,
          stageCorrect: postSnap.stageCorrect,
          stageTotal: postSnap.stageTotal,
          accRounded: postSnap.accRounded,
          skills: postSnap.skills,
          seenCount: completedSeen.seenCount,
          totalCount: completedSeen.totalCount,
          nextStageIndex: null,
          isFinalStage: true,
          isExamStage: Boolean(postSnap.isExamStage)
        });
      }
      if (!wasFinalCompleted) {
        flashProgressionMilestone(`${CATEGORIES[catId].label} Completed!`);
      }
    }
  } else if (postSnap.isExamStage && postSnap.examFailed) {
    openTopicExamFailedModal({
      catId,
      stageLabel: stages[prog.stageIndex]?.label || 'Topic Exam',
      stageCorrect: postSnap.stageCorrect,
      stageTotal: postSnap.stageTotal,
      accRounded: postSnap.accRounded
    });
  } else {
    if (!prevSnap.skills[activeSkillKey]?.proficient && postSnap.skills[activeSkillKey]?.proficient) {
      const doneMeta = SKILL_META[activeSkillKey];
      flashProgressionMilestone(`${doneMeta.label} Proficient (${postSnap.skills[activeSkillKey].correct}/${postSnap.skills[activeSkillKey].target})!`);
    }
  }

  syncProgressionUI();
}

export function selectStageInProgression(catId, stageIndex) {
  const cat = CATEGORIES[catId];
  if (!cat || !Array.isArray(cat.stages)) return null;
  const idx = Number(stageIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= cat.stages.length) return null;

  const prog = getCategoryProgress(catId);
  const cfg = state.progressionConfig || createDefaultProgressionConfig();
  const activePillars = getActiveSkillPillars();
  const prevIdx = Math.min(cat.stages.length - 1, Math.max(0, Number(prog.stageIndex) || 0));

  // Preserve outgoing stage progress so switching stages never loses work
  if (!prog.stageSkills || typeof prog.stageSkills !== 'object') {
    prog.stageSkills = {};
  }
  if (!prog.stageRecentOutcomes || typeof prog.stageRecentOutcomes !== 'object') {
    prog.stageRecentOutcomes = {};
  }
  prog.stageSkills[prevIdx] = normalizeSkillsMap(prog.skills, prog.stageCorrect || 0, prog.stageTotal || 0, cfg.threshold);
  prog.stageRecentOutcomes[prevIdx] = Array.isArray(prog.recentOutcomes) ? prog.recentOutcomes.slice(-60) : [];

  // Switch to target stage and restore any saved progress for it
  prog.stageIndex = idx;
  const savedTargetSkills = prog.stageSkills[idx];
  prog.skills = savedTargetSkills
    ? normalizeSkillsMap(savedTargetSkills, 0, 0, cfg.threshold)
    : createEmptySkillsMap();
  prog.recentOutcomes = Array.isArray(prog.stageRecentOutcomes[idx])
    ? prog.stageRecentOutcomes[idx].slice(-60)
    : [];
  prog.stageCorrect = activePillars.reduce((sum, key) => sum + (prog.skills[key]?.correct || 0), 0);
  prog.stageTotal = activePillars.reduce((sum, key) => sum + (prog.skills[key]?.total || 0), 0);
  prog.skillTurn = 0;

  // Switch active category & reset live question state
  state.activeCategory = catId;
  state.reviewFilterCat = catId;
  state.weakDrillActive = false;
  state.polishDrillActive = false;
  state.revisionDrillActive = false;
  state.practiceMode = false;
  state.practiceQueueStageKey = '';
  state.practiceQueueIndex = 0;
  state.currentItem = null;
  state.currentContext = null;
  state.answered = false;

  if (catId === 'numbers' && cat.stages[idx]?.contextMode) {
    state.contextMode = cat.stages[idx].contextMode;
  }

  const snap = getProgressionSnapshot(catId);
  state.direction = snap.phaseDirection;
  state.questionType = snap.phaseQuestionType;

  savePersistedData();
  progressionHooks.onStageSelected({ catId, stageIndex: idx });
  progressionHooks.onSyncQuestionTypeUI();
  progressionHooks.onSyncDirectionUI();
  progressionHooks.onRenderPlayCategoryState();
  syncProgressionUI();
  if (state.activeView !== 'play') {
    progressionHooks.onSwitchView('play');
  }
  progressionHooks.onLoadQuestion();

  return { catId, stageIndex: idx };
}

export function skipStageInProgression(catId, stageIndex) {
  if (isTrackingDisabled()) return null;
  const cat = CATEGORIES[catId];
  if (!cat || !Array.isArray(cat.stages) || !isCategoryUnlocked(catId)) return null;
  const idx = Number(stageIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= cat.stages.length) return null;

  const prog = getCategoryProgress(catId);
  const completedSet = new Set(Array.isArray(prog.completedStages) ? prog.completedStages : []);
  if (completedSet.has(idx)) return null;

  const skippedSet = new Set(Array.isArray(prog.skippedStages) ? prog.skippedStages : []);
  const activePillars = getActiveSkillPillars();
  const stageMeta = cat.stages[idx];

  completedSet.add(idx);
  skippedSet.add(idx);
  prog.completedStages = Array.from(completedSet).sort((a, b) => a - b);
  prog.skippedStages = Array.from(skippedSet).sort((a, b) => a - b);

  const cfg = state.progressionConfig || createDefaultProgressionConfig();
  if (!prog.stageSkills || typeof prog.stageSkills !== 'object') {
    prog.stageSkills = {};
  }
  if (!prog.stageRecentOutcomes || typeof prog.stageRecentOutcomes !== 'object') {
    prog.stageRecentOutcomes = {};
  }
  prog.stageSkills[idx] = activePillars.reduce((acc, key) => {
    acc[key] = {
      correct: Math.max(0, Number(prog.skills?.[key]?.correct) || 0),
      total: Math.max(0, Number(prog.skills?.[key]?.total) || 0)
    };
    return acc;
  }, {});
  if (prog.stageIndex === idx) {
    prog.stageRecentOutcomes[idx] = Array.isArray(prog.recentOutcomes) ? prog.recentOutcomes.slice(-60) : [];
  }

  // Mark this skipped stage's Practice Gate and intro popups as done so it never blocks progression
  const stagePart = stageMeta?.stageKey || `s${idx}`;
  if (!(state.completedPracticeStages instanceof Set)) {
    state.completedPracticeStages = new Set(state.completedPracticeStages || []);
  }
  state.completedPracticeStages.add(`${catId}:${stagePart}`);
  if (!(state.skippedIntroStages instanceof Set)) {
    state.skippedIntroStages = new Set(state.skippedIntroStages || []);
  }
  state.skippedIntroStages.add(`${catId}:${idx}`);

  const isFinalStage = idx >= cat.stages.length - 1;
  let nextStageIndex = null;
  let unlockedNextUnitId = null;

  if (!isFinalStage) {
    let targetNext = idx + 1;
    while (targetNext < cat.stages.length - 1 && completedSet.has(targetNext)) {
      targetNext += 1;
    }
    prog.stageIndex = targetNext;
    const savedNextSkills = prog.stageSkills[targetNext];
    prog.skills = savedNextSkills
      ? normalizeSkillsMap(savedNextSkills, 0, 0, cfg.threshold)
      : createEmptySkillsMap();
    prog.skillTurn = 0;
    prog.stageCorrect = activePillars.reduce((sum, key) => sum + (prog.skills[key]?.correct || 0), 0);
    prog.stageTotal = activePillars.reduce((sum, key) => sum + (prog.skills[key]?.total || 0), 0);
    prog.recentOutcomes = Array.isArray(prog.stageRecentOutcomes[targetNext])
      ? prog.stageRecentOutcomes[targetNext].slice(-60)
      : [];
    nextStageIndex = targetNext;

    if (catId === 'numbers' && cat.stages[targetNext]?.contextMode) {
      state.contextMode = cat.stages[targetNext].contextMode;
    }
    if (catId === state.activeCategory) {
      state.practiceQueueStageKey = '';
      state.practiceQueueIndex = 0;
      state.currentItem = null;
      state.currentContext = null;
      state.answered = false;
    }
    savePersistedData();
    syncProgressionUI();
    if (catId === state.activeCategory) {
      progressionHooks.onSyncQuestionTypeUI();
      progressionHooks.onSyncDirectionUI();
      progressionHooks.onLoadQuestion();
    }
  } else {
    const nextUnit = getNextCategoryInOrder(catId);
    unlockedNextUnitId = nextUnit && isCategoryUnlocked(nextUnit.id) ? nextUnit.id : null;
    savePersistedData();
    syncProgressionUI();
    if (catId === state.activeCategory && unlockedNextUnitId) {
      progressionHooks.onSwitchCategory(unlockedNextUnitId);
    }
  }

  return {
    catId,
    skippedStageIndex: idx,
    nextStageIndex,
    unlockedNextUnitId
  };
}

export function undoSkipStageInProgression(catId, stageIndex) {
  if (isTrackingDisabled()) return null;
  const cat = CATEGORIES[catId];
  if (!cat || !Array.isArray(cat.stages)) return null;
  const idx = Number(stageIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= cat.stages.length) return null;

  const prog = getCategoryProgress(catId);
  const skippedSet = new Set(Array.isArray(prog.skippedStages) ? prog.skippedStages : []);
  if (!skippedSet.has(idx)) return null;

  const completedSet = new Set(Array.isArray(prog.completedStages) ? prog.completedStages : []);
  skippedSet.delete(idx);
  completedSet.delete(idx);
  prog.skippedStages = Array.from(skippedSet).sort((a, b) => a - b);
  prog.completedStages = Array.from(completedSet).sort((a, b) => a - b);
  prog.completed = prog.completedStages.length >= cat.stages.length;

  const stageMeta = cat.stages[idx];
  const stagePart = stageMeta?.stageKey || `s${idx}`;
  if (state.completedPracticeStages instanceof Set) {
    state.completedPracticeStages.delete(`${catId}:${stagePart}`);
  }
  if (state.skippedIntroStages instanceof Set) {
    state.skippedIntroStages.delete(`${catId}:${idx}`);
  }

  savePersistedData();
  syncProgressionUI();
  if (catId === state.activeCategory) {
    progressionHooks.onSyncQuestionTypeUI();
    progressionHooks.onSyncDirectionUI();
  }
  return { catId, stageIndex: idx };
}

export function recalibrateAllTopicsFromStats() {
  const cfg = normalizeProgressionConfig(state.progressionConfig);
  const overrides = {};
  const details = [];
  let stagesUnlocked = 0;
  let activeStageChanged = false;

  CATEGORY_ORDER.forEach((catId) => {
    const cat = CATEGORIES[catId];
    if (!cat || !Array.isArray(cat.stages)) return;

    // Aggregate real user stats for this topic
    let topicCorrect = 0;
    let topicIncorrect = 0;
    let topicSkipped = 0;
    let topicBans = 0;

    if (catId === 'numbers') {
      Object.values(state.counts || {}).forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;
        topicCorrect += Math.max(0, Number(entry.correct) || 0);
        topicIncorrect += Math.max(0, Number(entry.incorrect) || 0);
        topicSkipped += Math.max(0, Number(entry.skipped) || 0);
        topicBans += Math.max(0, Number(entry.banCount) || 0);
      });
    } else {
      getItemsForCategory(catId).forEach((item) => {
        const entry = state.phraseCounts?.[item.id];
        if (!entry || typeof entry !== 'object') return;
        topicCorrect += Math.max(0, Number(entry.correct) || 0);
        topicIncorrect += Math.max(0, Number(entry.incorrect) || 0);
        topicSkipped += Math.max(0, Number(entry.skipped) || 0);
        topicBans += Math.max(0, Number(entry.banCount) || 0);
      });
    }

    const topicTotal = topicCorrect + topicIncorrect;
    const topicAcc = topicTotal > 0 ? Math.round((topicCorrect / topicTotal) * 100) : null;

    // Choose supportive per-topic calibration tier based on user's actual performance
    let volumeMultiplier = PRESET_VOLUME_MULTIPLIER;
    let windowMultiplier = PRESET_WINDOW_MULTIPLIER;
    let minAccuracy = cfg.minAccuracy || 85;
    let tier = 'balanced';

    if (topicTotal >= 20 && topicAcc >= 90 && topicBans === 0) {
      // Strong mastery -> brisker pace
      volumeMultiplier = 1.5;
      windowMultiplier = 1.25;
      minAccuracy = 85;
      tier = 'accelerated';
    } else if (topicTotal >= 10 && (topicAcc < 75 || topicBans >= 2 || topicSkipped >= 6)) {
      // Struggling / high skips -> extra reinforcement with a supportive, forgiving rolling threshold
      volumeMultiplier = 2.5;
      windowMultiplier = 1.5;
      minAccuracy = 80;
      tier = 'supportive';
    } else {
      volumeMultiplier = PRESET_VOLUME_MULTIPLIER;
      windowMultiplier = PRESET_WINDOW_MULTIPLIER;
      minAccuracy = 85;
      tier = 'balanced';
    }

    overrides[catId] = { volumeMultiplier, windowMultiplier, minAccuracy, tier };
    details.push({
      catId,
      code: cat.a1Code || cat.label,
      topicTotal,
      topicAcc,
      tier,
      volumeMultiplier,
      windowMultiplier,
      minAccuracy
    });
  });

  state.progressionConfig = normalizeProgressionConfig({
    ...cfg,
    perTopicOverrides: overrides
  });

  // Re-evaluate active stages under the newly calibrated Rolling Window targets
  CATEGORY_ORDER.forEach((catId) => {
    const cat = CATEGORIES[catId];
    if (!cat || !Array.isArray(cat.stages)) return;
    const prog = getCategoryProgress(catId);
    const activeIdx = Math.min(cat.stages.length - 1, Math.max(0, Number(prog.stageIndex) || 0));
    const stage = cat.stages[activeIdx];
    if (!stage || stage.isExam) return;

    // Seed a representative rolling window for legacy stages that have attempts but empty recentOutcomes
    const speak = prog.skills?.speak || { correct: 0, total: 0 };
    if ((!Array.isArray(prog.recentOutcomes) || prog.recentOutcomes.length === 0) && speak.total > 0) {
      const nItems = catId === 'numbers' ? getNumbersStageEffectiveItemCount(activeIdx) : getItemsForStage(catId, activeIdx).length;
      const winSize = Math.max(8, Math.round(nItems * (overrides[catId]?.windowMultiplier || PRESET_WINDOW_MULTIPLIER)));
      const sampleLen = Math.min(speak.total, winSize);
      const sampleCorrect = Math.round((speak.correct / speak.total) * sampleLen);
      const seeded = [];
      for (let i = 0; i < sampleLen; i += 1) {
        seeded.push(i >= sampleLen - sampleCorrect);
      }
      prog.recentOutcomes = seeded;
    }

    const snap = getProgressionSnapshot(catId);
    if (snap.canCompleteStage && !snap.isExamStage) {
      const completedSet = new Set(Array.isArray(prog.completedStages) ? prog.completedStages : []);
      if (!completedSet.has(activeIdx)) {
        completedSet.add(activeIdx);
        prog.completedStages = Array.from(completedSet).sort((a, b) => a - b);
        stagesUnlocked += 1;
        // Advance to next incomplete stage if available
        let nextIdx = activeIdx;
        for (let i = activeIdx + 1; i < cat.stages.length; i += 1) {
          if (!completedSet.has(i)) {
            nextIdx = i;
            break;
          }
        }
        if (nextIdx !== activeIdx) {
          if (!prog.stageSkills || typeof prog.stageSkills !== 'object') prog.stageSkills = {};
          if (!prog.stageRecentOutcomes || typeof prog.stageRecentOutcomes !== 'object') prog.stageRecentOutcomes = {};
          prog.stageSkills[activeIdx] = normalizeSkillsMap(prog.skills, prog.stageCorrect || 0, prog.stageTotal || 0, cfg.threshold);
          prog.stageRecentOutcomes[activeIdx] = Array.isArray(prog.recentOutcomes) ? prog.recentOutcomes.slice(-60) : [];
          prog.stageIndex = nextIdx;
          const savedNext = prog.stageSkills[nextIdx];
          prog.skills = savedNext ? normalizeSkillsMap(savedNext, 0, 0, cfg.threshold) : createEmptySkillsMap();
          prog.recentOutcomes = Array.isArray(prog.stageRecentOutcomes[nextIdx]) ? prog.stageRecentOutcomes[nextIdx].slice(-60) : [];
          prog.stageCorrect = prog.skills.speak?.correct || 0;
          prog.stageTotal = prog.skills.speak?.total || 0;
          if (catId === state.activeCategory) {
            activeStageChanged = true;
          }
        }
      }
    }
  });

  if (!isTrackingDisabled()) {
    savePersistedData();
  }
  syncProgressionUI();
  return {
    topicsCalibrated: details.length,
    stagesUnlocked,
    activeStageChanged,
    details
  };
}

export function initProgressionModule(hooks = {}) {
  registerProgressionHooks(hooks);

  const seenBackdropEl = document.getElementById('stage-seen-modal-backdrop');
  const seenCloseX = document.getElementById('stage-seen-close-x');
  if (seenCloseX) seenCloseX.addEventListener('click', closeStageSeenModal);
  if (seenBackdropEl) {
    seenBackdropEl.addEventListener('click', (e) => {
      if (e.target === seenBackdropEl) closeStageSeenModal();
    });
  }

  const reintroBackdropEl = document.getElementById('reintroduce-skill-modal-backdrop');
  const reintroCancelBtn = document.getElementById('reintroduce-skill-cancel-btn');
  const reintroConfirmBtn = document.getElementById('reintroduce-skill-confirm-btn');
  if (reintroCancelBtn) reintroCancelBtn.addEventListener('click', closeReintroduceSkillModal);
  if (reintroConfirmBtn) reintroConfirmBtn.addEventListener('click', confirmReintroduceSkill);
  if (reintroBackdropEl) {
    reintroBackdropEl.addEventListener('click', (e) => {
      if (e.target === reintroBackdropEl) closeReintroduceSkillModal();
    });
  }

  if (subjectCompleteStayBtn) {
    subjectCompleteStayBtn.addEventListener('click', closeSubjectCompleteModal);
  }
  if (subjectCompleteNextBtn) {
    subjectCompleteNextBtn.addEventListener('click', () => {
      const nextId = pendingSubjectNextId || getHighestUnlockedCategoryId();
      closeSubjectCompleteModal({ reloadQuestion: false });
      if (nextId && CATEGORIES[nextId] && isCategoryUnlocked(nextId)) {
        progressionHooks.onSwitchCategory(nextId);
        progressionHooks.onSwitchView('play');
      } else if (state.activeView === 'play' && isCategoryUnlocked(state.activeCategory) && state.answered) {
        state.questionNumber += 1;
        progressionHooks.onLoadQuestion();
      }
    });
  }
  if (subjectCompleteModalBackdropEl) {
    subjectCompleteModalBackdropEl.addEventListener('click', (e) => {
      if (e.target === subjectCompleteModalBackdropEl) {
        closeSubjectCompleteModal();
      }
    });
  }

  const awardBtn = document.getElementById('stage-award-continue-btn');
  const awardBackdrop = document.getElementById('stage-complete-award-modal-backdrop');
  const nextBtn = document.getElementById('next-stage-preview-start-btn');
  const nextBackdrop = document.getElementById('next-stage-preview-modal-backdrop');
  if (awardBtn) awardBtn.addEventListener('click', closeStageCompleteAwardModal);
  if (awardBackdrop) {
    awardBackdrop.addEventListener('click', (e) => {
      if (e.target === awardBackdrop) closeStageCompleteAwardModal();
    });
  }
  if (nextBtn) nextBtn.addEventListener('click', closeNextStagePreviewModal);
  if (nextBackdrop) {
    nextBackdrop.addEventListener('click', (e) => {
      if (e.target === nextBackdrop) closeNextStagePreviewModal();
    });
  }
  const examRetakeBtn = document.getElementById('topic-exam-retake-btn');
  if (examRetakeBtn) {
    examRetakeBtn.addEventListener('click', retakeTopicExam);
  }
}
