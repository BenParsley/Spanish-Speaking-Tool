import {
  CATEGORIES,
  CATEGORY_ORDER,
  QUANTITY_SCENARIOS,
  buildPhraseSpanishCandidates,
  buildQuestionContext,
  getItemsForCategory,
  getItemsForStage,
  getSlotConfigForItem,
  getSpeakableSpanishForItem,
  matchesSlotTemplateSpanish
} from '../curriculum/index.js';
import { getAllVariationsForStructure } from '../curriculum/structure-engine.js';
import {
  playCorrectSound,
  playHandsFreePausedSound,
  playIncorrectSound,
  playListeningReadyChime
} from './audio.js';
import { formatPromptForEnglishTts } from './hands-free.js';
import {
  getCategoryProgress,
  getProgressionSnapshot,
  isTopicExamActive,
  openNextStagePreviewModal,
  openStageCompleteAwardModal,
  openSubjectCompleteModal,
  openTopicExamFailedModal,
  syncProgressionUI
} from './progression.js';
import {
  PRESET_STAGE_MIN_ACCURACY,
  STAGE_PHRASE_MULTIPLIER,
  TOPIC_EXAM_MIN_ACCURACY,
  TOPIC_EXAM_QUESTION_COUNT,
  createEmptySkillsMap
} from './progression-core.js';
import { isCategoryUnlocked, savePersistedData, state } from './state.js';
import { STORAGE_KEY } from './tracking-schema.js';
import { escapeHtmlText, getLocalDateKey } from './utils.js';
import {
  commitLocalPronunciationResult,
  getSpeechRecognitionCtor,
  isLocalScorerActive,
  voiceCaptureState
} from './voice-capture.js';

let qaHooks = {
  getSpokenText: () => '',
  getDisplayText: () => '',
  getActivePhraseData: () => null,
  getQuestionSplit: () => ({ hasExtension: false }),
  getExpectedAlternatives: () => [],
  onCloseSettingsPopover: () => { },
  onSwitchCategory: () => { },
  onSwitchView: () => { },
  onSyncQuestionTypeUI: () => { },
  onSyncDirectionUI: () => { },
  onSyncPracticeModeCardUI: () => { },
  onUpdateMemoryTipUI: () => { },
  onUpdateDailyGoalUI: () => { },
  onEvaluateAchievements: () => { },
  onRenderCategoryNav: () => { },
  onRenderPathView: () => { },
  onLoadQuestion: () => { },
  onVoiceCommand: () => { }
};

let showExpectedOverlay = false;
let lastDiagnosticsReport = null;

export function isTestingExpectedOverlayEnabled() {
  return showExpectedOverlay;
}

export function setTestingStatus(msg, tone = 'info') {
  const el = document.getElementById('testing-quick-status');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden', 'is-ready', 'is-error');
  if (tone === 'ok') el.classList.add('is-ready');
  if (tone === 'error') el.classList.add('is-error');
}

export function syncTestingExpectedBanner() {
  const bannerEl = document.getElementById('testing-expected-banner');
  if (!bannerEl) return;
  if (!showExpectedOverlay || state.activeView !== 'play' || !isCategoryUnlocked(state.activeCategory)) {
    bannerEl.innerHTML = '';
    bannerEl.classList.add('hidden');
    return;
  }

  const snap = getProgressionSnapshot(state.activeCategory);
  const spoken = qaHooks.getSpokenText() || '—';
  const alts = qaHooks.getExpectedAlternatives() || [];
  const inst = state.currentInstance;
  const modeLabel = isTopicExamActive()
    ? `HARD EXAM (Q ${snap.stageTotal}/${TOPIC_EXAM_QUESTION_COUNT} · 90% req)`
    : state.practiceMode
      ? 'PRACTICE (ungraded)'
      : `GRADED (${snap.stageCorrect}/${snap.threshold} · ≥${snap.minAccuracy}%)`;

  const extras = [];
  const split = typeof qaHooks.getQuestionSplit === 'function' ? qaHooks.getQuestionSplit() : { hasExtension: false };
  if (split?.hasExtension) {
    extras.push(`Base: "${split.baseEs}" | Ext: "${split.extensionEs}"`);
  }
  if (inst?.isDynamic) {
    extras.push(`Fill: ${inst.fillKey} (${inst.variationCount} vars)`);
  }
  if (state.activeCategory === 'numbers' && state.currentContext?.isQuantity) {
    extras.push(`Qty: ${state.currentContext.quantityScenarioId}`);
  }
  if (alts.length > 1) {
    extras.push(`${alts.length} accepted variants`);
  }
  const extraHtml = extras.length > 0
    ? ` <span class="testing-expected-meta">· ${escapeHtmlText(extras.join(' · '))}</span>`
    : '';

  bannerEl.innerHTML = `
    <span class="testing-expected-badge">QA EXPECTED</span>
    <strong class="testing-expected-es">${escapeHtmlText(spoken)}</strong>
    <span class="testing-expected-meta">[${escapeHtmlText(modeLabel)}]</span>${extraHtml}
  `;
  bannerEl.classList.remove('hidden');
}

