import {
  speechConsoleAutoscrollEl,
  speechConsoleClearBtn,
  speechConsoleCloseBtn,
  speechConsoleCopyBtn,
  speechConsoleCountEl,
  speechConsoleHealthBtn,
  speechConsoleLogMetaEl,
  speechConsoleLogsEl,
  speechConsolePanelEl,
  speechConsoleStatePillEl,
  speechConsoleStatsEl,
  speechConsoleToggleBtn
} from './dom.js';
import { escapeHtmlText } from './utils.js';

const MAX_LOG_ENTRIES = 250;

const consoleEntries = [];

const consoleStats = {
  engine: 'local',
  connectionStatus: 'unknown',
  captureState: 'idle',
  device: null,
  gopModel: null,
  asrModel: null,
  asrComputeType: null,
  modelsLoaded: null,
  ffmpegAvailable: null,
  uptimeSeconds: null,
  activeMicLabel: 'Default Microphone',
  speechRecognitionSupported: false,
  mediaRecorderSupported: false,
  totalScorings: 0,
  passedCount: 0,
  failedCount: 0,
  wrongWordCount: 0,
  errorCount: 0,
  totalClientMs: 0,
  lastClientMs: null,
  lastServerMs: null,
  lastDecodeMs: null,
  lastGopMs: null,
  lastAsrMs: null,
  lastScore: null,
  lastAccuracy: null,
  lastFluency: null,
  lastAudioBytes: null,
  lastAudioDurationMs: null,
  lastAudioRmsDb: null,
  serverRequests: null
};

let consoleHooks = {
  onCheckHealth: () => { }
};

