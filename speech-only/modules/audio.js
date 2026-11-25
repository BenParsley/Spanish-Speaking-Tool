import {
  correctSoundSelectEl,
  incorrectSoundSelectEl,
  mutedAudioDismissBtn,
  mutedAudioModalBackdropEl,
  mutedAudioUnmuteBtn,
  sfxVolumeRangeEl,
  sfxVolumeValueEl,
  testCorrectSoundBtn,
  testIncorrectSoundBtn,
  volumeRangeEl,
  volumeValueEl
} from './dom.js';
import { savePersistedData, state } from './state.js';

export const MALE_VOICE_HINTS = [
  'raul',
  'raúl',
  'jorge',
  'alvaro',
  'álvaro',
  'alonso',
  'rodrigo',
  'carlos',
  'diego',
  'pablo',
  'andres',
  'andrés',
  'lorenzo',
  'tomas',
  'tomás',
  'juan',
  'emilio',
  'male'
];

export const FEMALE_VOICE_HINTS = [
  'sabina',
  'dalia',
  'paulina',
  'mia',
  'mía',
  'paloma',
  'helena',
  'laura',
  'monica',
  'mónica',
  'angelica',
  'angélica',
  'elvira',
  'female'
];

export const PANAMA_LOCALE_PRIORITY = ['es-pa', 'es-co', 'es-ve', 'es-cr', 'es-pr', 'es-do', 'es-419', 'es-us'];

let audioHooks = {
  getSpokenText: () => ''
};

export function classifyVoiceGender(voice) {
  const name = voice.name.toLowerCase();
  if (MALE_VOICE_HINTS.some((h) => name.includes(h))) return 'male';
  if (FEMALE_VOICE_HINTS.some((h) => name.includes(h))) return 'female';
  return 'unknown';
}

let activeLocalTtsAudio = null;
let wordByWordToken = 0;
let wordByWordTimer = null;
let activeSpeechToken = 0;
let activeSpeechWatchdog = null;
let activeSpeechResolver = null;

function clearActiveSpeechState(completed = false) {
  if (activeSpeechWatchdog !== null) {
    clearTimeout(activeSpeechWatchdog);
    activeSpeechWatchdog = null;
  }
  if (activeSpeechResolver) {
    const resolve = activeSpeechResolver;
    activeSpeechResolver = null;
    resolve(Boolean(completed));
  }
}

function cancelWordByWordPlayback() {
  wordByWordToken += 1;
  if (wordByWordTimer !== null) {
    clearTimeout(wordByWordTimer);
    wordByWordTimer = null;
  }
}

function stopLocalTtsAudio() {
  if (activeLocalTtsAudio) {
    try {
      activeLocalTtsAudio.onended = null;
      activeLocalTtsAudio.onerror = null;
      activeLocalTtsAudio.pause();
      activeLocalTtsAudio.currentTime = 0;
    } catch {
      // Ignore audio stop errors
    }
    activeLocalTtsAudio = null;
  }
}

function estimateSpeechWatchdogMs(text, rate = 1) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  const effRate = Math.max(0.5, Number(rate) || 1);
  return Math.max(2400, Math.min(12000, Math.round(((words * 850) + 1800) / effRate)));
}