function populateJumpSelectors() {
  const topicSel = document.getElementById('test-jump-topic-select');
  const stageSel = document.getElementById('test-jump-stage-select');
  if (!topicSel || !stageSel) return;

  const prevTopic = topicSel.value && CATEGORIES[topicSel.value] ? topicSel.value : state.activeCategory;
  topicSel.innerHTML = CATEGORY_ORDER.map((id) => {
    const cat = CATEGORIES[id];
    return `<option value="${escapeHtmlText(id)}">${escapeHtmlText(cat.label)}</option>`;
  }).join('');
  topicSel.value = CATEGORIES[prevTopic] ? prevTopic : CATEGORY_ORDER[0];
  populateJumpStagesForTopic(topicSel.value);
}

function populateJumpStagesForTopic(catId) {
  const stageSel = document.getElementById('test-jump-stage-select');
  const cat = CATEGORIES[catId];
  if (!stageSel || !cat) return;
  const prog = getCategoryProgress(catId);
  stageSel.innerHTML = cat.stages
    .map((st, idx) => {
      const tag = st.isExam ? ' [EXAM 90%]' : '';
      return `<option value="${idx}">${idx + 1}. ${escapeHtmlText(st.shortTitle)}${tag}</option>`;
    })
    .join('');
  stageSel.value = String(Math.min(cat.stages.length - 1, Math.max(0, prog.stageIndex || 0)));
}

function unlockUpToTopicAndStage(targetCatId, targetStageIdx, { bypassPractice = true } = {}) {
  const cat = CATEGORIES[targetCatId];
  if (!cat) return;
  const targetOrderIdx = CATEGORY_ORDER.indexOf(targetCatId);
  for (let i = 0; i < targetOrderIdx; i += 1) {
    const prevId = CATEGORY_ORDER[i];
    const prevCat = CATEGORIES[prevId];
    const prevProg = getCategoryProgress(prevId);
    prevProg.completedStages = prevCat.stages.map((_, idx) => idx);
    prevProg.stageIndex = prevCat.stages.length - 1;
  }

  const prog = getCategoryProgress(targetCatId);
  const clampedIdx = Math.min(cat.stages.length - 1, Math.max(0, Number(targetStageIdx) || 0));
  prog.completedStages = Array.from({ length: clampedIdx }, (_, idx) => idx);
  prog.skippedStages = (prog.skippedStages || []).filter((idx) => idx < clampedIdx);
  prog.stageIndex = clampedIdx;
  prog.skills = createEmptySkillsMap();
  prog.stageCorrect = 0;
  prog.stageTotal = 0;
  prog.skillTurn = 0;
  prog.recentOutcomes = [];

  if (bypassPractice) {
    if (!(state.completedPracticeStages instanceof Set)) {
      state.completedPracticeStages = new Set(state.completedPracticeStages || []);
    }
    const stKey = cat.stages[clampedIdx]?.stageKey || `s${clampedIdx}`;
    state.completedPracticeStages.add(`${targetCatId}:${stKey}`);
    state.practiceMode = false;
  }
  if (targetCatId === 'numbers' && cat.stages[clampedIdx]?.contextMode) {
    state.contextMode = cat.stages[clampedIdx].contextMode;
  }

  state.seenTopicGuides.add(targetCatId);
  state.answered = false;
  savePersistedData();

  qaHooks.onSwitchView('play');
  qaHooks.onSwitchCategory(targetCatId);
  qaHooks.onSyncQuestionTypeUI();
  qaHooks.onSyncDirectionUI();
  syncProgressionUI();
  qaHooks.onLoadQuestion();
  syncTestingExpectedBanner();
}

