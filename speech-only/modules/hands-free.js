import {
  playHandsFreePausedSound,
  playListeningReadyChime,
  speakSpanishAsync,
  speakSpanishWordByWordAsync,
  stopAllSpeech
} from './audio.js';
import {
  handsFreeCommandsDrawerEl,
  handsFreeInlineIntroEl,
  handsFreeModeBtn,
  handsFreeModeLabelEl,
  typeAnswerFeedbackEl
} from './dom.js';
import { logSpeechEvent } from './speech-console.js';
import { savePersistedData, state } from './state.js';
import { markStudyActivity } from './study-timer.js';
import { escapeHtmlText } from './utils.js';
import {
  acquirePersistentMicStream,
  cancelActiveQuestionRecording,
  releasePersistentMicStream,
  resetQuestionVoiceCapture,
  startVoiceCapture,
  stopActiveVoiceCapture,
  voiceCaptureState
} from './voice-capture.js';

export const HANDS_FREE_NEW_WORD_AUDIO_DELAY_MS = 500;

export const handsFreeState = {
  enabled: false,
  phase: 'idle', // 'idle' | 'speaking-prompt' | 'cooldown' | 'listening' | 'recording' | 'scoring' | 'coaching' | 'review' | 'paused'
  sessionToken: 0,
  consecutiveNoSpeechCount: 0,
  wakeLockSentinel: null,
  pausedReason: '',
  statusNote: '',
  activeTimers: new Set(),
  shownHeadphoneTip: false
};

let hfHooks = {
  getSpokenText: () => '',
  getDisplayText: () => '',
  getCurrentPromptMeta: () => ({
    categoryId: state.activeCategory,
    num: state.currentNum,
    context: state.currentContext,
    item: state.currentItem,
    isPractice: Boolean(state.practiceMode),
    quantityMissCount: 0
  }),
  isPlayViewUnlocked: () => false,
  onMarkWordIntroduced: () => { },
  onStartRetryRound: () => { },
  onContinueFromIncorrect: () => { },
  onSkipQuestion: () => { },
  onPracticeAdvance: () => { },
  onEnterGradedFromPractice: () => { },
  onDismissStageModals: () => { },
  onUpdateVolumeUI: () => { },
  onSyncSpeechPreferencesUI: () => { }
};

function clearHandsFreeTimers() {
  handsFreeState.activeTimers.forEach((id) => clearTimeout(id));
  handsFreeState.activeTimers.clear();
}

function waitMs(ms, token) {
  const delay = Math.max(0, Number(ms) || 0);
  if (delay === 0) {
    return Promise.resolve(token === handsFreeState.sessionToken && handsFreeState.enabled && handsFreeState.phase !== 'paused');
  }
  return new Promise((resolve) => {
    const id = setTimeout(() => {
      handsFreeState.activeTimers.delete(id);
      resolve(token === handsFreeState.sessionToken && handsFreeState.enabled && handsFreeState.phase !== 'paused');
    }, delay);
    handsFreeState.activeTimers.add(id);
  });
}

function isTokenAlive(token) {
  return (
    handsFreeState.enabled &&
    handsFreeState.phase !== 'idle' &&
    handsFreeState.phase !== 'paused' &&
    handsFreeState.sessionToken === token
  );
}

export function isHandsFreeActive() {
  return Boolean(handsFreeState.enabled && handsFreeState.phase !== 'idle');
}

export function isHandsFreeRunning() {
  return Boolean(
    handsFreeState.enabled &&
    handsFreeState.phase !== 'idle' &&
    handsFreeState.phase !== 'paused'
  );
}

export function isHandsFreeBusy() {
  return isHandsFreeRunning();
}

export function hideHandsFreeInlineIntro() {
  if (!handsFreeInlineIntroEl) return;
  handsFreeInlineIntroEl.innerHTML = '';
  handsFreeInlineIntroEl.classList.add('hidden');
}

function showHandsFreeInlineIntro(enText, esText) {
  if (!handsFreeInlineIntroEl) return;
  handsFreeInlineIntroEl.innerHTML = `<span>New phrase: <strong>${escapeHtmlText(esText)}</strong> — ${escapeHtmlText(enText)}</span>`;
  handsFreeInlineIntroEl.classList.remove('hidden');
}