function speakEnglishViaBrowser(text, rateOverride = null, { onEnd = null, speechToken = null } = {}) {
  if (!('speechSynthesis' in window) || Number(state.volume) <= 0) {
    if (typeof onEnd === 'function') onEnd(true);
    return;
  }
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.volume = Math.min(1, Math.max(0, Number(state.volume)));
  const baseRate = rateOverride !== null ? rateOverride : 1.0;
  utterance.rate = Math.max(0.65, Math.min(1.4, Number(baseRate) || 1.0));

  const voices = window.speechSynthesis.getVoices();
  const normLang = (v) => (v.lang || '').toLowerCase().replace('_', '-');
  const enUs = voices.filter((v) => normLang(v) === 'en-us');
  const enAll = voices.filter((v) => normLang(v).startsWith('en'));
  const pool = enUs.length > 0 ? enUs : enAll;
  if (pool.length > 0) {
    const preferred =
      pool.find((v) => /natural|neural|google us|aria|zira|david|samantha/i.test(v.name)) ||
      pool.find((v) => v.localService) ||
      pool[0];
    if (preferred) utterance.voice = preferred;
  }

  let settled = false;
  let watchdog = null;
  const finish = (completed = true) => {
    if (settled) return;
    settled = true;
    if (watchdog !== null) {
      clearTimeout(watchdog);
      if (activeSpeechWatchdog === watchdog) activeSpeechWatchdog = null;
      watchdog = null;
    }
    if (typeof onEnd === 'function') {
      const stillCurrent = speechToken === null || speechToken === activeSpeechToken;
      onEnd(Boolean(completed && stillCurrent));
    }
  };
  utterance.onend = () => finish(true);
  utterance.onerror = () => finish(true);
  watchdog = setTimeout(() => finish(true), estimateSpeechWatchdogMs(text, utterance.rate));
  activeSpeechWatchdog = watchdog;

  window.speechSynthesis.speak(utterance);
}

function speakSpanishViaBrowser(text, rateOverride = null, { onEnd = null, speechToken = null } = {}) {
  if (!('speechSynthesis' in window) || Number(state.volume) <= 0) {
    if (typeof onEnd === 'function') onEnd(true);
    return;
  }
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-PA';
  utterance.volume = Math.min(1, Math.max(0, Number(state.volume)));

  const voices = window.speechSynthesis.getVoices();
  const normLang = (v) => (v.lang || '').toLowerCase().replace('_', '-');

  let regionalPool = [];
  for (const loc of PANAMA_LOCALE_PRIORITY) {
    const matched = voices.filter((v) => normLang(v) === loc);
    if (matched.length > 0) {
      regionalPool = matched;
      break;
    }
  }
  const caribbeanVoices = voices.filter((v) =>
    PANAMA_LOCALE_PRIORITY.includes(normLang(v))
  );
  const esVoices = voices.filter((v) => normLang(v).startsWith('es'));

  const pool =
    regionalPool.length > 0 ? regionalPool : caribbeanVoices.length > 0 ? caribbeanVoices : esVoices;

  const targetGender = state.currentVoiceGender || (Math.random() < 0.5 ? 'male' : 'female');
  const baseRate = rateOverride !== null ? rateOverride : (Number(state.speechRate) || 1);

  if (pool.length > 0) {
    let genderMatches = pool.filter((v) => classifyVoiceGender(v) === targetGender);
    if (genderMatches.length === 0 && esVoices.length > 0) {
      genderMatches = esVoices.filter((v) => classifyVoiceGender(v) === targetGender);
    }

    if (genderMatches.length > 0) {
      utterance.voice = genderMatches[0];
      utterance.pitch = targetGender === 'male' ? 0.9 : 1.05;
      utterance.rate = baseRate;
    } else {
      const localPool = pool.filter((v) => v.localService);
      const localEs = esVoices.filter((v) => v.localService);
      const pitchableVoice = localPool[0] || localEs[0] || pool[0];

      if (pitchableVoice) {
        utterance.voice = pitchableVoice;
      }
      utterance.pitch = targetGender === 'male' ? 0.5 : 1.12;
      utterance.rate = targetGender === 'male' ? Math.max(0.55, baseRate - 0.03) : baseRate;
    }
  } else {
    utterance.pitch = targetGender === 'male' ? 0.5 : 1.12;
    utterance.rate = baseRate;
  }

  if (typeof onEnd === 'function') {
    let settled = false;
    let watchdog = null;
    const finish = (completed = true) => {
      if (settled) return;
      settled = true;
      if (watchdog !== null) {
        clearTimeout(watchdog);
        if (activeSpeechWatchdog === watchdog) activeSpeechWatchdog = null;
        watchdog = null;
      }
      const stillCurrent = speechToken === null || speechToken === activeSpeechToken;
      onEnd(Boolean(completed && stillCurrent));
    };
    utterance.onend = () => finish(true);
    utterance.onerror = () => finish(true);
    watchdog = setTimeout(() => finish(true), estimateSpeechWatchdogMs(text, utterance.rate));
    activeSpeechWatchdog = watchdog;
  }

  window.speechSynthesis.speak(utterance);
}

