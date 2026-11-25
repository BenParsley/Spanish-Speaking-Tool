import {
  CATEGORIES,
  CATEGORY_ORDER,
  NUMBER_MAX,
  NUMBER_MIN,
  RANGE_BUCKETS,
  SPANISH_NUMBERS,
  getAllVariationsForStructure,
  getItemsForCategory,
  getItemsForStage,
  getSlotConfigForItem,
  getStructureVariationCount
} from '../curriculum/index.js';
import {
  DAILY_CORRECT_GOAL,
  DAILY_TIME_GOAL_SECONDS,
  DAILY_TOTAL_GOAL,
  computeDailyNewWordsMap,
  computeDailyStatsFromCounts,
  computeDailyTotalsFromCounts,
  forEachCategoryEntry,
  getConfidenceTierInfo,
  getOverallPronunciationStats,
  getStatsForScope,
  getTopicPracticedSummary,
  getWordPronunciationInfo,
  getWordTrophyInfo,
  updateDailyGoalUI
} from './data-tracking.js';
import {
  calMonthLabelEl,
  calNextMonthBtn,
  calPrevMonthBtn,
  drillWeakWordsBtn,
  extSortHeaderBtns,
  sortHeaderBtns,
  statsAnalyticsWidgetsEl,
  statsBaseCountBadgeEl,
  statsBaseSectionEl,
  statsCalDetailEl,
  statsCalGridEl,
  statsCalPickerEl,
  statsCalendarViewEl,
  statsColItemLabelEl,
  statsColMeaningLabelEl,
  statsEmptyStateEl,
  statsExtensionsCountBadgeEl,
  statsExtensionsEmptyStateEl,
  statsExtensionsSectionEl,
  statsExtensionsTableWrapEl,
  statsExtensionsTbodyEl,
  statsInsightEl,
  statsPeriodAllBtn,
  statsPeriodMonthBtn,
  statsPeriodWeekBtn,
  statsScopeBaseBtn,
  statsScopeBothBtn,
  statsScopeExtensionsBtn,
  statsSubjectFilterEl,
  statsTabCalendarBtn,
  statsTabTableBtn,
  statsTabTrendsBtn,
  statsTableViewEl,
  statsTableWrapEl,
  statsTbodyEl,
  statsTrendsViewEl
} from './dom.js';
import { state } from './state.js';
import {
  FULL_MONTHS,
  SHORT_MONTHS,
  escapeHtmlText,
  formatDateKeyLabel,
  formatDurationSeconds,
  formatPercent,
  formatShortChartDuration,
  formatShortGraphDate,
  getLocalDateKey,
  getPctTierClass,
  getPctValue,
  parseDateKeyLocal
} from './utils.js';

let statsViewHooks = {
  onStartWeakDrill: () => { },
  onStartPolishDrill: () => { }
};

export function registerStatsViewHooks(hooks = {}) {
  statsViewHooks = { ...statsViewHooks, ...hooks };
}

export const statsCalendarState = {
  subView: 'calendar', // 'calendar' | 'trends' | 'table'
  activeTrend: 'pronunciation', // 'pronunciation' | 'newWords' | 'timeSpent'
  trendPeriod: 'global', // 'global' | 'month' | 'week'
  tableScope: 'both', // 'both' | 'base' | 'extensions'
  extSortKey: 'name', // 'name' | 'correct' | 'incorrect' | 'pct' | 'pronunciation' | 'trophy'
  extSortDir: 'asc',
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  selectedDateKey: getLocalDateKey(),
  detailOpen: false,
  pickerOpen: false,
  pickerYear: new Date().getFullYear(),
  pickerMonth: new Date().getMonth()
};

const VALID_STATS_TRENDS = ['pronunciation', 'newWords', 'timeSpent'];
const VALID_TREND_PERIODS = ['global', 'month', 'week'];
const PRONUNCIATION_TREND_TARGET = 80;
const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
let currentTrendHoverMap = {};
const openStatsFillItemIds = new Set();

export function setStatsActiveTrend(trendKey) {
  if (!VALID_STATS_TRENDS.includes(trendKey)) return;
  statsCalendarState.activeTrend = trendKey;
  renderStatsAnalyticsWidgets();
}

export function setStatsTrendPeriod(periodKey) {
  if (!VALID_TREND_PERIODS.includes(periodKey)) return;
  statsCalendarState.trendPeriod = periodKey;
  syncStatsPeriodButtonsUI();
  renderStatsAnalyticsWidgets();
}

function syncStatsPeriodButtonsUI() {
  const periodSegEl = document.querySelector('.stats-period-seg');
  const isCalendar = statsCalendarState.subView === 'calendar';
  const isTrends = statsCalendarState.subView === 'trends';
  if (periodSegEl) {
    periodSegEl.classList.toggle('hidden', !isCalendar && !isTrends);
  }
  if (statsPeriodAllBtn) {
    statsPeriodAllBtn.classList.toggle('hidden', !isTrends);
    const isAll = isTrends && statsCalendarState.trendPeriod === 'global';
    statsPeriodAllBtn.classList.toggle('active', isAll);
    statsPeriodAllBtn.setAttribute('aria-pressed', String(isAll));
  }
  if (statsPeriodMonthBtn) {
    const isMonth = isTrends
      ? statsCalendarState.trendPeriod === 'month'
      : !statsCalendarState.detailOpen;
    statsPeriodMonthBtn.classList.toggle('active', isMonth);
    statsPeriodMonthBtn.setAttribute('aria-pressed', String(isMonth));
  }
  if (statsPeriodWeekBtn) {
    const isWeek = isTrends
      ? statsCalendarState.trendPeriod === 'week'
      : Boolean(statsCalendarState.detailOpen);
    statsPeriodWeekBtn.classList.toggle('active', isWeek);
    statsPeriodWeekBtn.setAttribute('aria-pressed', String(isWeek));
  }
}

export function generateDailyReflectionNote(dateKey, dayStats, studySeconds, scope) {
  const todayKey = getLocalDateKey();
  const total = Number(dayStats?.total) || 0;
  const correct = Number(dayStats?.correct) || 0;
  const incorrect = Number(dayStats?.incorrect) || 0;

  if (total === 0 && studySeconds === 0) {
    if (dateKey > todayKey) {
      return `Upcoming study day — plan a 30-minute active session (or aim for ${DAILY_CORRECT_GOAL} correct / ${DAILY_TOTAL_GOAL} total answers).`;
    }
    if (dateKey === todayKey) {
      return 'No study logged yet today. Start with 10–15 questions in your current stage to build recall and keep your streak moving.';
    }
    return 'No study recorded on this date. Even a short 5-minute review of weak items helps lock in long-term retention.';
  }

  const parts = [];
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const timeGoalReached = studySeconds >= DAILY_TIME_GOAL_SECONDS;
  const goalReached =
    correct >= DAILY_CORRECT_GOAL || total >= DAILY_TOTAL_GOAL || timeGoalReached;

  if (studySeconds > 0 && total > 0) {
    const mins = Math.max(0.1, studySeconds / 60);
    const pace = (total / mins).toFixed(1);
    parts.push(
      `Studied ${formatDurationSeconds(studySeconds)} across ${total} questions (${pct}% accuracy, ~${pace} q/min)${goalReached ? ' and reached the daily goal' : ''}.`
    );
  } else if (total > 0) {
    parts.push(`Completed ${total} questions at ${pct}% accuracy${goalReached ? ', reaching the daily goal' : ''}.`);
  } else {
    parts.push(
      `Logged ${formatDurationSeconds(studySeconds)} of active study time on this date${timeGoalReached ? ' and hit the 30m daily time goal' : ''}.`
    );
  }

  const subjectStats = CATEGORY_ORDER.map((catId) => {
    const s = scope.perCategory?.[catId] || { correct: 0, incorrect: 0, total: 0 };
    return {
      catId,
      label: CATEGORIES[catId].label,
      correct: s.correct,
      incorrect: s.incorrect,
      total: s.total,
      pct: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 100
    };
  })
    .filter((s) => s.total > 0)
    .sort((a, b) => a.pct - b.pct || b.incorrect - a.incorrect);

  const missedNumItems = Object.entries(scope.perNum || {})
    .map(([numStr, s]) => ({
      label: `${numStr} (${SPANISH_NUMBERS[Number(numStr)] || numStr})`,
      correct: s.correct,
      incorrect: s.incorrect,
      total: s.total,
      pct: Math.round((s.correct / s.total) * 100)
    }))
    .filter((x) => x.incorrect > 0);

  const missedPhraseItems = Object.values(scope.perPhrase || {})
    .map((p) => ({
      label: `"${p.item.es}"`,
      correct: p.correct,
      incorrect: p.incorrect,
      total: p.total,
      pct: Math.round((p.correct / p.total) * 100)
    }))
    .filter((x) => x.incorrect > 0);

  const topMissed = [...missedPhraseItems, ...missedNumItems]
    .sort((a, b) => b.incorrect - a.incorrect || a.pct - b.pct)
    .slice(0, 3);

  const weakestSubject = subjectStats[0] || null;
  if (weakestSubject && (weakestSubject.incorrect > 0 || weakestSubject.pct < 90)) {
    let focusDetail = `Where to improve: ${weakestSubject.label} had your lowest accuracy (${weakestSubject.pct}%, ${weakestSubject.correct}/${weakestSubject.total}).`;

    if (weakestSubject.catId === 'numbers') {
      const weakBucket = RANGE_BUCKETS.map((b) => {
        let c = 0;
        let inc = 0;
        for (let n = b.min; n <= b.max; n += 1) {
          const s = scope.perNum?.[n];
          if (s) {
            c += s.correct;
            inc += s.incorrect;
          }
        }
        const t = c + inc;
        return { label: b.label, inc, t, pct: t > 0 ? Math.round((c / t) * 100) : 100 };
      })
        .filter((b) => b.t > 0 && b.inc > 0)
        .sort((a, b) => a.pct - b.pct || b.inc - a.inc)[0];

      if (weakBucket) {
        focusDetail += ` Pay extra attention to numbers ${weakBucket.label} (${weakBucket.pct}%).`;
      }
    }

    if (topMissed.length > 0) {
      focusDetail += ` Revisit ${topMissed.map((m) => m.label).join(', ')} using Topic Guide and Practice Mode.`;
    }
    parts.push(focusDetail);
  } else if (topMissed.length > 0) {
    parts.push(
      `Where to improve: tighten recall on ${topMissed.map((m) => m.label).join(', ')} (${incorrect} total ${incorrect === 1 ? 'miss' : 'misses'}) before advancing.`
    );
  } else if (total > 0 && studySeconds < 180 && !goalReached) {
    const drillLabel = state.speakOnlyMode ? 'Speaking' : 'Listening and Speaking';
    parts.push(
      `Where to improve: extend your next session past 5–10 minutes to reinforce ${drillLabel} under recall pressure.`
    );
  } else if (total > 0) {
    const nextDrills = state.speakOnlyMode ? 'Speak' : 'Listen and Speak';
    parts.push(
      `Strong accuracy across practiced items — push into the next stage’s ${nextDrills} drills to test active recall.`
    );
  }

  return parts.join(' ');
}