async function acquireWakeLock() {
  if (!navigator.wakeLock || typeof navigator.wakeLock.request !== 'function') return;
  if (handsFreeState.wakeLockSentinel) return;
  try {
    const sentinel = await navigator.wakeLock.request('screen');
    handsFreeState.wakeLockSentinel = sentinel;
    sentinel.addEventListener('release', () => {
      if (handsFreeState.wakeLockSentinel === sentinel) {
        handsFreeState.wakeLockSentinel = null;
      }
    });
  } catch {
    // Wake Lock may be unavailable or denied in headless/background contexts
  }
}

async function releaseWakeLock() {
  const sentinel = handsFreeState.wakeLockSentinel;
  handsFreeState.wakeLockSentinel = null;
  if (!sentinel) return;
  try {
    await sentinel.release();
  } catch {
    // Ignore wake lock release errors
  }
}

export function formatPromptForEnglishTts(ctx, item, { categoryId = state.activeCategory, num = state.currentNum } = {}) {
  if (categoryId === 'numbers') {
    if (!ctx || !ctx.isContext) {
      return String(num);
    }
    const mode = ctx.resolvedMode || state.contextMode;
    if (mode === 'prices') {
      return `${num} ${num === 1 ? 'dollar' : 'dollars'}`;
    }
    if (mode === 'time') {
      const m = String(ctx.promptEn || '').match(/^(\d{1,2}):(\d{2})$/);
      if (m) {
        const hour = Number(m[1]);
        const minute = Number(m[2]);
        if (minute === 0) return `${hour} o'clock`;
        if (minute < 10) return `${hour} oh ${minute}`;
        return `${hour} ${minute}`;
      }
    }
    return String(ctx.promptEn || num).replace(/^\$(\d+)\s+(dollars?)$/i, '$1 $2').trim();
  }

  let raw = String(item?.en || '').trim();
  if (!raw) return '';

  // Convert open-slot brackets like "[your name]" -> "say your own name"
  raw = raw.replace(/\[([^\]]+)\]/g, (_, inner) => {
    const cleaned = String(inner || '').trim();
    if (!cleaned) return '';
    return /^your\b/i.test(cleaned) ? `— say ${cleaned}` : `— say a ${cleaned}`;
  });

  // Preserve disambiguating parentheticals cleanly as spoken clauses
  raw = raw.replace(/\(([^)]+)\)/g, (_, inner) => {
    const cleaned = String(inner || '').trim();
    return cleaned ? `, ${cleaned}` : '';
  });

  // Replace slash variants ("hello / hi") with concise spoken alternative ("hello, or hi")
  if (raw.includes('/')) {
    const parts = raw
      .split('/')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      raw = `${parts[0]}, or ${parts[1]}`;
    } else if (parts.length === 1) {
      raw = parts[0];
    }
  }

  return raw.replace(/\s+/g, ' ').replace(/\s+,/g, ',').replace(/([?!.])\s*,/g, '$1').trim();
}

function getPhaseDisplayInfo(phase) {
  switch (phase) {
    case 'speaking-prompt':
      return { label: 'Reading prompt…', cls: '' };
    case 'cooldown':
      return { label: 'Get ready…', cls: '' };
    case 'listening':
      return { label: 'Listening…', cls: 'is-listening' };
    case 'recording':
      return { label: 'Hearing speech…', cls: 'is-recording' };
    case 'scoring':
      return { label: 'Scoring…', cls: '' };
    case 'coaching':
      return { label: 'Coaching…', cls: '' };
    case 'review':
      return { label: 'Reviewing…', cls: '' };
    case 'paused':
      return { label: 'Paused', cls: 'is-paused' };
    default:
      return { label: 'Hands-Free', cls: '' };
  }
}