export function stopAllSpeech() {
  activeSpeechToken += 1;
  cancelWordByWordPlayback();
  stopLocalTtsAudio();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  clearActiveSpeechState(false);
}

export function stopAllSpanishSpeech() {
  stopAllSpeech();
}

function speakSingleChunk(cleanText, rateOverride = null, { onEnd = null, lang = 'es', speechToken = null } = {}) {
  stopLocalTtsAudio();
  if (Number(state.volume) <= 0) {
    if (typeof onEnd === 'function') onEnd(true);
    return;
  }
  const isEnglish = String(lang || 'es').toLowerCase().startsWith('en');
  if (isEnglish) {
    speakEnglishViaBrowser(cleanText, rateOverride, { onEnd, speechToken });
  } else {
    speakSpanishViaBrowser(cleanText, rateOverride, { onEnd, speechToken });
  }
}

function stripBracketPlaceholdersForTts(text) {
  return String(text || '')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/\s+([?!.,;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function speakSpanish(text, rateOverride = null) {
  const cleanText = stripBracketPlaceholdersForTts(text);
  if (!cleanText) return;
  activeSpeechToken += 1;
  clearActiveSpeechState(false);
  cancelWordByWordPlayback();
  speakSingleChunk(cleanText, rateOverride, { lang: 'es', speechToken: activeSpeechToken });
}

export function speakSpanishAsync(text, { rateOverride = null } = {}) {
  const cleanText = stripBracketPlaceholdersForTts(text);
  if (!cleanText || Number(state.volume) <= 0) {
    return Promise.resolve(true);
  }
  activeSpeechToken += 1;
  const token = activeSpeechToken;
  clearActiveSpeechState(false);
  cancelWordByWordPlayback();
  return new Promise((resolve) => {
    activeSpeechResolver = resolve;
    speakSingleChunk(cleanText, rateOverride, {
      lang: 'es',
      speechToken: token,
      onEnd: (completed) => {
        if (token !== activeSpeechToken) {
          resolve(false);
          return;
        }
        clearActiveSpeechState(completed);
      }
    });
  });
}

export function speakEnglishAsync(text, { rateOverride = 1.0 } = {}) {
  const cleanText = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleanText || Number(state.volume) <= 0) {
    return Promise.resolve(true);
  }
  activeSpeechToken += 1;
  const token = activeSpeechToken;
  clearActiveSpeechState(false);
  cancelWordByWordPlayback();
  return new Promise((resolve) => {
    activeSpeechResolver = resolve;
    speakSingleChunk(cleanText, rateOverride, {
      lang: 'en',
      speechToken: token,
      onEnd: (completed) => {
        if (token !== activeSpeechToken) {
          resolve(false);
          return;
        }
        clearActiveSpeechState(completed);
      }
    });
  });
}

export function speakSpanishWordByWord(
  text,
  { pauseMs = 650, rateOverride = 0.85, onWordStart = null, onDone = null } = {}
) {
  const cleanText = stripBracketPlaceholdersForTts(text);
  if (!cleanText) {
    if (typeof onDone === 'function') onDone(true);
    return;
  }
  stopAllSpeech();

  const words = cleanText.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    if (typeof onDone === 'function') onDone(true);
    return;
  }

  const token = wordByWordToken;
  const playIndex = (idx) => {
    if (token !== wordByWordToken) return;
    if (idx >= words.length) {
      if (typeof onDone === 'function') onDone(true);
      return;
    }
    if (typeof onWordStart === 'function') {
      onWordStart(idx, words);
    }
    const wordForTts = words[idx].replace(/^[¿¡]+|[?!.,;:]+$/g, '') || words[idx];
    speakSingleChunk(wordForTts, rateOverride, {
      lang: 'es',
      onEnd: () => {
        if (token !== wordByWordToken) return;
        if (idx + 1 >= words.length) {
          if (typeof onDone === 'function') onDone(true);
          return;
        }
        wordByWordTimer = setTimeout(() => {
          wordByWordTimer = null;
          playIndex(idx + 1);
        }, Math.max(200, Number(pauseMs) || 650));
      }
    });
  };

  playIndex(0);
}

export function speakSpanishWordByWordAsync(
  text,
  { pauseMs = 550, rateOverride = 0.85, onWordStart = null } = {}
) {
  const cleanText = stripBracketPlaceholdersForTts(text);
  if (!cleanText || Number(state.volume) <= 0) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const startToken = wordByWordToken + 1;
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      resolve(Boolean(ok));
    };
    speakSpanishWordByWord(cleanText, {
      pauseMs,
      rateOverride,
      onWordStart,
      onDone: () => done(wordByWordToken === startToken)
    });
    activeSpeechResolver = done;
  });
}

