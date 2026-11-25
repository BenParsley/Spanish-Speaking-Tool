import { tokenizeDisplaySpanishWithSlots } from '../curriculum/index.js';
import {
  checkZeroVolumePrompt,
  playCaptureLockedSound,
  speakSpanish,
  speakSpanishWordByWord,
  stopAllSpanishSpeech
} from './audio.js';
import {
  answerInputEl,
  audioQualityWarningEl,
  inputShellEl,
  localScorerStatusEl,
  localScorerTestBtn,
  micBtn,
  micBtnLabelEl,
  micDeviceSelectEl,
  micTestMeterFillEl,
  micTestStatusEl,
  panamaPhoneticsTipEl,
  playMyAudioBtn,
  playNativeAudioBtn,
  postSpeakActionsEl,
  pronunciationEngineSelectEl,
  pronunciationPhonemeStripEl,
  scorerLoadingBannerEl,
  speakCompareBtn,
  testMicBtn,
  testMicPlaybackBtn,
  testTtsBtn,
  typeAnswerFeedbackEl,
  vadThresholdMarkerEl,
  voiceCancelBtn,
  voiceMeterFillEl,
  voiceRedoBtn
} from './dom.js';
import { escapeHtmlText } from './utils.js';
import {
  incrementSpeechErrorCount,
  initSpeechConsole,
  logSpeechEvent,
  recordSpeechScoringOutcome,
  setSpeechConsoleStats
} from './speech-console.js';
import { savePersistedData, state } from './state.js';

const LOCAL_SCORER_URL = 'http://127.0.0.1:8765';
const HEALTH_FETCH_TIMEOUT_MS = 6000;
const COMMAND_FETCH_TIMEOUT_MS = 15000;
const SCORE_FETCH_TIMEOUT_MS = 30000;

async function fetchWithTimeout(url, options = {}, timeoutMs = SCORE_FETCH_TIMEOUT_MS) {
  if (typeof AbortController === 'undefined') {
    return fetch(url, options);
  }
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw err;
  } finally {
    clearTimeout(timerId);
  }
}

export function isLocalScorerActive() {
  return (state.pronunciationEngine || 'local') === 'local';
}

export const MAX_SPEAK_ATTEMPTS_BEFORE_NEXT = 2;

const VOICE_SKIP_COMMANDS = new Set([
  'skip',
  'eskip',
  'esquip',
  'skip it',
  'skip this',
  'skip word',
  'skip please',
  'pass',
  'saltar',
  'pasar'
]);

const VOICE_REPEAT_COMMANDS = new Set([
  'repeat',
  'repeat prompt',
  'again',
  'say that again',
  'what was that',
  'hear it',
  'play it',
  'play again',
  'say it again',
  'repetir',
  'escuchar'
]);

const VOICE_HEAR_SLOW_COMMANDS = new Set([
  'slow',
  'slower',
  'slowly',
  'hear spanish',
  'more slowly',
  'mas despacio',
  'más despacio',
  'despacio',
  'lento',
  'mas lento',
  'más lento'
]);

const VOICE_WORD_BY_WORD_COMMANDS = new Set([
  'word by word',
  'palabra por palabra',
  'break it down'
]);

const VOICE_RETRY_COMMANDS = new Set([
  'retry',
  'try again',
  'otra vez',
  'de nuevo',
  'intentar de nuevo'
]);

const VOICE_NEXT_COMMANDS = new Set([
  'next',
  'continue',
  'next word',
  'neks',
  'siguiente',
  'continuar'
]);

const VOICE_CANCEL_COMMANDS = new Set([
  'cancel',
  'redo',
  'start over',
  'cancelar',
  'borrar'
]);

const VOICE_PAUSE_COMMANDS = new Set([
  'pause',
  'stop',
  'stop listening',
  'pausa',
  'parar',
  'detener'
]);

const VOICE_COMMAND_TABLE = [
  ['skip', VOICE_SKIP_COMMANDS],
  ['repeat', VOICE_REPEAT_COMMANDS],
  ['hear_slow', VOICE_HEAR_SLOW_COMMANDS],
  ['word_by_word', VOICE_WORD_BY_WORD_COMMANDS],
  ['retry', VOICE_RETRY_COMMANDS],
  ['next', VOICE_NEXT_COMMANDS],
  ['cancel', VOICE_CANCEL_COMMANDS],
  ['pause', VOICE_PAUSE_COMMANDS]
];

export const PANAMA_SOUND_TIPS = {
  rr: "Roll 'rr' with a quick tongue-tip vibration behind your top teeth.",
  r: "Tap 'r' lightly once behind your top teeth (like the 'tt' in 'butter').",
  ch: "Say 'ch' crisply like English 'church' (don't soften to 'sh').",
  ll: "In Panama, pronounce 'll' smoothly like English 'y' in 'yes'.",
  y: "Pronounce 'y' smoothly like a soft English 'y' in 'yes'.",
  ñ: "Press the middle of your tongue to the roof of your mouth (like 'ny' in 'canyon').",
  j: "In Panama, 'j' sounds like a soft, breathy English 'h'.",
  qu: "In 'qu', the 'u' is silent — pronounce a crisp, unaspirated 'k'.",
  gu: "In 'gue/gui', the 'u' is silent — say a smooth hard 'g'.",
  a: "Keep Spanish 'a' open and pure ('ah'), never turning into 'uh'.",
  á: "Stress accented 'á' clearly with an open 'ah' sound.",
  e: "Keep Spanish 'e' short and pure ('eh'), without gliding into 'ay'.",
  é: "Stress 'é' cleanly ('eh') without an English 'ey' glide.",
  i: "Keep Spanish 'i' crisp and bright ('ee').",
  í: "Hold and stress 'í' cleanly as a bright 'ee'.",
  o: "Keep Spanish 'o' short and rounded ('oh') — avoid gliding into 'oh-w'.",
  ó: "Stress 'ó' firmly with a pure rounded 'oh' sound.",
  u: "Round your lips firmly for a clean Spanish 'u' ('oo').",
  ú: "Stress 'ú' clearly with rounded lips ('oo').",
  t: "Touch your tongue tip directly to your upper teeth for an unaspirated 't'.",
  d: "Tap 'd' gently behind your upper teeth (softened slightly between vowels in Panama).",
  p: "Say 'p' cleanly without a strong puff of English breath.",
  b: "Keep 'b' soft with lips barely touching between vowels.",
  v: "In Spanish, 'v' sounds just like a soft 'b' (lips together).",
  s: "Keep 's' crisp at the start of words; Panamanian final '-s' can be light.",
  z: "In Panama (seseo), pronounce 'z' like a clean 's'.",
  c: "Pronounce 'ce/ci' like 's' (Panamanian seseo), and 'ca/co/cu' like crisp 'k'."
};

export function getSoundCoachingTip(ch) {
  const key = String(ch || '').trim().toLowerCase();
  return PANAMA_SOUND_TIPS[key] || `Articulate '${key}' crisply and listen to the slow native replay.`;
}

function cleanCommandPhrase(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[¿?¡!.,;:()'"-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectVoiceCommand(heardText, expectedEs = '', altCandidates = []) {
  const clean = cleanCommandPhrase(heardText);
  if (!clean) return null;
  const checkList = [expectedEs, ...(Array.isArray(altCandidates) ? altCandidates : [])];
  for (const cand of checkList) {
    const cleanCand = cleanCommandPhrase(cand);
    if (cleanCand && clean === cleanCand) return null;
  }
  if (typeof voiceHooks.matchesExpectedSpanish === 'function' && voiceHooks.matchesExpectedSpanish(clean)) {
    return null;
  }
  for (const [cmdName, cmdSet] of VOICE_COMMAND_TABLE) {
    if (cmdSet.has(clean)) return cmdName;
  }
  return null;
}

export function isVoiceRepeatCommand(heardText, expectedEs = '') {
  const clean = cleanCommandPhrase(heardText);
  if (!clean) return false;
  const cleanExp = cleanCommandPhrase(expectedEs);
  if (cleanExp && clean === cleanExp) return false;
  return VOICE_REPEAT_COMMANDS.has(clean);
}

export function isVoiceSkipCommand(heardText, expectedEs = '') {
  const clean = cleanCommandPhrase(heardText);
  if (!clean) return false;
  const cleanExp = cleanCommandPhrase(expectedEs);
  if (cleanExp && clean === cleanExp) return false;
  return VOICE_SKIP_COMMANDS.has(clean);
}

export const voiceCaptureState = {
  activeMode: null, // 'question' | 'test' | null
  capturePurpose: 'answer', // 'answer' | 'command'
  captureHandsFree: false,
  hasSpokenAudio: false,
  cancelPendingRecording: false,
  speakCloseAttemptCount: 0,
  attemptCount: 0,
  retryRoundUsed: false,
  pendingIncorrectCommit: false,
  lastFailedMeta: null,
  requestToken: 0,
  stream: null,
  persistentStream: null,
  persistentDeviceId: '',
  persistentAudioCtx: null,
  persistentAnalyser: null,
  persistentSource: null,
  recorder: null,
  chunks: [],
  recognition: null,
  recognitionRestartTimer: null,
  browserAutoSubmitTimer: null,
  meterRaf: null,
  meterCtx: null,
  vadIntervalId: null,
  vadNoiseFloor: 0.008,
  vadOnsetThreshold: 0.022,
  vadOffsetThreshold: 0.014,
  vadHeardSpeech: false,
  testRmsOverride: null,
  testNoSpeechTimeoutMs: null,
  testAutoStopTimer: null,
  questionAudioBlob: null,
  questionAlternatives: [],
  testAudioUrl: null,
  testAudioEl: null,
  lastSubmittedAudioUrl: null,
  lastSubmittedAudioEl: null,
  healthPollTimer: null,
  startupHealthRetries: 0,
  isScoring: false,
  scoringErrorRequiresRedo: false,
  questionLocalResult: null,
  localScorerStatus: 'unknown'
};

let voiceHooks = {
  onEvaluateTypedAnswer: () => { },
  getSpokenText: () => '',
  getDisplayText: () => '',
  getExpectedSpanishAlternatives: () => [],
  getSlotTemplate: () => null,
  getQuestionSplit: () => ({ hasExtension: false }),
  resolveSpokenExtensionInfo: () => null,
  matchesExpectedSpanish: () => false,
  onPracticeItemSpoken: () => ({ justCompleted: false }),
  onPracticeAdvance: () => { },
  onAttemptFailed: () => { },
  onRecordOutcome: () => { },
  onRecordPronunciationAttempt: () => { },
  onPlayCorrectSound: () => { },
  onPlayIncorrectSound: () => { },
  onFullAnswerReward: () => { },
  onClearFullAnswerReward: () => { },
  onStartFeedbackProgressBar: () => { },
  onPauseFeedbackForPlayback: () => { },
  onShowIncorrectScreen: () => { },
  isHandsFreeRunning: () => false,
  onHandsFreeSpeechOnset: () => { },
  onHandsFreeScoringStarted: () => { },
  onHandsFreeAttempt1Fail: () => false,
  onHandsFreeIncorrectScreen: () => false,
  onHandsFreePracticeResult: () => false,
  onHandsFreeVoiceCommand: () => false,
  onHandsFreeNoSpeech: () => { },
  onHandsFreeCaptureTooShort: () => { },
  onHandsFreeScorerError: () => { },
  onHandsFreeMicEnded: () => { },
  onManualVoiceAction: () => { },
  isHardTopicExamActive: () => false
};

export function syncLocalScorerStatusUI() {
  const status = isLocalScorerActive() ? voiceCaptureState.localScorerStatus : 'browser';

  if (localScorerStatusEl) {
    localScorerStatusEl.classList.remove('is-ready', 'is-error');
    if (status === 'ready') {
      localScorerStatusEl.classList.add('is-ready');
      localScorerStatusEl.textContent = 'Connected! Local Hybrid Scorer is ready (es-PA).';
    } else if (status === 'loading') {
      localScorerStatusEl.textContent = 'Server up, models still loading…';
    } else if (status === 'ffmpeg-missing') {
      localScorerStatusEl.classList.add('is-error');
      localScorerStatusEl.textContent = 'Server connected, but FFmpeg was not found on PATH.';
    } else if (status === 'checking') {
      localScorerStatusEl.textContent = 'Checking local scorer…';
    } else if (status === 'browser') {
      localScorerStatusEl.textContent = 'Using Browser Speech-to-Text.';
    } else {
      localScorerStatusEl.classList.add('is-error');
      localScorerStatusEl.textContent = 'Not reachable — start uvicorn on port 8765.';
    }
  }
}

export async function checkLocalScorerHealth({ isStartup = false } = {}) {
  const recSupported = Boolean(getSpeechRecognitionCtor());
  const mrSupported = typeof MediaRecorder !== 'undefined';

  if (!isLocalScorerActive()) {
    if (scorerLoadingBannerEl) scorerLoadingBannerEl.classList.add('hidden');
    if (voiceCaptureState.healthPollTimer) {
      clearTimeout(voiceCaptureState.healthPollTimer);
      voiceCaptureState.healthPollTimer = null;
    }
    voiceCaptureState.localScorerStatus = 'browser';
    syncLocalScorerStatusUI();
    setSpeechConsoleStats({
      engine: 'browser',
      connectionStatus: 'browser',
      speechRecognitionSupported: recSupported,
      mediaRecorderSupported: mrSupported
    });
    logSpeechEvent('ENGINE', 'Health check skipped — Browser Speech-to-Text engine is active.', {
      pronunciationEngine: 'browser',
      speechRecognitionSupported: recSupported,
      mediaRecorderSupported: mrSupported
    });
    return false;
  }

  voiceCaptureState.localScorerStatus = 'checking';
  syncLocalScorerStatusUI();
  setSpeechConsoleStats({
    engine: 'local',
    connectionStatus: 'checking',
    speechRecognitionSupported: recSupported,
    mediaRecorderSupported: mrSupported
  });

  const t0 = performance.now();
  try {
    logSpeechEvent('HEALTH', `GET ${LOCAL_SCORER_URL}/health`);
    const res = await fetchWithTimeout(`${LOCAL_SCORER_URL}/health`, {}, HEALTH_FETCH_TIMEOUT_MS);
    const clientMs = Math.round(performance.now() - t0);
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      voiceCaptureState.localScorerStatus = 'offline';
      logSpeechEvent('HEALTH', `Health endpoint returned error HTTP ${res.status} (${clientMs} ms)`, data, 'error');
    } else if (data.modelStatus === 'error') {
      voiceCaptureState.localScorerStatus = 'offline';
      if (scorerLoadingBannerEl) scorerLoadingBannerEl.classList.add('hidden');
      logSpeechEvent('HEALTH', `Local scorer failed to load models: ${data.loadError || 'Unknown error'}`, data, 'error');
    } else if (!data.modelsLoaded) {
      voiceCaptureState.localScorerStatus = 'loading';
      logSpeechEvent('HEALTH', `Server reachable (${clientMs} ms) — models still loading`, data, 'warn');
      if (scorerLoadingBannerEl) {
        scorerLoadingBannerEl.textContent = 'Loading AI speech models on 127.0.0.1:8765…';
        scorerLoadingBannerEl.classList.remove('hidden');
      }
      if (voiceCaptureState.healthPollTimer) clearTimeout(voiceCaptureState.healthPollTimer);
      voiceCaptureState.healthPollTimer = setTimeout(() => {
        voiceCaptureState.healthPollTimer = null;
        if (isLocalScorerActive() && voiceCaptureState.localScorerStatus === 'loading') {
          checkLocalScorerHealth({ isStartup: true });
        }
      }, 2000);
    } else if (data.ffmpegAvailable === false && data.pyavDecode === false) {
      voiceCaptureState.localScorerStatus = 'ffmpeg-missing';
      if (scorerLoadingBannerEl) scorerLoadingBannerEl.classList.add('hidden');
      logSpeechEvent('HEALTH', `Server reachable (${clientMs} ms) — neither PyAV nor FFmpeg available`, data, 'error');
    } else {
      voiceCaptureState.localScorerStatus = 'ready';
      if (scorerLoadingBannerEl) scorerLoadingBannerEl.classList.add('hidden');
      if (voiceCaptureState.healthPollTimer) {
        clearTimeout(voiceCaptureState.healthPollTimer);
        voiceCaptureState.healthPollTimer = null;
      }
      logSpeechEvent('HEALTH', `Hybrid server ready (${clientMs} ms) · device=${data.device || 'cpu'}`, data);
    }

    setSpeechConsoleStats({
      engine: 'local',
      connectionStatus: voiceCaptureState.localScorerStatus,
      device: data?.device || null,
      gopModel: data?.gopModel || null,
      asrModel: data?.asrModel || null,
      asrComputeType: data?.asrComputeType || null,
      modelsLoaded: data?.modelsLoaded ?? null,
      ffmpegAvailable: data?.ffmpegAvailable ?? null,
      uptimeSeconds: data?.uptimeSeconds ?? null,
      serverRequests: data?.stats?.totalRequests ?? null
    });
  } catch (err) {
    const clientMs = Math.round(performance.now() - t0);
    voiceCaptureState.localScorerStatus = 'offline';
    setSpeechConsoleStats({
      engine: 'local',
      connectionStatus: 'offline',
      modelsLoaded: false
    });
    if (isStartup && voiceCaptureState.startupHealthRetries < 6) {
      voiceCaptureState.startupHealthRetries += 1;
      if (scorerLoadingBannerEl) {
        scorerLoadingBannerEl.textContent = 'Starting Local AI Scorer on 127.0.0.1:8765…';
        scorerLoadingBannerEl.classList.remove('hidden');
      }
      logSpeechEvent(
        'HEALTH',
        `Waiting for Local AI Scorer to start (attempt ${voiceCaptureState.startupHealthRetries}/6)…`,
        { error: err?.message || 'Connection refused while starting' },
        'warn'
      );
      if (voiceCaptureState.healthPollTimer) clearTimeout(voiceCaptureState.healthPollTimer);
      voiceCaptureState.healthPollTimer = setTimeout(() => {
        voiceCaptureState.healthPollTimer = null;
        if (isLocalScorerActive()) {
          checkLocalScorerHealth({ isStartup: true });
        }
      }, 2000);
    } else {
      if (scorerLoadingBannerEl) scorerLoadingBannerEl.classList.add('hidden');
      logSpeechEvent(
        'HEALTH',
        `Local scorer offline (${clientMs} ms) — unreachable at ${LOCAL_SCORER_URL}/health`,
        { error: err?.message || 'Network/connection refused' },
        'error'
      );
    }
  }
  syncLocalScorerStatusUI();
  return voiceCaptureState.localScorerStatus === 'ready';
}