export function syncHandsFreeUI() {
  const active = isHandsFreeActive();
  const paused = handsFreeState.phase === 'paused';

  if (handsFreeModeBtn) {
    handsFreeModeBtn.classList.toggle('is-hf-active', active && !paused);
    handsFreeModeBtn.classList.toggle('is-hf-paused', active && paused);
    handsFreeModeBtn.setAttribute('aria-pressed', String(active));
    handsFreeModeBtn.title = active
      ? (paused
        ? 'Hands-Free Mode is paused — click to resume (Alt+H)'
        : 'Hands-Free Mode is active — click to stop (Alt+H)')
      : 'Start continuous Hands-Free speaking loop (Alt+H)';
  }
  if (handsFreeModeLabelEl) {
    handsFreeModeLabelEl.textContent = !active
      ? 'Hands-Free'
      : paused
        ? 'Hands-Free (Paused)'
        : 'Hands-Free On';
  }

  if (handsFreeCommandsDrawerEl) {
    handsFreeCommandsDrawerEl.classList.toggle('is-open', active);
    handsFreeCommandsDrawerEl.setAttribute('aria-hidden', String(!active));
  }
}

function setHandsFreePhase(phase, statusNote = '') {
  handsFreeState.phase = phase;
  handsFreeState.statusNote = statusNote;
  syncHandsFreeUI();
}

function getExpectedWordCount() {
  const es = String(hfHooks.getSpokenText() || '').trim();
  if (!es) return 1;
  return es.split(/\s+/).filter(Boolean).length;
}

async function armHandsFreeListening(token, { purpose = 'answer', skipCooldown = false, statusNote = '' } = {}) {
  if (!isTokenAlive(token)) return;
  if (!hfHooks.isPlayViewUnlocked()) return;
  if (purpose === 'answer' && state.answered) return;

  if (!skipCooldown) {
    setHandsFreePhase('cooldown', statusNote);
    const okCool = await waitMs(350, token);
    if (!okCool || !isTokenAlive(token)) return;
  }

  playListeningReadyChime();
  const okChime = await waitMs(state.sfxVolume > 0 ? 100 : 20, token);
  if (!okChime || !isTokenAlive(token)) return;
  if (purpose === 'answer' && state.answered) return;

  setHandsFreePhase('listening', statusNote);
  markStudyActivity();
  await startVoiceCapture('question', {
    handsFree: true,
    usePersistent: true,
    purpose,
    expectedWordCount: getExpectedWordCount()
  });
}

async function runCurrentQuestionTurn(token, { shouldShowIntro = false, introDetails = null, repeatOnlyPrompt = false } = {}) {
  if (!isTokenAlive(token)) return;
  if (!hfHooks.isPlayViewUnlocked()) return;

  const meta = hfHooks.getCurrentPromptMeta();
  const promptEn = formatPromptForEnglishTts(meta.context, meta.item, {
    categoryId: meta.categoryId,
    num: meta.num
  });
  const expectedEs = hfHooks.getSpokenText();
  const hasVolume = Number(state.volume) > 0;
  const volumeNote = !hasVolume
    ? 'Voice volume is 0% — click Unmute 80% to hear Spanish audio.'
    : '';

  hideHandsFreeInlineIntro();

  if (meta.isPractice) {
    let spokeSpanish = false;
    if (hasVolume && expectedEs) {
      setHandsFreePhase('cooldown', volumeNote);
      const okDelay = await waitMs(HANDS_FREE_NEW_WORD_AUDIO_DELAY_MS, token);
      if (!okDelay || !isTokenAlive(token)) return;
      setHandsFreePhase('speaking-prompt', volumeNote);
      const okEs = await speakSpanishAsync(expectedEs);
      if (!okEs || !isTokenAlive(token)) return;
      spokeSpanish = true;
    }
    await armHandsFreeListening(token, {
      purpose: 'answer',
      skipCooldown: !spokeSpanish,
      statusNote: volumeNote
    });
    return;
  }

  // Graded mode turn: show English on screen only (never speak English)
  await armHandsFreeListening(token, {
    purpose: 'answer',
    skipCooldown: true,
    statusNote: volumeNote
  });
}