let sfxAudioCtx = null;

function getSfxContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sfxAudioCtx) {
    sfxAudioCtx = new AudioCtx();
  }
  if (sfxAudioCtx.state === 'suspended') {
    sfxAudioCtx.resume().catch(() => { });
  }
  return sfxAudioCtx;
}

function scheduleSfxTone(ctx, { type = 'sine', freq = 440, endFreq = null, delay = 0, duration = 0.3, gain = 0.2, filterFreq = null }) {
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq !== null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + duration);
  }

  const peak = Math.max(0.0001, gain * state.sfxVolume);
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.linearRampToValueAtTime(peak, now + Math.min(0.025, duration * 0.2));
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  if (filterFreq) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    osc.connect(filter);
    filter.connect(amp);
  } else {
    osc.connect(amp);
  }

  amp.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playCorrectSound(preset = state.correctSound) {
  if (state.sfxVolume <= 0) return;
  const ctx = getSfxContext();
  if (!ctx) return;

  switch (String(preset)) {
    case '2': // Soft Bell
      scheduleSfxTone(ctx, { type: 'sine', freq: 523.25, delay: 0, duration: 0.75, gain: 0.22 });
      scheduleSfxTone(ctx, { type: 'sine', freq: 1046.5, delay: 0, duration: 0.55, gain: 0.07 });
      break;
    case '3': // Warm Triad
      scheduleSfxTone(ctx, { type: 'sine', freq: 523.25, delay: 0, duration: 0.45, gain: 0.16 });
      scheduleSfxTone(ctx, { type: 'sine', freq: 659.25, delay: 0.1, duration: 0.48, gain: 0.16 });
      scheduleSfxTone(ctx, { type: 'sine', freq: 783.99, delay: 0.2, duration: 0.65, gain: 0.18 });
      break;
    case '4': // Crystal Drop
      scheduleSfxTone(ctx, { type: 'sine', freq: 783.99, delay: 0, duration: 0.45, gain: 0.16 });
      scheduleSfxTone(ctx, { type: 'sine', freq: 1174.66, delay: 0.12, duration: 0.75, gain: 0.15 });
      break;
    case '5': // Harp Pluck
      [349.23, 440, 523.25, 698.46].forEach((f, idx) => {
        scheduleSfxTone(ctx, { type: 'triangle', freq: f, delay: idx * 0.08, duration: 0.55, gain: 0.14, filterFreq: 2200 });
      });
      break;
    case '6': // Bamboo Flute
      scheduleSfxTone(ctx, { type: 'sine', freq: 587.33, endFreq: 880, delay: 0, duration: 0.65, gain: 0.18 });
      break;
    case '7': // Glass Marimba
      scheduleSfxTone(ctx, { type: 'sine', freq: 659.25, delay: 0, duration: 0.35, gain: 0.18 });
      scheduleSfxTone(ctx, { type: 'sine', freq: 987.77, delay: 0.11, duration: 0.45, gain: 0.16 });
      scheduleSfxTone(ctx, { type: 'sine', freq: 1318.51, delay: 0.22, duration: 0.65, gain: 0.14 });
      break;
    case '8': // Morning Dew
      [440, 554.37, 659.25, 880].forEach((f, idx) => {
        scheduleSfxTone(ctx, { type: 'sine', freq: f, delay: idx * 0.09, duration: 0.52, gain: 0.14 });
      });
      break;
    case '9': // Velvet Chord
      [523.25, 659.25, 783.99, 987.77].forEach((f) => {
        scheduleSfxTone(ctx, { type: 'sine', freq: f, delay: 0, duration: 0.92, gain: 0.09 });
      });
      break;
    case '10': // Celesta Spark
      scheduleSfxTone(ctx, { type: 'triangle', freq: 783.99, delay: 0, duration: 0.35, gain: 0.14, filterFreq: 2600 });
      scheduleSfxTone(ctx, { type: 'triangle', freq: 987.77, delay: 0.09, duration: 0.4, gain: 0.14, filterFreq: 2600 });
      scheduleSfxTone(ctx, { type: 'sine', freq: 1174.66, delay: 0.18, duration: 0.65, gain: 0.16 });
      break;
    case '11': // Zen Bowl
      scheduleSfxTone(ctx, { type: 'sine', freq: 432, delay: 0, duration: 0.95, gain: 0.2 });
      scheduleSfxTone(ctx, { type: 'sine', freq: 648, delay: 0.03, duration: 0.85, gain: 0.09 });
      break;
    case '1': // High Marimba
    default:
      scheduleSfxTone(ctx, { type: 'triangle', freq: 783.99, delay: 0, duration: 0.22, gain: 0.18, filterFreq: 1600 });
      scheduleSfxTone(ctx, { type: 'triangle', freq: 1046.5, delay: 0.12, duration: 0.45, gain: 0.18, filterFreq: 1800 });
      break;
  }
}