export function simulateCurrentAnswer(mode = 'pass') {
  if (state.activeView !== 'play' || !isCategoryUnlocked(state.activeCategory)) {
    setTestingStatus('Switch to Learn view on an unlocked topic first.', 'error');
    return;
  }
  if (state.answered) {
    setTestingStatus('Current question is already answered — wait for advance or click Next.', 'error');
    return;
  }
  const expectedEs = qaHooks.getSpokenText() || 'hola';
  const dummyBlob = new Blob([new Uint8Array(1200)], { type: 'audio/webm' });

  const isPass = mode === 'pass' || mode === 'polish';
  const score = mode === 'pass' ? 96 : mode === 'polish' ? 84 : 42;
  const charDetails = expectedEs
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word, wIdx) =>
      Array.from(word.replace(/[¿?¡!.,;:]/g, '')).map((ch, cIdx) => ({
        ch,
        wordIndex: wIdx,
        score: mode === 'pass' ? 96 : mode === 'polish' ? (cIdx === 0 ? 74 : 92) : 40
      }))
    );

  const split = typeof qaHooks.getQuestionSplit === 'function' ? qaHooks.getQuestionSplit() : { hasExtension: false };
  const baseOnlyRated = Boolean(split?.hasExtension && split.baseEs && split.extensionEs);
  const extensionRating = baseOnlyRated
    ? {
      key: split.extensionKey,
      catId: split.catId,
      es: split.extensionLabelEs || split.extensionEs,
      en: split.extensionLabelEn || split.extensionEn,
      group: split.extensionGroup || '',
      isCorrect: isPass,
      score,
      needsImprovement: mode === 'polish'
    }
    : null;

  voiceCaptureState.questionAudioBlob = dummyBlob;
  voiceCaptureState.isScoring = false;
  voiceCaptureState.scoringErrorRequiresRedo = false;
  voiceCaptureState.questionLocalResult = {
    heard: isPass ? expectedEs : 'incorrecto',
    heardTranslation: isPass ? '' : 'wrong phrase (simulated)',
    voiceCommand: null,
    isRepeatCmd: false,
    skipped: false,
    wrongWord: !isPass,
    score,
    accuracy: score,
    fluency: isPass ? 92 : 55,
    isCorrect: isPass,
    needsPronunciationImprovement: mode === 'polish',
    tipText:
      mode === 'pass'
        ? 'Simulated clean Panamanian pass (96/100)'
        : mode === 'polish'
          ? 'Simulated polish pass (84/100)'
          : 'Simulated miss (42/100)',
    prosodyTip: '',
    expectedEs,
    audioBlob: dummyBlob,
    audioStats: { rmsDb: -18, clippingDetected: false, durationMs: 950 },
    charDetails,
    baseCharDetails: charDetails,
    weakChars: mode === 'polish' ? [charDetails[0]?.ch || 'r'] : [],
    baseOnlyRated,
    baseEs: baseOnlyRated ? split.baseEs : '',
    extensionRating,
    panamaNormalization: null,
    rawResponse: { simulated: true, mode }
  };

  commitLocalPronunciationResult();
  setTestingStatus(
    mode === 'pass'
      ? `Simulated PASS (96%) on "${expectedEs}". Expected: +1 correct & advance.`
      : mode === 'polish'
        ? `Simulated POLISH PASS (84%) on "${expectedEs}". Expected: Pass + "could be improved".`
        : `Simulated FAIL (42%) on "${expectedEs}". Expected: ${isTopicExamActive() ? 'Immediate Exam Incorrect Screen (1 try)' : 'Attempt count +1 or Incorrect Screen'}.`,
    isPass ? 'ok' : 'info'
  );
  syncTestingExpectedBanner();
}