export async function startHandsFreeSession() {
  if (!hfHooks.isPlayViewUnlocked()) return false;
  clearHandsFreeTimers();
  stopAllSpeech();

  handsFreeState.sessionToken += 1;
  const token = handsFreeState.sessionToken;
  handsFreeState.enabled = true;
  handsFreeState.consecutiveNoSpeechCount = 0;
  handsFreeState.pausedReason = '';
  state.handsFreeMode = true;

  logSpeechEvent('HANDS_FREE', 'Starting Hands-Free Mode session.', {
    readPrompt: state.handsFreeReadPrompt !== false,
    engine: state.pronunciationEngine
  });

  setHandsFreePhase('cooldown', 'Opening microphone…');
  try {
    await acquirePersistentMicStream();
  } catch (err) {
    if (handsFreeState.sessionToken !== token) return false;
    handsFreeState.enabled = false;
    state.handsFreeMode = false;
    setHandsFreePhase('idle');
    if (typeAnswerFeedbackEl) {
      typeAnswerFeedbackEl.textContent = err?.name === 'NotAllowedError'
        ? 'Hands-Free requires microphone permission.'
        : (err?.message || 'Could not start Hands-Free microphone.');
      typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-transcript');
      typeAnswerFeedbackEl.classList.add('is-warning');
    }
    return false;
  }

  if (handsFreeState.sessionToken !== token || !handsFreeState.enabled) return false;
  acquireWakeLock();
  syncHandsFreeUI();
  hfHooks.onSyncSpeechPreferencesUI();

  if (!state.answered) {
    runCurrentQuestionTurn(token);
  }
  return true;
}

export function pauseHandsFreeSession(reason = 'user', note = '') {
  if (!isHandsFreeActive()) return;
  if (handsFreeState.phase === 'paused' && handsFreeState.pausedReason === reason) return;

  handsFreeState.sessionToken += 1;
  clearHandsFreeTimers();
  stopAllSpeech();
  hideHandsFreeInlineIntro();

  if (voiceCaptureState.activeMode === 'question') {
    cancelActiveQuestionRecording(`Hands-Free paused (${reason})`);
  }
  releasePersistentMicStream();
  releaseWakeLock();

  handsFreeState.pausedReason = reason;
  const defaultNote =
    reason === 'inactivity'
      ? 'Auto-paused after 2 silent prompts — click Resume or press Space.'
      : reason === 'tab-hidden'
        ? 'Paused while tab was in background — click Resume or press Space.'
        : reason === 'scorer-offline'
          ? 'Local AI Scorer offline — check port 8765, then click Resume.'
          : reason === 'mic-ended'
            ? 'Microphone disconnected — reconnect mic, then click Resume.'
            : reason === 'stage-complete'
              ? 'Stage complete! Review your summary, then click Resume.'
              : reason === 'voice-command'
                ? 'Paused by voice command — click Resume or press Space.'
                : 'Paused — click Resume or press Space to continue.';

  setHandsFreePhase('paused', note || defaultNote);
  logSpeechEvent('HANDS_FREE', `Paused Hands-Free Mode (reason=${reason}).`);
  if (reason === 'inactivity' || reason === 'voice-command' || reason === 'user') {
    playHandsFreePausedSound();
  }
}

export async function resumeHandsFreeSession() {
  if (!handsFreeState.enabled) {
    return startHandsFreeSession();
  }
  if (!hfHooks.isPlayViewUnlocked()) return false;
  clearHandsFreeTimers();
  stopAllSpeech();

  handsFreeState.sessionToken += 1;
  const token = handsFreeState.sessionToken;
  handsFreeState.consecutiveNoSpeechCount = 0;
  handsFreeState.pausedReason = '';

  setHandsFreePhase('cooldown', 'Resuming Hands-Free…');
  try {
    await acquirePersistentMicStream();
  } catch (err) {
    if (handsFreeState.sessionToken !== token) return false;
    pauseHandsFreeSession('mic-ended', err?.message || 'Microphone unavailable.');
    return false;
  }

  if (handsFreeState.sessionToken !== token || !handsFreeState.enabled) return false;
  acquireWakeLock();
  logSpeechEvent('HANDS_FREE', 'Resumed Hands-Free Mode.');

  const incorrectPanelEl = document.getElementById('incorrect-screen-panel');
  if (incorrectPanelEl && !incorrectPanelEl.classList.contains('hidden')) {
    hfHooks.onContinueFromIncorrect();
    return true;
  }
  if (!state.answered) {
    runCurrentQuestionTurn(token);
  }
  return true;
}