export function playFullAnswerBonusSound(preset = state.correctSound) {
  playCorrectSound(preset);
  if (state.sfxVolume <= 0) return;
  const ctx = getSfxContext();
  if (!ctx) return;
  // Bright ascending celebratory sparkle shimmer layered right after the correct chime
  const notes = [880, 1108.73, 1318.51, 1760];
  notes.forEach((freq, idx) => {
    scheduleSfxTone(ctx, {
      type: idx === notes.length - 1 ? 'sine' : 'triangle',
      freq,
      delay: 0.14 + idx * 0.055,
      duration: idx === notes.length - 1 ? 0.52 : 0.24,
      gain: idx === notes.length - 1 ? 0.13 : 0.1,
      filterFreq: 3200
    });
  });
}

export function playAchievementFanfare() {
  if (state.sfxVolume <= 0) return;
  const ctx = getSfxContext();
  if (!ctx) return;
  // Bright celebratory Cmaj9 arpeggio shimmer
  const notes = [523.25, 659.25, 783.99, 987.77, 1174.66];
  notes.forEach((freq, idx) => {
    scheduleSfxTone(ctx, {
      type: idx === notes.length - 1 ? 'sine' : 'triangle',
      freq,
      delay: idx * 0.065,
      duration: idx === notes.length - 1 ? 0.65 : 0.34,
      gain: idx === notes.length - 1 ? 0.16 : 0.13,
      filterFreq: 2800
    });
  });
}