export function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export async function refreshMicDeviceList() {
  if (!micDeviceSelectEl || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return;
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === 'audioinput');
    const prevValue = state.micDeviceId || '';
    micDeviceSelectEl.innerHTML = '';

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'Default Microphone';
    micDeviceSelectEl.appendChild(defaultOpt);

    audioInputs.forEach((dev, idx) => {
      const opt = document.createElement('option');
      opt.value = dev.deviceId;
      opt.textContent = dev.label || `Microphone ${idx + 1}`;
      micDeviceSelectEl.appendChild(opt);
    });

    if (prevValue && audioInputs.some((d) => d.deviceId === prevValue)) {
      micDeviceSelectEl.value = prevValue;
    } else {
      micDeviceSelectEl.value = '';
    }
    const activeLabel = micDeviceSelectEl.selectedOptions?.[0]?.textContent || 'Default Microphone';
    setSpeechConsoleStats({ activeMicLabel: activeLabel });
  } catch {
    // Ignore device enumeration errors on restricted origins
  }
}

function stopVoiceMeter(fillEl) {
  if (voiceCaptureState.meterRaf !== null) {
    cancelAnimationFrame(voiceCaptureState.meterRaf);
    voiceCaptureState.meterRaf = null;
  }
  if (voiceCaptureState.vadIntervalId !== null) {
    clearInterval(voiceCaptureState.vadIntervalId);
    voiceCaptureState.vadIntervalId = null;
  }
  if (voiceCaptureState.meterCtx && voiceCaptureState.meterCtx !== voiceCaptureState.persistentAudioCtx) {
    try {
      voiceCaptureState.meterCtx.close();
    } catch {
      // Ignore close error
    }
  }
  voiceCaptureState.meterCtx = null;
  voiceCaptureState.vadHeardSpeech = false;
  if (fillEl) {
    fillEl.style.width = '0%';
  }
  if (vadThresholdMarkerEl) {
    vadThresholdMarkerEl.classList.add('hidden');
  }
}

function attachAnalyserForStream(stream) {
  if (
    stream &&
    stream === voiceCaptureState.persistentStream &&
    voiceCaptureState.persistentAnalyser &&
    voiceCaptureState.persistentAudioCtx &&
    voiceCaptureState.persistentAudioCtx.state !== 'closed'
  ) {
    if (voiceCaptureState.persistentAudioCtx.state === 'suspended') {
      voiceCaptureState.persistentAudioCtx.resume().catch(() => { });
    }
    voiceCaptureState.meterCtx = voiceCaptureState.persistentAudioCtx;
    return voiceCaptureState.persistentAnalyser;
  }
  if (typeof window.AudioContext === 'undefined' && typeof window.webkitAudioContext === 'undefined') {
    return null;
  }
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    if (stream && stream === voiceCaptureState.persistentStream) {
      voiceCaptureState.persistentAudioCtx = ctx;
      voiceCaptureState.persistentSource = source;
      voiceCaptureState.persistentAnalyser = analyser;
    }
    voiceCaptureState.meterCtx = ctx;
    return analyser;
  } catch {
    return null;
  }
}

function startVoiceMeter(stream, fillEl, isQuestion = false, vadOpts = {}) {
  stopVoiceMeter(fillEl);
  const analyser = attachAnalyserForStream(stream);
  const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

  const isHandsFreeActive = Boolean(isQuestion && (vadOpts.handsFree || voiceHooks.isHandsFreeRunning()));
  const useVad = Boolean(isQuestion && isHandsFreeActive);
  const purpose = vadOpts.purpose || 'answer';
  const expectedWordCount = Math.max(1, Number(vadOpts.expectedWordCount) || 1);

  const readRms = () => {
    if (typeof voiceCaptureState.testRmsOverride === 'number' && Number.isFinite(voiceCaptureState.testRmsOverride)) {
      return Math.max(0, voiceCaptureState.testRmsOverride);
    }
    if (!analyser || !data) return 0;
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const centered = (data[i] - 128) / 128;
      sum += centered * centered;
    }
    return Math.sqrt(sum / data.length);
  };

  if (useVad) {
    const startMs = performance.now();
    const calibrationMs = 240;
    const baseSilenceMs = 1300;
    const effectiveSilenceMs = baseSilenceMs + (purpose === 'answer' && expectedWordCount >= 5 ? 300 : 0);
    const noSpeechTimeoutMs =
      typeof voiceCaptureState.testNoSpeechTimeoutMs === 'number' && voiceCaptureState.testNoSpeechTimeoutMs > 0
        ? voiceCaptureState.testNoSpeechTimeoutMs
        : (purpose === 'command' ? 5000 : 8000);
    const maxUtteranceMs = 12000;

    let noiseFloor = 0.006;
    let calibSum = 0;
    let calibCount = 0;
    let calibrated = false;
    let speechAccumMs = 0;
    let vadHeardSpeech = false;
    let vadSilenceStart = 0;
    let lastTickMs = startMs;

    const updateThresholdMarker = (onset) => {
      if (!vadThresholdMarkerEl) return;
      const pct = Math.min(95, Math.max(5, Math.round(onset * 320)));
      vadThresholdMarkerEl.style.left = `${pct}%`;
      vadThresholdMarkerEl.classList.remove('hidden');
    };

    voiceCaptureState.vadIntervalId = setInterval(() => {
      if (voiceCaptureState.activeMode !== 'question') {
        stopVoiceMeter(fillEl);
        return;
      }
      const now = performance.now();
      const dt = Math.min(120, Math.max(10, now - lastTickMs));
      lastTickMs = now;

      const rms = readRms();
      if (fillEl) {
        const pct = Math.min(100, Math.max(4, Math.round(rms * 320)));
        fillEl.style.width = `${pct}%`;
      }

      const elapsed = now - startMs;
      if (!calibrated) {
        calibSum += rms;
        calibCount += 1;
        if (elapsed >= calibrationMs) {
          const avg = calibCount > 0 ? calibSum / calibCount : 0.006;
          noiseFloor = Math.min(0.055, Math.max(0.003, avg));
          calibrated = true;
        }
      }

      const onsetThreshold = Math.max(0.016, noiseFloor * 2.8);
      const offsetThreshold = Math.max(0.010, noiseFloor * 1.65);
      voiceCaptureState.vadNoiseFloor = noiseFloor;
      voiceCaptureState.vadOnsetThreshold = onsetThreshold;
      voiceCaptureState.vadOffsetThreshold = offsetThreshold;
      updateThresholdMarker(onsetThreshold);

      if (!vadHeardSpeech) {
        if (calibrated && rms < onsetThreshold) {
          noiseFloor = Math.min(0.055, Math.max(0.003, noiseFloor * 0.92 + rms * 0.08));
        }
        const hasLiveSttText =
          purpose === 'answer' &&
          Boolean(answerInputEl && answerInputEl.value.trim().length > 0 && elapsed >= calibrationMs);
        if (rms >= onsetThreshold) {
          speechAccumMs += dt;
        } else {
          speechAccumMs = Math.max(0, speechAccumMs - dt * 0.6);
        }
        if (speechAccumMs >= 160 || hasLiveSttText) {
          vadHeardSpeech = true;
          voiceCaptureState.vadHeardSpeech = true;
          vadSilenceStart = 0;
          if (typeof voiceHooks.onHandsFreeSpeechOnset === 'function') {
            voiceHooks.onHandsFreeSpeechOnset();
          }
        } else if (isHandsFreeActive && elapsed >= noSpeechTimeoutMs) {
          logSpeechEvent('VAD', `No speech detected within ${Math.round(noSpeechTimeoutMs / 1000)}s — stopping quietly.`);
          voiceCaptureState.cancelPendingRecording = true;
          stopActiveVoiceCapture({ fromVad: true, cancelQuietly: true });
          if (typeof voiceHooks.onHandsFreeNoSpeech === 'function') {
            voiceHooks.onHandsFreeNoSpeech({ purpose });
          }
          return;
        }
      } else {
        if (rms >= offsetThreshold) {
          vadSilenceStart = 0;
        } else {
          if (!vadSilenceStart) {
            vadSilenceStart = now;
          } else if (now - vadSilenceStart >= effectiveSilenceMs) {
            logSpeechEvent(
              'VAD',
              `Adaptive silence detected (${(effectiveSilenceMs / 1000).toFixed(1)}s, floor=${noiseFloor.toFixed(4)}, onset=${onsetThreshold.toFixed(4)}) — stopping automatically.`
            );
            if (isHandsFreeActive) {
              playCaptureLockedSound();
            }
            stopActiveVoiceCapture({ fromVad: true });
            return;
          }
        }
        if (elapsed >= maxUtteranceMs) {
          logSpeechEvent('VAD', 'Max utterance duration (12s) reached — stopping automatically.');
          if (isHandsFreeActive) {
            playCaptureLockedSound();
          }
          stopActiveVoiceCapture({ fromVad: true });
          return;
        }
      }
    }, 40);
    return;
  }

  if (!fillEl || !analyser) return;
  const tick = () => {
    if (!voiceCaptureState.activeMode) {
      fillEl.style.width = '0%';
      return;
    }
    const rms = readRms();
    const pct = Math.min(100, Math.max(4, Math.round(rms * 320)));
    fillEl.style.width = `${pct}%`;
    voiceCaptureState.meterRaf = requestAnimationFrame(tick);
  };
  tick();
}

export function stopVoicePlayback(target = 'all') {
  if ((target === 'all' || target === 'test') && voiceCaptureState.testAudioEl) {
    voiceCaptureState.testAudioEl.onended = null;
    voiceCaptureState.testAudioEl.onerror = null;
    voiceCaptureState.testAudioEl.pause();
    voiceCaptureState.testAudioEl.currentTime = 0;
    voiceCaptureState.testAudioEl = null;
    if (testMicPlaybackBtn) testMicPlaybackBtn.textContent = 'Play Mic';
  }
  if ((target === 'all' || target === 'question') && voiceCaptureState.lastSubmittedAudioEl) {
    voiceCaptureState.lastSubmittedAudioEl.onended = null;
    voiceCaptureState.lastSubmittedAudioEl.onerror = null;
    voiceCaptureState.lastSubmittedAudioEl.pause();
    voiceCaptureState.lastSubmittedAudioEl.currentTime = 0;
    voiceCaptureState.lastSubmittedAudioEl = null;
    if (playMyAudioBtn) playMyAudioBtn.textContent = 'Play Mine';
    const incPlayMineBtn = document.getElementById('incorrect-screen-play-mine-btn');
    if (incPlayMineBtn) incPlayMineBtn.textContent = 'Play Mine';
  }
}

export function markQuestionAudioSpoken() {
  if (state.questionType !== 'speak' || state.answered) return;
  voiceCaptureState.hasSpokenAudio = true;
  if (inputShellEl) {
    inputShellEl.classList.add('has-spoken-audio');
  }
  if (micBtn) {
    micBtn.classList.add('is-submit');
  }
  if (micBtnLabelEl) {
    micBtnLabelEl.textContent = 'Submit';
  }
  if (voiceRedoBtn) {
    voiceRedoBtn.disabled = false;
  }
  if (typeAnswerFeedbackEl) {
    const transcript = answerInputEl.value.trim();
    typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning');
    typeAnswerFeedbackEl.classList.add('is-transcript');
    typeAnswerFeedbackEl.textContent = transcript
      ? `Heard: "${transcript}"`
      : 'Audio recorded (no speech detected)';
  }
}

function isStreamLive(stream) {
  if (!stream || typeof stream.getAudioTracks !== 'function') return false;
  const tracks = stream.getAudioTracks();
  return tracks.length > 0 && tracks.some((t) => t.readyState !== 'ended');
}

export async function acquirePersistentMicStream() {
  const targetDevice = state.micDeviceId || '';
  if (
    isStreamLive(voiceCaptureState.persistentStream) &&
    voiceCaptureState.persistentDeviceId === targetDevice
  ) {
    return voiceCaptureState.persistentStream;
  }
  releasePersistentMicStream();
  const stream = await openMicStream();
  voiceCaptureState.persistentStream = stream;
  voiceCaptureState.persistentDeviceId = targetDevice;
  const track = stream.getAudioTracks()[0];
  if (track && typeof track.addEventListener === 'function') {
    track.addEventListener('ended', () => {
      if (voiceCaptureState.persistentStream === stream) {
        releasePersistentMicStream();
        if (typeof voiceHooks.onHandsFreeMicEnded === 'function') {
          voiceHooks.onHandsFreeMicEnded();
        }
      }
    });
  }
  logSpeechEvent('MIC', 'Acquired warm persistent microphone stream for Hands-Free Mode.');
  return stream;
}