export function stopHandsFreeSession() {
  const wasEnabled = handsFreeState.enabled;
  handsFreeState.sessionToken += 1;
  clearHandsFreeTimers();
  stopAllSpeech();
  hideHandsFreeInlineIntro();

  if (voiceCaptureState.activeMode === 'question') {
    voiceCaptureState.cancelPendingRecording = true;
    stopActiveVoiceCapture({ cancelQuietly: true });
    resetQuestionVoiceCapture({ resetAttempts: false });
  }
  releasePersistentMicStream();
  releaseWakeLock();

  handsFreeState.enabled = false;
  handsFreeState.phase = 'idle';
  handsFreeState.pausedReason = '';
  handsFreeState.statusNote = '';
  handsFreeState.consecutiveNoSpeechCount = 0;
  state.handsFreeMode = false;

  syncHandsFreeUI();
  hfHooks.onSyncSpeechPreferencesUI();
  if (wasEnabled) {
    logSpeechEvent('HANDS_FREE', 'Exited Hands-Free Mode.');
  }
}

export function toggleHandsFreeMode() {
  if (!isHandsFreeActive()) {
    return startHandsFreeSession();
  }
  if (handsFreeState.phase === 'paused') {
    return resumeHandsFreeSession();
  }
  stopHandsFreeSession();
  return false;
}

export function handleHandsFreeSpeechOnset() {
  if (!isHandsFreeRunning()) return;
  handsFreeState.consecutiveNoSpeechCount = 0;
  markStudyActivity();
  setHandsFreePhase('recording');
}

export function handleHandsFreeScoringStarted() {
  if (!isHandsFreeRunning()) return;
  setHandsFreePhase('scoring');
}

export function handleHandsFreeQuestionLoaded({ shouldShowIntro = false, introDetails = null } = {}) {
  if (!isHandsFreeRunning()) return false;
  clearHandsFreeTimers();
  handsFreeState.sessionToken += 1;
  const token = handsFreeState.sessionToken;
  runCurrentQuestionTurn(token, { shouldShowIntro, introDetails });
  return true;
}

export async function handleHandsFreeAttempt1Fail({ expectedEs = '', score = 0, wrongWord = false } = {}) {
  if (!isHandsFreeRunning()) return false;
  clearHandsFreeTimers();
  handsFreeState.sessionToken += 1;
  const token = handsFreeState.sessionToken;
  handsFreeState.consecutiveNoSpeechCount = 0;

  setHandsFreePhase('coaching', 'Listen to the Panamanian Spanish model, then try again.');
  const targetEs = expectedEs || hfHooks.getSpokenText();
  const useSlow = Boolean(wrongWord || (Number.isFinite(score) && score < 70));
  if (Number(state.volume) > 0 && targetEs) {
    const okEs = await speakSpanishAsync(targetEs, { rateOverride: useSlow ? 0.85 : null });
    if (!okEs || !isTokenAlive(token)) return true;
  }

  await armHandsFreeListening(token, { purpose: 'answer' });
  return true;
}