export function playListeningReadyChime() {
  if (state.sfxVolume <= 0) return;
  const ctx = getSfxContext();
  if (!ctx) return;
  scheduleSfxTone(ctx, { type: 'sine', freq: 587.33, delay: 0, duration: 0.065, gain: 0.11, filterFreq: 2200 });
  scheduleSfxTone(ctx, { type: 'sine', freq: 783.99, delay: 0.048, duration: 0.085, gain: 0.12, filterFreq: 2400 });
}

export function playCaptureLockedSound() {
  if (state.sfxVolume <= 0) return;
  const ctx = getSfxContext();
  if (!ctx) return;
  scheduleSfxTone(ctx, { type: 'triangle', freq: 440, endFreq: 370, delay: 0, duration: 0.055, gain: 0.08, filterFreq: 1400 });
}

export function playHandsFreePausedSound() {
  if (state.sfxVolume <= 0) return;
  const ctx = getSfxContext();
  if (!ctx) return;
  scheduleSfxTone(ctx, { type: 'sine', freq: 523.25, delay: 0, duration: 0.08, gain: 0.11, filterFreq: 1800 });
  scheduleSfxTone(ctx, { type: 'sine', freq: 392.0, delay: 0.065, duration: 0.12, gain: 0.11, filterFreq: 1600 });
}

export function playIncorrectSound(preset = state.incorrectSound) {
  if (state.sfxVolume <= 0) return;
  const ctx = getSfxContext();
  if (!ctx) return;

  switch (String(preset)) {
    case '2': // Soft Thud
      scheduleSfxTone(ctx, { type: 'sine', freq: 185, endFreq: 105, delay: 0, duration: 0.38, gain: 0.25 });
      break;
    case '3': // Muted Woodblock
      scheduleSfxTone(ctx, { type: 'triangle', freq: 310, endFreq: 190, delay: 0, duration: 0.22, gain: 0.22, filterFreq: 650 });
      break;
    case '4': // Gentle Low Drop
      scheduleSfxTone(ctx, { type: 'sine', freq: 329.63, delay: 0, duration: 0.22, gain: 0.18 });
      scheduleSfxTone(ctx, { type: 'sine', freq: 261.63, delay: 0.14, duration: 0.42, gain: 0.2 });
      break;
    case '5': // Dull Buzz
      scheduleSfxTone(ctx, { type: 'triangle', freq: 140, delay: 0, duration: 0.45, gain: 0.2, filterFreq: 380 });
      break;
    case '6': // Double Tap
      scheduleSfxTone(ctx, { type: 'sine', freq: 200, endFreq: 140, delay: 0, duration: 0.16, gain: 0.2 });
      scheduleSfxTone(ctx, { type: 'sine', freq: 170, endFreq: 115, delay: 0.18, duration: 0.22, gain: 0.2 });
      break;
    case '7': // Warm Minor
      scheduleSfxTone(ctx, { type: 'sine', freq: 220, delay: 0, duration: 0.25, gain: 0.18 });
      scheduleSfxTone(ctx, { type: 'sine', freq: 174.61, delay: 0.15, duration: 0.45, gain: 0.18 });
      break;
    case '8': // Hollow Knock
      scheduleSfxTone(ctx, { type: 'sine', freq: 240, endFreq: 120, delay: 0, duration: 0.3, gain: 0.24 });
      scheduleSfxTone(ctx, { type: 'triangle', freq: 150, delay: 0.02, duration: 0.25, gain: 0.12, filterFreq: 400 });
      break;
    case '9': // Faded Buzzer
      scheduleSfxTone(ctx, { type: 'sawtooth', freq: 155, endFreq: 125, delay: 0, duration: 0.42, gain: 0.14, filterFreq: 320 });
      break;
    case '10': // Soft Sigh
      scheduleSfxTone(ctx, { type: 'sine', freq: 270, endFreq: 155, delay: 0, duration: 0.65, gain: 0.18 });
      break;
    case '1': // Low Marimba
    default:
      scheduleSfxTone(ctx, { type: 'triangle', freq: 196, delay: 0, duration: 0.22, gain: 0.2, filterFreq: 550 });
      scheduleSfxTone(ctx, { type: 'triangle', freq: 146.83, delay: 0.14, duration: 0.45, gain: 0.2, filterFreq: 500 });
      break;
  }
}