export function releasePersistentMicStream() {
  const prevStream = voiceCaptureState.persistentStream;
  voiceCaptureState.persistentStream = null;
  voiceCaptureState.persistentDeviceId = '';
  if (voiceCaptureState.persistentAudioCtx) {
    try {
      voiceCaptureState.persistentAudioCtx.close();
    } catch {
      // Ignore close errors
    }
    if (voiceCaptureState.meterCtx === voiceCaptureState.persistentAudioCtx) {
      voiceCaptureState.meterCtx = null;
    }
    voiceCaptureState.persistentAudioCtx = null;
  }
  voiceCaptureState.persistentAnalyser = null;
  voiceCaptureState.persistentSource = null;
  if (prevStream) {
    try {
      prevStream.getTracks().forEach((t) => t.stop());
    } catch {
      // Ignore stop errors
    }
    if (voiceCaptureState.stream === prevStream) {
      voiceCaptureState.stream = null;
    }
    logSpeechEvent('MIC', 'Released persistent Hands-Free microphone stream.');
  }
}

function stopStreamTracks(streamToStop) {
  if (!streamToStop) return;
  if (streamToStop === voiceCaptureState.persistentStream) {
    if (voiceCaptureState.stream === streamToStop) {
      voiceCaptureState.stream = null;
    }
    return;
  }
  try {
    streamToStop.getTracks().forEach((t) => t.stop());
  } catch {
    // Ignore track stop errors
  }
  if (voiceCaptureState.stream === streamToStop) {
    voiceCaptureState.stream = null;
  }
}

function clearBrowserAutoSubmitTimer() {
  if (voiceCaptureState.browserAutoSubmitTimer !== null) {
    clearTimeout(voiceCaptureState.browserAutoSubmitTimer);
    voiceCaptureState.browserAutoSubmitTimer = null;
  }
}

function dispatchBrowserAutoSubmit({ purpose = 'answer', handsFree = false } = {}) {
  clearBrowserAutoSubmitTimer();
  const submitToken = voiceCaptureState.requestToken;
  voiceCaptureState.browserAutoSubmitTimer = setTimeout(() => {
    voiceCaptureState.browserAutoSubmitTimer = null;
    if (voiceCaptureState.requestToken !== submitToken) return;
    if (purpose === 'answer' && state.answered) return;

    const expectedEs = voiceHooks.getSpokenText();
    const altList = voiceHooks.getExpectedSpanishAlternatives();
    const rawText = String(answerInputEl?.value || '').trim();
    const candidates = [rawText, ...(voiceCaptureState.questionAlternatives || [])].filter(Boolean);

    for (const cand of candidates) {
      const cmd = detectVoiceCommand(cand, expectedEs, altList);
      if (cmd) {
        logSpeechEvent('COMMAND', `Browser STT voice command "${cmd}" detected (heard="${cand}").`);
        if (typeof voiceHooks.onHandsFreeVoiceCommand === 'function') {
          voiceHooks.onHandsFreeVoiceCommand(cmd, { heard: cand, expectedEs });
        }
        return;
      }
    }

    if (purpose === 'command') {
      if (typeof voiceHooks.onHandsFreeNoSpeech === 'function') {
        voiceHooks.onHandsFreeNoSpeech({ purpose: 'command' });
      }
      return;
    }

    if (rawText || voiceCaptureState.questionAlternatives.length > 0) {
      voiceHooks.onEvaluateTypedAnswer({ voiceAlternatives: voiceCaptureState.questionAlternatives });
    } else if (handsFree && typeof voiceHooks.onHandsFreeCaptureTooShort === 'function') {
      voiceHooks.onHandsFreeCaptureTooShort();
    }
  }, 160);
}

export function stopActiveVoiceCapture({ fromVad = false, cancelQuietly = false } = {}) {
  voiceCaptureState.requestToken += 1;
  const wasQuestionMode = voiceCaptureState.activeMode === 'question';
  const wasPurpose = voiceCaptureState.capturePurpose || 'answer';
  const wasHandsFree = Boolean(voiceCaptureState.captureHandsFree || voiceHooks.isHandsFreeRunning());
  clearBrowserAutoSubmitTimer();
  if (voiceCaptureState.testAutoStopTimer !== null) {
    clearTimeout(voiceCaptureState.testAutoStopTimer);
    voiceCaptureState.testAutoStopTimer = null;
  }
  if (voiceCaptureState.recognitionRestartTimer !== null) {
    clearTimeout(voiceCaptureState.recognitionRestartTimer);
    voiceCaptureState.recognitionRestartTimer = null;
  }
  if (voiceCaptureState.recognition) {
    try {
      voiceCaptureState.recognition.onresult = null;
      voiceCaptureState.recognition.onerror = null;
      voiceCaptureState.recognition.onend = null;
      voiceCaptureState.recognition.stop();
    } catch {
      // Ignore stop errors
    }
    voiceCaptureState.recognition = null;
  }
  const activeRecorder = voiceCaptureState.recorder;
  const activeStream = voiceCaptureState.stream;
  const hasActiveRecorder = Boolean(activeRecorder && activeRecorder.state !== 'inactive');
  let recorderStopped = false;
  if (hasActiveRecorder) {
    try {
      activeRecorder.stop();
      recorderStopped = true;
    } catch {
      recorderStopped = false;
    }
  }
  voiceCaptureState.recorder = null;
  if (!recorderStopped && activeStream) {
    stopStreamTracks(activeStream);
  }
  stopVoiceMeter(voiceMeterFillEl);
  stopVoiceMeter(micTestMeterFillEl);
  voiceCaptureState.activeMode = null;
  voiceCaptureState.capturePurpose = 'answer';
  voiceCaptureState.captureHandsFree = false;
  setSpeechConsoleStats({ captureState: 'idle' });
  logSpeechEvent('MIC', `Stopped active capture (wasQuestionMode=${wasQuestionMode}, fromVad=${fromVad})`);

  if (inputShellEl) inputShellEl.classList.remove('is-recording');
  if (micBtn) micBtn.classList.remove('is-recording');
  if (micBtnLabelEl) micBtnLabelEl.textContent = 'Speak';
  if (voiceCancelBtn) voiceCancelBtn.classList.add('hidden');
  if (testMicBtn) {
    testMicBtn.classList.remove('is-recording');
    testMicBtn.textContent = 'Record Mic';
  }
  if (wasQuestionMode && !cancelQuietly && !voiceCaptureState.cancelPendingRecording) {
    if (wasPurpose === 'answer') {
      markQuestionAudioSpoken();
    }
    if (!isLocalScorerActive() && (fromVad || wasHandsFree)) {
      dispatchBrowserAutoSubmit({ purpose: wasPurpose, handsFree: wasHandsFree });
    }
  }
}

export function syncNextQuestionButtonUI() {
  const hintBtnEl = document.getElementById('hint-btn');
  const skipBtnEl = document.getElementById('skip-question-btn');
  if (skipBtnEl) {
    skipBtnEl.classList.toggle('hidden', Boolean(state.practiceMode));
    skipBtnEl.disabled = Boolean(state.answered);
  }
  if (!hintBtnEl) return;
  if (state.practiceMode) {
    hintBtnEl.disabled = false;
    hintBtnEl.textContent = 'Next Word →';
    hintBtnEl.title = 'Move to the next word in Practice Mode (ungraded)';
    hintBtnEl.classList.add('is-next-ready');
    return;
  }
  const isHardExam = Boolean(
    typeof voiceHooks.isHardTopicExamActive === 'function' && voiceHooks.isHardTopicExamActive()
  );
  const maxAttempts = isHardExam ? 1 : MAX_SPEAK_ATTEMPTS_BEFORE_NEXT;
  const attempts = Math.max(0, Number(voiceCaptureState.attemptCount) || 0);
  const labelPrefix = isHardExam
    ? 'Exam'
    : voiceCaptureState.retryRoundUsed
      ? 'Retry'
      : 'Attempts';
  hintBtnEl.disabled = true;
  hintBtnEl.textContent = isHardExam
    ? `Exam · 1 Try`
    : `${labelPrefix} ${Math.min(attempts, maxAttempts)}/${maxAttempts}`;
  hintBtnEl.title = isHardExam
    ? 'Hard Topic Exam — 1 attempt per question, no retries'
    : voiceCaptureState.retryRoundUsed
      ? `Final retry round — speak the word correctly within ${maxAttempts} tries`
      : `Speak the word correctly — after ${maxAttempts} incorrect attempts you can review or try again`;
  hintBtnEl.classList.remove('is-next-ready');
}

export function playLastSubmittedAudio(triggerBtnEl = null) {
  if (!voiceCaptureState.lastSubmittedAudioUrl) return;
  voiceHooks.onPauseFeedbackForPlayback();
  const btn = triggerBtnEl || playMyAudioBtn;
  if (voiceCaptureState.lastSubmittedAudioEl) {
    stopVoicePlayback('question');
    if (btn) btn.textContent = 'Play Mine';
    return;
  }
  const audio = new Audio(voiceCaptureState.lastSubmittedAudioUrl);
  audio.volume = Math.min(1, Math.max(0.1, Number(state.volume) || 1));
  voiceCaptureState.lastSubmittedAudioEl = audio;
  if (btn) btn.textContent = 'Stop Mine';
  const resetPlayback = () => {
    if (voiceCaptureState.lastSubmittedAudioEl === audio) {
      voiceCaptureState.lastSubmittedAudioEl = null;
    }
    if (btn) btn.textContent = 'Play Mine';
  };
  audio.onended = resetPlayback;
  audio.onerror = resetPlayback;
  audio.play().catch(resetPlayback);
}

export function cancelActiveQuestionRecording(reason = 'Cancelled active recording') {
  if (state.answered) return false;
  const wasCapturing =
    voiceCaptureState.activeMode === 'question' || Boolean(state.pttSpaceHeld);
  if (!wasCapturing) return false;

  logSpeechEvent('MIC', `${reason} — discarding active recording without submitting.`);
  voiceCaptureState.cancelPendingRecording = true;
  if (voiceCaptureState.activeMode === 'question') {
    stopActiveVoiceCapture();
  }
  resetQuestionVoiceCapture({ resetAttempts: false });
  if (answerInputEl) {
    answerInputEl.value = '';
  }
  if (typeAnswerFeedbackEl) {
    typeAnswerFeedbackEl.textContent = 'Recording cancelled — not submitted.';
    typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-transcript', 'is-analyzing');
    typeAnswerFeedbackEl.classList.add('is-warning');
  }
  return true;
}

export function resetQuestionVoiceCapture({ resetAttempts = true, resetRetry = true } = {}) {
  voiceCaptureState.requestToken += 1;
  clearBrowserAutoSubmitTimer();
  if (voiceCaptureState.recognitionRestartTimer !== null) {
    clearTimeout(voiceCaptureState.recognitionRestartTimer);
    voiceCaptureState.recognitionRestartTimer = null;
  }
  if (voiceCaptureState.activeMode === 'question') {
    voiceCaptureState.activeMode = null;
    if (voiceCaptureState.recorder && voiceCaptureState.recorder.state !== 'inactive') {
      voiceCaptureState.cancelPendingRecording = true;
    }
    stopActiveVoiceCapture();
  }
  voiceCaptureState.questionAudioBlob = null;
  voiceCaptureState.questionAlternatives = [];
  voiceCaptureState.hasSpokenAudio = false;
  voiceCaptureState.isScoring = false;
  voiceCaptureState.scoringErrorRequiresRedo = false;
  voiceCaptureState.questionLocalResult = null;
  if (resetAttempts) {
    voiceCaptureState.attemptCount = 0;
    voiceCaptureState.lastFailedMeta = null;
    voiceCaptureState.pendingIncorrectCommit = false;
    if (resetRetry) {
      voiceCaptureState.retryRoundUsed = false;
    }
  }

  if (inputShellEl) {
    inputShellEl.classList.remove('has-spoken-audio', 'is-recording');
  }
  if (micBtn) {
    micBtn.disabled = Boolean(state.answered);
    micBtn.classList.remove('is-recording', 'is-submit');
  }
  if (micBtnLabelEl) micBtnLabelEl.textContent = voiceCaptureState.attemptCount > 0 ? 'Speak Again' : 'Speak';
  if (voiceRedoBtn) voiceRedoBtn.disabled = Boolean(state.answered);
  if (voiceCancelBtn) voiceCancelBtn.classList.add('hidden');
  syncNextQuestionButtonUI();
  stopVoicePlayback('question');
  if (voiceCaptureState.lastSubmittedAudioUrl) {
    URL.revokeObjectURL(voiceCaptureState.lastSubmittedAudioUrl);
    voiceCaptureState.lastSubmittedAudioUrl = null;
  }
  if (pronunciationPhonemeStripEl) {
    pronunciationPhonemeStripEl.innerHTML = '';
    pronunciationPhonemeStripEl.classList.add('hidden');
  }
  if (postSpeakActionsEl) postSpeakActionsEl.classList.add('hidden');
  hidePostSpeakWordStrip();
  if (audioQualityWarningEl) {
    audioQualityWarningEl.textContent = '';
    audioQualityWarningEl.classList.add('hidden');
  }
  if (panamaPhoneticsTipEl) {
    panamaPhoneticsTipEl.textContent = '';
    panamaPhoneticsTipEl.classList.add('hidden');
  }
  if (typeof voiceHooks.onClearFullAnswerReward === 'function') {
    voiceHooks.onClearFullAnswerReward();
  }
  if (!state.answered && typeAnswerFeedbackEl) {
    typeAnswerFeedbackEl.textContent = 'Feedback bar';
    typeAnswerFeedbackEl.classList.remove(
      'is-invisible',
      'is-correct',
      'is-incorrect',
      'is-warning',
      'is-transcript',
      'is-analyzing'
    );
    typeAnswerFeedbackEl.style.removeProperty('--analysis-pct');
  }
}

async function openMicStream() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Microphone unavailable (requires localhost or HTTPS)');
  }
  const baseAudioOpts = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  };
  const constraints = state.micDeviceId
    ? { audio: { ...baseAudioOpts, deviceId: { exact: state.micDeviceId } } }
    : { audio: baseAudioOpts };
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    if (state.micDeviceId && err && err.name === 'OverconstrainedError') {
      state.micDeviceId = '';
      savePersistedData();
      return navigator.mediaDevices.getUserMedia({ audio: baseAudioOpts });
    }
    throw err;
  }
}