export async function handleHandsFreeIncorrectScreen({
  expectedEs = '',
  canRetry = false,
  wrongWord = false
} = {}) {
  if (!isHandsFreeRunning()) return false;
  clearHandsFreeTimers();
  handsFreeState.sessionToken += 1;
  const token = handsFreeState.sessionToken;
  handsFreeState.consecutiveNoSpeechCount = 0;

  const targetEs = expectedEs || hfHooks.getSpokenText();

  setHandsFreePhase('review', 'Listen to the correct Panamanian Spanish…');
  if (Number(state.volume) > 0 && targetEs) {
    const okEs = await speakSpanishAsync(targetEs);
    if (!okEs || !isTokenAlive(token)) return true;
    if (wrongWord) {
      const okGap = await waitMs(220, token);
      if (!okGap || !isTokenAlive(token)) return true;
      const okSlow = await speakSpanishAsync(targetEs, { rateOverride: 0.78 });
      if (!okSlow || !isTokenAlive(token)) return true;
    }
  }

  if (canRetry) {
    setHandsFreePhase('review', 'Starting 2-try retry round in 1.5s… (Space to pause)');
    const okWait = await waitMs(1500, token);
    if (!okWait || !isTokenAlive(token)) return true;
    hfHooks.onStartRetryRound();
    return true;
  }

  setHandsFreePhase('review', 'Continuing to next question…');
  const okWait = await waitMs(1800, token);
  if (!okWait || !isTokenAlive(token)) return true;
  hfHooks.onContinueFromIncorrect();
  return true;
}

export async function handleHandsFreePracticeResult({
  isCorrect = false,
  expectedEs = '',
  justCompleted = false
} = {}) {
  if (!isHandsFreeRunning()) return false;
  clearHandsFreeTimers();
  handsFreeState.sessionToken += 1;
  const token = handsFreeState.sessionToken;
  handsFreeState.consecutiveNoSpeechCount = 0;

  if (isCorrect) {
    if (justCompleted) {
      setHandsFreePhase('coaching', 'Practice complete! Starting Graded Test…');
      const okWait = await waitMs(800, token);
      if (!okWait || !isTokenAlive(token)) return true;
      hfHooks.onEnterGradedFromPractice();
      return true;
    }
    setHandsFreePhase('coaching', 'Great! Advancing to next practice word…');
    const delayMs = Math.max(500, Math.min(2500, Math.round((Number(state.speed) || 1) * 1000)));
    const okWait = await waitMs(delayMs, token);
    if (!okWait || !isTokenAlive(token)) return true;
    hfHooks.onPracticeAdvance();
    return true;
  }

  // Practice fail -> replay slowly & re-arm
  setHandsFreePhase('coaching', 'Listen slowly and try again, or say "next" to advance.');
  const targetEs = expectedEs || hfHooks.getSpokenText();
  if (Number(state.volume) > 0 && targetEs) {
    const okSlow = await speakSpanishAsync(targetEs, { rateOverride: 0.78 });
    if (!okSlow || !isTokenAlive(token)) return true;
  }
  await armHandsFreeListening(token, { purpose: 'answer' });
  return true;
}