export function runAllAutomatedSelfTests() {
  const results = [];
  const addCheck = (name, expected, actual, passed) => {
    results.push({ name, expected, actual, passed: Boolean(passed) });
  };

  // 1. Dynamic Structures & Curriculum Variation Audit
  const allPhraseItems = CATEGORY_ORDER.filter((id) => id !== 'numbers').flatMap((id) =>
    getItemsForCategory(id)
  );
  const dynItems = allPhraseItems.filter((it) => Boolean(it.structure));
  let totalVars = 0;
  let malformedCount = 0;
  let contractionBugs = 0;
  dynItems.forEach((it) => {
    const vars = getAllVariationsForStructure(it);
    totalVars += vars.length;
    vars.forEach((v) => {
      if (!v.es || !v.en || /\{|\}/.test(v.es) || /\{|\}/.test(v.en)) malformedCount += 1;
      if (/\bde el\b|\ba el\b/i.test(v.es)) contractionBugs += 1;
    });
  });
  addCheck(
    'Dynamic Structures & Variations',
    '≥80 structures, ≥3,000 scenarios, 0 malformed, 0 "de el/a el" bugs',
    `${dynItems.length} structures, ${totalVars} scenarios, ${malformedCount} malformed, ${contractionBugs} contraction bugs`,
    dynItems.length >= 80 && totalVars >= 3000 && malformedCount === 0 && contractionBugs === 0
  );

  // 2. Grammar Agreement & Contraction Spot-Checks
  const findVar = (itemId, fillKey) => {
    const it = allPhraseItems.find((x) => x.id === itemId);
    return it ? getAllVariationsForStructure(it).find((v) => v.fillKey === fillKey)?.es || '' : '';
  };
  const grammarChecks = [
    ['fam_abierto', 'farmacia', 'la farmacia está abierta'],
    ['fam_cerrado', 'banco', 'el banco está cerrado'],
    ['t_al_lado', 'al_lado__hotel', 'está al lado del hotel'],
    ['a1_duele_cabeza', 'pies', 'me duelen los pies'],
    ['t_desayuno_inc', 'toallas', '¿las toallas están incluidas?'],
    ['fam_casa_grande', 'zapatos__caro', 'los zapatos son caros']
  ];
  const grammarFails = grammarChecks.filter(([id, fk, exp]) => findVar(id, fk) !== exp);
  addCheck(
    'Spanish Gender/Number & al/del Inflection',
    '6/6 grammar inflection test cases match expected Spanish',
    grammarFails.length === 0
      ? '6/6 matched (abierta, cerrado, del hotel, duelen los pies, incluidas, caros)'
      : `${6 - grammarFails.length}/6 matched (failed: ${grammarFails.map((x) => x[0]).join(', ')})`,
    grammarFails.length === 0
  );

  // 3. Numbers, Dollar Prices & 25 Quantity Scenarios
  let badPrices = 0;
  for (let n = 0; n <= 100; n += 1) {
    const ctx = buildQuestionContext(n, 'prices');
    const expEs = n === 1 ? 'dólar' : 'dólares';
    const expEn = n === 1 ? 'dollar' : 'dollars';
    if (!ctx.answerEs.endsWith(expEs) || !ctx.promptEn.endsWith(expEn)) badPrices += 1;
  }
  const hasBlocks = QUANTITY_SCENARIOS.some((sc) => sc.id === 'cuadras' || /block/i.test(sc.pluralEn));
  const m21 = buildQuestionContext(21, 'age', { quantityScenarioId: 'minutos' }).answerEs;
  const f21 = buildQuestionContext(21, 'age', { quantityScenarioId: 'personas' }).answerEs;
  addCheck(
    'Numbers, Dollars & 25 Quantity Scenarios',
    '101/101 prices use dólar/dólares, 25 scenarios (no Blocks), "veintiún minutos" & "veintiuna personas"',
    `${101 - badPrices}/101 valid dollar prices, ${QUANTITY_SCENARIOS.length} scenarios (Blocks=${hasBlocks}), "${m21}" / "${f21}"`,
    badPrices === 0 &&
    QUANTITY_SCENARIOS.length === 25 &&
    !hasBlocks &&
    m21 === 'veintiún minutos' &&
    f21 === 'veintiuna personas'
  );

  // 4. Harder Stage Thresholds & No Fail-Through Loophole
  const gWords0 = getItemsForStage('greetings', 0).length;
  const expectedPhraseTarget = Math.max(24, gWords0 * STAGE_PHRASE_MULTIPLIER);
  const gSnap = getProgressionSnapshot('greetings');
  const stageThresholdOk =
    PRESET_STAGE_MIN_ACCURACY === 85 &&
    STAGE_PHRASE_MULTIPLIER === 3 &&
    TOPIC_EXAM_QUESTION_COUNT === 30 &&
    TOPIC_EXAM_MIN_ACCURACY === 90;
  addCheck(
    'Harder Stage & Exam Threshold Constants',
    `Phrase=${expectedPhraseTarget} (3×${gWords0}), MinAcc=85%, Exam=30 Qs @ 90% (27+)`,
    `Phrase=${expectedPhraseTarget}, MinAcc=${PRESET_STAGE_MIN_ACCURACY}%, Exam=${TOPIC_EXAM_QUESTION_COUNT} Qs @ ${TOPIC_EXAM_MIN_ACCURACY}% (active target=${gSnap.targets?.speak})`,
    stageThresholdOk
  );

  // 5. All 8 Units Have Cumulative Final Topic Exam
  const examUnitsOk = CATEGORY_ORDER.every((catId) => {
    const stages = CATEGORIES[catId].stages;
    const last = stages[stages.length - 1];
    if (!last?.isExam) return false;
    if (catId === 'numbers') return last.contextMode === 'mixed';
    return getItemsForStage(catId, stages.length - 1).length === getItemsForCategory(catId).length;
  });
  addCheck(
    'Cumulative Topic Exam on All 8 Units',
    '8/8 units end with isExam=true covering 100% of unit items',
    `${CATEGORY_ORDER.filter((id) => CATEGORIES[id].stages.at(-1)?.isExam).length}/8 units have cumulative Final Exam`,
    examUnitsOk
  );

  // 6. Multi-Option (spanish_options) & Combination Matching
  const petItem = allPhraseItems.find((x) => x.id === 'fam_mascota');
  const petCfg = petItem ? getSlotConfigForItem(petItem) : null;
  const comboMatch = Boolean(
    petItem?.slotTemplate && matchesSlotTemplateSpanish('tengo un perro y un gato', petItem.slotTemplate)
  );
  const singleMatch = Boolean(
    petItem?.slotTemplate && matchesSlotTemplateSpanish('tengo un caballo', petItem.slotTemplate)
  );
  const spokenSample = petItem ? getSpeakableSpanishForItem(petItem, 'un perro') : '';
  addCheck(
    'Multi-Option & Combination Matching',
    '25 pet options, accepts "tengo un caballo" & "tengo un perro y un gato", 0 brackets in TTS',
    `${petCfg?.options?.length || 0} options, single=${singleMatch}, combo=${comboMatch}, tts="${spokenSample}"`,
    petCfg?.options?.length === 25 && singleMatch && comboMatch && !/\[|\]/.test(spokenSample)
  );

  // 7. Hands-Free Prompt Normalizer
  const t00 = formatPromptForEnglishTts({ isContext: true, resolvedMode: 'time', promptEn: '8:00' }, null, { categoryId: 'numbers', num: 0 });
  const t05 = formatPromptForEnglishTts({ isContext: true, resolvedMode: 'time', promptEn: '8:05' }, null, { categoryId: 'numbers', num: 5 });
  const p15 = formatPromptForEnglishTts(buildQuestionContext(15, 'prices'), null, { categoryId: 'numbers', num: 15 });
  addCheck(
    'Hands-Free Prompt Normalizer',
    '8:00→"8 o\'clock", 8:05→"8 oh 5", $15→"15 dollars"',
    `"${t00}", "${t05}", "${p15}"`,
    t00 === "8 o'clock" && t05 === '8 oh 5' && p15 === '15 dollars'
  );

  // 8. Browser Capabilities & Storage Key
  const hasMR = typeof MediaRecorder !== 'undefined';
  const hasSTT = Boolean(getSpeechRecognitionCtor());
  const hasTTS = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const hasStorage = Boolean(localStorage.getItem(STORAGE_KEY));
  addCheck(
    'Browser Audio, Mic & Persistence',
    `MediaRecorder=true, SpeechSynthesis=true, StorageKey=${STORAGE_KEY}`,
    `MediaRecorder=${hasMR}, SpeechRec=${hasSTT}, SpeechSynth=${hasTTS}, LocalScorer=${voiceCaptureState.localScorerStatus}, Saved=${hasStorage}`,
    hasMR && hasTTS
  );

  // 9. Base-Only Rating & Separate Extension Split (All Units)
  const findVarObj = (itemId, fillKey) => {
    const it = allPhraseItems.find((x) => x.id === itemId);
    return it ? getAllVariationsForStructure(it).find((v) => v.fillKey === fillKey) || null : null;
  };
  const vVecina = findVarObj('g_como_estas', 'vecina');
  const vFarmacia = findVarObj('fam_abierto', 'farmacia');
  const vHotel = findVarObj('t_al_lado', 'al_lado__hotel');
  const vSiempre = findVarObj('v_siempre', 'siempre__despierto');
  const ctxEmp = buildQuestionContext(21, 'age', { quantityScenarioId: 'empanadas' });
  const splitOk =
    Boolean(vVecina?.hasExtension && vVecina.baseEs === 'cómo está' && vVecina.extensionEs === 'vecina' && vVecina.extensionKey === 'greetings::vecina') &&
    Boolean(vFarmacia?.hasExtension && vFarmacia.baseEs === 'está abierta' && vFarmacia.extensionEs === 'la farmacia') &&
    Boolean(vHotel?.hasExtension && vHotel.baseEs === 'está' && vHotel.extensionEs.includes('hotel')) &&
    Boolean(vSiempre?.hasExtension && vSiempre.baseEs === 'siempre' && vSiempre.extensionEs.includes('despierto')) &&
    Boolean(ctxEmp?.hasExtension && ctxEmp.baseEs === 'veintiuna' && ctxEmp.extensionEs === 'empanadas' && ctxEmp.extensionKey === 'numbers::empanadas') &&
    Boolean(state.extensionCounts && typeof state.extensionCounts === 'object');
  addCheck(
    'Base-Only Rating & Separate Extension Split',
    'vecina→base "cómo está"/ext "vecina", 21 empanadas→base "veintiuna"/ext "empanadas", extensionCounts store ready',
    `vecina=(${vVecina?.baseEs || '?'} | ${vVecina?.extensionEs || '?'}), emp=(${ctxEmp?.baseEs || '?'} | ${ctxEmp?.extensionEs || '?'}), store=${typeof state.extensionCounts}`,
    splitOk
  );

  lastDiagnosticsReport = {
    ranAt: new Date().toISOString(),
    engine: isLocalScorerActive() ? 'local' : 'browser',
    passedCount: results.filter((r) => r.passed).length,
    totalCount: results.length,
    results
  };

  renderDiagnosticsResults();
  return lastDiagnosticsReport;
}