export function updateVolumeUI() {
  if (volumeRangeEl) volumeRangeEl.value = String(state.volume);
  if (volumeValueEl) volumeValueEl.textContent = `${Math.round(state.volume * 100)}%`;
}

export function updateSfxUI() {
  if (sfxVolumeRangeEl) sfxVolumeRangeEl.value = String(state.sfxVolume);
  if (sfxVolumeValueEl) sfxVolumeValueEl.textContent = `${Math.round(state.sfxVolume * 100)}%`;
  if (correctSoundSelectEl) correctSoundSelectEl.value = state.correctSound;
  if (incorrectSoundSelectEl) incorrectSoundSelectEl.value = state.incorrectSound;
}

export function checkZeroVolumePrompt() {
  if (Number(state.volume) > 0) return false;
  if (mutedAudioModalBackdropEl) mutedAudioModalBackdropEl.classList.remove('hidden');
  return true;
}

export function closeMutedAudioModal() {
  if (mutedAudioModalBackdropEl) mutedAudioModalBackdropEl.classList.add('hidden');
}

export function initAudioModule(hooks = {}) {
  audioHooks = { ...audioHooks, ...hooks };

  if ('speechSynthesis' in window && 'onvoiceschanged' in window.speechSynthesis) {
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      window.speechSynthesis.getVoices();
    });
  }

  if (volumeRangeEl) {
    volumeRangeEl.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (!Number.isNaN(val)) {
        state.volume = Math.min(1, Math.max(0, val));
        updateVolumeUI();
        savePersistedData();
      }
    });
  }

  if (sfxVolumeRangeEl) {
    sfxVolumeRangeEl.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (!Number.isNaN(val)) {
        state.sfxVolume = Math.min(1, Math.max(0, val));
        updateSfxUI();
        savePersistedData();
      }
    });
  }

  if (correctSoundSelectEl) {
    correctSoundSelectEl.addEventListener('change', (e) => {
      state.correctSound = e.target.value;
      savePersistedData();
      playCorrectSound(state.correctSound);
    });
  }

  if (testCorrectSoundBtn) {
    testCorrectSoundBtn.addEventListener('click', () => {
      playCorrectSound(state.correctSound);
    });
  }

  if (incorrectSoundSelectEl) {
    incorrectSoundSelectEl.addEventListener('change', (e) => {
      state.incorrectSound = e.target.value;
      savePersistedData();
      playIncorrectSound(state.incorrectSound);
    });
  }

  if (testIncorrectSoundBtn) {
    testIncorrectSoundBtn.addEventListener('click', () => {
      playIncorrectSound(state.incorrectSound);
    });
  }

  if (mutedAudioDismissBtn) {
    mutedAudioDismissBtn.addEventListener('click', closeMutedAudioModal);
  }
  if (mutedAudioModalBackdropEl) {
    mutedAudioModalBackdropEl.addEventListener('click', (e) => {
      if (e.target === mutedAudioModalBackdropEl) {
        closeMutedAudioModal();
      }
    });
  }
  if (mutedAudioUnmuteBtn) {
    mutedAudioUnmuteBtn.addEventListener('click', () => {
      state.volume = 1;
      updateVolumeUI();
      savePersistedData();
      closeMutedAudioModal();
      if (state.questionType === 'audio' || state.questionType === 'dictation' || state.questionType === 'speak') {
        speakSpanish(audioHooks.getSpokenText());
      }
    });
  }
}