export async function handleHandsFreeVoiceCommand(cmd, { expectedEs = '' } = {}) {
  if (!cmd) return false;
  const targetEs = expectedEs || hfHooks.getSpokenText();

  if (cmd === 'pause') {
    if (isHandsFreeActive()) {
      pauseHandsFreeSession('voice-command');
      return true;
    }
    return false;
  }

  if (cmd === 'skip') {
    hfHooks.onSkipQuestion();
    return true;
  }

  const incorrectPanelEl = document.getElementById('incorrect-screen-panel');
  const isIncorrectVisible = Boolean(incorrectPanelEl && !incorrectPanelEl.classList.contains('hidden'));

  if (cmd === 'retry') {
    if (isIncorrectVisible && !voiceCaptureState.retryRoundUsed) {
      hfHooks.onStartRetryRound();
      return true;
    }
    if (isHandsFreeRunning() && !state.answered) {
      clearHandsFreeTimers();
      handsFreeState.sessionToken += 1;
      await armHandsFreeListening(handsFreeState.sessionToken, { purpose: 'answer', skipCooldown: true });
      return true;
    }
    return false;
  }

  if (cmd === 'next') {
    if (isIncorrectVisible) {
      hfHooks.onContinueFromIncorrect();
      return true;
    }
    if (state.practiceMode) {
      hfHooks.onPracticeAdvance();
      return true;
    }
    if (isHandsFreeRunning()) {
      hfHooks.onSkipQuestion();
      return true;
    }
    return false;
  }

  if (cmd === 'cancel') {
    if (typeAnswerFeedbackEl) {
      typeAnswerFeedbackEl.textContent = 'Take cancelled — speak again when ready.';
      typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-transcript');
      typeAnswerFeedbackEl.classList.add('is-warning');
    }
    if (isHandsFreeRunning() && !state.answered) {
      clearHandsFreeTimers();
      handsFreeState.sessionToken += 1;
      await armHandsFreeListening(handsFreeState.sessionToken, { purpose: 'answer', skipCooldown: true });
    }
    return true;
  }

  if (cmd === 'repeat') {
    clearHandsFreeTimers();
    handsFreeState.sessionToken += 1;
    const token = handsFreeState.sessionToken;
    const meta = hfHooks.getCurrentPromptMeta();
    const isHardExam = Boolean(meta?.isExamStage);
    const canRevealSpanish =
      state.practiceMode ||
      isIncorrectVisible ||
      (!isHardExam && (voiceCaptureState.attemptCount > 0 || voiceCaptureState.retryRoundUsed));

    if (!canRevealSpanish) {
      // NEVER leak Spanish before Attempt 1 in Graded Mode or during Hard Topic Exam!
      if (isHandsFreeRunning()) {
        setHandsFreePhase('listening', 'Prompt shown above — try speaking in Spanish first.');
      }
      if (typeAnswerFeedbackEl) {
        typeAnswerFeedbackEl.textContent = isHardExam
          ? 'Spanish audio is locked during the Hard Topic Exam — speak your answer!'
          : 'Try Attempt 1 first before hearing Spanish — speak when ready!';
        typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-transcript');
        typeAnswerFeedbackEl.classList.add('is-warning');
      }
      if (isHandsFreeRunning()) {
        await armHandsFreeListening(token, { purpose: 'answer', skipCooldown: true });
      }
      return true;
    }

    // Practice / Shadowing / Incorrect Screen / post-Attempt-1: replay Spanish
    if (isHandsFreeRunning()) {
      setHandsFreePhase('coaching', `Replaying "${targetEs}"…`);
    }
    if (typeAnswerFeedbackEl && !isIncorrectVisible) {
      typeAnswerFeedbackEl.textContent = `Listening model: "${targetEs}" — speak when ready!`;
      typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning');
      typeAnswerFeedbackEl.classList.add('is-transcript');
    }
    if (Number(state.volume) > 0 && targetEs) {
      const okEs = await speakSpanishAsync(targetEs);
      if (isHandsFreeRunning() && (!okEs || !isTokenAlive(token))) return true;
    }
    if (isHandsFreeRunning()) {
      await armHandsFreeListening(token, {
        purpose: isIncorrectVisible ? 'command' : 'answer'
      });
    }
    return true;
  }

  if (cmd === 'hear_slow' || cmd === 'word_by_word') {
    const meta = hfHooks.getCurrentPromptMeta();
    const isHardExam = Boolean(meta?.isExamStage);
    const canRevealSpanish =
      state.practiceMode ||
      isIncorrectVisible ||
      (!isHardExam && (voiceCaptureState.attemptCount > 0 || voiceCaptureState.retryRoundUsed));

    clearHandsFreeTimers();
    handsFreeState.sessionToken += 1;
    const token = handsFreeState.sessionToken;

    if (!canRevealSpanish) {
      // Exam integrity: before Attempt 1 in Graded Mode, do not leak Spanish (and never speak English)
      if (typeAnswerFeedbackEl) {
        typeAnswerFeedbackEl.textContent = 'Try Attempt 1 first before hearing Spanish — speak when ready!';
        typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-transcript');
        typeAnswerFeedbackEl.classList.add('is-warning');
      }
      if (isHandsFreeRunning()) {
        await armHandsFreeListening(token, {
          purpose: 'answer',
          skipCooldown: true,
          statusNote: 'Try Attempt 1 first before hearing Spanish.'
        });
      }
      return true;
    }

    if (isHandsFreeRunning()) {
      setHandsFreePhase('coaching', cmd === 'word_by_word' ? 'Playing word by word…' : 'Playing Spanish slowly…');
    }
    if (Number(state.volume) > 0 && targetEs) {
      const okEs = cmd === 'word_by_word'
        ? await speakSpanishWordByWordAsync(targetEs, { pauseMs: 550, rateOverride: 0.82 })
        : await speakSpanishAsync(targetEs, { rateOverride: 0.75 });
      if (isHandsFreeRunning() && (!okEs || !isTokenAlive(token))) return true;
    }
    if (isHandsFreeRunning()) {
      await armHandsFreeListening(token, {
        purpose: isIncorrectVisible ? 'command' : 'answer'
      });
    }
    return true;
  }

  return false;
}