function formatConsoleTime(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

function safeJsonStringify(payload) {
  if (payload === null || payload === undefined) return '';
  if (typeof payload === 'string') return payload;
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

export function isSpeechConsoleOpen() {
  return Boolean(speechConsolePanelEl && !speechConsolePanelEl.classList.contains('hidden'));
}

export function openSpeechConsole() {
  if (!speechConsolePanelEl) return;
  speechConsolePanelEl.classList.remove('hidden');
  if (speechConsoleToggleBtn) {
    speechConsoleToggleBtn.classList.add('is-active');
    speechConsoleToggleBtn.setAttribute('aria-expanded', 'true');
  }
  renderSpeechConsoleStats();
  renderSpeechConsoleLogs();
}

export function closeSpeechConsole() {
  if (!speechConsolePanelEl) return;
  speechConsolePanelEl.classList.add('hidden');
  if (speechConsoleToggleBtn) {
    speechConsoleToggleBtn.classList.remove('is-active');
    speechConsoleToggleBtn.setAttribute('aria-expanded', 'false');
  }
}

export function toggleSpeechConsole() {
  if (isSpeechConsoleOpen()) {
    closeSpeechConsole();
  } else {
    openSpeechConsole();
  }
}

export function renderSpeechConsoleStats() {
  if (speechConsoleStatePillEl) {
    const statusMap = {
      ready: { label: 'Ready · Hybrid', cls: 'is-ready' },
      loading: { label: 'Loading Models', cls: 'is-loading' },
      'ffmpeg-missing': { label: 'FFmpeg Missing', cls: 'is-error' },
      checking: { label: 'Checking…', cls: 'is-loading' },
      offline: { label: 'Offline (8765)', cls: 'is-error' },
      browser: { label: 'Browser STT', cls: 'is-browser' },
      unknown: { label: 'Initializing', cls: '' }
    };
    const info = statusMap[consoleStats.connectionStatus] || statusMap.unknown;
    speechConsoleStatePillEl.className = `speech-console-state-pill ${info.cls}`.trim();
    speechConsoleStatePillEl.textContent =
      consoleStats.captureState !== 'idle'
        ? `${info.label} · ${consoleStats.captureState}`
        : info.label;
  }

  if (!speechConsoleStatsEl) return;

  const avgClientMs =
    consoleStats.totalScorings > 0
      ? `${Math.round(consoleStats.totalClientMs / consoleStats.totalScorings)} ms`
      : '—';
  const lastLat =
    consoleStats.lastClientMs !== null
      ? `${consoleStats.lastClientMs} ms${consoleStats.lastServerMs !== null ? ` (srv ${consoleStats.lastServerMs} ms)` : ''}`
      : '—';
  const engineLabel =
    consoleStats.engine === 'local'
      ? `Local Hybrid (${consoleStats.device || 'cpu'}${consoleStats.asrComputeType ? `/${consoleStats.asrComputeType}` : ''})`
      : 'Browser SpeechRecognition';
  const modelsText =
    consoleStats.engine === 'local'
      ? `models=${consoleStats.modelsLoaded ?? '?'} · ffmpeg=${consoleStats.ffmpegAvailable ?? '?'}${consoleStats.uptimeSeconds !== null ? ` · up ${consoleStats.uptimeSeconds}s` : ''}`
      : `SpeechRec=${consoleStats.speechRecognitionSupported ? 'yes' : 'no'} · MediaRec=${consoleStats.mediaRecorderSupported ? 'yes' : 'no'}`;
  const audioText =
    consoleStats.lastAudioBytes !== null
      ? `${(consoleStats.lastAudioBytes / 1024).toFixed(1)} KB${consoleStats.lastAudioDurationMs !== null ? ` · ${consoleStats.lastAudioDurationMs} ms` : ''}${consoleStats.lastAudioRmsDb !== null ? ` · ${consoleStats.lastAudioRmsDb} dBFS` : ''}`
      : 'No clip yet';
  const scoreText =
    consoleStats.lastScore !== null
      ? `${consoleStats.lastScore}/100 (acc ${consoleStats.lastAccuracy ?? '—'} · flu ${consoleStats.lastFluency ?? '—'})`
      : '—';
  const reqText = `${consoleStats.totalScorings} local (${consoleStats.passedCount} pass / ${consoleStats.failedCount} fail · ${consoleStats.wrongWordCount} wrong · ${consoleStats.errorCount} err)`;

  const cards = [
    { label: 'Engine / Hardware', value: engineLabel, sub: modelsText },
    { label: 'Mic / Capture', value: `${consoleStats.activeMicLabel} (${consoleStats.captureState})`, sub: `Clip: ${audioText}` },
    { label: 'Scoring Results', value: `Last: ${scoreText}`, sub: reqText },
    { label: 'Latency', value: `Last: ${lastLat}`, sub: `Avg client: ${avgClientMs}${consoleStats.lastGopMs !== null ? ` · GOP ${consoleStats.lastGopMs}ms / ASR ${consoleStats.lastAsrMs}ms` : ''}` }
  ];

  speechConsoleStatsEl.innerHTML = cards
    .map(
      (c) => `
      <div class="speech-console-stat-card">
        <span class="speech-console-stat-label">${escapeHtmlText(c.label)}</span>
        <span class="speech-console-stat-value">${escapeHtmlText(c.value)}</span>
        <span class="speech-console-stat-sub">${escapeHtmlText(c.sub)}</span>
      </div>`
    )
    .join('');
}

function buildConsoleEntryHTML(entry) {
  const payloadText = entry.payloadText ? escapeHtmlText(entry.payloadText) : '';
  const detailsBlock = payloadText
    ? `<pre class="speech-console-json">${payloadText}</pre>`
    : '';
  return `
    <div class="speech-console-entry level-${escapeHtmlText(entry.level)}">
      <div class="speech-console-entry-head">
        <span class="speech-console-time">${escapeHtmlText(entry.time)}</span>
        <span class="speech-console-tag tag-${escapeHtmlText(entry.category.toLowerCase())}">${escapeHtmlText(entry.category)}</span>
        <span class="speech-console-msg">${escapeHtmlText(entry.message)}</span>
      </div>
      ${detailsBlock}
    </div>
  `;
}

export function renderSpeechConsoleLogs() {
  if (speechConsoleCountEl) {
    speechConsoleCountEl.textContent = String(consoleEntries.length);
  }
  if (speechConsoleLogMetaEl) {
    speechConsoleLogMetaEl.textContent = `${consoleEntries.length} event${consoleEntries.length === 1 ? '' : 's'} (max ${MAX_LOG_ENTRIES})`;
  }
  if (!speechConsoleLogsEl) return;

  if (consoleEntries.length === 0) {
    speechConsoleLogsEl.innerHTML = '<div class="speech-console-empty">No speech events recorded yet. Open Speak Mode or click Health to trace activity.</div>';
    return;
  }

  speechConsoleLogsEl.innerHTML = consoleEntries.map(buildConsoleEntryHTML).join('');
  if (!speechConsoleAutoscrollEl || speechConsoleAutoscrollEl.checked) {
    speechConsoleLogsEl.scrollTop = speechConsoleLogsEl.scrollHeight;
  }
}

export function setSpeechConsoleStats(patch = {}) {
  Object.assign(consoleStats, patch);
  renderSpeechConsoleStats();
}

export function recordSpeechScoringOutcome({
  score = null,
  accuracy = null,
  fluency = null,
  passed = false,
  wrongWord = false,
  clientMs = null,
  serverMs = null,
  decodeMs = null,
  gopMs = null,
  asrMs = null,
  audioBytes = null,
  audioDurationMs = null,
  rmsDb = null
} = {}) {
  consoleStats.totalScorings += 1;
  if (passed) consoleStats.passedCount += 1;
  else consoleStats.failedCount += 1;
  if (wrongWord) consoleStats.wrongWordCount += 1;
  if (typeof clientMs === 'number') {
    consoleStats.totalClientMs += clientMs;
    consoleStats.lastClientMs = clientMs;
  }
  if (typeof serverMs === 'number') consoleStats.lastServerMs = serverMs;
  if (typeof decodeMs === 'number') consoleStats.lastDecodeMs = decodeMs;
  if (typeof gopMs === 'number') consoleStats.lastGopMs = gopMs;
  if (typeof asrMs === 'number') consoleStats.lastAsrMs = asrMs;
  if (typeof score === 'number') consoleStats.lastScore = score;
  if (typeof accuracy === 'number') consoleStats.lastAccuracy = accuracy;
  if (typeof fluency === 'number') consoleStats.lastFluency = fluency;
  if (typeof audioBytes === 'number') consoleStats.lastAudioBytes = audioBytes;
  if (typeof audioDurationMs === 'number') consoleStats.lastAudioDurationMs = audioDurationMs;
  if (typeof rmsDb === 'number') consoleStats.lastAudioRmsDb = rmsDb;
  renderSpeechConsoleStats();
}

export function incrementSpeechErrorCount() {
  consoleStats.errorCount += 1;
  renderSpeechConsoleStats();
}

export function closeSpeechErrorModal() {
  const backdropEl = document.getElementById('speech-error-modal-backdrop');
  if (backdropEl) {
    backdropEl.classList.add('hidden');
  }
}

export function openSpeechErrorModal({ title = 'Speech System Error', message = '', detail = '' } = {}) {
  const backdropEl = document.getElementById('speech-error-modal-backdrop');
  const titleEl = document.getElementById('speech-error-modal-title');
  const descEl = document.getElementById('speech-error-modal-desc');
  const detailEl = document.getElementById('speech-error-modal-detail');
  if (!backdropEl) return;

  if (titleEl) {
    titleEl.textContent = title || 'Speech System Error';
  }
  if (descEl) {
    descEl.textContent = message || 'The speech system encountered an error.';
  }
  if (detailEl) {
    const cleanDetail = String(detail || '').trim();
    if (cleanDetail) {
      detailEl.textContent = cleanDetail;
      detailEl.classList.remove('hidden');
    } else {
      detailEl.textContent = '';
      detailEl.classList.add('hidden');
    }
  }
  backdropEl.classList.remove('hidden');
}

function extractErrorDetail(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (typeof payload === 'object') {
    const candidate = payload.detail || payload.error || payload.message;
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return '';
}

export function logSpeechEvent(category, message, payload = null, level = 'info') {
  const entry = {
    time: formatConsoleTime(new Date()),
    category: String(category || 'INFO').toUpperCase(),
    message: String(message || ''),
    payloadText: safeJsonStringify(payload),
    level
  };
  consoleEntries.push(entry);
  if (consoleEntries.length > MAX_LOG_ENTRIES) {
    consoleEntries.shift();
  }
  if (speechConsoleCountEl) {
    speechConsoleCountEl.textContent = String(consoleEntries.length);
  }
  if (isSpeechConsoleOpen()) {
    renderSpeechConsoleLogs();
  }
  if (level === 'error') {
    const detailText = extractErrorDetail(payload);
    openSpeechErrorModal({
      title: entry.category === 'ERROR' ? 'Speech System Error' : `Speech System Error (${entry.category})`,
      message: entry.message,
      detail: detailText && detailText !== entry.message ? detailText : ''
    });
  }
}

export function clearSpeechConsoleLogs() {
  consoleEntries.length = 0;
  renderSpeechConsoleLogs();
}

export function initSpeechConsole(hooks = {}) {
  consoleHooks = { ...consoleHooks, ...hooks };

  if (speechConsoleToggleBtn) {
    speechConsoleToggleBtn.addEventListener('click', toggleSpeechConsole);
  }
  if (speechConsoleCloseBtn) {
    speechConsoleCloseBtn.addEventListener('click', closeSpeechConsole);
  }
  if (speechConsoleClearBtn) {
    speechConsoleClearBtn.addEventListener('click', clearSpeechConsoleLogs);
  }
  if (speechConsoleHealthBtn) {
    speechConsoleHealthBtn.addEventListener('click', () => {
      consoleHooks.onCheckHealth();
    });
  }
  if (speechConsoleCopyBtn) {
    speechConsoleCopyBtn.addEventListener('click', async () => {
      const dump = {
        exportedAt: new Date().toISOString(),
        stats: consoleStats,
        events: consoleEntries.map((e) => ({
          time: e.time,
          category: e.category,
          level: e.level,
          message: e.message,
          payload: e.payloadText
            ? (() => {
              try {
                return JSON.parse(e.payloadText);
              } catch {
                return e.payloadText;
              }
            })()
            : null
        }))
      };
      try {
        await navigator.clipboard.writeText(JSON.stringify(dump, null, 2));
        const orig = speechConsoleCopyBtn.textContent;
        speechConsoleCopyBtn.textContent = 'Copied!';
        setTimeout(() => {
          speechConsoleCopyBtn.textContent = orig;
        }, 1200);
      } catch {
        // Ignore clipboard errors in restricted contexts
      }
    });
  }

  const errBackdropEl = document.getElementById('speech-error-modal-backdrop');
  const errDismissBtn = document.getElementById('speech-error-dismiss-btn');
  const errConsoleBtn = document.getElementById('speech-error-console-btn');
  const errRetryBtn = document.getElementById('speech-error-retry-btn');
  if (errDismissBtn) {
    errDismissBtn.addEventListener('click', closeSpeechErrorModal);
  }
  if (errConsoleBtn) {
    errConsoleBtn.addEventListener('click', () => {
      closeSpeechErrorModal();
      openSpeechConsole();
    });
  }
  if (errRetryBtn) {
    errRetryBtn.addEventListener('click', () => {
      closeSpeechErrorModal();
      consoleHooks.onCheckHealth();
    });
  }
  if (errBackdropEl) {
    errBackdropEl.addEventListener('click', (e) => {
      if (e.target === errBackdropEl) {
        closeSpeechErrorModal();
      }
    });
  }

  renderSpeechConsoleStats();
  renderSpeechConsoleLogs();
}