function renderDiagnosticsResults() {
  const container = document.getElementById('testing-diagnostics-results');
  const summaryEl = document.getElementById('testing-diagnostics-summary');
  if (!container) return;
  if (!lastDiagnosticsReport) {
    container.innerHTML = '<div class="testing-empty-note">Click "Run All Checks" to audit curriculum, thresholds, exam rules, multi-options, and audio APIs.</div>';
    return;
  }
  const { passedCount, totalCount, results } = lastDiagnosticsReport;
  if (summaryEl) {
    summaryEl.textContent = `${passedCount}/${totalCount} Passed`;
    summaryEl.className = `testing-summary-pill ${passedCount === totalCount ? 'is-pass' : 'is-fail'}`;
  }
  container.innerHTML = results
    .map(
      (r) => `
      <div class="testing-check-row ${r.passed ? 'is-pass' : 'is-fail'}">
        <div class="testing-check-top">
          <span class="testing-check-name">${escapeHtmlText(r.name)}</span>
          <span class="testing-check-badge ${r.passed ? 'is-pass' : 'is-fail'}">${r.passed ? 'PASS' : 'FAIL'}</span>
        </div>
        <div class="testing-check-detail"><strong>Expected:</strong> ${escapeHtmlText(r.expected)}</div>
        <div class="testing-check-detail"><strong>Actual:</strong> ${escapeHtmlText(r.actual)}</div>
      </div>
    `
    )
    .join('');
}