export async function handleHandsFreeNoSpeech({ purpose = 'answer' } = {}) {
  if (!isHandsFreeRunning()) return;
  clearHandsFreeTimers();
  handsFreeState.sessionToken += 1;
  const token = handsFreeState.sessionToken;

  if (purpose === 'command') {
    // Voice-choice timed out on Incorrect Screen -> default to continuing cleanly
    hfHooks.onContinueFromIncorrect();
    return;
  }

  handsFreeState.consecutiveNoSpeechCount += 1;
  logSpeechEvent('HANDS_FREE', `No speech detected (timeout ${handsFreeState.consecutiveNoSpeechCount}/2).`, null, 'warn');

  if (handsFreeState.consecutiveNoSpeechCount >= 2) {
    pauseHandsFreeSession('inactivity');
    return;
  }

  // First timeout: replay Spanish only in Practice mode, then re-arm cleanly (never speak English)
  let spokeSpanish = false;
  const expectedEs = hfHooks.getSpokenText();
  if (state.practiceMode && Number(state.volume) > 0 && expectedEs) {
    setHandsFreePhase('speaking-prompt', 'No speech heard — replaying Spanish model…');
    const okEs = await speakSpanishAsync(expectedEs);
    if (!okEs || !isTokenAlive(token)) return;
    spokeSpanish = true;
  }
  await armHandsFreeListening(token, {
    purpose: 'answer',
    skipCooldown: !spokeSpanish,
    statusNote: 'No speech heard — listening again…'
  });
}

export async function handleHandsFreeCaptureTooShort() {
  if (!isHandsFreeRunning()) return;
  clearHandsFreeTimers();
  handsFreeState.sessionToken += 1;
  const token = handsFreeState.sessionToken;
  setHandsFreePhase('cooldown', 'Clip too short — listening again…');
  const okWait = await waitMs(350, token);
  if (!okWait || !isTokenAlive(token)) return;
  await armHandsFreeListening(token, { purpose: 'answer', skipCooldown: true });
}

export function handleHandsFreeScorerError() {
  if (!isHandsFreeRunning()) return;
  pauseHandsFreeSession('scorer-offline');
}

export function handleHandsFreeMicEnded() {
  if (!isHandsFreeRunning()) return;
  pauseHandsFreeSession('mic-ended');
}

export async function handleHandsFreeStageComplete({
  stageLabel = '',
  nextStageLabel = '',
  nextUnitLabel = ''
} = {}) {
  if (!isHandsFreeRunning()) return false;
  clearHandsFreeTimers();
  handsFreeState.sessionToken += 1;
  const token = handsFreeState.sessionToken;

  const nextName = nextStageLabel || nextUnitLabel || 'the next stage';
  setHandsFreePhase('coaching', `${stageLabel || 'Stage'} complete! Moving to ${nextName}…`);
  const okWait = await waitMs(1400, token);
  if (!okWait || !isTokenAlive(token)) return true;
  hfHooks.onDismissStageModals();
  return true;
}

export function handleHandsFreeManualInteraction(reason = 'manual-interaction') {
  if (!isHandsFreeRunning()) return;
  pauseHandsFreeSession(reason);
}

export function initHandsFree(hooks = {}) {
  hfHooks = { ...hfHooks, ...hooks };

  if (handsFreeModeBtn) {
    handsFreeModeBtn.addEventListener('click', () => {
      toggleHandsFreeMode();
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isHandsFreeRunning()) {
      pauseHandsFreeSession('tab-hidden');
    }
  });

  window.addEventListener('pagehide', () => {
    if (isHandsFreeActive()) {
      stopHandsFreeSession();
    }
  });

  syncHandsFreeUI();
}