export async function startVoiceCapture(
  target,
  { handsFree = false, usePersistent = false, purpose = 'answer', expectedWordCount = 1 } = {}
) {
  const isCommandCapture = target === 'question' && purpose === 'command';
  if (voiceCaptureState.activeMode === target) {
    stopActiveVoiceCapture();
    return;
  }
  if (voiceCaptureState.activeMode) {
    stopActiveVoiceCapture();
  }
  if (target === 'question' && state.answered && !isCommandCapture) return;

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  stopVoicePlayback(target);

  if (target === 'question') {
    voiceCaptureState.cancelPendingRecording = false;
    voiceCaptureState.questionAudioBlob = null;
    voiceCaptureState.questionAlternatives = [];
    voiceCaptureState.hasSpokenAudio = false;
    voiceCaptureState.isScoring = false;
    voiceCaptureState.scoringErrorRequiresRedo = false;
    voiceCaptureState.questionLocalResult = null;
    if (!isCommandCapture) {
      hidePostSpeakWordStrip();
      if (inputShellEl) {
        inputShellEl.classList.remove('has-spoken-audio');
      }
      answerInputEl.value = '';
    }
  } else {
    if (voiceCaptureState.testAudioUrl) {
      URL.revokeObjectURL(voiceCaptureState.testAudioUrl);
      voiceCaptureState.testAudioUrl = null;
    }
    if (testMicPlaybackBtn) testMicPlaybackBtn.disabled = true;
    if (micTestStatusEl) micTestStatusEl.textContent = 'Requesting microphone...';
  }

  const captureToken = ++voiceCaptureState.requestToken;
  setSpeechConsoleStats({ captureState: 'requesting-mic' });
  logSpeechEvent('MIC', `Starting voice capture (target=${target}, purpose=${purpose}, handsFree=${Boolean(handsFree)})`, {
    target,
    purpose,
    handsFree: Boolean(handsFree),
    engine: isLocalScorerActive() ? 'local' : 'browser',
    selectedMicDeviceId: state.micDeviceId || '(default)',
    expectedEs: target === 'question' && !isCommandCapture ? voiceHooks.getSpokenText() : null
  });
  let stream;
  try {
    if (target === 'question' && (usePersistent || handsFree || voiceHooks.isHandsFreeRunning())) {
      stream = await acquirePersistentMicStream();
    } else {
      stream = await openMicStream();
    }
  } catch (err) {
    if (voiceCaptureState.requestToken !== captureToken) return;
    setSpeechConsoleStats({ captureState: 'idle' });
    incrementSpeechErrorCount();
    const msg =
      err && err.name === 'NotAllowedError'
        ? 'Microphone permission denied.'
        : err?.message || 'Could not access microphone.';
    logSpeechEvent(
      'ERROR',
      `Microphone access failed: ${msg}`,
      { name: err?.name || 'Error', message: err?.message || msg },
      'error'
    );
    if (target === 'test' && micTestStatusEl) {
      micTestStatusEl.textContent = msg;
    }
    return;
  }

  if (
    voiceCaptureState.requestToken !== captureToken ||
    voiceCaptureState.activeMode ||
    (target === 'question' &&
      ((state.answered && !isCommandCapture) || state.questionType !== 'speak' || voiceCaptureState.cancelPendingRecording))
  ) {
    voiceCaptureState.cancelPendingRecording = false;
    stopStreamTracks(stream);
    setSpeechConsoleStats({ captureState: 'idle' });
    logSpeechEvent('MIC', 'Aborted stale microphone stream after state change.', null, 'warn');
    return;
  }

  const audioTrack = stream.getAudioTracks()[0];
  const trackSettings = audioTrack && typeof audioTrack.getSettings === 'function' ? audioTrack.getSettings() : {};
  logSpeechEvent('MIC', `Microphone stream active: ${audioTrack?.label || 'Audio input'}`, {
    label: audioTrack?.label || '',
    sampleRate: trackSettings.sampleRate || null,
    channelCount: trackSettings.channelCount || null,
    echoCancellation: trackSettings.echoCancellation ?? null,
    noiseSuppression: trackSettings.noiseSuppression ?? null,
    autoGainControl: trackSettings.autoGainControl ?? null
  });

  refreshMicDeviceList();
  voiceCaptureState.activeMode = target;
  voiceCaptureState.capturePurpose = isCommandCapture ? 'command' : 'answer';
  voiceCaptureState.captureHandsFree = Boolean(handsFree || voiceHooks.isHandsFreeRunning());
  voiceCaptureState.stream = stream;
  voiceCaptureState.chunks = [];
  setSpeechConsoleStats({ captureState: 'recording' });

  if (target === 'question') {
    if (!isCommandCapture) {
      if (inputShellEl) inputShellEl.classList.add('is-recording');
      if (micBtn) {
        micBtn.classList.remove('is-submit');
        micBtn.classList.add('is-recording');
      }
      if (micBtnLabelEl) micBtnLabelEl.textContent = 'Finish';
      if (voiceCancelBtn) voiceCancelBtn.classList.remove('hidden');
      if (typeAnswerFeedbackEl) {
        typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning');
        typeAnswerFeedbackEl.classList.add('is-transcript');
        typeAnswerFeedbackEl.textContent = handsFree ? 'Hands-Free listening (es-PA)...' : 'Listening (es-PA)...';
      }
    }
    startVoiceMeter(stream, voiceMeterFillEl, true, {
      handsFree: Boolean(handsFree || voiceHooks.isHandsFreeRunning()),
      purpose: isCommandCapture ? 'command' : 'answer',
      expectedWordCount
    });
  } else {
    if (testMicBtn) {
      testMicBtn.classList.add('is-recording');
      testMicBtn.textContent = 'Stop Mic';
    }
    if (micTestStatusEl) micTestStatusEl.textContent = 'Recording test (es-PA)... speak now';
    startVoiceMeter(stream, micTestMeterFillEl);
    voiceCaptureState.testAutoStopTimer = setTimeout(() => {
      if (voiceCaptureState.activeMode === 'test') {
        stopActiveVoiceCapture();
      }
    }, 6000);
  }

  if (typeof MediaRecorder !== 'undefined') {
    try {
      const recorder = new MediaRecorder(stream);
      const localChunks = [];
      voiceCaptureState.recorder = recorder;
      logSpeechEvent('RECORDER', `MediaRecorder started (${recorder.mimeType || 'default mime'})`, {
        target,
        purpose: isCommandCapture ? 'command' : 'answer',
        mimeType: recorder.mimeType || 'browser-default',
        audioBitsPerSecond: recorder.audioBitsPerSecond || null
      });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          localChunks.push(e.data);
          voiceCaptureState.chunks = localChunks;
        }
      };
      recorder.onstop = () => {
        stopStreamTracks(stream);
        if (voiceCaptureState.recorder === recorder) {
          voiceCaptureState.recorder = null;
        }
        if (target === 'question' && (voiceCaptureState.cancelPendingRecording || state.activeView !== 'play')) {
          voiceCaptureState.cancelPendingRecording = false;
          localChunks.length = 0;
          voiceCaptureState.chunks = [];
          logSpeechEvent('RECORDER', 'Recording cancelled or left Play view — audio chunks discarded.', null, 'warn');
          return;
        }
        const blob = new Blob(localChunks, {
          type: recorder.mimeType || 'audio/webm'
        });
        logSpeechEvent('RECORDER', `MediaRecorder stopped (${blob.size} bytes, chunks=${localChunks.length})`, {
          target,
          purpose: isCommandCapture ? 'command' : 'answer',
          bytes: blob.size,
          mimeType: blob.type || recorder.mimeType || 'audio/webm',
          chunkCount: localChunks.length
        });
        if (target === 'question') {
          if (isCommandCapture) {
            resolveHandsFreeVoiceChoiceFromAudio(blob);
            return;
          }
          voiceCaptureState.questionAudioBlob = blob;
          markQuestionAudioSpoken();
          if (isLocalScorerActive() && !state.answered) {
            previewSpokenWithLocalScorer(blob);
          }
        } else {
          const url = URL.createObjectURL(blob);
          if (voiceCaptureState.testAudioUrl) {
            URL.revokeObjectURL(voiceCaptureState.testAudioUrl);
          }
          voiceCaptureState.testAudioUrl = url;
          if (testMicPlaybackBtn) testMicPlaybackBtn.disabled = false;
          if (micTestStatusEl && !micTestStatusEl.textContent.startsWith('Heard:')) {
            micTestStatusEl.textContent = 'Recorded. Click Play Mic to verify volume.';
          }
        }
      };
      recorder.start();
    } catch (recErr) {
      logSpeechEvent(
        'RECORDER',
        'MediaRecorder unavailable or failed to start.',
        { error: recErr?.message || String(recErr) },
        'warn'
      );
    }
  }

  const RecognitionCtor = getSpeechRecognitionCtor();
  if (RecognitionCtor) {
    const useSpanish =
      !isCommandCapture &&
      (target === 'test' ||
        state.questionType === 'speak' ||
        state.direction === 'num-to-es');
    const targetLang = useSpanish ? 'es-PA' : 'en-US';
    const FATAL_STT_ERRORS = new Set([
      'not-allowed',
      'service-not-allowed',
      'audio-capture',
      'language-not-supported'
    ]);
    let committedFinalText = '';
    let currentSegmentFinalText = '';
    let fatalSttError = false;
    let consecutiveRestartErrors = 0;

    const scheduleRecognitionRestart = (reason = 'audio break', delayOverrideMs = null) => {
      const stillCapturing =
        !fatalSttError &&
        voiceCaptureState.requestToken === captureToken &&
        voiceCaptureState.activeMode === target &&
        !voiceCaptureState.isScoring &&
        (target !== 'question' || !state.answered || isCommandCapture);
      if (!stillCapturing) return false;

      const delayMs =
        delayOverrideMs !== null
          ? delayOverrideMs
          : consecutiveRestartErrors > 0
            ? Math.min(1000, 250 * consecutiveRestartErrors)
            : 120;
      if (voiceCaptureState.recognitionRestartTimer !== null) {
        clearTimeout(voiceCaptureState.recognitionRestartTimer);
      }
      logSpeechEvent('STT', `Browser SpeechRecognition ${reason} — restarting listener in ${delayMs} ms.`);
      voiceCaptureState.recognitionRestartTimer = setTimeout(() => {
        voiceCaptureState.recognitionRestartTimer = null;
        startRecognitionSegment(true);
      }, delayMs);
      return true;
    };

    const startRecognitionSegment = (isRestart = false) => {
      if (
        fatalSttError ||
        voiceCaptureState.requestToken !== captureToken ||
        voiceCaptureState.activeMode !== target ||
        voiceCaptureState.isScoring ||
        (target === 'question' && state.answered && !isCommandCapture)
      ) {
        return;
      }

      try {
        const recognition = new RecognitionCtor();
        recognition.lang = targetLang;
        recognition.interimResults = true;
        recognition.maxAlternatives = 5;
        recognition.continuous = true;
        voiceCaptureState.recognition = recognition;
        currentSegmentFinalText = '';

        logSpeechEvent(
          'STT',
          isRestart
            ? `Browser SpeechRecognition restarted (lang=${recognition.lang}, continuous=true)`
            : `Browser SpeechRecognition started (lang=${recognition.lang}, continuous=true)`,
          {
            lang: recognition.lang,
            interimResults: recognition.interimResults,
            maxAlternatives: recognition.maxAlternatives,
            continuous: recognition.continuous,
            isRestart,
            note: isCommandCapture
              ? 'Hands-free voice command listener.'
              : isLocalScorerActive()
                ? 'Running continuously in parallel for live Heard preview; final score comes from Local Hybrid.'
                : 'Primary continuous transcript engine.'
          }
        );

        recognition.onresult = (event) => {
          if (
            voiceCaptureState.requestToken !== captureToken ||
            voiceCaptureState.recognition !== recognition
          ) {
            return;
          }
          consecutiveRestartErrors = 0;

          let segInterimText = '';
          let segFinalText = '';
          const segAltList = [];
          const altDetails = [];

          for (let i = 0; i < event.results.length; i += 1) {
            const result = event.results[i];
            const primary = String(result[0]?.transcript || '').trim();
            if (result.isFinal) {
              if (primary) segFinalText += `${primary} `;
              for (let j = 0; j < result.length; j += 1) {
                const t = String(result[j]?.transcript || '').trim();
                if (t && !segAltList.includes(t)) segAltList.push(t);
                altDetails.push({
                  transcript: t,
                  confidence: Number.isFinite(result[j]?.confidence)
                    ? Number(result[j].confidence.toFixed(3))
                    : null
                });
              }
            } else if (primary) {
              segInterimText += `${primary} `;
            }
          }

          currentSegmentFinalText = segFinalText.trim();
          const combinedFinal = [committedFinalText, currentSegmentFinalText]
            .filter(Boolean)
            .join(' ')
            .trim();
          const displayTranscript = [combinedFinal, segInterimText.trim()]
            .filter(Boolean)
            .join(' ')
            .trim();

          if (currentSegmentFinalText) {
            logSpeechEvent('STT', `Browser STT final transcript: "${combinedFinal}"`, {
              alternatives: altDetails
            });
          }

          if (target === 'question') {
            if (!isCommandCapture && displayTranscript && !voiceCaptureState.isScoring && !voiceCaptureState.questionLocalResult) {
              answerInputEl.value = displayTranscript;
              if (!state.answered && typeAnswerFeedbackEl) {
                typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning');
                typeAnswerFeedbackEl.classList.add('is-transcript');
                typeAnswerFeedbackEl.textContent = `Heard: "${displayTranscript}"`;
              }
            }
            const mergedAlts = [];
            if (combinedFinal) mergedAlts.push(combinedFinal);
            if (displayTranscript && !mergedAlts.includes(displayTranscript)) mergedAlts.push(displayTranscript);
            segAltList.forEach((alt) => {
              const fullAlt = [committedFinalText, alt].filter(Boolean).join(' ').trim();
              if (fullAlt && !mergedAlts.includes(fullAlt)) mergedAlts.push(fullAlt);
            });
            if (mergedAlts.length > 0) {
              voiceCaptureState.questionAlternatives = mergedAlts;
            }
          } else if (micTestStatusEl && displayTranscript) {
            micTestStatusEl.textContent = `Heard: "${displayTranscript}"`;
          }
        };

        recognition.onerror = (event) => {
          if (
            voiceCaptureState.requestToken !== captureToken ||
            voiceCaptureState.recognition !== recognition
          ) {
            return;
          }
          if (event.error === 'no-speech' || event.error === 'aborted') {
            logSpeechEvent('STT', `Browser STT paused with "${event.error}" — keeping listener active.`, {
              error: event.error
            });
            return;
          }
          if (FATAL_STT_ERRORS.has(event.error)) {
            fatalSttError = true;
          } else {
            consecutiveRestartErrors += 1;
            if (consecutiveRestartErrors >= 6) {
              fatalSttError = true;
            }
          }
          logSpeechEvent(
            'STT',
            `Browser STT error: ${event.error}`,
            { error: event.error, fatal: fatalSttError },
            isLocalScorerActive() ? 'warn' : 'error'
          );
          const msg =
            event.error === 'not-allowed'
              ? 'Speech permission denied.'
              : `Speech error: ${event.error}`;
          if (target === 'test' && micTestStatusEl) {
            micTestStatusEl.textContent = msg;
          }
        };

        recognition.onend = () => {
          if (
            voiceCaptureState.requestToken !== captureToken ||
            voiceCaptureState.recognition !== recognition
          ) {
            return;
          }
          voiceCaptureState.recognition = null;
          if (currentSegmentFinalText) {
            committedFinalText = [committedFinalText, currentSegmentFinalText]
              .filter(Boolean)
              .join(' ')
              .trim();
            currentSegmentFinalText = '';
          }
          if (!scheduleRecognitionRestart('paused after audio break')) {
            logSpeechEvent('STT', 'Browser SpeechRecognition session ended.');
          }
        };

        recognition.start();
      } catch (sttErr) {
        if (voiceCaptureState.recognition && voiceCaptureState.requestToken === captureToken) {
          voiceCaptureState.recognition = null;
        }
        if (isRestart && consecutiveRestartErrors < 5) {
          consecutiveRestartErrors += 1;
          scheduleRecognitionRestart('restart retry after start error', 300);
          return;
        }
        logSpeechEvent(
          'STT',
          'Could not start browser SpeechRecognition; continuing with MediaRecorder.',
          { error: sttErr?.message || String(sttErr) },
          'warn'
        );
      }
    };

    startRecognitionSegment(false);
  } else {
    logSpeechEvent('STT', 'Browser SpeechRecognition API unavailable in this browser.', null, 'warn');
  }
}