export function renderStatsCalendarDayDetail(dateKey, dailyStats) {
  if (!statsCalDetailEl) return;
  const dayStats = dailyStats?.[dateKey] || { correct: 0, incorrect: 0, total: 0 };
  const studySeconds = Number(state.dailyActiveSeconds?.[dateKey]) || 0;
  const scope = getStatsForScope(dateKey);
  const pct = dayStats.total > 0 ? Math.round((dayStats.correct / dayStats.total) * 100) : 0;
  const timeGoalReached = studySeconds >= DAILY_TIME_GOAL_SECONDS;
  const timeGoalPct = Math.min(100, Math.round((studySeconds / DAILY_TIME_GOAL_SECONDS) * 100));
  const goalReached =
    dayStats.correct >= DAILY_CORRECT_GOAL || dayStats.total >= DAILY_TOTAL_GOAL || timeGoalReached;

  const badgeText = goalReached
    ? 'Goal Reached'
    : dayStats.total > 0 || studySeconds > 0
      ? 'In Progress'
      : 'No Activity';

  const activeSubjects = CATEGORY_ORDER.filter(
    (catId) => (scope.perCategory?.[catId]?.total || 0) > 0
  ).map((catId) => CATEGORIES[catId].label);

  const missedNumItems = Object.entries(scope.perNum || {}).map(([numStr, s]) => ({
    label: `${numStr} (${SPANISH_NUMBERS[Number(numStr)]})`,
    ...s,
    pct: Math.round((s.correct / s.total) * 100)
  }));
  const missedPhraseItems = Object.values(scope.perPhrase || {}).map((p) => ({
    label: `${p.item.es} (${p.item.en})`,
    correct: p.correct,
    incorrect: p.incorrect,
    total: p.total,
    pct: Math.round((p.correct / p.total) * 100)
  }));
  const missedItems = [...missedPhraseItems, ...missedNumItems]
    .filter((item) => item.incorrect > 0)
    .sort((a, b) => a.pct - b.pct || b.incorrect - a.incorrect)
    .slice(0, 8);

  const reflectionNote = generateDailyReflectionNote(dateKey, dayStats, studySeconds, scope);
  const rawSessions = Array.isArray(state.dailySessions?.[dateKey]) ? state.dailySessions[dateKey] : [];
  const sessionCount = rawSessions.length;
  const totalSessionSeconds = rawSessions.reduce(
    (sum, sess) => sum + Math.max(0, Math.round(((Number(sess?.end) || 0) - (Number(sess?.start) || 0)) / 1000)),
    0
  );
  const avgSessionSeconds = sessionCount > 0 ? Math.round(totalSessionSeconds / sessionCount) : 0;
  const activeStudyLengthSeconds = sessionCount * avgSessionSeconds;

  const subjectRowsHTML = CATEGORY_ORDER.filter(
    (catId) => (scope.perCategory?.[catId]?.total || 0) > 0
  )
    .map((catId) => {
      const s = scope.perCategory[catId];
      const catPct = Math.round((s.correct / s.total) * 100);
      const tier = getPctTierClass(catPct);
      return `
        <div class="breakdown-metric-row">
          <span class="breakdown-metric-label">${escapeHtmlText(CATEGORIES[catId].label)}</span>
          <div class="breakdown-metric-bar-track">
            <div class="breakdown-metric-bar-fill ${tier}" style="width: ${catPct}%"></div>
          </div>
          <span class="breakdown-metric-stat ${tier}">${catPct}% (${s.correct}/${s.total})</span>
        </div>
      `;
    })
    .join('');

  const weakItemsHTML =
    missedItems.length > 0
      ? `<div class="breakdown-section-card">
          <div class="breakdown-section-title">Items to Review</div>
          <div class="weak-items-list">${missedItems
        .map(
          (m) =>
            `<span class="weak-item-pill">${escapeHtmlText(m.label)} · ${m.pct}% (${m.correct}/${m.total})</span>`
        )
        .join('')}</div>
        </div>`
      : '';

  const dayPronRec = state.dailyPronunciation?.[dateKey];
  const dayPronCount = Math.max(0, Number(dayPronRec?.count) || 0);
  const dayPronAvg = dayPronCount > 0 ? Math.round((Number(dayPronRec?.sum) || 0) / dayPronCount) : -1;
  const allTimePron = getOverallPronunciationStats('all');
  const dayPronSub =
    allTimePron.count > 0
      ? `All-time avg: ${allTimePron.avg}% (${allTimePron.count} spoken)`
      : 'No spoken audio graded yet';
  const { byDate: newWordsByDate } = computeDailyNewWordsMap();
  const dayNewWords = Number(newWordsByDate[dateKey]) || 0;

  if (!statsCalendarState.detailOpen) {
    const pronBit = dayPronAvg >= 0 ? ` · Avg pron ${dayPronAvg}%` : (allTimePron.avg >= 0 ? ` · All-time pron ${allTimePron.avg}%` : '');
    const newBit = dayNewWords > 0 ? ` · ${dayNewWords} new` : '';
    const timeBit = `${formatDurationSeconds(studySeconds)}/30m${timeGoalReached ? ' ✓' : ''}`;
    const summaryText =
      dayStats.total > 0 || studySeconds > 0 || dayNewWords > 0
        ? `${timeBit} · ${dayStats.correct}/${DAILY_CORRECT_GOAL} correct · ${dayStats.total}/${DAILY_TOTAL_GOAL} total (${pct}%)${newBit}${pronBit}`
        : 'No study recorded';

    statsCalDetailEl.innerHTML = `
      <div class="stats-cal-footer-bar">
        <div class="stats-cal-footer-summary">
          <span class="stats-cal-footer-date">${escapeHtmlText(formatDateKeyLabel(dateKey))}</span>
          <span class="stats-cal-footer-stats">${escapeHtmlText(summaryText)}</span>
        </div>
        <button type="button" id="stats-cal-expand-btn" class="stats-cal-collapse-btn stats-cal-arrow-btn" aria-label="Expand date details"><span class="stats-cal-arrow" aria-hidden="true">▴</span></button>
        <span class="stats-cal-detail-badge${goalReached ? ' is-goal-met' : ''}">${badgeText}</span>
      </div>
    `;
    return;
  }

  statsCalDetailEl.innerHTML = `
    <div class="stats-cal-detail-header">
      <span class="stats-cal-detail-title">${escapeHtmlText(formatDateKeyLabel(dateKey))}</span>
      <button type="button" id="stats-cal-collapse-btn" class="stats-cal-collapse-btn stats-cal-arrow-btn is-open" aria-label="Collapse date details"><span class="stats-cal-arrow" aria-hidden="true">▴</span></button>
      <span class="stats-cal-detail-badge${goalReached ? ' is-goal-met' : ''}">${badgeText}</span>
    </div>

    <div class="breakdown-summary-grid">
      <div class="breakdown-stat-card">
        <span class="breakdown-stat-label">Progress</span>
        <span class="breakdown-stat-value">${dayStats.total > 0 ? `${pct}%` : '—'}</span>
        <span class="breakdown-stat-sub">${dayStats.correct}/${DAILY_CORRECT_GOAL} correct · ${dayStats.total}/${DAILY_TOTAL_GOAL} total</span>
      </div>
      <div class="breakdown-stat-card">
        <span class="breakdown-stat-label">Topics Practiced</span>
        <span class="breakdown-stat-value">${activeSubjects.length}</span>
        <span class="breakdown-stat-sub">${activeSubjects.length > 0 ? `${escapeHtmlText(activeSubjects.join(', '))}${dayNewWords > 0 ? ` · ${dayNewWords} new` : ''}` : (dayNewWords > 0 ? `${dayNewWords} new word${dayNewWords === 1 ? '' : 's'} shown` : 'None recorded')}</span>
      </div>
      <div class="breakdown-stat-card">
        <span class="breakdown-stat-label">Sessions</span>
        <span class="breakdown-stat-value">${sessionCount}</span>
        <span class="breakdown-stat-sub">${sessionCount > 0 ? '15m gap = new session' : 'No sessions recorded'}</span>
      </div>
      <div class="breakdown-stat-card">
        <span class="breakdown-stat-label">Active Study Length</span>
        <span class="breakdown-stat-value">${sessionCount > 0 ? formatDurationSeconds(activeStudyLengthSeconds) : '—'}</span>
        <span class="breakdown-stat-sub">${sessionCount > 0 ? `${sessionCount} × ${formatDurationSeconds(avgSessionSeconds)} avg` : 'No sessions recorded'}</span>
      </div>
      <div class="breakdown-stat-card">
        <span class="breakdown-stat-label">Study Time</span>
        <span class="breakdown-stat-value">${formatDurationSeconds(studySeconds)}</span>
        <span class="breakdown-stat-sub">${timeGoalPct}% of 30m daily goal${timeGoalReached ? ' ✓' : ''}</span>
      </div>
      <div class="breakdown-stat-card">
        <span class="breakdown-stat-label">Avg Pronunciation</span>
        <span class="breakdown-stat-value">${dayPronAvg >= 0 ? `${dayPronAvg}%` : (allTimePron.avg >= 0 ? `${allTimePron.avg}%` : '—')}</span>
        <span class="breakdown-stat-sub">${escapeHtmlText(dayPronSub)}</span>
      </div>
    </div>

    <div class="stats-cal-reflection-card">
      <span class="stats-cal-reflection-label">Reflection &amp; Where to Improve</span>
      <p class="stats-cal-reflection-text">${escapeHtmlText(reflectionNote)}</p>
    </div>

    ${subjectRowsHTML
      ? `<div class="breakdown-section-card">
          <div class="breakdown-section-title">Subject Progress</div>
          <div class="breakdown-metric-list">${subjectRowsHTML}</div>
        </div>`
      : ''
    }
    ${weakItemsHTML}
  `;

  const collapseBtn = document.getElementById('stats-cal-collapse-btn');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      statsCalendarState.detailOpen = false;
      renderStatsCalendar();
    });
  }
}

