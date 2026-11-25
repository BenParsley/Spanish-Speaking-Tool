export const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

export const FULL_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export function stripAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeText(str) {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizePhraseSpanish(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/[¿¡?!.,]/g, '')
    .replace(/['’]/g, '')
    .replace(/\s+/g, ' ');
}

export function normalizePhraseEnglish(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[¿¡?!.,'’]/g, '')
    .replace(/\.\.\./g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeHtmlText(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getLocalDateKey(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getOrdinalSuffix(day) {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

export function formatDateKeyLabel(dateKey) {
  const now = new Date();
  const todayKey = getLocalDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);

  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateKey;
  const [year, month, day] = parts;
  const monthName = SHORT_MONTHS[month - 1] || '';
  const ord = `${day}${getOrdinalSuffix(day)} of ${monthName}`;
  const fullOrd = year !== now.getFullYear() ? `${ord} ${year}` : ord;

  if (dateKey === todayKey) return `Today (${ord})`;
  if (dateKey === yesterdayKey) return `Yesterday (${ord})`;
  return fullOrd;
}

export function getPreviousDateKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateKey(d);
}

export function formatShortGraphDate(dateKey) {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateKey;
  const [, month, day] = parts;
  return `${day} ${SHORT_MONTHS[month - 1] || ''}`;
}

export function parseDateKeyLocal(dateKey) {
  const parts = String(dateKey || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function parseLocalDateKeyMs(dateKey) {
  const parts = String(dateKey || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return NaN;
  return Date.UTC(parts[0], parts[1] - 1, parts[2]);
}

export function formatDurationSeconds(totalSeconds) {
  const safeSecs = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSecs / 3600);
  const mins = Math.floor((safeSecs % 3600) / 60);
  const secs = safeSecs % 60;
  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, '0')}m`;
  }
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

export function formatShortChartDuration(totalSeconds) {
  const safeSecs = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (safeSecs === 0) return '0s';
  if (safeSecs < 60) return `${safeSecs}s`;
  const hours = Math.floor(safeSecs / 3600);
  const mins = Math.floor((safeSecs % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function getPctValue(correct, incorrect) {
  const total = correct + incorrect;
  if (total === 0) return 0;
  return (correct / total) * 100;
}

export function formatPercent(correct, incorrect) {
  const total = correct + incorrect;
  if (total === 0) return '0%';
  return `${Math.round((correct / total) * 100)}%`;
}

export function getPctTierClass(pct) {
  if (pct >= 85) return 'is-good';
  if (pct >= 60) return 'is-mid';
  return 'is-bad';
}