async function resolveHandsFreeVoiceChoiceFromAudio(audioBlob) {
  const expectedEs = voiceHooks.getSpokenText();
  const browserAlts = Array.isArray(voiceCaptureState.questionAlternatives)
    ? voiceCaptureState.questionAlternatives
    : [];
  for (const cand of browserAlts) {
    const cmd = detectVoiceCommand(cand, '__hf_command__', []);
    if (cmd) {
      logSpeechEvent('COMMAND', `Hands-Free voice choice "${cmd}" matched via Browser STT ("${cand}").`);
      if (typeof voiceHooks.onHandsFreeVoiceCommand === 'function') {
        voiceHooks.onHandsFreeVoiceCommand(cmd, { heard: cand, expectedEs });
      }
      return;
    }
  }
  if (!isLocalScorerActive() || !audioBlob || audioBlob.size < 400) {
    if (typeof voiceHooks.onHandsFreeNoSpeech === 'function') {
      voiceHooks.onHandsFreeNoSpeech({ purpose: 'command' });
    }
    return;
  }
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'command.webm');
    formData.append('expectedEs', '__hf_command__');
    formData.append('altExpectedEs', '[]');
    formData.append('mode', 'scripted');
    formData.append('minScore', '70');
    const res = await fetchWithTimeout(
      `${LOCAL_SCORER_URL}/score-pronunciation`,
      { method: 'POST', body: formData },
      COMMAND_FETCH_TIMEOUT_MS
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const parsed = await res.json();
    const heard = String(parsed.heard || '').trim();
    const cmd = parsed.voiceCommand || detectVoiceCommand(heard, '__hf_command__', []);
    if (cmd && typeof voiceHooks.onHandsFreeVoiceCommand === 'function') {
      logSpeechEvent('COMMAND', `Hands-Free voice choice "${cmd}" matched via Local Scorer ("${heard}").`);
      voiceHooks.onHandsFreeVoiceCommand(cmd, { heard, expectedEs });
      return;
    }
  } catch (err) {
    logSpeechEvent('COMMAND', `Hands-Free voice choice error: ${err?.message || err}`, null, 'warn');
  }
  if (typeof voiceHooks.onHandsFreeNoSpeech === 'function') {
    voiceHooks.onHandsFreeNoSpeech({ purpose: 'command' });
  }
}

async function previewSpokenWithLocalScorer(audioBlob) {
  if (state.answered || voiceCaptureState.isScoring || !isLocalScorerActive() || !audioBlob) return;
  if (audioBlob.size < 400) {
    voiceCaptureState.hasSpokenAudio = false;
    voiceCaptureState.questionAudioBlob = null;
    voiceCaptureState.questionLocalResult = null;
    voiceCaptureState.scoringErrorRequiresRedo = false;
    setSpeechConsoleStats({ captureState: 'idle' });
    logSpeechEvent(
      'RECORDER',
      `Clip too small (${audioBlob.size} bytes < 400 bytes) — skipped local scoring.`,
      { bytes: audioBlob.size, mimeType: audioBlob.type || 'audio/webm' },
      'warn'
    );
    if (inputShellEl) inputShellEl.classList.remove('has-spoken-audio', 'is-recording');
    if (micBtn) {
      micBtn.disabled = false;
      micBtn.classList.remove('is-submit', 'is-recording');
    }
    if (micBtnLabelEl) micBtnLabelEl.textContent = voiceCaptureState.attemptCount > 0 ? 'Speak Again' : 'Speak';
    if (voiceRedoBtn) voiceRedoBtn.disabled = true;
    syncNextQuestionButtonUI();
    if (typeAnswerFeedbackEl) {
      typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-transcript');
      typeAnswerFeedbackEl.classList.add('is-warning');
      typeAnswerFeedbackEl.textContent = 'Recording too short — click Speak to record again.';
    }
    if (voiceHooks.isHandsFreeRunning() && typeof voiceHooks.onHandsFreeCaptureTooShort === 'function') {
      voiceHooks.onHandsFreeCaptureTooShort();
    }
    return;
  }

  voiceCaptureState.isScoring = true;
  voiceCaptureState.questionLocalResult = null;
  voiceCaptureState.scoringErrorRequiresRedo = false;
  setSpeechConsoleStats({ captureState: 'scoring' });
  if (typeof voiceHooks.onHandsFreeScoringStarted === 'function') {
    voiceHooks.onHandsFreeScoringStarted();
  }
  if (micBtn) micBtn.disabled = true;
  if (micBtnLabelEl) micBtnLabelEl.textContent = 'Analyzing...';
  syncNextQuestionButtonUI();
  if (typeAnswerFeedbackEl) {
    typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning');
    typeAnswerFeedbackEl.classList.add('is-transcript', 'is-analyzing');
    typeAnswerFeedbackEl.textContent = 'Scoring Panamanian pronunciation locally...';
  }

  const expectedEs = voiceHooks.getSpokenText();
  const altExpectedEs = voiceHooks.getExpectedSpanishAlternatives();
  const mode = 'scripted';
  const reqUrl = `${LOCAL_SCORER_URL}/score-pronunciation`;
  const t0 = performance.now();

  logSpeechEvent('REQUEST', `POST ${reqUrl} · target="${expectedEs}" (${audioBlob.size} bytes)`, {
    url: reqUrl,
    method: 'POST',
    mode,
    expectedEs,
    altExpectedCount: altExpectedEs.length,
    audioBytes: audioBlob.size,
    mimeType: audioBlob.type || 'audio/webm'
  });

  try {
    const minScore = 90;
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('expectedEs', expectedEs);
    formData.append('altExpectedEs', JSON.stringify(altExpectedEs));
    const slotTemplate = typeof voiceHooks.getSlotTemplate === 'function' ? voiceHooks.getSlotTemplate() : null;
    if (slotTemplate) {
      formData.append('slotTemplate', JSON.stringify(slotTemplate));
    }
    const questionSplit =
      typeof voiceHooks.getQuestionSplit === 'function' ? voiceHooks.getQuestionSplit() : null;
    if (questionSplit?.hasExtension && questionSplit.baseEs && questionSplit.extensionEs) {
      formData.append('baseEs', questionSplit.baseEs);
      formData.append('baseAltEs', JSON.stringify(questionSplit.baseAltEs || []));
      formData.append('extensionEs', questionSplit.extensionEs);
      formData.append('baseWordIndices', JSON.stringify(questionSplit.baseWordIndices || []));
      formData.append('extensionWordIndices', JSON.stringify(questionSplit.extensionWordIndices || []));
    }
    formData.append('mode', mode);
    formData.append('minScore', String(minScore));

    const res = await fetchWithTimeout(
      reqUrl,
      { method: 'POST', body: formData },
      SCORE_FETCH_TIMEOUT_MS
    );
    const clientMs = Math.round(performance.now() - t0);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      logSpeechEvent(
        'ERROR',
        `POST ${reqUrl} -> HTTP ${res.status} (${clientMs} ms)`,
        errBody,
        'error'
      );
      throw new Error(errBody.detail || `Local scorer error (${res.status}).`);
    }

    const parsed = await res.json();
    const dbg = parsed.debug || {};
    const timings = dbg.timingsMs || {};
    const audioDbg = dbg.audio || {};

    recordSpeechScoringOutcome({
      score: Number(parsed.score),
      accuracy: Number(parsed.accuracy),
      fluency: Number(parsed.fluency),
      passed: Boolean(parsed.passed),
      wrongWord: Boolean(parsed.wrongWord),
      clientMs,
      serverMs: timings.totalServerMs ?? null,
      decodeMs: timings.decodeFfmpegMs ?? null,
      gopMs: timings.gopScoreMs ?? null,
      asrMs: timings.asrTranscribeMs ?? null,
      audioBytes: audioBlob.size,
      audioDurationMs: audioDbg.durationMs ?? null,
      rmsDb: audioDbg.rmsDb ?? null
    });

    logSpeechEvent(
      'RESPONSE',
      `Score=${parsed.score}/100 (acc=${parsed.accuracy}, flu=${parsed.fluency}) · passed=${parsed.passed} · wrongWord=${parsed.wrongWord} · heard="${parsed.heard || ''}" (${clientMs} ms)`,
      parsed,
      parsed.wrongWord || !parsed.passed ? 'warn' : 'info'
    );

    if (Array.isArray(dbg.gop?.charDetails) && dbg.gop.charDetails.length > 0) {
      const tokenSummary = dbg.gop.charDetails
        .map((c) => {
          const flagText = c.flags?.length ? `[${c.flags.join(',')}]` : '';
          return `${c.ch}:${c.score}%(${c.rawGop}→${c.adjustedGop})${flagText}`;
        })
        .join(' ');
      logSpeechEvent('GOP', `Unit alignment (${dbg.gop.alignedTokens}/${dbg.gop.expectedTokens} tokens, target="${dbg.gop.scoredTargetEs || expectedEs}", ctc="${dbg.gop.ctcHeard}"): ${tokenSummary}`, {
        scoredTargetEs: dbg.gop.scoredTargetEs || expectedEs,
        ctcHeard: dbg.gop.ctcHeard,
        weakChars: dbg.gop.weakChars,
        fluencyDetails: dbg.gop.fluencyDetails || null,
        prosody: dbg.gop.prosody || null,
        panamaNormalization: dbg.panamaNormalization || null,
        asrSegments: dbg.asr?.segments || []
      });
    }

    if (state.answered || voiceCaptureState.questionAudioBlob !== audioBlob) {
      logSpeechEvent('RESPONSE', 'Discarded stale response because question state changed.', null, 'warn');
      return;
    }

    voiceCaptureState.localScorerStatus = 'ready';
    syncLocalScorerStatusUI();

    const heard = String(parsed.heard || '').trim();
    const parallelBrowserText = String(answerInputEl?.value || '').trim();
    const detectedCommand =
      (parsed.voiceCommand && typeof parsed.voiceCommand === 'string' ? parsed.voiceCommand : null) ||
      detectVoiceCommand(heard, expectedEs, altExpectedEs) ||
      (voiceHooks.isHandsFreeRunning() && parallelBrowserText
        ? detectVoiceCommand(parallelBrowserText, expectedEs, altExpectedEs)
        : null);
    const isRepeatCmd = detectedCommand === 'repeat';
    const skipped = !isRepeatCmd && (Boolean(parsed.skipped) || detectedCommand === 'skip');
    const isCommand = Boolean(detectedCommand && detectedCommand !== 'skip');
    let wrongWord = (skipped || isCommand) ? false : Boolean(parsed.wrongWord);
    let score = (skipped || isCommand) ? 0 : Math.min(100, Math.max(0, Math.round(Number(parsed.score) || 0)));
    const passThreshold = minScore <= 80 ? minScore : 81;
    let isCorrect = (skipped || isCommand) ? false : Boolean(!wrongWord && score >= passThreshold);
    if (!skipped && !isCommand && wrongWord && heard && voiceHooks.matchesExpectedSpanish(heard)) {
      const rawGop = Number(dbg.gop?.rawGopScore ?? parsed.score) || 0;
      wrongWord = false;
      score = Math.min(100, Math.max(0, Math.round(rawGop)));
      isCorrect = score >= passThreshold;
      logSpeechEvent('RESPONSE', `Matched expected Spanish via digit/alternate normalization for "${heard}" -> score=${score}/100`);
    }
    const weakCharsArr = Array.isArray(dbg.gop?.weakChars) ? dbg.gop.weakChars : [];
    const rawCharDetails = Array.isArray(dbg.gop?.charDetails) ? dbg.gop.charDetails : [];

    // Base-only rating: when a question has an extension (fill word / quantity noun / slot option),
    // ONLY require the base for pass/fail & pronunciation score.
    // Track the extension in the mastery table ONLY if the user actually included it,
    // and trigger an additional visual reward when both base & extension are answered correctly!
    const baseOnlyRated = Boolean(
      !skipped && !isCommand && questionSplit?.hasExtension && questionSplit.baseEs && questionSplit.extensionEs
    );
    let extensionRating = null;
    let extensionIncluded = false;
    let fullAnswerBonus = false;
    let bonusExtensionLabelEs = '';
    let bonusExtensionScore = null;
    let baseCharDetails = rawCharDetails;
    let effectiveWeakChars = weakCharsArr;

    if (baseOnlyRated) {
      const normClean = (s) =>
        String(s || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[¿¡?!.,;:()"'-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      const baseRescoredOnly = Boolean(parsed.baseRescoredOnly);
      const baseIdxSet = new Set((questionSplit.baseWordIndices || []).map(Number));
      const extIdxSet = new Set((questionSplit.extensionWordIndices || []).map(Number));
      const splitBaseChars = baseRescoredOnly
        ? rawCharDetails
        : rawCharDetails.filter((c) => baseIdxSet.has(Number(c?.wordIndex)));
      const splitExtChars = baseRescoredOnly
        ? []
        : rawCharDetails.filter((c) => extIdxSet.has(Number(c?.wordIndex)));
      if (splitBaseChars.length > 0) {
        baseCharDetails = splitBaseChars;
      }

      let baseMatched = !wrongWord;
      let extMatched = false;
      let baseScoreVal = score;
      let extScoreVal = 0;
      let extPassedVal = false;

      if (parsed.baseOnlyRated === true) {
        baseMatched = Boolean(parsed.baseMatched);
        baseScoreVal = Number.isFinite(Number(parsed.baseScore))
          ? Math.min(100, Math.max(0, Math.round(Number(parsed.baseScore))))
          : score;
        extMatched = Boolean(parsed.extensionMatched);
        extensionIncluded = Boolean(parsed.extensionIncluded ?? parsed.extensionMatched);
        extScoreVal = Number.isFinite(Number(parsed.extensionScore))
          ? Math.min(100, Math.max(0, Math.round(Number(parsed.extensionScore))))
          : 0;
        extPassedVal = Boolean(parsed.extensionPassed);
      } else {
        const heardNorm = normClean(heard);
        const paddedHeard = ` ${heardNorm} `;
        const baseCands = [questionSplit.baseEs, ...(questionSplit.baseAltEs || [])]
          .map(normClean)
          .filter(Boolean);
        const matchedBaseCand = heardNorm
          ? baseCands.find((bc) => heardNorm === bc || paddedHeard.includes(` ${bc} `))
          : '';
        if (!baseMatched && matchedBaseCand) {
          baseMatched = true;
        }
        const isAnySlotExt = questionSplit.extensionEs === '__slot_any__';
        const extNorm = isAnySlotExt ? '' : normClean(questionSplit.extensionEs);
        const spokenExtMatch =
          typeof voiceHooks.resolveSpokenExtensionInfo === 'function'
            ? voiceHooks.resolveSpokenExtensionInfo(heard, parsed.scoredTargetEs)
            : null;
        extMatched = Boolean(
          spokenExtMatch ||
          (heardNorm && extNorm && (heardNorm === extNorm || paddedHeard.includes(` ${extNorm} `))) ||
          (!wrongWord && splitExtChars.length > 0 && (!isAnySlotExt || heardNorm.split(' ').length > normClean(questionSplit.baseEs).split(' ').length))
        );
        const leftoverAfterBase =
          baseMatched && matchedBaseCand && !extMatched && !isAnySlotExt
            ? heardNorm.replace(matchedBaseCand, ' ').replace(/\s+/g, ' ').trim()
            : '';
        extensionIncluded = extMatched || leftoverAfterBase.length > 0;
        if (splitBaseChars.length > 0) {
          baseScoreVal = Math.min(
            100,
            Math.max(
              0,
              Math.round(splitBaseChars.reduce((s, c) => s + (Number(c?.score) || 0), 0) / splitBaseChars.length)
            )
          );
        }
        if (extensionIncluded) {
          if (splitExtChars.length > 0) {
            extScoreVal = Math.min(
              100,
              Math.max(
                0,
                Math.round(splitExtChars.reduce((s, c) => s + (Number(c?.score) || 0), 0) / splitExtChars.length)
              )
            );
          } else {
            extScoreVal = extMatched ? score : 0;
          }
          extPassedVal = Boolean(extMatched && extScoreVal >= passThreshold);
        } else {
          extScoreVal = 0;
          extPassedVal = false;
        }
      }

      wrongWord = !baseMatched;
      score = wrongWord ? Math.min(baseScoreVal, 45) : baseScoreVal;
      isCorrect = Boolean(!wrongWord && score >= passThreshold);
      effectiveWeakChars = splitBaseChars
        .filter((c) => (Number(c?.score) || 0) < 80)
        .map((c) => c.ch)
        .filter(Boolean);

      const resolvedSpokenExt =
        typeof voiceHooks.resolveSpokenExtensionInfo === 'function'
          ? voiceHooks.resolveSpokenExtensionInfo(heard, parsed.scoredTargetEs)
          : null;
      const trackInMastery = questionSplit.trackExtensionInMastery !== false;
      fullAnswerBonus = Boolean(isCorrect && extensionIncluded && extPassedVal);
      bonusExtensionLabelEs =
        resolvedSpokenExt?.es ||
        (questionSplit.extensionEs === '__slot_any__'
          ? ''
          : (questionSplit.extensionLabelEs || questionSplit.extensionEs));
      bonusExtensionScore = extensionIncluded ? Math.min(100, Math.max(0, Math.round(extScoreVal))) : null;

      // Only track extension in Mastery Table when the user actually included it!
      if (extensionIncluded && trackInMastery) {
        extensionRating = {
          key: resolvedSpokenExt?.key || questionSplit.extensionKey,
          catId: resolvedSpokenExt?.catId || questionSplit.catId,
          es: resolvedSpokenExt?.es || questionSplit.extensionLabelEs || questionSplit.extensionEs,
          en: resolvedSpokenExt?.en || questionSplit.extensionLabelEn || questionSplit.extensionEn,
          group: resolvedSpokenExt?.group || questionSplit.extensionGroup || '',
          isCorrect: Boolean(extPassedVal),
          score: Math.min(100, Math.max(0, Math.round(extScoreVal))),
          needsImprovement: Boolean(extPassedVal && extScoreVal < 90)
        };
      }
    }

    const needsPronunciationImprovement = Boolean(
      isCorrect && (baseOnlyRated ? (score < 90 || effectiveWeakChars.length > 0) : (parsed.needsPronunciationImprovement || score < 90 || weakCharsArr.length > 0))
    );
    const tipText = isRepeatCmd
      ? `Playing "${expectedEs}" — listen and speak again.`
      : skipped
        ? `Skipped — "${expectedEs}"`
        : isCommand
          ? `Voice command "${detectedCommand}" detected.`
          : (score >= 100 ? '' : String(parsed.feedback || '').trim());
    const prosodyTip = isCommand || skipped || wrongWord ? '' : String(parsed.prosodyTip || dbg.gop?.prosody?.tip || '').trim();

    voiceCaptureState.questionLocalResult = {
      heard,
      heardTranslation: String(parsed.heardTranslation || '').trim(),
      voiceCommand: detectedCommand,
      isRepeatCmd,
      skipped,
      wrongWord,
      score,
      accuracy: Number(parsed.accuracy) || 0,
      fluency: Number(parsed.fluency) || 0,
      isCorrect,
      needsPronunciationImprovement,
      tipText,
      prosodyTip,
      expectedEs: String(parsed.scoredTargetEs || expectedEs),
      audioBlob,
      audioStats: audioDbg,
      charDetails: rawCharDetails,
      baseCharDetails,
      weakChars: effectiveWeakChars,
      baseOnlyRated,
      baseEs: baseOnlyRated ? questionSplit.baseEs : '',
      extensionIncluded,
      fullAnswerBonus,
      bonusExtensionLabelEs,
      bonusExtensionScore,
      extensionRating,
      panamaNormalization: dbg.panamaNormalization || null,
      rawResponse: parsed
    };

    if (!wrongWord && score >= 60) {
      voiceCaptureState.speakCloseAttemptCount += 1;
    }
    if (speakCompareBtn) {
      speakCompareBtn.classList.toggle('hidden', voiceCaptureState.speakCloseAttemptCount < 2);
    }
    if (heard) answerInputEl.value = heard;
    if (typeAnswerFeedbackEl) {
      typeAnswerFeedbackEl.classList.remove('is-analyzing');
    }
    // Clear scoring lock and immediately commit verdict so the next question loads automatically
    voiceCaptureState.isScoring = false;
    commitLocalPronunciationResult();
  } catch (err) {
    const clientMs = Math.round(performance.now() - t0);
    incrementSpeechErrorCount();
    if (voiceCaptureState.questionAudioBlob !== audioBlob) return;
    voiceCaptureState.hasSpokenAudio = false;
    voiceCaptureState.questionAudioBlob = null;
    voiceCaptureState.questionLocalResult = null;
    voiceCaptureState.scoringErrorRequiresRedo = false;
    voiceCaptureState.localScorerStatus = 'offline';
    syncLocalScorerStatusUI();
    setSpeechConsoleStats({ connectionStatus: 'offline', captureState: 'idle' });
    logSpeechEvent(
      'ERROR',
      `Local scorer request failed (${clientMs} ms): ${err?.message || 'Unknown error'}`,
      { url: reqUrl, expectedEs, error: err?.message || String(err) },
      'error'
    );
    if (inputShellEl) inputShellEl.classList.remove('has-spoken-audio', 'is-recording');
    if (micBtn) {
      micBtn.disabled = false;
      micBtn.classList.remove('is-submit', 'is-recording');
    }
    if (micBtnLabelEl) micBtnLabelEl.textContent = voiceCaptureState.attemptCount > 0 ? 'Speak Again' : 'Speak';
    if (voiceRedoBtn) voiceRedoBtn.disabled = true;
    syncNextQuestionButtonUI();
    if (typeAnswerFeedbackEl) {
      typeAnswerFeedbackEl.classList.remove('is-analyzing', 'is-transcript');
      typeAnswerFeedbackEl.classList.add('is-warning');
      typeAnswerFeedbackEl.textContent = `${err?.message || 'Local scorer unavailable'} — click Speak to retry or check port 8765.`;
    }
    if (voiceHooks.isHandsFreeRunning() && typeof voiceHooks.onHandsFreeScorerError === 'function') {
      voiceHooks.onHandsFreeScorerError(err);
    }
  } finally {
    setSpeechConsoleStats({ captureState: voiceCaptureState.activeMode ? 'recording' : 'idle' });
    if (typeAnswerFeedbackEl) typeAnswerFeedbackEl.classList.remove('is-analyzing');
    if (voiceCaptureState.questionAudioBlob === audioBlob || !voiceCaptureState.questionAudioBlob) {
      voiceCaptureState.isScoring = false;
    }
    syncNextQuestionButtonUI();
  }
}

export function getSpokenWordAtIndex(text, wordIdx) {
  const idx = Number(wordIdx);
  if (!Number.isInteger(idx) || idx < 0) return '';
  const words = String(text || '')
    .replace(/\[[^\]]+\]/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/^[¿¡]+|[?!.,;:]+$/g, '').trim())
    .filter(Boolean);
  return words[idx] || '';
}