function renderCurrentQuestionInspector() {
  const box = document.getElementById('testing-inspector-body');
  if (!box) return;
  const snap = getProgressionSnapshot(state.activeCategory);
  const spoken = qaHooks.getSpokenText() || '—';
  const display = qaHooks.getDisplayText() || '—';
  const alts = qaHooks.getExpectedAlternatives() || [];
  const activeData = qaHooks.getActivePhraseData();
  const inst = state.currentInstance;

  const split = typeof qaHooks.getQuestionSplit === 'function' ? qaHooks.getQuestionSplit() : { hasExtension: false };
  const rows = [
    ['Active Topic & Stage', `${snap.category.label} · Stage ${snap.stageNum}/${snap.totalStages}: ${snap.stage.shortTitle}${snap.isExamStage ? ' (HARD EXAM)' : ''}`],
    ['Stage Progress (Expected)', snap.isExamStage
      ? `Q ${snap.stageTotal}/${TOPIC_EXAM_QUESTION_COUNT} · Score ${snap.stageCorrect}/${snap.stageTotal} (${snap.accRounded}%) · Expected ≥90% (27+)`
      : `${snap.stageCorrect}/${snap.threshold} correct (${snap.accRounded}%) · Expected ≥${snap.minAccuracy}%`],
    ['Mode', isTopicExamActive() ? 'Hard Topic Exam (1 try · No hints)' : state.practiceMode ? 'Practice Mode (ungraded)' : 'Graded Speaking Mode (2 tries + 1 retry)'],
    ['Expected Spoken Spanish', spoken],
    ['Base vs Extension Rating', split?.hasExtension
      ? `Rated Base: "${split.baseEs}" (words [${(split.baseWordIndices || []).join(',')}]) · Separate Extension: "${split.extensionEs}" (${split.extensionKey})`
      : 'Single-part prompt (full phrase rated as Base)'],
    ['Expected Display Spanish', display],
    ['Accepted Alternatives', alts.length > 0 ? `${alts.length} variants: ${alts.slice(0, 6).join(' | ')}${alts.length > 6 ? ' …' : ''}` : 'None'],
    ['Dynamic Structure / Context', inst?.isDynamic
      ? `${inst.patternEs} · fillKey="${inst.fillKey}" (${inst.variationCount} scenarios)`
      : state.activeCategory === 'numbers' && state.currentContext
        ? `Numbers mode="${state.currentContext.resolvedMode || state.contextMode}"${state.currentContext.isQuantity ? ` · qty="${state.currentContext.quantityScenarioId}"` : ''}`
        : activeData?.id
          ? `Static item id="${activeData.id}"`
          : '—']
  ];

  box.innerHTML = rows
    .map(
      ([k, v]) => `
      <div class="testing-kv-row">
        <span class="testing-kv-key">${escapeHtmlText(k)}</span>
        <span class="testing-kv-val">${escapeHtmlText(String(v))}</span>
      </div>
    `
    )
    .join('');
}

export function openTestingSuiteModal() {
  qaHooks.onCloseSettingsPopover();
  const backdrop = document.getElementById('testing-suite-modal-backdrop');
  if (!backdrop) return;
  renderCurrentQuestionInspector();
  if (!lastDiagnosticsReport) {
    runAllAutomatedSelfTests();
  } else {
    renderDiagnosticsResults();
  }
  backdrop.classList.remove('hidden');
}

export function closeTestingSuiteModal() {
  const backdrop = document.getElementById('testing-suite-modal-backdrop');
  if (backdrop) backdrop.classList.add('hidden');
}

