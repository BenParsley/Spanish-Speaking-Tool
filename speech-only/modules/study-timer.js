import {
  studyTimerPillEl,
  studyTimerStateEl,
  studyTimerValueEl
} from './dom.js';
import { isTrackingDisabled, savePersistedData, state } from './state.js';
import { formatDurationSeconds, getLocalDateKey } from './utils.js';

export const STUDY_IDLE_TIMEOUT_MS = 10000;
export const STUDY_SESSION_GAP_MS = 15 * 60 * 1000;

function recordStudySessionPing(dateKey, nowMs) {
  if (!dateKey || !Number.isFinite(nowMs)) return;
  if (!state.dailySessions || typeof state.dailySessions !== 'object') {
    state.dailySessions = {};
  }
  if (!Array.isArray(state.dailySessions[dateKey])) {
    state.dailySessions[dateKey] = [];
  }
  const sessions = state.dailySessions[dateKey];
  const last = sessions[sessions.length - 1];
  if (!last || nowMs - (Number(last.end) || 0) >= STUDY_SESSION_GAP_MS) {
    sessions.push({ start: nowMs, end: nowMs });
  } else {
    last.end = Math.max(Number(last.end) || nowMs, nowMs);
  }
}

export const studyTimerState = {
  isRunning: false,
  lastAnswerAt: 0,
  lastTickAt: 0,
  carryMs: 0,
  dateKey: getLocalDateKey()
};

let timerHooks = {
  onAchievementCheck: () => { },
  onTimeTick: () => { }
};

export function getTodayActiveSeconds() {
  const todayKey = getLocalDateKey();
  return Math.max(0, Math.floor(Number(state.dailyActiveSeconds?.[todayKey]) || 0));
}

export function updateStudyTimerUI() {
  const todaySecs = getTodayActiveSeconds();
  const formatted = formatDurationSeconds(todaySecs);
  const trackingOff = isTrackingDisabled();
  const isRunning = !trackingOff && studyTimerState.isRunning;

  if (studyTimerValueEl) {
    studyTimerValueEl.textContent = formatted;
  }
  if (studyTimerStateEl) {
    studyTimerStateEl.textContent = isRunning ? 'Active' : 'Paused';
  }
  if (studyTimerPillEl) {
    studyTimerPillEl.classList.toggle('is-active', isRunning);
    studyTimerPillEl.classList.toggle('is-paused', !isRunning);
  }
  if (typeof timerHooks.onTimeTick === 'function') {
    timerHooks.onTimeTick(todaySecs);
  }
}

export function addActiveStudySeconds(dateKey, wholeSeconds) {
  if (isTrackingDisabled()) return;
  if (!wholeSeconds || wholeSeconds <= 0) return;
  if (!state.dailyActiveSeconds || typeof state.dailyActiveSeconds !== 'object') {
    state.dailyActiveSeconds = {};
  }
  state.dailyActiveSeconds[dateKey] =
    (Math.floor(Number(state.dailyActiveSeconds[dateKey]) || 0)) + wholeSeconds;
}

export function flushStudyTimerDelta(now = Date.now()) {
  if (isTrackingDisabled()) {
    studyTimerState.isRunning = false;
    studyTimerState.carryMs = 0;
    updateStudyTimerUI();
    return;
  }
  if (!studyTimerState.isRunning) return;

  const cutoff = studyTimerState.lastAnswerAt + STUDY_IDLE_TIMEOUT_MS;
  const effectiveNow = Math.min(now, cutoff);
  const currentDateKey = getLocalDateKey(new Date(effectiveNow));

  if (effectiveNow > studyTimerState.lastTickAt) {
    const deltaMs = effectiveNow - studyTimerState.lastTickAt;
    studyTimerState.carryMs += deltaMs;
    const wholeSeconds = Math.floor(studyTimerState.carryMs / 1000);
    if (wholeSeconds > 0) {
      studyTimerState.carryMs -= wholeSeconds * 1000;
      const targetKey = studyTimerState.dateKey || currentDateKey;
      addActiveStudySeconds(targetKey, wholeSeconds);
      recordStudySessionPing(targetKey, effectiveNow);
      timerHooks.onAchievementCheck();
      savePersistedData();
    }
    studyTimerState.lastTickAt = effectiveNow;
  }

  studyTimerState.dateKey = currentDateKey;

  if (now >= cutoff) {
    studyTimerState.isRunning = false;
    studyTimerState.carryMs = 0;
    savePersistedData();
  }

  updateStudyTimerUI();
}

export function markStudyActivity() {
  if (isTrackingDisabled()) {
    updateStudyTimerUI();
    return;
  }
  const now = Date.now();
  if (studyTimerState.isRunning) {
    flushStudyTimerDelta(now);
  }
  const todayKey = getLocalDateKey(new Date(now));
  studyTimerState.isRunning = true;
  studyTimerState.lastAnswerAt = now;
  studyTimerState.lastTickAt = now;
  studyTimerState.dateKey = todayKey;
  recordStudySessionPing(todayKey, now);
  updateStudyTimerUI();
}

export function pauseStudyTimerNow({ resetCarry = false } = {}) {
  if (studyTimerState.isRunning) {
    flushStudyTimerDelta(Date.now());
  }
  studyTimerState.isRunning = false;
  if (resetCarry) {
    studyTimerState.lastAnswerAt = 0;
    studyTimerState.lastTickAt = 0;
    studyTimerState.carryMs = 0;
  }
  updateStudyTimerUI();
  savePersistedData();
}

export function initStudyTimer(hooks = {}) {
  timerHooks = { ...timerHooks, ...hooks };

  setInterval(() => {
    if (studyTimerState.isRunning) {
      flushStudyTimerDelta(Date.now());
    }
  }, 500);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseStudyTimerNow();
    }
  });

  window.addEventListener('pagehide', () => {
    pauseStudyTimerNow();
  });
}