export function renderPronunciationWordStripHTML(charDetails) {
  if (!Array.isArray(charDetails) || charDetails.length === 0) return '';

  const wordGroups = [];
  let currentGroup = null;
  let lastWordIdx = null;

  charDetails.forEach((c) => {
    const ch = String(c?.ch ?? c?.char ?? '');
    if (!ch) return;
    const rawWIdx = c?.wordIndex;
    const hasWordIdx = rawWIdx !== undefined && rawWIdx !== null && Number.isFinite(Number(rawWIdx));
    const wIdx = hasWordIdx ? Number(rawWIdx) : 0;

    if (!currentGroup || (hasWordIdx && wIdx !== lastWordIdx)) {
      currentGroup = { wordIdx: wIdx, tokens: [] };
      wordGroups.push(currentGroup);
      lastWordIdx = wIdx;
    }
    currentGroup.tokens.push({
      ch,
      score: Math.round(Number(c?.score) || 0)
    });
  });

  return wordGroups
    .map(({ wordIdx, tokens }) => {
      const inner = tokens
        .map(({ ch, score }) => {
          const isGood = score >= 80;
          const cls = isGood ? 'is-high' : 'is-low';
          const status = isGood ? 'Correct' : 'Needs work';
          return `<span class="phoneme-chip ${cls}" data-sound="${escapeHtmlText(ch)}" role="button" tabindex="0" title="${escapeHtmlText(ch)}: ${score}% (${status}) — Click for mouth-position tip & hear this word slowly">${escapeHtmlText(ch)}</span>`;
        })
        .join('');
      return `<span class="pron-word" data-word-index="${wordIdx}">${inner}</span>`;
    })
    .join('<span class="pron-word-space" aria-hidden="true"> </span>');
}