export function buildCalendarDayCellHTML(dateKey, dayNum, dailyStats, todayKey, isOutsideMonth = false) {
  const s = dailyStats[dateKey] || { correct: 0, incorrect: 0, total: 0 };
  const secs = Number(state.dailyActiveSeconds?.[dateKey]) || 0;
  const hasActivity = s.total > 0 || secs > 0;
  const timeGoalReached = secs >= DAILY_TIME_GOAL_SECONDS;
  const goalReached =
    s.correct >= DAILY_CORRECT_GOAL || s.total >= DAILY_TOTAL_GOAL || timeGoalReached;
  const pctFill = Math.min(
    100,
    Math.max(
      (s.correct / DAILY_CORRECT_GOAL) * 100,
      (s.total / DAILY_TOTAL_GOAL) * 100,
      (secs / DAILY_TIME_GOAL_SECONDS) * 100
    )
  );
  const accPct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;

  const isPastEmpty = dateKey < todayKey && !hasActivity;
  const cls = [
    'stats-cal-day',
    hasActivity ? 'has-activity' : '',
    isPastEmpty ? 'is-past-empty' : '',
    goalReached ? 'is-goal-met' : '',
    dateKey === todayKey ? 'is-today' : '',
    dateKey === statsCalendarState.selectedDateKey ? 'is-selected' : '',
    isOutsideMonth ? 'is-outside-month' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const timeText = secs > 0 ? formatShortChartDuration(secs) : '';
  const metaText =
    s.total > 0
      ? goalReached
        ? `Goal ✓ · ${accPct}%`
        : `${s.total}q · ${accPct}%`
      : timeGoalReached
        ? '30m Goal ✓'
        : secs > 0
          ? 'Active'
          : '—';

  return `
    <button type="button" class="${cls}" data-cal-date="${dateKey}" aria-pressed="${dateKey === statsCalendarState.selectedDateKey}"${isPastEmpty ? ' disabled aria-disabled="true"' : ''}>
      <div class="stats-cal-day-top">
        <span class="stats-cal-day-num">${dayNum}</span>
        ${timeText ? `<span class="stats-cal-day-time">${escapeHtmlText(timeText)}</span>` : ''}
      </div>
      <div class="stats-cal-day-progress">
        <span class="stats-cal-day-meta">${escapeHtmlText(metaText)}</span>
        ${hasActivity ? `<div class="stats-cal-day-bar" aria-hidden="true"><div class="stats-cal-day-bar-fill" style="width: ${Math.round(pctFill)}%"></div></div>` : ''}
      </div>
    </button>
  `;
}

export function renderStatsCalendarPicker(dailyStats) {
  if (!statsCalPickerEl || !calMonthLabelEl) return;
  const isOpen = Boolean(statsCalendarState.pickerOpen);
  statsCalPickerEl.classList.toggle('hidden', !isOpen);
  calMonthLabelEl.classList.toggle('active', isOpen);
  calMonthLabelEl.setAttribute('aria-expanded', String(isOpen));
  if (!isOpen) return;

  const isWeekly = Boolean(statsCalendarState.detailOpen);
  const pYear = statsCalendarState.pickerYear;
  const pMonth = statsCalendarState.pickerMonth;
  const todayKey = getLocalDateKey();

  if (isWeekly) {
    const firstDay = new Date(pYear, pMonth, 1);
    const lastDay = new Date(pYear, pMonth + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cursor = new Date(firstDay);
    cursor.setDate(firstDay.getDate() - startOffset);

    const selectedDate = parseDateKeyLocal(statsCalendarState.selectedDateKey);
    const selOffset = (selectedDate.getDay() + 6) % 7;
    const selWeekStart = new Date(selectedDate);
    selWeekStart.setDate(selectedDate.getDate() - selOffset);
    const selWeekKey = getLocalDateKey(selWeekStart);

    const weeks = [];
    while (cursor <= lastDay) {
      const wStart = new Date(cursor);
      const wEnd = new Date(cursor);
      wEnd.setDate(wStart.getDate() + 6);
      let wTotal = 0;
      let wSecs = 0;
      for (let i = 0; i < 7; i += 1) {
        const d = new Date(wStart);
        d.setDate(wStart.getDate() + i);
        const dk = getLocalDateKey(d);
        wTotal += Number(dailyStats?.[dk]?.total) || 0;
        wSecs += Number(state.dailyActiveSeconds?.[dk]) || 0;
      }
      weeks.push({
        startKey: getLocalDateKey(wStart),
        label: `${formatShortGraphDate(getLocalDateKey(wStart))} – ${formatShortGraphDate(getLocalDateKey(wEnd))}`,
        total: wTotal,
        secs: wSecs
      });
      cursor.setDate(cursor.getDate() + 7);
    }

    statsCalPickerEl.innerHTML = `
      <div class="stats-cal-picker-top">
        <div class="stats-cal-picker-nav">
          <button type="button" id="cal-picker-prev-btn" class="stats-cal-nav-btn" aria-label="Previous month">‹</button>
          <span class="stats-cal-picker-title">${escapeHtmlText(FULL_MONTHS[pMonth] || '')} ${pYear}</span>
          <button type="button" id="cal-picker-next-btn" class="stats-cal-nav-btn" aria-label="Next month">›</button>
        </div>
        <div class="stats-cal-picker-quick">
          <input type="date" id="cal-picker-date-input" class="stats-cal-date-input" value="${escapeHtmlText(statsCalendarState.selectedDateKey)}" aria-label="Jump to date" />
          <button type="button" id="cal-picker-today-btn" class="stats-action-btn">Today</button>
        </div>
      </div>
      <div class="stats-cal-week-list">
        ${weeks
        .map((w) => {
          const isAct = w.startKey === selWeekKey;
          const meta =
            w.total > 0 || w.secs > 0
              ? `${w.total}q · ${formatShortChartDuration(w.secs)}`
              : 'No activity';
          return `
              <button type="button" class="stats-cal-week-opt${isAct ? ' is-active' : ''}" data-pick-week="${w.startKey}">
                <span>${escapeHtmlText(w.label)}</span>
                <span class="stats-cal-week-meta">${escapeHtmlText(meta)}</span>
              </button>
            `;
        })
        .join('')}
      </div>
    `;
  } else {
    const monthsWithActivity = new Set();
    Object.entries(dailyStats || {}).forEach(([dk, val]) => {
      if ((Number(val?.total) || 0) > 0 && dk.startsWith(`${pYear}-`)) {
        monthsWithActivity.add(Number(dk.slice(5, 7)) - 1);
      }
    });
    Object.entries(state.dailyActiveSeconds || {}).forEach(([dk, sec]) => {
      if ((Number(sec) || 0) > 0 && dk.startsWith(`${pYear}-`)) {
        monthsWithActivity.add(Number(dk.slice(5, 7)) - 1);
      }
    });

    statsCalPickerEl.innerHTML = `
      <div class="stats-cal-picker-top">
        <div class="stats-cal-picker-nav">
          <button type="button" id="cal-picker-prev-btn" class="stats-cal-nav-btn" aria-label="Previous year">‹</button>
          <span class="stats-cal-picker-title">${pYear}</span>
          <button type="button" id="cal-picker-next-btn" class="stats-cal-nav-btn" aria-label="Next year">›</button>
        </div>
        <div class="stats-cal-picker-quick">
          <input type="date" id="cal-picker-date-input" class="stats-cal-date-input" value="${escapeHtmlText(statsCalendarState.selectedDateKey || todayKey)}" aria-label="Jump to date" />
          <button type="button" id="cal-picker-today-btn" class="stats-action-btn">Today</button>
        </div>
      </div>
      <div class="stats-cal-month-grid">
        ${SHORT_MONTHS.map((mName, mIdx) => {
      const isAct = pYear === statsCalendarState.year && mIdx === statsCalendarState.month;
      const hasDot = monthsWithActivity.has(mIdx);
      return `
            <button type="button" class="stats-cal-month-opt${isAct ? ' is-active' : ''}" data-pick-month="${mIdx}">
              <span>${escapeHtmlText(mName)}</span>
              ${hasDot ? '<span class="stats-cal-month-dot" aria-hidden="true"></span>' : ''}
            </button>
          `;
    }).join('')}
      </div>
    `;
  }

  const prevBtn = document.getElementById('cal-picker-prev-btn');
  const nextBtn = document.getElementById('cal-picker-next-btn');
  const todayBtn = document.getElementById('cal-picker-today-btn');
  const dateInput = document.getElementById('cal-picker-date-input');

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isWeekly) {
        statsCalendarState.pickerMonth -= 1;
        if (statsCalendarState.pickerMonth < 0) {
          statsCalendarState.pickerMonth = 11;
          statsCalendarState.pickerYear -= 1;
        }
      } else {
        statsCalendarState.pickerYear -= 1;
      }
      renderStatsCalendarPicker(dailyStats);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isWeekly) {
        statsCalendarState.pickerMonth += 1;
        if (statsCalendarState.pickerMonth > 11) {
          statsCalendarState.pickerMonth = 0;
          statsCalendarState.pickerYear += 1;
        }
      } else {
        statsCalendarState.pickerYear += 1;
      }
      renderStatsCalendarPicker(dailyStats);
    });
  }
  if (todayBtn) {
    todayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const now = new Date();
      statsCalendarState.year = now.getFullYear();
      statsCalendarState.month = now.getMonth();
      statsCalendarState.selectedDateKey = getLocalDateKey(now);
      statsCalendarState.pickerOpen = false;
      renderStatsCalendar();
    });
  }
  if (dateInput) {
    dateInput.addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return;
      const d = parseDateKeyLocal(val);
      statsCalendarState.selectedDateKey = val;
      statsCalendarState.year = d.getFullYear();
      statsCalendarState.month = d.getMonth();
      statsCalendarState.detailOpen = true;
      statsCalendarState.pickerOpen = false;
      renderStatsCalendar();
    });
  }
  statsCalPickerEl.querySelectorAll('[data-pick-month]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const mIdx = Number(btn.dataset.pickMonth);
      if (Number.isNaN(mIdx)) return;
      statsCalendarState.year = statsCalendarState.pickerYear;
      statsCalendarState.month = mIdx;
      statsCalendarState.pickerOpen = false;
      renderStatsCalendar();
    });
  });
  statsCalPickerEl.querySelectorAll('[data-pick-week]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wkStart = btn.dataset.pickWeek;
      if (!wkStart) return;
      const d = parseDateKeyLocal(wkStart);
      statsCalendarState.selectedDateKey = wkStart;
      statsCalendarState.year = d.getFullYear();
      statsCalendarState.month = d.getMonth();
      statsCalendarState.pickerOpen = false;
      renderStatsCalendar();
    });
  });
}

export function renderStatsCalendar() {
  if (!statsCalGridEl || !calMonthLabelEl) return;
  const dailyStats = computeDailyStatsFromCounts(state.counts, state.dailyCounts, state.phraseCounts);
  state.dailyCounts = computeDailyTotalsFromCounts(state.counts, state.dailyCounts, state.phraseCounts);

  const todayKey = getLocalDateKey();
  if (!statsCalendarState.selectedDateKey) {
    statsCalendarState.selectedDateKey = todayKey;
  }

  const isDetailOpen = Boolean(statsCalendarState.detailOpen);
  statsCalendarState.detailOpen = isDetailOpen;
  if (statsCalendarViewEl) {
    statsCalendarViewEl.classList.toggle('is-detail-open', isDetailOpen);
  }
  if (statsCalDetailEl) {
    statsCalDetailEl.classList.toggle('is-open', isDetailOpen);
  }

  let gridHTML = '';
  if (isDetailOpen) {
    const selectedDate = parseDateKeyLocal(statsCalendarState.selectedDateKey);
    const dayOffset = (selectedDate.getDay() + 6) % 7;
    const weekStart = new Date(selectedDate);
    weekStart.setDate(selectedDate.getDate() - dayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    calMonthLabelEl.textContent = `${formatShortGraphDate(getLocalDateKey(weekStart))} – ${formatShortGraphDate(getLocalDateKey(weekEnd))}, ${weekEnd.getFullYear()} ▾`;

    for (let i = 0; i < 7; i += 1) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dk = getLocalDateKey(d);
      const isOutside = d.getMonth() !== statsCalendarState.month || d.getFullYear() !== statsCalendarState.year;
      gridHTML += buildCalendarDayCellHTML(dk, d.getDate(), dailyStats, todayKey, isOutside);
    }
  } else {
    const year = statsCalendarState.year;
    const month = statsCalendarState.month;
    calMonthLabelEl.textContent = `${FULL_MONTHS[month] || ''} ${year} ▾`;

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;

    for (let i = 0; i < startOffset; i += 1) {
      gridHTML += '<div class="stats-cal-spacer" aria-hidden="true"></div>';
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateKey = `${year}-${mm}-${dd}`;
      gridHTML += buildCalendarDayCellHTML(dateKey, day, dailyStats, todayKey, false);
    }
  }

  statsCalGridEl.innerHTML = gridHTML;
  statsCalGridEl.querySelectorAll('[data-cal-date]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled || btn.classList.contains('is-past-empty')) return;
      const dateKey = btn.dataset.calDate;
      if (!dateKey) return;
      const d = parseDateKeyLocal(dateKey);
      statsCalendarState.selectedDateKey = dateKey;
      statsCalendarState.year = d.getFullYear();
      statsCalendarState.month = d.getMonth();
      statsCalendarState.detailOpen = true;
      renderStatsCalendar();
    });
  });

  renderStatsCalendarPicker(dailyStats);
  renderStatsCalendarDayDetail(statsCalendarState.selectedDateKey, dailyStats);
  renderStatsAnalyticsWidgets();
  syncStatsPeriodButtonsUI();
}

export function switchStatsSubView(subView = 'calendar') {
  const normalized = subView === 'trends' || subView === 'table' ? subView : 'calendar';
  const isCalendar = normalized === 'calendar';
  const isTrends = normalized === 'trends';
  const isTable = normalized === 'table';
  statsCalendarState.subView = normalized;
  if (isCalendar) {
    statsCalendarState.detailOpen = false;
    statsCalendarState.pickerOpen = false;
  }

  syncStatsPeriodButtonsUI();

  if (statsTabCalendarBtn) {
    statsTabCalendarBtn.classList.toggle('active', isCalendar);
    statsTabCalendarBtn.setAttribute('aria-pressed', String(isCalendar));
  }
  if (statsTabTrendsBtn) {
    statsTabTrendsBtn.classList.toggle('active', isTrends);
    statsTabTrendsBtn.setAttribute('aria-pressed', String(isTrends));
  }
  if (statsTabTableBtn) {
    statsTabTableBtn.classList.toggle('active', isTable);
    statsTabTableBtn.setAttribute('aria-pressed', String(isTable));
  }
  if (statsCalendarViewEl) {
    statsCalendarViewEl.classList.toggle('hidden', !isCalendar);
  }
  if (statsTrendsViewEl) {
    statsTrendsViewEl.classList.toggle('hidden', !isTrends);
  }
  if (statsTableViewEl) {
    statsTableViewEl.classList.toggle('hidden', !isTable);
  }

  if (isTable) {
    buildStatsTable(true);
  } else if (isTrends) {
    renderStatsAnalyticsWidgets();
  } else {
    renderStatsCalendar();
  }
}