export function initTestingTools(hooks = {}) {
  qaHooks = { ...qaHooks, ...hooks };
  populateJumpSelectors();

  const topicSel = document.getElementById('test-jump-topic-select');
  const stageSel = document.getElementById('test-jump-stage-select');
  if (topicSel) {
    topicSel.addEventListener('change', () => populateJumpStagesForTopic(topicSel.value));
  }

  document.getElementById('open-testing-suite-btn')?.addEventListener('click', openTestingSuiteModal);
  document.getElementById('testing-suite-close-x')?.addEventListener('click', closeTestingSuiteModal);
  document.getElementById('testing-suite-close-btn')?.addEventListener('click', closeTestingSuiteModal);
  const suiteBackdrop = document.getElementById('testing-suite-modal-backdrop');
  if (suiteBackdrop) {
    suiteBackdrop.addEventListener('click', (e) => {
      if (e.target === suiteBackdrop) closeTestingSuiteModal();
    });
  }

  document.getElementById('test-sim-pass-btn')?.addEventListener('click', () => {
    qaHooks.onCloseSettingsPopover();
    simulateCurrentAnswer('pass');
  });
  document.getElementById('test-sim-polish-btn')?.addEventListener('click', () => {
    qaHooks.onCloseSettingsPopover();
    simulateCurrentAnswer('polish');
  });
  document.getElementById('test-sim-fail-btn')?.addEventListener('click', () => {
    qaHooks.onCloseSettingsPopover();
    simulateCurrentAnswer('fail');
  });

  document.getElementById('test-jump-go-btn')?.addEventListener('click', () => {
    const catId = topicSel?.value || state.activeCategory;
    const stIdx = Number(stageSel?.value || 0);
    qaHooks.onCloseSettingsPopover();
    unlockUpToTopicAndStage(catId, stIdx, { bypassPractice: true });
    setTestingStatus(`Jumped to ${CATEGORIES[catId]?.label} · Stage ${stIdx + 1}.`, 'ok');
  });

  document.getElementById('test-unlock-all-btn')?.addEventListener('click', () => {
    CATEGORY_ORDER.forEach((catId) => {
      const cat = CATEGORIES[catId];
      const prog = getCategoryProgress(catId);
      if (catId !== CATEGORY_ORDER[CATEGORY_ORDER.length - 1]) {
        prog.completedStages = cat.stages.map((_, i) => i);
        prog.stageIndex = cat.stages.length - 1;
      }
      state.seenTopicGuides.add(catId);
    });
    savePersistedData();
    syncProgressionUI();
    qaHooks.onRenderCategoryNav();
    qaHooks.onRenderPathView();
    setTestingStatus('All 8 CEFR A1 units unlocked! Expected: every unit accessible in Path & Guidebook.', 'ok');
  });

  document.getElementById('test-bypass-practice-btn')?.addEventListener('click', () => {
    const snap = getProgressionSnapshot(state.activeCategory);
    const stKey = snap.stage?.stageKey || `s${snap.stageIndex}`;
    if (!(state.completedPracticeStages instanceof Set)) {
      state.completedPracticeStages = new Set(state.completedPracticeStages || []);
    }
    state.completedPracticeStages.add(`${state.activeCategory}:${stKey}`);
    state.practiceMode = false;
    savePersistedData();
    qaHooks.onCloseSettingsPopover();
    qaHooks.onSyncPracticeModeCardUI({ autoSpeak: false });
    qaHooks.onLoadQuestion();
    setTestingStatus('Practice gate bypassed! Expected: Graded Mode active immediately.', 'ok');
  });

  document.getElementById('test-near-stage-end-btn')?.addEventListener('click', () => {
    const snap = getProgressionSnapshot(state.activeCategory);
    const prog = getCategoryProgress(state.activeCategory);
    if (snap.isExamStage) {
      prog.skills.speak = { correct: 26, total: 29 };
      prog.stageCorrect = 26;
      prog.stageTotal = 29;
      setTestingStatus('Set Topic Exam to 26/29. Expected: next PASS = 27/30 (90% Pass!), next FAIL = 26/30 (Exam Failed).', 'ok');
    } else {
      const t = Math.max(1, snap.targets.speak - 1);
      prog.skills.speak = { correct: t, total: t };
      prog.stageCorrect = t;
      prog.stageTotal = t;
      setTestingStatus(`Set stage to ${t}/${snap.targets.speak} (100%). Expected: next PASS completes stage!`, 'ok');
    }
    savePersistedData();
    syncProgressionUI();
    qaHooks.onSyncQuestionTypeUI();
    syncTestingExpectedBanner();
  });

  document.getElementById('test-trigger-exam-fail-btn')?.addEventListener('click', () => {
    const cat = CATEGORIES[state.activeCategory];
    if (!cat) return;
    const examIdx = cat.stages.length - 1;
    qaHooks.onCloseSettingsPopover();
    unlockUpToTopicAndStage(state.activeCategory, examIdx, { bypassPractice: true });
    const prog = getCategoryProgress(state.activeCategory);
    prog.skills.speak = { correct: 26, total: 29 };
    prog.stageCorrect = 26;
    prog.stageTotal = 29;
    savePersistedData();
    syncProgressionUI();
    simulateCurrentAnswer('fail');
  });

  const expectedToggleBtn = document.getElementById('test-show-expected-toggle');
  const expectedStatusEl = document.getElementById('test-show-expected-status');
  if (expectedToggleBtn) {
    expectedToggleBtn.addEventListener('click', () => {
      showExpectedOverlay = !showExpectedOverlay;
      expectedToggleBtn.classList.toggle('active', showExpectedOverlay);
      expectedToggleBtn.setAttribute('aria-pressed', String(showExpectedOverlay));
      if (expectedStatusEl) expectedStatusEl.textContent = showExpectedOverlay ? 'On' : 'Off';
      syncTestingExpectedBanner();
    });
  }

  // Modal QA Suite buttons
  document.getElementById('testing-run-all-btn')?.addEventListener('click', () => {
    runAllAutomatedSelfTests();
    renderCurrentQuestionInspector();
  });

  document.getElementById('testing-copy-report-btn')?.addEventListener('click', async () => {
    const report = lastDiagnosticsReport || runAllAutomatedSelfTests();
    const lines = [
      `Panamanian Spanish A1 QA Report (${report.ranAt})`,
      `Summary: ${report.passedCount}/${report.totalCount} Passed · Engine: ${report.engine}`,
      ...report.results.map(
        (r) => `[${r.passed ? 'PASS' : 'FAIL'}] ${r.name}\n  Expected: ${r.expected}\n  Actual:   ${r.actual}`
      )
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      const btn = document.getElementById('testing-copy-report-btn');
      if (btn) {
        btn.textContent = 'Copied ✓';
        setTimeout(() => { btn.textContent = 'Copy Report'; }, 1500);
      }
    } catch {
      // Clipboard may be unavailable in restricted contexts
    }
  });

  // UI & Modal Triggers inside QA Suite
  document.getElementById('qa-trigger-award-modal-btn')?.addEventListener('click', () => {
    const snap = getProgressionSnapshot(state.activeCategory);
    closeTestingSuiteModal();
    openStageCompleteAwardModal({
      catId: state.activeCategory,
      stageLabel: snap.stage.label,
      stageCorrect: snap.targets.speak,
      stageTotal: snap.targets.speak,
      accRounded: 100,
      skills: snap.skills,
      seenCount: 12,
      totalCount: 12,
      nextStageIndex: snap.stageIndex < snap.totalStages - 1 ? snap.stageIndex + 1 : null,
      isFinalStage: snap.isFinalStage,
      isExamStage: snap.isExamStage
    });
  });

  document.getElementById('qa-trigger-exam-brief-btn')?.addEventListener('click', () => {
    const cat = CATEGORIES[state.activeCategory];
    if (!cat) return;
    closeTestingSuiteModal();
    openNextStagePreviewModal(state.activeCategory, cat.stages.length - 1);
  });

  document.getElementById('qa-trigger-exam-fail-modal-btn')?.addEventListener('click', () => {
    const cat = CATEGORIES[state.activeCategory];
    closeTestingSuiteModal();
    openTopicExamFailedModal({
      catId: state.activeCategory,
      stageLabel: cat?.stages?.at(-1)?.label || 'Topic Exam',
      stageCorrect: 26,
      stageTotal: 30,
      accRounded: 87
    });
  });

  document.getElementById('qa-trigger-unit-complete-btn')?.addEventListener('click', () => {
    closeTestingSuiteModal();
    openSubjectCompleteModal(state.activeCategory);
  });

  document.getElementById('qa-trigger-memory-tip-btn')?.addEventListener('click', () => {
    if (state.activeCategory !== 'numbers' && state.currentItem?.id) {
      const id = state.currentItem.id;
      if (!state.phraseCounts[id]) state.phraseCounts[id] = { correct: 0, incorrect: 0, byDate: {} };
      state.phraseCounts[id].incorrect = Math.max(3, (state.phraseCounts[id].incorrect || 0) + 3);
    } else if (state.activeCategory === 'numbers' && state.currentNum >= 0) {
      if (!state.counts[state.currentNum]) state.counts[state.currentNum] = { correct: 0, incorrect: 0, byDate: {} };
      state.counts[state.currentNum].incorrect = Math.max(3, (state.counts[state.currentNum].incorrect || 0) + 3);
    }
    savePersistedData();
    closeTestingSuiteModal();
    qaHooks.onUpdateMemoryTipUI();
  });

  document.getElementById('qa-trigger-daily-30m-btn')?.addEventListener('click', () => {
    const key = getLocalDateKey();
    state.dailyActiveSeconds[key] = Math.max(1800, Number(state.dailyActiveSeconds[key]) || 0);
    savePersistedData();
    qaHooks.onUpdateDailyGoalUI();
    qaHooks.onEvaluateAchievements({ recordActivity: true });
    renderCurrentQuestionInspector();
  });

  document.getElementById('qa-trigger-sfx-correct-btn')?.addEventListener('click', () => playCorrectSound());
  document.getElementById('qa-trigger-sfx-wrong-btn')?.addEventListener('click', () => playIncorrectSound());
  document.getElementById('qa-trigger-sfx-earcon-btn')?.addEventListener('click', () => playListeningReadyChime());
  document.getElementById('qa-trigger-sfx-pause-btn')?.addEventListener('click', () => playHandsFreePausedSound());

  document.querySelectorAll('[data-qa-voice-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.qaVoiceCmd;
      if (!cmd) return;
      closeTestingSuiteModal();
      qaHooks.onVoiceCommand(cmd, { expectedEs: qaHooks.getSpokenText() });
    });
  });
}