export function commitLocalPronunciationResult() {
  if (state.answered || voiceCaptureState.isScoring || voiceCaptureState.scoringErrorRequiresRedo) return;
  const result = voiceCaptureState.questionLocalResult;
  if (!result) return;

  const {
    score,
    accuracy,
    fluency,
    isCorrect,
    needsPronunciationImprovement,
    voiceCommand,
    isRepeatCmd,
    skipped,
    tipText,
    prosodyTip,
    wrongWord,
    heard,
    heardTranslation,
    expectedEs,
    audioBlob,
    audioStats,
    charDetails,
    baseCharDetails,
    weakChars,
    baseOnlyRated,
    extensionIncluded,
    fullAnswerBonus,
    bonusExtensionLabelEs,
    bonusExtensionScore,
    extensionRating,
    panamaNormalization
  } = result;
  // Word-spaced phoneme breakdown with green (correct) / red (incorrect) underlines
  if (pronunciationPhonemeStripEl) {
    if (!wrongWord && Array.isArray(charDetails) && charDetails.length > 0) {
      pronunciationPhonemeStripEl.innerHTML = renderPronunciationWordStripHTML(charDetails);
      pronunciationPhonemeStripEl.classList.remove('hidden');
    } else {
      pronunciationPhonemeStripEl.innerHTML = '';
      pronunciationPhonemeStripEl.classList.add('hidden');
    }
  }

  // Side-by-side playback (Play Mine vs Play Spanish)
  if (audioBlob && postSpeakActionsEl) {
    if (voiceCaptureState.lastSubmittedAudioUrl) {
      URL.revokeObjectURL(voiceCaptureState.lastSubmittedAudioUrl);
    }
    voiceCaptureState.lastSubmittedAudioUrl = URL.createObjectURL(audioBlob);
    if (playMyAudioBtn) playMyAudioBtn.classList.remove('hidden');
    postSpeakActionsEl.classList.remove('hidden');
  }

  // Mic gain / clipping quality warning (only warn on genuine sustained clipping or very quiet input)
  if (audioQualityWarningEl) {
    const rmsDb = Number(audioStats?.rmsDb);
    const sustainedClipping = Boolean(audioStats?.clippingDetected);
    if (sustainedClipping && (!isCorrect || score < 90)) {
      audioQualityWarningEl.textContent = 'Heavy mic distortion detected — lower your mic input slightly or step back a bit.';
      audioQualityWarningEl.classList.remove('hidden');
    } else if (Number.isFinite(rmsDb) && rmsDb < -40) {
      audioQualityWarningEl.textContent = `Mic volume very quiet (${rmsDb} dB) — speak closer to the mic or increase input level.`;
      audioQualityWarningEl.classList.remove('hidden');
    } else {
      audioQualityWarningEl.textContent = '';
      audioQualityWarningEl.classList.add('hidden');
    }
  }

  // Panamanian phonetics & prosody coaching callout
  if (panamaPhoneticsTipEl) {
    const expPhon = String(panamaNormalization?.expectedPhonetic || '').trim();
    const rawClean = String(expectedEs || '').toLowerCase().replace(/[¿¡?!.,:;]/g, '').trim();
    const notes = [];
    if (!wrongWord && panamaNormalization?.matched && expPhon && expPhon !== rawClean) {
      notes.push(`Panama es-PA: Natural phonetics accepted ("${expPhon}").`);
    }
    if (!wrongWord && prosodyTip && prosodyTip !== tipText) {
      notes.push(`Rhythm/Stress: ${prosodyTip}`);
    }
    if (notes.length > 0) {
      panamaPhoneticsTipEl.textContent = notes.join(' · ');
      panamaPhoneticsTipEl.classList.remove('hidden');
    } else {
      panamaPhoneticsTipEl.textContent = '';
      panamaPhoneticsTipEl.classList.add('hidden');
    }
  }

  if (voiceCommand && voiceCommand !== 'skip') {
    voiceCaptureState.hasSpokenAudio = false;
    voiceCaptureState.questionAudioBlob = null;
    voiceCaptureState.questionLocalResult = null;
    if (inputShellEl) {
      inputShellEl.classList.remove('has-spoken-audio', 'is-recording', 'correct', 'incorrect');
    }
    if (micBtn) {
      micBtn.disabled = false;
      micBtn.classList.remove('is-submit', 'is-recording');
    }
    if (micBtnLabelEl) {
      micBtnLabelEl.textContent = voiceCaptureState.attemptCount > 0 ? 'Speak Again' : 'Speak';
    }
    if (voiceRedoBtn) voiceRedoBtn.disabled = true;
    const targetSpoken = expectedEs || voiceHooks.getSpokenText();
    logSpeechEvent('COMMAND', `Voice command "${voiceCommand.toUpperCase()}" detected (heard="${heard}").`);
    const fallbackUnrecognizedCmd = () => {
      if (isRepeatCmd && (state.practiceMode || (!voiceHooks.isHardTopicExamActive() && (voiceCaptureState.attemptCount > 0 || voiceCaptureState.retryRoundUsed)))) {
        if (typeAnswerFeedbackEl) {
          typeAnswerFeedbackEl.textContent = `Listening model: "${targetSpoken}" — speak when ready!`;
          typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning');
          typeAnswerFeedbackEl.classList.add('is-transcript');
        }
        speakSpanish(targetSpoken);
      } else if (typeAnswerFeedbackEl && !state.answered) {
        typeAnswerFeedbackEl.textContent = `Voice command "${voiceCommand}" heard — speak your Spanish answer when ready.`;
        typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-transcript');
        typeAnswerFeedbackEl.classList.add('is-warning');
      }
    };
    if (typeof voiceHooks.onHandsFreeVoiceCommand === 'function') {
      Promise.resolve(voiceHooks.onHandsFreeVoiceCommand(voiceCommand, { heard, expectedEs: targetSpoken }))
        .then((handled) => {
          if (!handled) fallbackUnrecognizedCmd();
        })
        .catch(() => fallbackUnrecognizedCmd());
      return;
    }
    fallbackUnrecognizedCmd();
    return;
  }

  if (skipped) {
    const targetSpoken = expectedEs || voiceHooks.getSpokenText();
    if (state.practiceMode) {
      speakSpanish(targetSpoken);
      if (typeof voiceHooks.onPracticeAdvance === 'function') {
        voiceHooks.onPracticeAdvance();
      } else {
        voiceHooks.onStartFeedbackProgressBar(false);
      }
      return;
    }
    state.answered = true;
    if (answerInputEl) answerInputEl.disabled = true;
    if (micBtn) {
      micBtn.disabled = true;
      micBtn.classList.remove('is-submit', 'is-recording');
    }
    if (voiceRedoBtn) voiceRedoBtn.disabled = true;
    syncNextQuestionButtonUI();

    voiceHooks.onRecordOutcome(false, { skipped: true });
    logSpeechEvent(
      'COMMIT',
      `Voice command SKIP detected (heard="${heard}") — pronouncing "${targetSpoken}" and advancing.`,
      { engine: 'local', skipped: true, heard, expectedEs: targetSpoken },
      'info'
    );

    if (inputShellEl) {
      inputShellEl.classList.remove('has-spoken-audio', 'is-recording', 'correct', 'incorrect');
    }
    if (typeAnswerFeedbackEl) {
      typeAnswerFeedbackEl.textContent = `Skipped — "${targetSpoken}"`;
      typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning', 'is-transcript');
      typeAnswerFeedbackEl.classList.add('is-warning');
    }
    speakSpanish(targetSpoken);
    voiceHooks.onStartFeedbackProgressBar(false);
    return;
  }

  // In Practice Mode (ungraded): show full score + underlined feedback without recording stats or locking out
  if (state.practiceMode) {
    voiceCaptureState.hasSpokenAudio = false;
    voiceCaptureState.questionAudioBlob = null;
    voiceCaptureState.questionLocalResult = null;
    if (inputShellEl) {
      inputShellEl.classList.remove('has-spoken-audio', 'is-recording', 'correct', 'incorrect');
      inputShellEl.classList.add(isCorrect ? 'correct' : 'incorrect');
    }
    if (micBtn) {
      micBtn.disabled = false;
      micBtn.classList.remove('is-submit', 'is-recording');
    }
    if (micBtnLabelEl) {
      micBtnLabelEl.textContent = 'Speak Again';
    }
    if (voiceRedoBtn) voiceRedoBtn.disabled = true;
    syncNextQuestionButtonUI();

    if (isCorrect && fullAnswerBonus) {
      if (typeof voiceHooks.onFullAnswerReward === 'function') {
        voiceHooks.onFullAnswerReward({
          extensionEs: bonusExtensionLabelEs,
          extensionScore: bonusExtensionScore,
          baseScore: score,
          trackedInMastery: false,
          isPractice: true
        });
      } else {
        voiceHooks.onPlayCorrectSound();
      }
    } else if (isCorrect) {
      voiceHooks.onPlayCorrectSound();
    } else {
      voiceHooks.onPlayIncorrectSound();
    }
    let practiceRes = { justCompleted: false };
    if (typeof voiceHooks.onPracticeItemSpoken === 'function') {
      practiceRes =
        voiceHooks.onPracticeItemSpoken({
          isCorrect,
          scoredTargetEs: expectedEs,
          heard,
          extensionIncluded: Boolean(extensionIncluded)
        }) || { justCompleted: false };
    }

    if (typeAnswerFeedbackEl) {
      typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning', 'is-transcript');
      if (isCorrect && fullAnswerBonus) {
        const extBit = bonusExtensionLabelEs
          ? ` (+ "${bonusExtensionLabelEs}"${Number.isFinite(bonusExtensionScore) ? ` ${bonusExtensionScore}/100` : ''})`
          : ' (Base + Extension)';
        typeAnswerFeedbackEl.textContent = `★ Practice · Correct! (${score}/100) · Full Answer Bonus${extBit} — Click Next Word →`;
        typeAnswerFeedbackEl.classList.add('is-correct', 'is-full-answer-bonus');
      } else if (isCorrect) {
        const improveBit = needsPronunciationImprovement ? ' · Could be improved' : '';
        const baseBit = baseOnlyRated ? ' · Base' : '';
        typeAnswerFeedbackEl.textContent = `Practice · Correct! (${score}/100${baseBit})${improveBit} — Speak again or click Next Word →`;
        typeAnswerFeedbackEl.classList.add('is-correct');
      } else if (wrongWord) {
        const heardPart = heardTranslation ? `Heard "${heardTranslation}"` : 'Different word';
        typeAnswerFeedbackEl.textContent = `Practice · ${heardPart} — Listen & try again or click Next Word →`;
        typeAnswerFeedbackEl.classList.add('is-incorrect');
      } else {
        const tipPart = tipText ? ` — ${tipText}` : '';
        typeAnswerFeedbackEl.textContent = `Practice · ${score}/100${tipPart}`;
        typeAnswerFeedbackEl.classList.add('is-incorrect');
      }
    }
    logSpeechEvent(
      'PRACTICE',
      `Practice (ungraded) score=${score}/100 · target="${expectedEs}" · heard="${heard}"`,
      { engine: 'local', practiceMode: true, isCorrect, wrongWord, score, expectedEs, heard },
      'info'
    );
    if (voiceHooks.isHandsFreeRunning() && typeof voiceHooks.onHandsFreePracticeResult === 'function') {
      voiceHooks.onHandsFreePracticeResult({
        isCorrect,
        score,
        wrongWord,
        expectedEs: expectedEs || voiceHooks.getSpokenText(),
        justCompleted: Boolean(practiceRes?.justCompleted)
      });
    }
    return;
  }

  // Record every graded spoken attempt's pronunciation score for an accurate average across all stats
  const recordedPronSample = Boolean(!skipped && Number.isFinite(score) && (!wrongWord || score > 0));
  if (recordedPronSample) {
    voiceHooks.onRecordPronunciationAttempt(score, {
      needsImprovement: Boolean(needsPronunciationImprovement || !isCorrect),
      weakChars,
      charDetails: baseOnlyRated ? (baseCharDetails || charDetails) : charDetails,
      extensionRating
    });
  }

  if (isCorrect) {
    state.answered = true;
    answerInputEl.disabled = true;
    if (micBtn) micBtn.disabled = true;
    if (voiceRedoBtn) voiceRedoBtn.disabled = true;
    syncNextQuestionButtonUI();

    voiceHooks.onRecordOutcome(true, {
      strictClean: !needsPronunciationImprovement,
      pronunciationScore: score,
      pronunciationNeedsImprovement: Boolean(needsPronunciationImprovement),
      pronunciationAlreadyRecorded: recordedPronSample,
      weakChars,
      charDetails: baseOnlyRated ? (baseCharDetails || charDetails) : charDetails,
      extensionIncluded: Boolean(extensionIncluded),
      fullAnswerBonus: Boolean(fullAnswerBonus),
      extensionRating,
      extensionPronunciationAlreadyRecorded: Boolean(recordedPronSample && extensionRating),
      scoredTargetEs: expectedEs,
      heard
    });
    if (fullAnswerBonus && typeof voiceHooks.onFullAnswerReward === 'function') {
      voiceHooks.onFullAnswerReward({
        extensionEs: bonusExtensionLabelEs,
        extensionScore: bonusExtensionScore,
        baseScore: score,
        trackedInMastery: Boolean(extensionRating),
        isPractice: false
      });
    } else {
      voiceHooks.onPlayCorrectSound();
    }

    logSpeechEvent(
      'COMMIT',
      `Committed Hybrid verdict: CORRECT${fullAnswerBonus ? ' (FULL ANSWER BONUS)' : ''}${needsPronunciationImprovement ? ' (Pronunciation could be improved)' : ''} · score=${score}/100 · target="${expectedEs}" · heard="${heard}"`,
      {
        engine: 'local',
        isCorrect: true,
        needsPronunciationImprovement: Boolean(needsPronunciationImprovement),
        wrongWord: false,
        score,
        accuracy,
        fluency,
        expectedEs,
        heard,
        tipText,
        attemptCount: voiceCaptureState.attemptCount + 1,
        retryRoundUsed: voiceCaptureState.retryRoundUsed,
        pronunciationScoreRecorded: score,
        baseOnlyRated: Boolean(baseOnlyRated),
        extensionIncluded: Boolean(extensionIncluded),
        fullAnswerBonus: Boolean(fullAnswerBonus),
        extensionRating: extensionRating || null
      },
      'info'
    );

    inputShellEl.classList.remove('incorrect');
    inputShellEl.classList.add('correct');
    if (fullAnswerBonus) {
      inputShellEl.classList.add('is-full-answer-bonus');
    }
    if (typeAnswerFeedbackEl) {
      if (fullAnswerBonus) {
        const extTag = bonusExtensionLabelEs
          ? `+ "${bonusExtensionLabelEs}"${Number.isFinite(bonusExtensionScore) ? ` ${bonusExtensionScore}/100` : ''}`
          : '+ Extension included';
        if (needsPronunciationImprovement) {
          typeAnswerFeedbackEl.textContent = `★ Correct! (${score}/100) · Pronunciation could be improved · Full Answer Bonus (${extTag})`;
        } else {
          typeAnswerFeedbackEl.textContent = `★ Correct! (${score}/100) · Full Answer Bonus (${extTag})`;
        }
      } else if (baseOnlyRated && extensionRating) {
        const extStatus = `Extension "${extensionRating.es}" ${extensionRating.score}/100 (tracked in mastery)`;
        if (needsPronunciationImprovement) {
          typeAnswerFeedbackEl.textContent = `Correct! (${score}/100) · Pronunciation could be improved · ${extStatus}`;
        } else {
          typeAnswerFeedbackEl.textContent = `Correct! (${score}/100) · Base passed · ${extStatus}`;
        }
      } else if (baseOnlyRated) {
        if (needsPronunciationImprovement) {
          typeAnswerFeedbackEl.textContent = `Correct! (${score}/100) · Pronunciation could be improved · Base answered`;
        } else {
          typeAnswerFeedbackEl.textContent = `Correct! (${score}/100) · Base answered`;
        }
      } else if (needsPronunciationImprovement) {
        const cleanTip = tipText && !/could be improved/i.test(tipText) ? ` — ${tipText}` : '';
        typeAnswerFeedbackEl.textContent = `Correct (${score}/100) · Pronunciation could be improved${cleanTip}`;
      } else {
        typeAnswerFeedbackEl.textContent = tipText
          ? `Correct (${score}/100) — ${tipText}`
          : `Correct (${score}/100)`;
      }
      typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning', 'is-transcript');
      typeAnswerFeedbackEl.classList.add('is-correct');
      if (fullAnswerBonus) {
        typeAnswerFeedbackEl.classList.add('is-full-answer-bonus');
      }
    }
    voiceHooks.onStartFeedbackProgressBar(true);
    return;
  }

  // Incorrect attempt: 2 attempts per round; first Incorrect Screen allows one Try Again (2 more tries)
  voiceCaptureState.attemptCount += 1;
  if (typeof voiceHooks.onAttemptFailed === 'function') {
    voiceHooks.onAttemptFailed();
  }
  voiceCaptureState.lastFailedMeta = {
    pronunciationScore: score,
    pronunciationAlreadyRecorded: recordedPronSample,
    weakChars,
    charDetails: baseOnlyRated ? (baseCharDetails || charDetails) : charDetails,
    extensionIncluded: Boolean(extensionIncluded),
    extensionRating,
    extensionPronunciationAlreadyRecorded: Boolean(recordedPronSample && extensionRating)
  };
  voiceCaptureState.hasSpokenAudio = false;
  voiceCaptureState.questionAudioBlob = null;
  voiceCaptureState.questionLocalResult = null;

  voiceHooks.onPlayIncorrectSound();

  const isHardExam = Boolean(
    typeof voiceHooks.isHardTopicExamActive === 'function' && voiceHooks.isHardTopicExamActive()
  );
  const maxAttempts = isHardExam ? 1 : MAX_SPEAK_ATTEMPTS_BEFORE_NEXT;
  const attemptNum = voiceCaptureState.attemptCount;
  const reachedMaxAttempts = attemptNum >= maxAttempts;
  const roundPrefix = isHardExam ? 'Exam' : voiceCaptureState.retryRoundUsed ? 'Retry' : 'Attempt';

  if (reachedMaxAttempts) {
    state.answered = true;
    if (answerInputEl) answerInputEl.disabled = true;
    if (micBtn) {
      micBtn.disabled = true;
      micBtn.classList.remove('is-submit', 'is-recording');
    }
    if (voiceRedoBtn) voiceRedoBtn.disabled = true;
    syncNextQuestionButtonUI();

    const canRetry = !isHardExam && !voiceCaptureState.retryRoundUsed;
    if (canRetry) {
      voiceCaptureState.pendingIncorrectCommit = true;
    } else {
      voiceCaptureState.pendingIncorrectCommit = false;
      voiceHooks.onRecordOutcome(false, {
        pronunciationScore: score,
        pronunciationAlreadyRecorded: recordedPronSample,
        weakChars,
        charDetails: baseOnlyRated ? (baseCharDetails || charDetails) : charDetails,
        extensionIncluded: Boolean(extensionIncluded),
        extensionRating,
        extensionPronunciationAlreadyRecorded: Boolean(recordedPronSample && extensionRating)
      });
    }

    logSpeechEvent(
      'COMMIT',
      `Speaking ${roundPrefix.toLowerCase()} ${attemptNum}/${MAX_SPEAK_ATTEMPTS_BEFORE_NEXT}: INCORRECT (showing Incorrect Screen, canRetry=${canRetry}) · score=${score}/100 · target="${expectedEs}" · heard="${heard}"`,
      {
        engine: 'local',
        isCorrect: false,
        wrongWord,
        score,
        accuracy,
        fluency,
        expectedEs,
        heard,
        heardTranslation,
        tipText,
        attemptCount: attemptNum,
        retryRoundUsed: voiceCaptureState.retryRoundUsed,
        canRetry,
        showIncorrectScreen: true
      },
      'warn'
    );

    const targetSpoken = expectedEs || voiceHooks.getSpokenText();
    voiceHooks.onShowIncorrectScreen({
      expectedEs: targetSpoken,
      heard,
      heardTranslation,
      wrongWord,
      score,
      tipText,
      charDetails,
      canRetry,
      retryRoundUsed: voiceCaptureState.retryRoundUsed,
      hasRecordedAudio: Boolean(voiceCaptureState.lastSubmittedAudioUrl)
    });
    if (voiceHooks.isHandsFreeRunning() && typeof voiceHooks.onHandsFreeIncorrectScreen === 'function') {
      voiceHooks.onHandsFreeIncorrectScreen({
        expectedEs: targetSpoken,
        canRetry,
        retryRoundUsed: voiceCaptureState.retryRoundUsed,
        wrongWord,
        score
      });
    } else {
      speakSpanish(targetSpoken);
    }
    return;
  }

  logSpeechEvent(
    'ATTEMPT',
    `Speaking ${roundPrefix.toLowerCase()} ${attemptNum}/${MAX_SPEAK_ATTEMPTS_BEFORE_NEXT}: INCORRECT · score=${score}/100 · target="${expectedEs}" · heard="${heard}"`,
    {
      engine: 'local',
      isCorrect: false,
      wrongWord,
      score,
      accuracy,
      fluency,
      expectedEs,
      heard,
      heardTranslation,
      tipText,
      attemptCount: attemptNum,
      retryRoundUsed: voiceCaptureState.retryRoundUsed,
      remainingAttempts: MAX_SPEAK_ATTEMPTS_BEFORE_NEXT - attemptNum
    },
    'warn'
  );

  if (inputShellEl) {
    inputShellEl.classList.remove('has-spoken-audio', 'is-recording', 'correct');
    inputShellEl.classList.add('incorrect');
  }
  if (micBtn) {
    micBtn.disabled = false;
    micBtn.classList.remove('is-submit', 'is-recording');
  }
  if (micBtnLabelEl) {
    micBtnLabelEl.textContent = 'Speak Again';
  }
  if (voiceRedoBtn) {
    voiceRedoBtn.disabled = true;
  }
  syncNextQuestionButtonUI();

  if (typeAnswerFeedbackEl) {
    const attemptTag = `${roundPrefix} ${attemptNum}/${MAX_SPEAK_ATTEMPTS_BEFORE_NEXT}`;
    if (wrongWord) {
      const heardPart = heardTranslation
        ? `You said: "${heardTranslation}"`
        : 'Wrong word';
      typeAnswerFeedbackEl.textContent = `${attemptTag} · ${heardPart} · Listen & try again!`;
    } else {
      const detailPart = tipText ? `(${score}/100) — ${tipText}` : `(${score}/100)`;
      typeAnswerFeedbackEl.textContent = `${attemptTag} · Incorrect ${detailPart} · Listen & try again!`;
    }
    typeAnswerFeedbackEl.classList.remove('is-invisible', 'is-correct', 'is-incorrect', 'is-warning', 'is-transcript');
    typeAnswerFeedbackEl.classList.add('is-incorrect');
  }

  const targetAttempt1Es = expectedEs || voiceHooks.getSpokenText();
  if (voiceHooks.isHandsFreeRunning() && typeof voiceHooks.onHandsFreeAttempt1Fail === 'function') {
    voiceHooks.onHandsFreeAttempt1Fail({
      expectedEs: targetAttempt1Es,
      score,
      wrongWord
    });
  } else {
    speakSpanish(targetAttempt1Es);
  }
}