function buildDateRangeKeys(startDateObj, endDateObj) {
  const keys = [];
  const cursor = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate());
  const end = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), endDateObj.getDate());
  let guard = 0;
  while (cursor <= end && guard < 1500) {
    keys.push(getLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return keys;
}

function getTrendDateWindow(allRecordedDateKeys, todayKey) {
  const period = VALID_TREND_PERIODS.includes(statsCalendarState.trendPeriod)
    ? statsCalendarState.trendPeriod
    : 'global';

  if (period === 'week') {
    const selectedDate = parseDateKeyLocal(statsCalendarState.selectedDateKey || todayKey);
    const dayOffset = (selectedDate.getDay() + 6) % 7;
    const weekStart = new Date(selectedDate);
    weekStart.setDate(selectedDate.getDate() - dayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const dateKeys = buildDateRangeKeys(weekStart, weekEnd);
    return {
      period: 'week',
      dateKeys,
      periodLabel: `${formatShortGraphDate(getLocalDateKey(weekStart))} – ${formatShortGraphDate(getLocalDateKey(weekEnd))}, ${weekEnd.getFullYear()}`,
      shortScopeLabel: 'Week',
      showNav: true
    };
  }

  if (period === 'month') {
    const year = statsCalendarState.year;
    const month = statsCalendarState.month;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const dateKeys = buildDateRangeKeys(firstDay, lastDay);
    return {
      period: 'month',
      dateKeys,
      periodLabel: `${FULL_MONTHS[month] || ''} ${year}`.trim(),
      shortScopeLabel: 'Month',
      showNav: true
    };
  }

  const validDates = Array.from(new Set(allRecordedDateKeys))
    .filter((dk) => typeof dk === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dk))
    .sort();
  if (validDates.length === 0) {
    return {
      period: 'global',
      dateKeys: [],
      periodLabel: 'All Time',
      shortScopeLabel: 'All Time',
      showNav: false
    };
  }
  const earliestKey = validDates[0];
  const latestKey = validDates[validDates.length - 1] > todayKey ? validDates[validDates.length - 1] : todayKey;
  const dateKeys = buildDateRangeKeys(parseDateKeyLocal(earliestKey), parseDateKeyLocal(latestKey));
  const rangeNote =
    earliestKey === latestKey
      ? formatShortGraphDate(earliestKey)
      : `${formatShortGraphDate(earliestKey)} – ${latestKey === todayKey ? 'Today' : formatShortGraphDate(latestKey)}`;
  return {
    period: 'global',
    dateKeys,
    periodLabel: `All Time · ${rangeNote}`,
    shortScopeLabel: 'All Time',
    showNav: false
  };
}

export function renderStatsAnalyticsWidgets() {
  if (!statsAnalyticsWidgetsEl) return;

  const activeTrend = VALID_STATS_TRENDS.includes(statsCalendarState.activeTrend)
    ? statsCalendarState.activeTrend
    : 'pronunciation';

  const today = new Date();
  const todayKey = getLocalDateKey(today);
  const pronMap = state.dailyPronunciation || {};
  const overallPron = getOverallPronunciationStats('all');
  const {
    byDate: newWordsByDate,
    stagesByDate: newWordStagesByDate,
    workedStagesByDate,
    totalUniqueSeen
  } = computeDailyNewWordsMap();
  const secsMap = state.dailyActiveSeconds || {};

  const allRecordedDates = [
    ...Object.entries(pronMap)
      .filter(([, rec]) => Number(rec?.count) > 0)
      .map(([dk]) => dk),
    ...Object.entries(newWordsByDate)
      .filter(([, cnt]) => Number(cnt) > 0)
      .map(([dk]) => dk),
    ...Object.entries(workedStagesByDate)
      .filter(([, list]) => Array.isArray(list) && list.length > 0)
      .map(([dk]) => dk),
    ...Object.entries(secsMap)
      .filter(([, secs]) => Number(secs) > 0)
      .map(([dk]) => dk)
  ];

  const windowInfo = getTrendDateWindow(allRecordedDates, todayKey);
  const dateKeys = windowInfo.dateKeys;
  const isWeekView = windowInfo.period === 'week';
  const isGlobalView = windowInfo.period === 'global';

  const formatXLabel = (dk) => {
    if (isWeekView) {
      const d = parseDateKeyLocal(dk);
      return `${SHORT_WEEKDAYS[d.getDay()]} ${d.getDate()}`;
    }
    return dk === todayKey && isGlobalView ? 'Today' : formatShortGraphDate(dk);
  };

  const hoverMap = {};
  let trendTitle = 'Pronunciation Trend';
  let trendBodyHTML = '';

  if (activeTrend === 'pronunciation') {
    trendTitle = 'Pronunciation Trend';
    const trendPoints = [];
    dateKeys.forEach((dk) => {
      const rec = pronMap[dk];
      if (rec && Number(rec.count) > 0) {
        trendPoints.push({
          dateKey: dk,
          avg: Math.round((Number(rec.sum) || 0) / Number(rec.count)),
          count: Number(rec.count)
        });
      }
    });

    trendBodyHTML = `<p class="modal-desc" style="margin:0;font-size:0.84rem;">${
      isGlobalView
        ? 'Speak a few graded answers with Local Hybrid to plot your pronunciation trend.'
        : `No graded pronunciation scores recorded in ${escapeHtmlText(windowInfo.periodLabel)}.`
    }</p>`;

    if (trendPoints.length > 0) {
      const w = 560;
      const h = 210;
      const padL = 34;
      const padR = 14;
      const padTop = 16;
      const padBottom = 24;
      const plotW = w - padL - padR;
      const plotH = h - padTop - padBottom;
      const toY = (val) => h - padBottom - (Math.min(100, Math.max(0, val)) / 100) * plotH;

      const coords = trendPoints.map((pt, idx) => {
        let x;
        if (dateKeys.length > 1 && !isGlobalView) {
          const dayIdx = Math.max(0, dateKeys.indexOf(pt.dateKey));
          x = padL + (dayIdx / (dateKeys.length - 1)) * plotW;
        } else {
          x =
            trendPoints.length === 1
              ? padL + plotW / 2
              : padL + (idx / (trendPoints.length - 1)) * plotW;
        }
        const y = toY(pt.avg);
        return { x, y, pt };
      });
      const latest = trendPoints[trendPoints.length - 1];
      const best = Math.max(...trendPoints.map((p) => p.avg));
      const overallText = overallPron.count > 0 ? `All-Time: <strong>${overallPron.avg}%</strong> (${overallPron.count})` : '';
      const goalY = toY(PRONUNCIATION_TREND_TARGET);
      const gridTicks = [100, 80, 60, 40, 20, 0];
      const linePts = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
      const areaPts = coords.length > 1
        ? `${coords[0].x.toFixed(1)},${(h - padBottom).toFixed(1)} ${linePts} ${coords[coords.length - 1].x.toFixed(1)},${(h - padBottom).toFixed(1)}`
        : '';

      coords.forEach((c) => {
        const hitTarget = c.pt.avg >= PRONUNCIATION_TREND_TARGET;
        hoverMap[c.pt.dateKey] = {
          header: `${formatShortGraphDate(c.pt.dateKey)} · ${c.pt.avg}%`,
          sub: `${c.pt.count} spoken attempt${c.pt.count === 1 ? '' : 's'} · ${
            hitTarget ? `At or above ${PRONUNCIATION_TREND_TARGET}% target ✓` : `Below ${PRONUNCIATION_TREND_TARGET}% target`
          }`,
          items: []
        };
      });

      const xAxisHTML = isWeekView
        ? dateKeys.map((dk, idx) => {
            const lx = padL + (idx / Math.max(1, dateKeys.length - 1)) * plotW;
            const anchor = idx === 0 ? 'start' : idx === dateKeys.length - 1 ? 'end' : 'middle';
            return `<text x="${lx.toFixed(1)}" y="${h - 6}" text-anchor="${anchor}" fill="rgba(148,163,184,0.75)" font-size="9" font-weight="600">${escapeHtmlText(formatXLabel(dk))}</text>`;
          }).join('')
        : `
          <text x="${padL}" y="${h - 6}" text-anchor="start" fill="rgba(148,163,184,0.75)" font-size="9.5" font-weight="600">${escapeHtmlText(formatShortGraphDate(isGlobalView ? trendPoints[0].dateKey : dateKeys[0]))}</text>
          <text x="${w - padR}" y="${h - 6}" text-anchor="end" fill="rgba(148,163,184,0.75)" font-size="9.5" font-weight="600">${escapeHtmlText(formatShortGraphDate(isGlobalView ? latest.dateKey : dateKeys[dateKeys.length - 1]))}</text>
        `;

      trendBodyHTML = `
        <div class="trend-chart-wrap">
          <svg class="pron-trend-svg pron-trend-svg--expanded" viewBox="0 0 ${w} ${h}" role="img" aria-label="Pronunciation score trend">
            <defs>
              <linearGradient id="pronAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.28" />
                <stop offset="100%" stop-color="#60a5fa" stop-opacity="0.02" />
              </linearGradient>
            </defs>
            ${gridTicks.map((val) => {
              const gy = toY(val).toFixed(1);
              return `
                <line x1="${padL}" y1="${gy}" x2="${w - padR}" y2="${gy}" stroke="rgba(148,163,184,0.16)" stroke-width="1" />
                <text x="${padL - 6}" y="${(Number(gy) + 3).toFixed(1)}" text-anchor="end" fill="rgba(148,163,184,0.75)" font-size="9" font-weight="600">${val}%</text>
              `;
            }).join('')}
            <line x1="${padL}" y1="${goalY.toFixed(1)}" x2="${w - padR}" y2="${goalY.toFixed(1)}" stroke="rgba(34,197,94,0.62)" stroke-dasharray="4 3" stroke-width="1.4" />
            <text x="${w - padR}" y="${Math.max(11, goalY - 4).toFixed(1)}" text-anchor="end" fill="rgba(74,222,128,0.92)" font-size="9.5" font-weight="700">${PRONUNCIATION_TREND_TARGET}% target</text>
            ${areaPts ? `<polygon points="${areaPts}" fill="url(#pronAreaGrad)" />` : ''}
            <polyline fill="none" stroke="#60a5fa" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" points="${linePts}" />
            ${coords.map((c) => {
              const tip = `${formatShortGraphDate(c.pt.dateKey)}: ${c.pt.avg}% (${c.pt.count} spoken)`;
              return `<circle class="trend-dot" data-hover-date="${c.pt.dateKey}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="5" fill="#93c5fd" stroke="#1e3a8a" stroke-width="1.2"><title>${escapeHtmlText(tip)}</title></circle>`;
            }).join('')}
            ${xAxisHTML}
          </svg>
          <div id="stats-trend-tooltip" class="trend-hover-tooltip hidden" role="tooltip"></div>
        </div>
        <div class="trend-summary-row">
          <span>Latest: <strong>${latest.avg}%</strong> (${latest.count})</span>
          ${overallText ? `<span>${overallText}</span>` : ''}
          <span>Target: <strong>${PRONUNCIATION_TREND_TARGET}%</strong></span>
          <span>Best: <strong>${best}%</strong></span>
        </div>
      `;
    }
  } else if (activeTrend === 'newWords') {
    trendTitle = 'New Words Shown';
    const series = dateKeys.map((dk) => ({
      dateKey: dk,
      count: Math.max(0, Number(newWordsByDate[dk]) || 0),
      newStages: Array.isArray(newWordStagesByDate[dk]) ? newWordStagesByDate[dk] : [],
      workedStages: Array.isArray(workedStagesByDate[dk]) ? workedStagesByDate[dk] : []
    }));
    const periodTotalNew = series.reduce((sum, p) => sum + p.count, 0);
    const peakInPeriod = Math.max(0, ...series.map((p) => p.count));
    const todayNew = Number(newWordsByDate[todayKey]) || 0;

    if (series.length === 0 || (isGlobalView && periodTotalNew === 0)) {
      trendBodyHTML = '<p class="modal-desc" style="margin:0;font-size:0.84rem;">Explore words in Learn mode to plot new words shown and see which units and stages you worked on.</p>';
    } else {
      const w = 560;
      const h = 210;
      const padL = 34;
      const padR = 14;
      const padTop = 16;
      const padBottom = 24;
      const plotW = w - padL - padR;
      const plotH = h - padTop - padBottom;
      const step = plotW / Math.max(1, series.length);
      const barW = Math.min(36, Math.max(3, step - (step > 8 ? 4 : step > 4 ? 2 : 0.6)));
      const maxVal = Math.max(2, peakInPeriod);
      const midVal = Math.round(maxVal / 2);
      const toY = (val) => h - padBottom - (val / maxVal) * plotH;

      const barsHTML = series.map((p, idx) => {
        const colX = padL + idx * step;
        const x = colX + (step - barW) / 2;
        const barH = p.count > 0 ? Math.max(5, (p.count / maxVal) * plotH) : 2;
        const y = h - padBottom - barH;
        const isToday = p.dateKey === todayKey;
        const fill = p.count === 0 ? 'rgba(148,163,184,0.22)' : (isToday ? '#c4b5fd' : '#a78bfa');

        const stageSource = p.newStages.length > 0 ? p.newStages : p.workedStages;
        const stagePrefix = p.newStages.length > 0 ? 'Working on' : (p.workedStages.length > 0 ? 'Reviewed' : '');
        const stageLines = stageSource.slice(0, 4).map((st) =>
          p.newStages.length > 0
            ? `${st.stageLabel} (${st.count} new)`
            : `${st.stageLabel} (${st.count}q)`
        );
        if (stageSource.length > 4) {
          stageLines.push(`+${stageSource.length - 4} more stage${stageSource.length - 4 === 1 ? '' : 's'}`);
        }
        hoverMap[p.dateKey] = {
          header: `${formatShortGraphDate(p.dateKey)} · ${p.count} new word${p.count === 1 ? '' : 's'}`,
          sub: stagePrefix || 'No study activity recorded',
          items: stageLines
        };

        const nativeTip =
          stageLines.length > 0
            ? `${formatShortGraphDate(p.dateKey)}: ${p.count} new word${p.count === 1 ? '' : 's'} — ${stageLines.join(' | ')}`
            : `${formatShortGraphDate(p.dateKey)}: ${p.count} new word${p.count === 1 ? '' : 's'}`;

        return `
          <rect class="trend-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="2.5" fill="${fill}" pointer-events="none"></rect>
          <rect class="trend-hover-col" data-hover-date="${p.dateKey}" x="${colX.toFixed(1)}" y="${padTop}" width="${step.toFixed(1)}" height="${plotH}" fill="transparent"><title>${escapeHtmlText(nativeTip)}</title></rect>
        `;
      }).join('');

      const xAxisHTML = isWeekView
        ? series.map((p, idx) => {
            const cx = padL + idx * step + step / 2;
            return `<text x="${cx.toFixed(1)}" y="${h - 6}" text-anchor="middle" fill="rgba(148,163,184,0.75)" font-size="9" font-weight="600">${escapeHtmlText(formatXLabel(p.dateKey))}</text>`;
          }).join('')
        : `
          <text x="${padL}" y="${h - 6}" text-anchor="start" fill="rgba(148,163,184,0.75)" font-size="9.5" font-weight="600">${escapeHtmlText(formatXLabel(series[0].dateKey))}</text>
          ${series.length > 2 ? `<text x="${(padL + plotW / 2).toFixed(1)}" y="${h - 6}" text-anchor="middle" fill="rgba(148,163,184,0.75)" font-size="9.5" font-weight="600">${escapeHtmlText(formatXLabel(series[Math.floor(series.length / 2)].dateKey))}</text>` : ''}
          ${series.length > 1 ? `<text x="${w - padR}" y="${h - 6}" text-anchor="end" fill="rgba(148,163,184,0.75)" font-size="9.5" font-weight="600">${escapeHtmlText(formatXLabel(series[series.length - 1].dateKey))}</text>` : ''}
        `;

      trendBodyHTML = `
        <div class="trend-chart-wrap">
          <svg class="pron-trend-svg pron-trend-svg--expanded" viewBox="0 0 ${w} ${h}" role="img" aria-label="New words shown trend">
            ${[maxVal, midVal, 0].map((val) => {
              const gy = toY(val).toFixed(1);
              return `
                <line x1="${padL}" y1="${gy}" x2="${w - padR}" y2="${gy}" stroke="rgba(148,163,184,0.16)" stroke-width="1" />
                <text x="${padL - 6}" y="${(Number(gy) + 3).toFixed(1)}" text-anchor="end" fill="rgba(148,163,184,0.75)" font-size="9" font-weight="600">${val}</text>
              `;
            }).join('')}
            ${barsHTML}
            ${xAxisHTML}
          </svg>
          <div id="stats-trend-tooltip" class="trend-hover-tooltip hidden" role="tooltip"></div>
        </div>
        <div class="trend-summary-row">
          <span>Today: <strong>${todayNew}</strong> new</span>
          <span>${isGlobalView ? 'Total Shown' : `${windowInfo.shortScopeLabel} Total`}: <strong>${periodTotalNew}</strong></span>
          <span>All-Time: <strong>${totalUniqueSeen}</strong></span>
          <span>Peak: <strong>${peakInPeriod}/day</strong></span>
        </div>
        <div class="trend-hover-hint">Hover over any day to see the unit &amp; stage you were working on.</div>
      `;
    }
  } else if (activeTrend === 'timeSpent') {
    trendTitle = 'Time Spent';
    const series = dateKeys.map((dk) => ({
      dateKey: dk,
      secs: Math.max(0, Number(secsMap[dk]) || 0)
    }));
    const periodTotalSecs = series.reduce((sum, p) => sum + p.secs, 0);
    const peakSecs = Math.max(0, ...series.map((p) => p.secs));
    const todaySecs = Math.max(0, Number(secsMap[todayKey]) || 0);
    const goalsHit = series.filter((p) => p.secs >= DAILY_TIME_GOAL_SECONDS).length;

    if (series.length === 0 || (isGlobalView && periodTotalSecs === 0)) {
      trendBodyHTML = '<p class="modal-desc" style="margin:0;font-size:0.84rem;">Study in Learn mode to plot your daily active study time against the 30m daily goal.</p>';
    } else {
      const w = 560;
      const h = 210;
      const padL = 38;
      const padR = 14;
      const padTop = 16;
      const padBottom = 24;
      const plotW = w - padL - padR;
      const plotH = h - padTop - padBottom;
      const step = plotW / Math.max(1, series.length);
      const barW = Math.min(36, Math.max(3, step - (step > 8 ? 4 : step > 4 ? 2 : 0.6)));
      const maxSecs = Math.max(DAILY_TIME_GOAL_SECONDS, peakSecs);
      const toY = (s) => h - padBottom - (s / maxSecs) * plotH;
      const goalY = toY(DAILY_TIME_GOAL_SECONDS);

      const barsHTML = series.map((p, idx) => {
        const colX = padL + idx * step;
        const x = colX + (step - barW) / 2;
        const barH = p.secs > 0 ? Math.max(5, (p.secs / maxSecs) * plotH) : 2;
        const y = h - padBottom - barH;
        const hitGoal = p.secs >= DAILY_TIME_GOAL_SECONDS;
        const fill = p.secs === 0 ? 'rgba(148,163,184,0.22)' : (hitGoal ? '#22c55e' : '#38bdf8');
        const tip = `${formatShortGraphDate(p.dateKey)}: ${formatDurationSeconds(p.secs)}${hitGoal ? ' (30m goal ✓)' : ''}`;
        hoverMap[p.dateKey] = {
          header: `${formatShortGraphDate(p.dateKey)} · ${formatDurationSeconds(p.secs)}`,
          sub: hitGoal ? '30m daily goal reached ✓' : (p.secs > 0 ? `${Math.round((p.secs / DAILY_TIME_GOAL_SECONDS) * 100)}% of 30m daily goal` : 'No study time recorded'),
          items: []
        };
        return `
          <rect class="trend-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="2.5" fill="${fill}" pointer-events="none"></rect>
          <rect class="trend-hover-col" data-hover-date="${p.dateKey}" x="${colX.toFixed(1)}" y="${padTop}" width="${step.toFixed(1)}" height="${plotH}" fill="transparent"><title>${escapeHtmlText(tip)}</title></rect>
        `;
      }).join('');

      const xAxisHTML = isWeekView
        ? series.map((p, idx) => {
            const cx = padL + idx * step + step / 2;
            return `<text x="${cx.toFixed(1)}" y="${h - 6}" text-anchor="middle" fill="rgba(148,163,184,0.75)" font-size="9" font-weight="600">${escapeHtmlText(formatXLabel(p.dateKey))}</text>`;
          }).join('')
        : `
          <text x="${padL}" y="${h - 6}" text-anchor="start" fill="rgba(148,163,184,0.75)" font-size="9.5" font-weight="600">${escapeHtmlText(formatXLabel(series[0].dateKey))}</text>
          ${series.length > 2 ? `<text x="${(padL + plotW / 2).toFixed(1)}" y="${h - 6}" text-anchor="middle" fill="rgba(148,163,184,0.75)" font-size="9.5" font-weight="600">${escapeHtmlText(formatXLabel(series[Math.floor(series.length / 2)].dateKey))}</text>` : ''}
          ${series.length > 1 ? `<text x="${w - padR}" y="${h - 6}" text-anchor="end" fill="rgba(148,163,184,0.75)" font-size="9.5" font-weight="600">${escapeHtmlText(formatXLabel(series[series.length - 1].dateKey))}</text>` : ''}
        `;

      trendBodyHTML = `
        <div class="trend-chart-wrap">
          <svg class="pron-trend-svg pron-trend-svg--expanded" viewBox="0 0 ${w} ${h}" role="img" aria-label="Study time spent trend">
            ${[maxSecs, Math.round(maxSecs / 2), 0].map((sVal) => {
              const gy = toY(sVal).toFixed(1);
              const lbl = `${Math.round(sVal / 60)}m`;
              return `
                <line x1="${padL}" y1="${gy}" x2="${w - padR}" y2="${gy}" stroke="rgba(148,163,184,0.16)" stroke-width="1" />
                <text x="${padL - 6}" y="${(Number(gy) + 3).toFixed(1)}" text-anchor="end" fill="rgba(148,163,184,0.75)" font-size="9" font-weight="600">${lbl}</text>
              `;
            }).join('')}
            <line x1="${padL}" y1="${goalY.toFixed(1)}" x2="${w - padR}" y2="${goalY.toFixed(1)}" stroke="rgba(34,197,94,0.55)" stroke-dasharray="4 3" stroke-width="1.2" />
            <text x="${w - padR}" y="${Math.max(11, goalY - 4).toFixed(1)}" text-anchor="end" fill="rgba(74,222,128,0.9)" font-size="9.5" font-weight="700">30m goal</text>
            ${barsHTML}
            ${xAxisHTML}
          </svg>
          <div id="stats-trend-tooltip" class="trend-hover-tooltip hidden" role="tooltip"></div>
        </div>
        <div class="trend-summary-row">
          <span>Today: <strong>${escapeHtmlText(formatDurationSeconds(todaySecs))}</strong></span>
          <span>${isGlobalView ? 'Total Studied' : `${windowInfo.shortScopeLabel} Total`}: <strong>${escapeHtmlText(formatDurationSeconds(periodTotalSecs))}</strong></span>
          <span>Peak: <strong>${escapeHtmlText(formatDurationSeconds(peakSecs))}</strong></span>
          <span>30m Goals: <strong>${goalsHit}</strong></span>
        </div>
      `;
    }
  }

  currentTrendHoverMap = hoverMap;

  const periodNavHTML = windowInfo.showNav
    ? `<div class="trend-period-nav">
        <button type="button" id="trends-prev-period-btn" class="stats-cal-nav-btn trend-nav-btn" aria-label="Previous ${windowInfo.period}">‹</button>
        <span id="stats-trend-period-label" class="trend-period-label">${escapeHtmlText(windowInfo.periodLabel)}</span>
        <button type="button" id="trends-next-period-btn" class="stats-cal-nav-btn trend-nav-btn" aria-label="Next ${windowInfo.period}">›</button>
      </div>`
    : `<span id="stats-trend-period-label" class="trend-period-pill">${escapeHtmlText(windowInfo.periodLabel)}</span>`;

  const phonemeEntries = Object.entries(state.weakPhonemeCounts || {})
    .map(([ch, rec]) => {
      const cnt = Math.max(0, Number(rec?.count) || 0);
      const misses = Math.max(0, Number(rec?.misses) || 0);
      const avg = cnt > 0 ? Math.round((Number(rec?.scoreSum) || 0) / cnt) : 0;
      return { ch, cnt, misses, avg };
    })
    .filter((p) => p.cnt > 0 && (p.misses > 0 || p.avg < 90))
    .sort((a, b) => a.avg - b.avg || b.misses - a.misses)
    .slice(0, 5);

  const phonemeBodyHTML =
    phonemeEntries.length === 0
      ? '<p class="modal-desc" style="margin:0;font-size:0.84rem;">No weak Spanish sounds recorded yet — keep speaking to build your phoneme profile.</p>'
      : `<div class="weak-phoneme-list">${phonemeEntries
          .map(
            (p) => `
          <div class="weak-phoneme-row">
            <span><strong>"${escapeHtmlText(p.ch)}"</strong> (${p.misses} low)</span>
            <span>Avg ${p.avg}%</span>
          </div>`
          )
          .join('')}</div>`;

  statsAnalyticsWidgetsEl.innerHTML = `
    <div class="analytics-widget-card analytics-widget-card--trend" data-active-trend="${activeTrend}" data-trend-period="${windowInfo.period}">
      <div class="analytics-widget-header">
        <div class="trend-header-left">
          <div class="analytics-widget-title" id="stats-trend-title">${escapeHtmlText(trendTitle)}</div>
          ${periodNavHTML}
        </div>
        <div class="trend-switcher" role="group" aria-label="Switch trend">
          <button type="button" class="trend-switch-btn${activeTrend === 'pronunciation' ? ' active' : ''}" data-trend="pronunciation" aria-pressed="${activeTrend === 'pronunciation'}">Pronunciation</button>
          <button type="button" class="trend-switch-btn${activeTrend === 'newWords' ? ' active' : ''}" data-trend="newWords" aria-pressed="${activeTrend === 'newWords'}">New Words</button>
          <button type="button" class="trend-switch-btn${activeTrend === 'timeSpent' ? ' active' : ''}" data-trend="timeSpent" aria-pressed="${activeTrend === 'timeSpent'}">Time Spent</button>
        </div>
      </div>
      ${trendBodyHTML}
    </div>
    <div class="analytics-widget-card analytics-widget-card--sounds">
      <div class="analytics-widget-title">Top 5 Sounds to Practice</div>
      ${phonemeBodyHTML}
    </div>
  `;
}

export function updateStatsInsight() {
  const catFilter = state.reviewFilterCat || state.activeCategory || CATEGORY_ORDER[0];
  const evaluated = [];

  if (catFilter === 'numbers') {
    for (const bucket of RANGE_BUCKETS) {
      let correct = 0;
      let incorrect = 0;
      for (let n = bucket.min; n <= bucket.max; n++) {
        const entry = state.counts[n];
        if (entry) {
          correct += entry.correct || 0;
          incorrect += entry.incorrect || 0;
        }
      }
      const total = correct + incorrect;
      if (total > 0) {
        const pct = (correct / total) * 100;
        evaluated.push({
          label: bucket.label,
          pct,
          roundedPct: Math.round(pct),
          incorrect,
          total
        });
      }
    }
  } else if (catFilter === 'all') {
    for (const catId of CATEGORY_ORDER) {
      let correct = 0;
      let incorrect = 0;
      forEachCategoryEntry(catId, (_, entry) => {
        if (entry) {
          correct += entry.correct || 0;
          incorrect += entry.incorrect || 0;
        }
      });
      const total = correct + incorrect;
      if (total > 0) {
        const pct = (correct / total) * 100;
        evaluated.push({
          label: CATEGORIES[catId].label,
          pct,
          roundedPct: Math.round(pct),
          incorrect,
          total
        });
      }
    }
  } else {
    const cat = CATEGORIES[catFilter];
    if (cat && cat.stages) {
      cat.stages.forEach((stage, idx) => {
        const items = getItemsForStage(catFilter, idx);
        let correct = 0;
        let incorrect = 0;
        items.forEach((item) => {
          const entry = state.phraseCounts && state.phraseCounts[item.id];
          if (entry) {
            correct += entry.correct || 0;
            incorrect += entry.incorrect || 0;
          }
        });
        const total = correct + incorrect;
        if (total > 0) {
          const pct = (correct / total) * 100;
          evaluated.push({
            label: `Stage ${idx + 1} (${stage.shortTitle})`,
            pct,
            roundedPct: Math.round(pct),
            incorrect,
            total
          });
        }
      });
    }
  }

  const drillPolishBtn = document.getElementById('drill-polish-pron-btn');
  if (drillPolishBtn) {
    const scopePron = getOverallPronunciationStats(catFilter);
    drillPolishBtn.classList.toggle('hidden', scopePron.improveWords <= 0);
  }
  if (evaluated.length === 0) {
    statsInsightEl.textContent = '';
    statsInsightEl.classList.add('hidden');
    if (drillWeakWordsBtn) drillWeakWordsBtn.classList.add('hidden');
    return;
  }

  evaluated.sort((a, b) => {
    if (a.pct !== b.pct) return a.pct - b.pct;
    if (b.incorrect !== a.incorrect) return b.incorrect - a.incorrect;
    return b.total - a.total;
  });

  const weakest = evaluated[0];
  statsInsightEl.textContent = `Needs work: ${weakest.label} (${weakest.roundedPct}% correct)`;
  statsInsightEl.classList.remove('hidden');
  if (drillWeakWordsBtn) {
    drillWeakWordsBtn.classList.toggle('hidden', weakest.roundedPct >= 95 && weakest.incorrect === 0);
  }
}

export function renderStatsSubjectFilter() {
  if (!statsSubjectFilterEl) return;
  const activeFilter = state.reviewFilterCat || state.activeCategory || 'numbers';
  statsSubjectFilterEl.innerHTML = '';

  let allPracticed = 0;
  let allTotal = 0;
  const topicSummaries = CATEGORY_ORDER.map((id) => {
    const summary = getTopicPracticedSummary(id);
    allPracticed += summary.practiced;
    allTotal += summary.total;
    return { id, ...summary };
  });

  const makeFilterBtn = ({ id, code, name, countText, isAll = false }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `subject-filter-btn${isAll ? ' is-all-btn' : ''}${activeFilter === id ? ' active' : ''}`;
    btn.setAttribute('aria-pressed', String(activeFilter === id));
    btn.innerHTML = `
      <span class="subject-filter-top">
        <span class="subject-filter-code">${escapeHtmlText(code)}</span>
        <span class="subject-filter-count">${escapeHtmlText(countText)}</span>
      </span>
      <span class="subject-filter-name">${escapeHtmlText(name)}</span>
    `;
    btn.addEventListener('click', () => {
      state.reviewFilterCat = id;
      buildStatsTable(false);
    });
    return btn;
  };

  statsSubjectFilterEl.appendChild(
    makeFilterBtn({
      id: 'all',
      code: 'ALL',
      name: 'All Subjects',
      countText: `${allPracticed}/${allTotal}`,
      isAll: true
    })
  );

  const gridEl = document.createElement('div');
  gridEl.className = 'stats-subject-grid';
  topicSummaries.forEach(({ id, practiced, total }, idx) => {
    const cat = CATEGORIES[id];
    const code = cat.a1Code || `A1.${idx + 1}`;
    const shortName = String(cat.label || '').replace(/^A1\.\d+\s+/, '');
    gridEl.appendChild(
      makeFilterBtn({
        id,
        code,
        name: shortName,
        countText: `${practiced}/${total}`
      })
    );
  });
  statsSubjectFilterEl.appendChild(gridEl);
}

export function buildStatsTable(animate = true) {
  if (!state.reviewFilterCat) {
    state.reviewFilterCat = state.activeCategory || CATEGORY_ORDER[0];
  }
  const activeFilter = state.reviewFilterCat;
  renderStatsSubjectFilter();
  updateStatsInsight();
  updateDailyGoalUI();

  const pronSummaryEl = document.getElementById('stats-pronunciation-summary');
  if (pronSummaryEl) {
    const scopePron = getOverallPronunciationStats(activeFilter);
    const allPron = getOverallPronunciationStats('all');
    if (allPron.count > 0) {
      const scopePart =
        activeFilter !== 'all' && scopePron.count > 0
          ? `<span><strong>This Subject Avg:</strong> ${scopePron.avg}% (${scopePron.count} spoken)</span>`
          : '';
      const improvePart =
        allPron.improveWords > 0
          ? `<span class="pron-summary-improve">${allPron.improveWords} word${allPron.improveWords === 1 ? '' : 's'} could be improved</span>`
          : '';
      pronSummaryEl.innerHTML = `
        <span><strong>Overall Avg Pronunciation:</strong> ${allPron.avg}% across ${allPron.count} spoken attempt${allPron.count === 1 ? '' : 's'}</span>
        ${scopePart}
        ${improvePart}
      `;
      pronSummaryEl.classList.remove('hidden');
    } else {
      pronSummaryEl.innerHTML = '';
      pronSummaryEl.classList.add('hidden');
    }
  }
  if (state.activeView === 'stats' && statsCalendarState.subView === 'calendar') {
    renderStatsCalendar();
  } else if (state.activeView === 'stats' && statsCalendarState.subView === 'trends') {
    renderStatsAnalyticsWidgets();
  }

  if (statsColItemLabelEl) {
    statsColItemLabelEl.textContent = activeFilter === 'numbers' ? 'Number' : 'Spanish';
  }
  if (statsColMeaningLabelEl) {
    statsColMeaningLabelEl.textContent = activeFilter === 'numbers' ? 'Spanish' : 'English';
  }

  const rawRows = [];
  if (activeFilter === 'numbers' || activeFilter === 'all') {
    const numCatIdx = CATEGORY_ORDER.indexOf('numbers');
    for (let n = NUMBER_MIN; n <= NUMBER_MAX; n++) {
      const entry = state.counts[n] || { correct: 0, incorrect: 0 };
      rawRows.push({
        key: n,
        sortOrder: numCatIdx * 10000 + n,
        col1: String(n),
        col2: activeFilter === 'all' ? `Numbers · ${SPANISH_NUMBERS[n]}` : SPANISH_NUMBERS[n],
        entry
      });
    }
  }

  CATEGORY_ORDER.forEach((catId, catIdx) => {
    if (catId === 'numbers') return;
    if (activeFilter !== 'all' && activeFilter !== catId) return;
    const catLabel = CATEGORIES[catId].label;
    getItemsForCategory(catId).forEach((item, itemIdx) => {
      const entry = state.phraseCounts[item.id] || { correct: 0, incorrect: 0 };
      const varCount = item.structure ? getStructureVariationCount(item) : 0;
      const slotCfg = !item.structure ? getSlotConfigForItem(item) : null;
      const optCount = slotCfg?.slotType === 'spanish_options' ? (slotCfg.options?.length || 0) : 0;
      let variationCount = 0;
      let practicedVariations = 0;
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
      rawRows.push({
        key: item.id,
        item,
        variationCount,
        practicedVariations,
        variationKind,
        sortOrder: catIdx * 10000 + itemIdx + 1,
        col1: item.es,
        col2: activeFilter === 'all' ? `${catLabel} · ${item.en}` : item.en,
        entry
      });
    });
  });

  const practicedBaseCount = rawRows.filter(
    (r) => (Number(r.entry.correct) || 0) + (Number(r.entry.incorrect) || 0) > 0
  ).length;
  if (statsBaseCountBadgeEl) {
    statsBaseCountBadgeEl.textContent = `${practicedBaseCount} practiced`;
  }

  const hasAnyData = practicedBaseCount > 0;

  if (!hasAnyData) {
    statsTbodyEl.innerHTML = '';
    statsTableWrapEl.classList.add('hidden');
    statsEmptyStateEl.classList.remove('hidden');
    sortHeaderBtns.forEach((b) => {
      b.disabled = true;
    });
    buildExtensionsStatsTable(animate);
    syncStatsTableScopeUI();
    return;
  }

  statsTableWrapEl.classList.remove('hidden');
  statsEmptyStateEl.classList.add('hidden');
  sortHeaderBtns.forEach((b) => {
    b.disabled = false;
  });

  const { recordSortKey, recordSortDir } = state;
  const dirMult = recordSortDir === 'asc' ? 1 : -1;

  rawRows.sort((a, b) => {
    const entryA = a.entry;
    const entryB = b.entry;
    let valA = a.sortOrder;
    let valB = b.sortOrder;

    if (recordSortKey === 'correct') {
      valA = entryA.correct || 0;
      valB = entryB.correct || 0;
    } else if (recordSortKey === 'incorrect') {
      valA = entryA.incorrect || 0;
      valB = entryB.incorrect || 0;
    } else if (recordSortKey === 'pct') {
      valA = getPctValue(entryA.correct || 0, entryA.incorrect || 0);
      valB = getPctValue(entryB.correct || 0, entryB.incorrect || 0);
    } else if (recordSortKey === 'pronunciation') {
      valA = getWordPronunciationInfo(entryA).avg;
      valB = getWordPronunciationInfo(entryB).avg;
    } else if (recordSortKey === 'trophy') {
      valA = getWordTrophyInfo(entryA.correct || 0, entryA.incorrect || 0).pct;
      valB = getWordTrophyInfo(entryB.correct || 0, entryB.incorrect || 0).pct;
    } else if (recordSortKey === 'mastery' || recordSortKey === 'confidence') {
      valA = getConfidenceTierInfo(a.key).rank;
      valB = getConfidenceTierInfo(b.key).rank;
    }

    if (valA !== valB) {
      return (valA - valB) * dirMult;
    }
    return a.sortOrder - b.sortOrder;
  });

  statsTbodyEl.innerHTML = '';
  rawRows.forEach((row, idx) => {
    const entry = row.entry;
    const c = Number(entry.correct) || 0;
    const inc = Number(entry.incorrect) || 0;
    const conf = getConfidenceTierInfo(row.key);
    entry.confidence = conf.label;
    const tr = document.createElement('tr');
    tr.id = `stats-row-${row.key}`;
    if (animate) {
      const delayMs = Math.min(idx, 18) * 16;
      tr.style.setProperty('--row-delay', `${delayMs}ms`);
    } else {
      tr.style.animation = 'none';
      tr.style.opacity = '1';
    }
    const pron = getWordPronunciationInfo(entry);
    const trophy = getWordTrophyInfo(c, inc);
    const trophyHTML =
      trophy.tierCls === 'is-none'
        ? `<span class="stats-trophy-none" title="${escapeHtmlText(trophy.label)}">—</span>`
        : `<span class="stats-trophy-badge ${trophy.tierCls}" title="${escapeHtmlText(trophy.label)}" aria-label="${escapeHtmlText(trophy.label)}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" fill="none" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" fill="none" />
              <path d="M4 22h16" fill="none" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" fill="none" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" fill="none" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </span>`;
    const pronBadgeHTML = pron.statusTag
      ? ` <span class="pron-status-badge ${pron.tierCls}">${escapeHtmlText(pron.statusTag)}</span>`
      : '';
    const hasVariations = Boolean(row.item && row.variationCount > 1);
    const isDrawerOpen = hasVariations && openStatsFillItemIds.has(row.key);
    const varPillHTML = hasVariations
      ? `<div class="stats-var-pill-wrap"><button type="button" class="vocab-var-pill stats-var-pill${isDrawerOpen ? ' is-open' : ''}" data-toggle-stats-fills="${escapeHtmlText(row.key)}" aria-expanded="${isDrawerOpen}">${row.practicedVariations}/${row.variationCount} ${row.variationKind === 'options' ? 'options' : 'variations'} ${isDrawerOpen ? '▴' : '▾'}</button></div>`
      : '';
    tr.innerHTML = `
      <td class="stats-item-cell">${escapeHtmlText(row.col1)}${varPillHTML}</td>
      <td>${escapeHtmlText(row.col2)}</td>
      <td class="num-col stats-correct-cell" data-role="correct">${c}</td>
      <td class="num-col stats-incorrect-cell" data-role="incorrect">${inc}</td>
      <td class="num-col" data-role="pct">${formatPercent(c, inc)}</td>
      <td class="num-col stats-pronunciation-cell ${pron.tierCls}" data-role="pronunciation" title="${escapeHtmlText(pron.title)}">${escapeHtmlText(pron.text)}${pronBadgeHTML}</td>
      <td class="num-col stats-trophy-cell" data-role="trophy">${trophyHTML}</td>
    `;
    statsTbodyEl.appendChild(tr);

    if (isDrawerOpen) {
      const drawerTr = document.createElement('tr');
      drawerTr.className = 'stats-fills-drawer-row';
      drawerTr.dataset.statsFillsFor = String(row.key);
      drawerTr.innerHTML = `<td colspan="7">${buildStatsFillDrawerHTML(row.item, row.variationKind)}</td>`;
      statsTbodyEl.appendChild(drawerTr);
    }
  });

  buildExtensionsStatsTable(animate);
  syncStatsTableScopeUI();
}

export function syncStatsTableScopeUI() {
  const scope = statsCalendarState.tableScope || 'both';
  if (statsScopeBothBtn) {
    const active = scope === 'both';
    statsScopeBothBtn.classList.toggle('active', active);
    statsScopeBothBtn.setAttribute('aria-pressed', String(active));
  }
  if (statsScopeBaseBtn) {
    const active = scope === 'base';
    statsScopeBaseBtn.classList.toggle('active', active);
    statsScopeBaseBtn.setAttribute('aria-pressed', String(active));
  }
  if (statsScopeExtensionsBtn) {
    const active = scope === 'extensions';
    statsScopeExtensionsBtn.classList.toggle('active', active);
    statsScopeExtensionsBtn.setAttribute('aria-pressed', String(active));
  }
  if (statsBaseSectionEl) {
    statsBaseSectionEl.classList.toggle('hidden', scope === 'extensions');
    statsBaseSectionEl.classList.toggle('is-sole-table', scope === 'base');
  }
  if (statsExtensionsSectionEl) {
    statsExtensionsSectionEl.classList.toggle('hidden', scope === 'base');
    statsExtensionsSectionEl.classList.toggle('is-sole-table', scope === 'extensions');
  }
}

export function buildExtensionsStatsTable(animate = true) {
  if (!statsExtensionsTbodyEl || !statsExtensionsTableWrapEl || !statsExtensionsEmptyStateEl) return;
  const activeFilter = state.reviewFilterCat || state.activeCategory || CATEGORY_ORDER[0];
  const rawEntries = Object.values(state.extensionCounts || {});
  const rows = rawEntries
    .filter((entry) => {
      if (!entry || !entry.key) return false;
      const total = (Number(entry.correct) || 0) + (Number(entry.incorrect) || 0);
      const pronCount = Number(entry.pronunciationCount) || 0;
      if (total <= 0 && pronCount <= 0) return false;
      if (activeFilter !== 'all' && entry.catId !== activeFilter) return false;
      return true;
    })
    .map((entry) => {
      const catLabel = CATEGORIES[entry.catId]?.label || entry.catId || 'General';
      const meaning = entry.en || entry.group || '';
      return {
        key: entry.key,
        catId: entry.catId,
        col1: entry.es || entry.key,
        col2: activeFilter === 'all' ? `${catLabel}${meaning ? ` · ${meaning}` : ''}` : (meaning || '—'),
        entry
      };
    });

  if (statsExtensionsCountBadgeEl) {
    statsExtensionsCountBadgeEl.textContent = `${rows.length} tracked`;
  }

  if (rows.length === 0) {
    statsExtensionsTbodyEl.innerHTML = '';
    statsExtensionsTableWrapEl.classList.add('hidden');
    statsExtensionsEmptyStateEl.classList.remove('hidden');
    extSortHeaderBtns.forEach((b) => {
      b.disabled = true;
    });
    return;
  }

  statsExtensionsTableWrapEl.classList.remove('hidden');
  statsExtensionsEmptyStateEl.classList.add('hidden');
  extSortHeaderBtns.forEach((b) => {
    b.disabled = false;
  });

  const sortKey = statsCalendarState.extSortKey || 'name';
  const dirMult = statsCalendarState.extSortDir === 'desc' ? -1 : 1;

  rows.sort((a, b) => {
    const entryA = a.entry;
    const entryB = b.entry;
    if (sortKey === 'name') {
      const cmp = String(a.col1).localeCompare(String(b.col1), 'es', { sensitivity: 'base' });
      if (cmp !== 0) return cmp * dirMult;
      return String(a.key).localeCompare(String(b.key));
    }
    let valA = 0;
    let valB = 0;
    if (sortKey === 'correct') {
      valA = entryA.correct || 0;
      valB = entryB.correct || 0;
    } else if (sortKey === 'incorrect') {
      valA = entryA.incorrect || 0;
      valB = entryB.incorrect || 0;
    } else if (sortKey === 'pct') {
      valA = getPctValue(entryA.correct || 0, entryA.incorrect || 0);
      valB = getPctValue(entryB.correct || 0, entryB.incorrect || 0);
    } else if (sortKey === 'pronunciation') {
      valA = getWordPronunciationInfo(entryA).avg;
      valB = getWordPronunciationInfo(entryB).avg;
    } else if (sortKey === 'trophy') {
      valA = getWordTrophyInfo(entryA.correct || 0, entryA.incorrect || 0).pct;
      valB = getWordTrophyInfo(entryB.correct || 0, entryB.incorrect || 0).pct;
    }
    if (valA !== valB) return (valA - valB) * dirMult;
    return String(a.col1).localeCompare(String(b.col1), 'es', { sensitivity: 'base' });
  });

  statsExtensionsTbodyEl.innerHTML = '';
  rows.forEach((row, idx) => {
    const entry = row.entry;
    const c = Number(entry.correct) || 0;
    const inc = Number(entry.incorrect) || 0;
    const tr = document.createElement('tr');
    tr.dataset.extKey = row.key;
    if (animate) {
      const delayMs = Math.min(idx, 18) * 16;
      tr.style.setProperty('--row-delay', `${delayMs}ms`);
    } else {
      tr.style.animation = 'none';
      tr.style.opacity = '1';
    }
    const pron = getWordPronunciationInfo(entry);
    const trophy = getWordTrophyInfo(c, inc);
    const trophyHTML =
      trophy.tierCls === 'is-none'
        ? `<span class="stats-trophy-none" title="${escapeHtmlText(trophy.label)}">—</span>`
        : `<span class="stats-trophy-badge ${trophy.tierCls}" title="${escapeHtmlText(trophy.label)}" aria-label="${escapeHtmlText(trophy.label)}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" fill="none" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" fill="none" />
              <path d="M4 22h16" fill="none" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" fill="none" />
              <path d="M14 14.66V17c0 .55-.47.98.97 1.21C16.15 18.75 17 20.24 17 22" fill="none" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </span>`;
    const pronBadgeHTML = pron.statusTag
      ? ` <span class="pron-status-badge ${pron.tierCls}">${escapeHtmlText(pron.statusTag)}</span>`
      : '';
    tr.innerHTML = `
      <td class="stats-item-cell">${escapeHtmlText(row.col1)}</td>
      <td>${escapeHtmlText(row.col2)}</td>
      <td class="num-col stats-correct-cell" data-role="correct">${c}</td>
      <td class="num-col stats-incorrect-cell" data-role="incorrect">${inc}</td>
      <td class="num-col" data-role="pct">${formatPercent(c, inc)}</td>
      <td class="num-col stats-pronunciation-cell ${pron.tierCls}" data-role="pronunciation" title="${escapeHtmlText(pron.title)}">${escapeHtmlText(pron.text)}${pronBadgeHTML}</td>
      <td class="num-col stats-trophy-cell" data-role="trophy">${trophyHTML}</td>
    `;
    statsExtensionsTbodyEl.appendChild(tr);
  });
}

function buildStatsFillDrawerHTML(item, variationKind) {
  if (!item) return '';
  if (variationKind === 'structure' && item.structure) {
    const vars = getAllVariationsForStructure(item);
    const fStats = state.structureFillStats?.[item.id] || {};
    const maxShow = 36;
    const shown = vars.slice(0, maxShow);
    const chipsHTML = shown
      .map((v) => {
        const st = fStats[v.fillKey];
        const c = Number(st?.c) || 0;
        const inc = Number(st?.i) || 0;
        const cls = c > 0 ? ' is-practiced' : inc > 0 ? ' is-missed' : '';
        const statBit = c + inc > 0 ? ` (${c}/${c + inc})` : '';
        const labelEs = v.extensionEs || v.es;
        const labelEn = v.extensionEn || v.en;
        return `<span class="fill-drawer-chip${cls}" title="${escapeHtmlText(v.es)} — ${escapeHtmlText(v.en)}"><strong>${escapeHtmlText(labelEs)}</strong>${labelEn ? ` · ${escapeHtmlText(labelEn)}` : ''}${escapeHtmlText(statBit)}</span>`;
      })
      .join('');
    const moreHTML = vars.length > maxShow
      ? `<span class="fill-drawer-more">+${vars.length - maxShow} more scenarios</span>`
      : '';
    return `
      <div class="fill-drawer-box">
        <div class="fill-drawer-head">Structure: <strong>${escapeHtmlText(item.structure.patternEs)}</strong> (${vars.length} scenarios)</div>
        <div class="fill-drawer-chips">${chipsHTML}${moreHTML}</div>
      </div>
    `;
  }
  if (variationKind === 'options') {
    const cfg = getSlotConfigForItem(item);
    const opts = cfg?.options || [];
    const usedSet = new Set(Array.isArray(state.usedSlotOptionsByItem?.[item.id]) ? state.usedSlotOptionsByItem[item.id] : []);
    const chipsHTML = opts
      .map((opt) => {
        const isUsed = usedSet.has(opt.es);
        return `<span class="fill-drawer-chip${isUsed ? ' is-practiced' : ''}"><strong>${escapeHtmlText(opt.es)}</strong> · ${escapeHtmlText(opt.en)}${isUsed ? ' ✓' : ''}</span>`;
      })
      .join('');
    return `
      <div class="fill-drawer-box">
        <div class="fill-drawer-head">Open Choice: <strong>${escapeHtmlText(cfg?.displayPatternEs || item.es)}</strong> (${opts.length} options · any valid answer accepted)</div>
        <div class="fill-drawer-chips">${chipsHTML}</div>
      </div>
    `;
  }
  return '';
}

export function initStatsView() {
  if (statsTbodyEl) {
    statsTbodyEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-toggle-stats-fills]');
      if (!btn) return;
      e.stopPropagation();
      const itemId = btn.dataset.toggleStatsFills;
      if (!itemId) return;
      if (openStatsFillItemIds.has(itemId)) {
        openStatsFillItemIds.delete(itemId);
      } else {
        openStatsFillItemIds.add(itemId);
      }
      buildStatsTable(false);
    });
  }
  sortHeaderBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.sort;
      if (!key) return;
      if (state.recordSortKey === key) {
        state.recordSortDir = state.recordSortDir === 'desc' ? 'asc' : 'desc';
      } else {
        state.recordSortKey = key;
        state.recordSortDir = key === 'number' ? 'asc' : 'desc';
      }
      sortHeaderBtns.forEach((b) => b.classList.toggle('active', b === btn));
      buildStatsTable(true);
    });
  });

  extSortHeaderBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.extSort;
      if (!key) return;
      if (statsCalendarState.extSortKey === key) {
        statsCalendarState.extSortDir = statsCalendarState.extSortDir === 'desc' ? 'asc' : 'desc';
      } else {
        statsCalendarState.extSortKey = key;
        statsCalendarState.extSortDir = key === 'name' ? 'asc' : 'desc';
      }
      extSortHeaderBtns.forEach((b) => b.classList.toggle('active', b === btn));
      buildExtensionsStatsTable(true);
    });
  });

  if (statsScopeBothBtn) {
    statsScopeBothBtn.addEventListener('click', () => {
      statsCalendarState.tableScope = 'both';
      syncStatsTableScopeUI();
    });
  }
  if (statsScopeBaseBtn) {
    statsScopeBaseBtn.addEventListener('click', () => {
      statsCalendarState.tableScope = 'base';
      syncStatsTableScopeUI();
    });
  }
  if (statsScopeExtensionsBtn) {
    statsScopeExtensionsBtn.addEventListener('click', () => {
      statsCalendarState.tableScope = 'extensions';
      syncStatsTableScopeUI();
    });
  }

  if (statsTabCalendarBtn) {
    statsTabCalendarBtn.addEventListener('click', () => switchStatsSubView('calendar'));
  }
  if (statsTabTrendsBtn) {
    statsTabTrendsBtn.addEventListener('click', () => switchStatsSubView('trends'));
  }
  if (statsTabTableBtn) {
    statsTabTableBtn.addEventListener('click', () => switchStatsSubView('table'));
  }
  if (statsCalDetailEl) {
    statsCalDetailEl.addEventListener('click', () => {
      if (!statsCalendarState.detailOpen) {
        statsCalendarState.detailOpen = true;
        renderStatsCalendar();
      }
    });
  }
  if (calPrevMonthBtn) {
    calPrevMonthBtn.addEventListener('click', () => {
      if (statsCalendarState.detailOpen) {
        const d = parseDateKeyLocal(statsCalendarState.selectedDateKey);
        d.setDate(d.getDate() - 7);
        statsCalendarState.selectedDateKey = getLocalDateKey(d);
        statsCalendarState.year = d.getFullYear();
        statsCalendarState.month = d.getMonth();
      } else {
        statsCalendarState.month -= 1;
        if (statsCalendarState.month < 0) {
          statsCalendarState.month = 11;
          statsCalendarState.year -= 1;
        }
      }
      renderStatsCalendar();
    });
  }
  if (calNextMonthBtn) {
    calNextMonthBtn.addEventListener('click', () => {
      if (statsCalendarState.detailOpen) {
        const d = parseDateKeyLocal(statsCalendarState.selectedDateKey);
        d.setDate(d.getDate() + 7);
        statsCalendarState.selectedDateKey = getLocalDateKey(d);
        statsCalendarState.year = d.getFullYear();
        statsCalendarState.month = d.getMonth();
      } else {
        statsCalendarState.month += 1;
        if (statsCalendarState.month > 11) {
          statsCalendarState.month = 0;
          statsCalendarState.year += 1;
        }
      }
      renderStatsCalendar();
    });
  }
  if (calMonthLabelEl) {
    calMonthLabelEl.addEventListener('click', (e) => {
      e.stopPropagation();
      statsCalendarState.pickerOpen = !statsCalendarState.pickerOpen;
      if (statsCalendarState.pickerOpen) {
        statsCalendarState.pickerYear = statsCalendarState.year;
        statsCalendarState.pickerMonth = statsCalendarState.month;
      }
      renderStatsCalendar();
    });
  }
  if (statsCalPickerEl) {
    statsCalPickerEl.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  if (statsPeriodAllBtn) {
    statsPeriodAllBtn.addEventListener('click', () => {
      if (statsCalendarState.subView === 'trends') {
        setStatsTrendPeriod('global');
      }
    });
  }
  if (statsPeriodWeekBtn) {
    statsPeriodWeekBtn.addEventListener('click', () => {
      if (statsCalendarState.subView === 'trends') {
        setStatsTrendPeriod('week');
        return;
      }
      statsCalendarState.detailOpen = true;
      statsCalendarState.pickerOpen = false;
      renderStatsCalendar();
    });
  }
  if (statsPeriodMonthBtn) {
    statsPeriodMonthBtn.addEventListener('click', () => {
      if (statsCalendarState.subView === 'trends') {
        setStatsTrendPeriod('month');
        return;
      }
      statsCalendarState.detailOpen = false;
      statsCalendarState.pickerOpen = false;
      renderStatsCalendar();
    });
  }
  if (drillWeakWordsBtn) {
    drillWeakWordsBtn.addEventListener('click', () => {
      statsViewHooks.onStartWeakDrill();
    });
  }
  if (statsAnalyticsWidgetsEl) {
    statsAnalyticsWidgetsEl.addEventListener('click', (e) => {
      const trendBtn = e.target.closest('[data-trend]');
      if (trendBtn) {
        e.stopPropagation();
        const trendKey = trendBtn.dataset.trend;
        if (trendKey) setStatsActiveTrend(trendKey);
        return;
      }
      const prevBtn = e.target.closest('#trends-prev-period-btn');
      const nextBtn = e.target.closest('#trends-next-period-btn');
      if (prevBtn || nextBtn) {
        e.stopPropagation();
        const delta = prevBtn ? -1 : 1;
        if (statsCalendarState.trendPeriod === 'week') {
          const d = parseDateKeyLocal(statsCalendarState.selectedDateKey || getLocalDateKey());
          d.setDate(d.getDate() + delta * 7);
          statsCalendarState.selectedDateKey = getLocalDateKey(d);
          statsCalendarState.year = d.getFullYear();
          statsCalendarState.month = d.getMonth();
        } else if (statsCalendarState.trendPeriod === 'month') {
          statsCalendarState.month += delta;
          if (statsCalendarState.month < 0) {
            statsCalendarState.month = 11;
            statsCalendarState.year -= 1;
          } else if (statsCalendarState.month > 11) {
            statsCalendarState.month = 0;
            statsCalendarState.year += 1;
          }
        }
        renderStatsAnalyticsWidgets();
      }
    });

    const positionAndShowTrendTooltip = (targetEl, clientX = null) => {
      const dk = targetEl?.dataset?.hoverDate;
      const tipEl = document.getElementById('stats-trend-tooltip');
      const wrapEl = targetEl?.closest('.trend-chart-wrap');
      if (!dk || !tipEl || !wrapEl) return;
      const info = currentTrendHoverMap[dk];
      if (!info) {
        tipEl.classList.add('hidden');
        return;
      }
      const listHTML =
        Array.isArray(info.items) && info.items.length > 0
          ? `<ul class="trend-tooltip-list">${info.items
              .map((line) => `<li>${escapeHtmlText(line)}</li>`)
              .join('')}</ul>`
          : '';
      tipEl.innerHTML = `
        <div class="trend-tooltip-header">${escapeHtmlText(info.header)}</div>
        ${info.sub ? `<div class="trend-tooltip-sub">${escapeHtmlText(info.sub)}</div>` : ''}
        ${listHTML}
      `;
      tipEl.classList.remove('hidden');

      const wrapRect = wrapEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const anchorX =
        clientX !== null && Number.isFinite(clientX)
          ? clientX - wrapRect.left
          : targetRect.left - wrapRect.left + targetRect.width / 2;
      const tipW = tipEl.offsetWidth || 220;
      const clampedX = Math.max(8, Math.min(wrapRect.width - tipW - 8, anchorX - tipW / 2));
      tipEl.style.left = `${Math.round(clampedX)}px`;
    };

    statsAnalyticsWidgetsEl.addEventListener('mouseover', (e) => {
      const hoverTarget = e.target.closest('[data-hover-date]');
      if (!hoverTarget) return;
      positionAndShowTrendTooltip(hoverTarget, e.clientX);
    });

    statsAnalyticsWidgetsEl.addEventListener('mousemove', (e) => {
      const hoverTarget = e.target.closest('[data-hover-date]');
      if (!hoverTarget) return;
      positionAndShowTrendTooltip(hoverTarget, e.clientX);
    });

    statsAnalyticsWidgetsEl.addEventListener('mouseout', (e) => {
      const hoverTarget = e.target.closest('[data-hover-date]');
      if (!hoverTarget) return;
      const nextTarget = e.relatedTarget?.closest?.('[data-hover-date]');
      if (nextTarget === hoverTarget) return;
      if (!nextTarget) {
        const tipEl = document.getElementById('stats-trend-tooltip');
        if (tipEl) tipEl.classList.add('hidden');
      }
    });
  }
  const drillPolishBtn = document.getElementById('drill-polish-pron-btn');
  if (drillPolishBtn) {
    drillPolishBtn.addEventListener('click', () => {
      statsViewHooks.onStartPolishDrill();
    });
  }
}