export function syncPronunciationEngineUI() {
  if (pronunciationEngineSelectEl) {
    pronunciationEngineSelectEl.value = state.pronunciationEngine === 'browser' ? 'browser' : 'local';
  }
  checkLocalScorerHealth();
}

export function hidePostSpeakWordStrip() {
  const stripEl = document.getElementById('post-speak-word-strip');
  const wordsBtn = document.getElementById('play-native-words-btn');
  if (stripEl) {
    stripEl.innerHTML = '';
    stripEl.classList.add('hidden');
  }
  if (wordsBtn) {
    wordsBtn.classList.remove('is-active');
    wordsBtn.setAttribute('aria-expanded', 'false');
  }
}

function renderPostSpeakWordStrip(displayText, activeWordIdx = -1) {
  const stripEl = document.getElementById('post-speak-word-strip');
  if (!stripEl) return;
  const tokens = tokenizeDisplaySpanishWithSlots(displayText);
  if (tokens.length === 0) {
    hidePostSpeakWordStrip();
    return;
  }
  let wordCounter = 0;
  let wordsHTML = '';
  tokens.forEach((tok) => {
    if (tok.type === 'slot') {
      wordsHTML += `<span class="slot-placeholder-chip" title="Say your own answer here">${escapeHtmlText(tok.text)}</span>`;
      return;
    }
    if (tok.type === 'punct') {
      wordsHTML += `<span class="slot-punct">${escapeHtmlText(tok.text)}</span>`;
      return;
    }
    const idx = wordCounter;
    wordCounter += 1;
    const activeCls = idx === activeWordIdx ? ' is-speaking' : '';
    wordsHTML += `<button type="button" class="post-speak-word-btn${activeCls}" data-speak-word="${escapeHtmlText(tok.spoken)}" title="Click to hear &quot;${escapeHtmlText(tok.spoken)}&quot;">${escapeHtmlText(tok.text)}</button>`;
  });
  const playAllBtnHTML =
    wordCounter > 1
      ? '<button type="button" class="post-speak-play-all-btn" title="Play every word slowly one by one">▶ All</button>'
      : '';
  stripEl.innerHTML = `<span class="post-speak-word-label">Click a word:</span><span class="post-speak-words">${wordsHTML}</span>${playAllBtnHTML}`;
  stripEl.classList.remove('hidden');
}

export function initVoiceCapture(hooks = {}) {
  voiceHooks = { ...voiceHooks, ...hooks };

  initSpeechConsole({
    onCheckHealth: () => checkLocalScorerHealth()
  });

  if (pronunciationEngineSelectEl) {
    pronunciationEngineSelectEl.value = state.pronunciationEngine === 'browser' ? 'browser' : 'local';
    setSpeechConsoleStats({ engine: state.pronunciationEngine });
    pronunciationEngineSelectEl.addEventListener('change', (e) => {
      const prev = state.pronunciationEngine;
      state.pronunciationEngine = e.target.value === 'browser' ? 'browser' : 'local';
      setSpeechConsoleStats({ engine: state.pronunciationEngine });
      logSpeechEvent('ENGINE', `Switched Pronunciation Engine: ${prev} -> ${state.pronunciationEngine}`);
      checkLocalScorerHealth();
    });
  }

  if (localScorerTestBtn) {
    localScorerTestBtn.addEventListener('click', () => {
      checkLocalScorerHealth();
    });
  }

  checkLocalScorerHealth({ isStartup: true });

  if (micBtn) {
    micBtn.addEventListener('click', () => {
      if (voiceCaptureState.hasSpokenAudio && voiceCaptureState.activeMode !== 'question') {
        if (isLocalScorerActive() && voiceCaptureState.questionAudioBlob) {
          commitLocalPronunciationResult();
          return;
        }
        if (answerInputEl.value.trim() || voiceCaptureState.questionAlternatives.length > 0) {
          voiceHooks.onEvaluateTypedAnswer({ voiceAlternatives: voiceCaptureState.questionAlternatives });
          return;
        }
      }
      startVoiceCapture('question');
    });
  }

  if (voiceRedoBtn) {
    voiceRedoBtn.addEventListener('click', () => {
      if (state.answered) return;
      logSpeechEvent('MIC', 'Clicked Redo — resetting recorded audio & preview score.');
      resetQuestionVoiceCapture({ resetAttempts: false });
      answerInputEl.value = '';
    });
  }

  if (voiceCancelBtn) {
    voiceCancelBtn.addEventListener('click', () => {
      cancelActiveQuestionRecording('Clicked Cancel');
    });
  }

  if (speakCompareBtn) {
    speakCompareBtn.addEventListener('click', () => {
      if (state.questionType !== 'speak' || voiceCaptureState.speakCloseAttemptCount < 2) return;
      if (checkZeroVolumePrompt()) return;
      speakSpanish(voiceHooks.getSpokenText());
    });
  }

  if (playMyAudioBtn) {
    playMyAudioBtn.addEventListener('click', () => {
      if (!voiceCaptureState.lastSubmittedAudioUrl) return;
      voiceHooks.onManualVoiceAction();
      voiceHooks.onPauseFeedbackForPlayback();
      if (voiceCaptureState.lastSubmittedAudioEl) {
        stopVoicePlayback('question');
        return;
      }
      const audio = new Audio(voiceCaptureState.lastSubmittedAudioUrl);
      audio.volume = Math.min(1, Math.max(0.1, Number(state.volume) || 1));
      voiceCaptureState.lastSubmittedAudioEl = audio;
      playMyAudioBtn.textContent = 'Stop Mine';
      const resetMyAudio = () => {
        if (voiceCaptureState.lastSubmittedAudioEl === audio) {
          voiceCaptureState.lastSubmittedAudioEl = null;
        }
        playMyAudioBtn.textContent = 'Play Mine';
      };
      audio.onended = resetMyAudio;
      audio.onerror = resetMyAudio;
      audio.play().catch(resetMyAudio);
    });
  }

  if (playNativeAudioBtn) {
    playNativeAudioBtn.addEventListener('click', () => {
      voiceHooks.onManualVoiceAction();
      voiceHooks.onPauseFeedbackForPlayback();
      if (checkZeroVolumePrompt()) return;
      speakSpanish(voiceHooks.getSpokenText());
    });
  }

  const playNativeSlowBtn = document.getElementById('play-native-slow-btn');
  if (playNativeSlowBtn) {
    playNativeSlowBtn.addEventListener('click', () => {
      voiceHooks.onManualVoiceAction();
      voiceHooks.onPauseFeedbackForPlayback();
      if (checkZeroVolumePrompt()) return;
      speakSpanish(voiceHooks.getSpokenText(), 0.75);
    });
  }

  const playNativeWordsBtn = document.getElementById('play-native-words-btn');
  if (playNativeWordsBtn) {
    playNativeWordsBtn.addEventListener('click', () => {
      voiceHooks.onManualVoiceAction();
      voiceHooks.onPauseFeedbackForPlayback();
      const stripEl = document.getElementById('post-speak-word-strip');
      if (!stripEl) return;
      const isCurrentlyOpen = !stripEl.classList.contains('hidden');
      if (isCurrentlyOpen) {
        stopAllSpanishSpeech();
        hidePostSpeakWordStrip();
        return;
      }
      const displayText = voiceHooks.getDisplayText() || voiceHooks.getSpokenText();
      if (!displayText) return;
      renderPostSpeakWordStrip(displayText);
      playNativeWordsBtn.classList.add('is-active');
      playNativeWordsBtn.setAttribute('aria-expanded', 'true');
    });
  }

  const postSpeakWordStripEl = document.getElementById('post-speak-word-strip');
  if (postSpeakWordStripEl) {
    postSpeakWordStripEl.addEventListener('click', (e) => {
      const playAllBtn = e.target.closest('.post-speak-play-all-btn');
      if (playAllBtn) {
        voiceHooks.onManualVoiceAction();
        voiceHooks.onPauseFeedbackForPlayback();
        if (checkZeroVolumePrompt()) return;
        const spokenText = voiceHooks.getSpokenText();
        const displayText = voiceHooks.getDisplayText() || spokenText;
        if (!spokenText) return;
        speakSpanishWordByWord(spokenText, {
          pauseMs: 650,
          rateOverride: 0.85,
          onWordStart: (activeIdx) => {
            if (postSpeakWordStripEl.classList.contains('hidden')) return;
            renderPostSpeakWordStrip(displayText, activeIdx);
          },
          onDone: () => {
            if (postSpeakWordStripEl.classList.contains('hidden')) return;
            renderPostSpeakWordStrip(voiceHooks.getDisplayText() || voiceHooks.getSpokenText());
          }
        });
        return;
      }
      const wordBtn = e.target.closest('.post-speak-word-btn[data-speak-word]');
      if (!wordBtn) return;
      const word = wordBtn.dataset.speakWord || wordBtn.textContent || '';
      if (!word) return;
      voiceHooks.onManualVoiceAction();
      voiceHooks.onPauseFeedbackForPlayback();
      if (checkZeroVolumePrompt()) return;
      postSpeakWordStripEl.querySelectorAll('.post-speak-word-btn.is-speaking').forEach((el) => {
        el.classList.remove('is-speaking');
      });
      wordBtn.classList.add('is-speaking');
      speakSpanish(word, 0.85);
      setTimeout(() => {
        wordBtn.classList.remove('is-speaking');
      }, 900);
    });
  }

  if (pronunciationPhonemeStripEl) {
    pronunciationPhonemeStripEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.phoneme-chip[data-sound]');
      if (!chip) return;
      const sound = chip.dataset.sound || chip.textContent || '';
      const tip = getSoundCoachingTip(sound);
      voiceHooks.onManualVoiceAction();
      voiceHooks.onPauseFeedbackForPlayback();
      if (panamaPhoneticsTipEl) {
        panamaPhoneticsTipEl.textContent = `Sound "${sound}": ${tip}`;
        panamaPhoneticsTipEl.classList.remove('hidden');
      }
      if (!checkZeroVolumePrompt()) {
        const wordWrap = chip.closest('.pron-word[data-word-index]');
        const spokenPhrase = voiceHooks.getSpokenText();
        const targetWord = wordWrap
          ? getSpokenWordAtIndex(spokenPhrase, wordWrap.dataset.wordIndex)
          : '';
        speakSpanish(targetWord || spokenPhrase, 0.75);
      }
    });
  }

  if (micDeviceSelectEl) {
    micDeviceSelectEl.addEventListener('change', (e) => {
      state.micDeviceId = e.target.value || '';
      releasePersistentMicStream();
      savePersistedData();
      const label = micDeviceSelectEl.selectedOptions?.[0]?.textContent || 'Default Microphone';
      setSpeechConsoleStats({ activeMicLabel: label });
      logSpeechEvent('MIC', `Selected microphone: ${label}`, { deviceId: state.micDeviceId || '(default)' });
      if (micTestStatusEl) {
        micTestStatusEl.textContent = `Selected: ${label}`;
      }
    });
  }

  if (testTtsBtn) {
    testTtsBtn.addEventListener('click', () => {
      if (Number(state.volume) <= 0) {
        if (micTestStatusEl) micTestStatusEl.textContent = 'Voice Volume is 0%. Raise slider to hear TTS.';
        return;
      }
      speakSpanish('¡Qué xopa! Uno, dos, tres.');
      if (micTestStatusEl) {
        micTestStatusEl.textContent = `Playing sample at ${Math.round(state.volume * 100)}% volume`;
      }
    });
  }

  if (testMicBtn) {
    testMicBtn.addEventListener('click', () => {
      startVoiceCapture('test');
    });
  }

  if (testMicPlaybackBtn) {
    testMicPlaybackBtn.addEventListener('click', () => {
      if (!voiceCaptureState.testAudioUrl) return;
      if (voiceCaptureState.testAudioEl) {
        stopVoicePlayback('test');
        return;
      }
      const audio = new Audio(voiceCaptureState.testAudioUrl);
      audio.volume = Math.min(1, Math.max(0.1, Number(state.volume) || 1));
      voiceCaptureState.testAudioEl = audio;
      testMicPlaybackBtn.textContent = 'Stop';
      const resetTestAudio = () => {
        if (voiceCaptureState.testAudioEl === audio) {
          voiceCaptureState.testAudioEl = null;
        }
        testMicPlaybackBtn.textContent = 'Play Mic';
      };
      audio.onended = resetTestAudio;
      audio.onerror = resetTestAudio;
      audio.play().catch(resetTestAudio);
    });
  }

  if (navigator.mediaDevices && typeof navigator.mediaDevices.addEventListener === 'function') {
    navigator.mediaDevices.addEventListener('devicechange', refreshMicDeviceList);
  }
}
