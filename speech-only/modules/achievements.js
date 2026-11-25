import { playAchievementFanfare } from './audio.js';
import {
  achievementToastDescEl,
  achievementToastEl,
  achievementToastIconEl,
  achievementToastTitleEl
} from './dom.js';
import { isTrackingDisabled, savePersistedData, state } from './state.js';
import { getTodayActiveSeconds } from './study-timer.js';
import {
  DAILY_TIME_GOAL_SECONDS,
  createDefaultJourneyRewards
} from './tracking-schema.js';
import { getLocalDateKey, parseDateKeyLocal, parseLocalDateKeyMs } from './utils.js';

let achievementHooks = {
  onRenderPathView: () => { }
};

export function ensureJourneyRewards() {
  if (!state.journeyRewards || typeof state.journeyRewards !== 'object' || state.journeyRewards.version !== 2) {
    state.journeyRewards = createDefaultJourneyRewards();
  }
  return state.journeyRewards;
}

export function formatAchievementTarget(val) {
  return String(Math.floor(Number(val) || 0));
}

export function formatAchievementDuration(totalSeconds) {
  const secs = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (secs < 60) return `${secs}s`;
  const hours = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export function getTotalActiveStudySeconds() {
  return Object.values(state.dailyActiveSeconds || {}).reduce(
    (sum, sec) => sum + Math.max(0, Math.floor(Number(sec) || 0)),
    0
  );
}

export function getAllActiveDayKeys() {
  const jr = ensureJourneyRewards();
  const keys = new Set(jr.activeDaysHistory || []);
  Object.entries(state.dailyCounts || {}).forEach(([k, v]) => {
    if ((Number(v) || 0) > 0 && Number.isFinite(parseLocalDateKeyMs(k))) keys.add(k);
  });
  Object.entries(state.dailyActiveSeconds || {}).forEach(([k, v]) => {
    if ((Number(v) || 0) > 0 && Number.isFinite(parseLocalDateKeyMs(k))) keys.add(k);
  });
  return Array.from(keys).sort();
}

export function getCurrentDayStreak(now = new Date()) {
  const activeSet = new Set(getAllActiveDayKeys());
  if (activeSet.size === 0) return 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = getLocalDateKey(cursor);
  if (!activeSet.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (activeSet.has(getLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function getBestDayStreak() {
  const dayMsList = getAllActiveDayKeys()
    .map(parseLocalDateKeyMs)
    .filter((ms) => Number.isFinite(ms))
    .sort((a, b) => a - b);
  if (dayMsList.length === 0) return 0;
  const ONE_DAY_MS = 86400000;
  let best = 1;
  let run = 1;
  for (let i = 1; i < dayMsList.length; i += 1) {
    const diff = Math.round((dayMsList[i] - dayMsList[i - 1]) / ONE_DAY_MS);
    if (diff === 1) {
      run += 1;
      if (run > best) best = run;
    } else if (diff > 1) {
      run = 1;
    }
  }
  return best;
}

export function getBestDaysInSingleWeek() {
  const keys = getAllActiveDayKeys();
  if (keys.length === 0) return 0;
  const weekBuckets = {};
  keys.forEach((dateKey) => {
    const ms = parseLocalDateKeyMs(dateKey);
    if (!Number.isFinite(ms)) return;
    const d = parseDateKeyLocal(dateKey);
    const offset = (d.getDay() + 6) % 7; // Monday = 0
    const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
    const weekId = getLocalDateKey(mon);
    if (!weekBuckets[weekId]) weekBuckets[weekId] = new Set();
    weekBuckets[weekId].add(dateKey);
  });
  let best = 0;
  Object.values(weekBuckets).forEach((set) => {
    if (set.size > best) best = set.size;
  });
  return best;
}

export function getCurrentWeekFlameStrip(now = new Date()) {
  const activeSet = new Set(getAllActiveDayKeys());
  const todayKey = getLocalDateKey(now);
  const offset = (now.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const key = getLocalDateKey(d);
    const secs = Math.max(0, Math.floor(Number(state.dailyActiveSeconds?.[key]) || 0));
    const lit = activeSet.has(key);
    const hit30m = secs >= DAILY_TIME_GOAL_SECONDS;
    days.push({
      label: labels[i],
      dateKey: key,
      lit,
      hit30m,
      isToday: key === todayKey,
      isFuture: key > todayKey
    });
  }
  return days;
}

export const JOURNEY_CATEGORIES = [
  { id: 'all', label: 'All', emoji: '' },
  { id: 'rhythm', label: 'Daily Rhythm', emoji: '' },
  { id: 'lifestyle', label: 'Rituals', emoji: '' },
  { id: 'speaking', label: 'Speaking', emoji: '' }
];

export const DEFAULT_PASSPORT_TITLE = {
  id: 'first_spark',
  emoji: '',
  label: 'Starter'
};

export const ACHIEVEMENTS = [
  // ===== DAILY RHYTHM (Multi-day consistency & 30-min habit) =====
  {
    id: 'flame_keeper',
    category: 'rhythm',
    categoryLabel: 'Daily Rhythm',
    emoji: '',
    title: 'Daily Streak',
    desc: 'Practice on consecutive days',
    rewardTitle: 'Streak Keeper',
    tiers: [2, 3, 7, 14, 30],
    tierUnit: 'd',
    formatValue: (v) => `${Math.floor(Number(v) || 0)}d`,
    formatTarget: (v) => `${Math.floor(Number(v) || 0)}d`,
    getValue: () => getBestDayStreak()
  },
  {
    id: 'habit_builder',
    category: 'rhythm',
    categoryLabel: 'Daily Rhythm',
    emoji: '',
    title: 'Active Days',
    desc: 'Total distinct study days',
    rewardTitle: 'Steady Learner',
    tiers: [1, 5, 12, 25, 50],
    tierUnit: 'd',
    formatValue: (v) => `${Math.floor(Number(v) || 0)}d`,
    formatTarget: (v) => `${Math.floor(Number(v) || 0)}d`,
    getValue: () => getAllActiveDayKeys().length
  },
  {
    id: 'thirty_min_club',
    category: 'rhythm',
    categoryLabel: 'Daily Rhythm',
    emoji: '',
    title: '30-Minute Goal',
    desc: 'Reach the 30-minute daily study goal',
    rewardTitle: 'Daily Ritualist',
    tiers: [1, 3, 7, 14, 30],
    tierUnit: 'd',
    formatValue: (v) => `${Math.floor(Number(v) || 0)}d`,
    formatTarget: (v) => `${Math.floor(Number(v) || 0)}d`,
    getValue: () => (ensureJourneyRewards().thirtyMinGoalDates || []).length
  },
  {
    id: 'full_week_warrior',
    category: 'rhythm',
    categoryLabel: 'Daily Rhythm',
    emoji: '',
    title: 'Weekly Consistency',
    desc: 'Active days within a single Mon–Sun week',
    rewardTitle: 'Rhythm Master',
    tiers: [2, 3, 4, 5, 7],
    tierUnit: 'd',
    formatValue: (v) => `${Math.floor(Number(v) || 0)}/7`,
    formatTarget: (v) => `${Math.floor(Number(v) || 0)}d`,
    getValue: () => getBestDaysInSingleWeek()
  },

  // ===== RITUALS (Schedule & Resilience) =====
  {
    id: 'morning_cafecito',
    category: 'lifestyle',
    categoryLabel: 'Rituals',
    emoji: '',
    title: 'Morning Practice',
    desc: 'Study before 11:00 AM',
    rewardTitle: 'Early Bird',
    tiers: [1, 3, 7, 14, 21],
    tierUnit: 'd',
    formatValue: (v) => `${Math.floor(Number(v) || 0)}d`,
    formatTarget: (v) => `${Math.floor(Number(v) || 0)}d`,
    getValue: () => (ensureJourneyRewards().morningDaysPlayed || []).length
  },
  {
    id: 'night_owl',
    category: 'lifestyle',
    categoryLabel: 'Rituals',
    emoji: '',
    title: 'Evening Practice',
    desc: 'Study after 6:00 PM',
    rewardTitle: 'Night Owl',
    tiers: [1, 3, 7, 14, 21],
    tierUnit: 'd',
    formatValue: (v) => `${Math.floor(Number(v) || 0)}d`,
    formatTarget: (v) => `${Math.floor(Number(v) || 0)}d`,
    getValue: () => (ensureJourneyRewards().eveningDaysPlayed || []).length
  },
  {
    id: 'weekend_explorer',
    category: 'lifestyle',
    categoryLabel: 'Rituals',
    emoji: '',
    title: 'Weekend Practice',
    desc: 'Study on Saturdays or Sundays',
    rewardTitle: 'Weekend Regular',
    tiers: [1, 2, 4, 8, 12],
    tierUnit: 'd',
    formatValue: (v) => `${Math.floor(Number(v) || 0)}d`,
    formatTarget: (v) => `${Math.floor(Number(v) || 0)}d`,
    getValue: () => (ensureJourneyRewards().weekendDaysPlayed || []).length
  },
  {
    id: 'phoenix_return',
    category: 'lifestyle',
    categoryLabel: 'Rituals',
    emoji: '',
    title: 'Comeback',
    desc: 'Return to practice after a 2+ day break',
    rewardTitle: 'Resilient Speaker',
    tiers: [1, 2, 3, 5, 8],
    tierUnit: '×',
    formatValue: (v) => `${Math.floor(Number(v) || 0)}×`,
    formatTarget: (v) => `${Math.floor(Number(v) || 0)}×`,
    getValue: () => Number(ensureJourneyRewards().comebackCount) || 0
  },

  // ===== SPEAKING (Pronunciation, flow & breakthroughs) =====
  {
    id: 'golden_voice',
    category: 'speaking',
    categoryLabel: 'Speaking',
    emoji: '',
    title: 'Clear Pronunciation',
    desc: 'Score 90%+ pronunciation on spoken answers',
    rewardTitle: 'Clear Speaker',
    tiers: [3, 15, 40, 100, 250],
    tierUnit: '',
    formatValue: formatAchievementTarget,
    formatTarget: formatAchievementTarget,
    getValue: () => Number(ensureJourneyRewards().crispSpeechCount) || 0
  },
  {
    id: 'flow_state',
    category: 'speaking',
    categoryLabel: 'Speaking',
    emoji: '',
    title: 'Answer Streak',
    desc: 'Consecutive correct answers in Graded Mode',
    rewardTitle: 'Flow Master',
    tiers: [5, 10, 20, 35, 50],
    tierUnit: '',
    formatValue: formatAchievementTarget,
    formatTarget: formatAchievementTarget,
    getValue: () => Math.max(Number(ensureJourneyRewards().bestCombo) || 0, Number(state.streak) || 0)
  },
  {
    id: 'memory_breakthrough',
    category: 'speaking',
    categoryLabel: 'Speaking',
    emoji: '',
    title: 'Difficult Items Cleared',
    desc: 'Correctly answer items missed 3+ times',
    rewardTitle: 'Problem Solver',
    tiers: [1, 3, 8, 15, 30],
    tierUnit: '',
    formatValue: formatAchievementTarget,
    formatTarget: formatAchievementTarget,
    getValue: () => Number(ensureJourneyRewards().comebackWordsCleared) || 0
  },
  {
    id: 'time_invested',
    category: 'speaking',
    categoryLabel: 'Speaking',
    emoji: '',
    title: 'Study Time',
    desc: 'Total active study time across all days',
    rewardTitle: 'Dedicated Learner',
    tiers: [900, 3600, 10800, 36000, 90000], // 15m, 1h, 3h, 10h, 25h
    tierUnit: '',
    formatValue: formatAchievementDuration,
    formatTarget: formatAchievementDuration,
    getValue: () => getTotalActiveStudySeconds()
  }
];

export function getActiveAchievements() {
  return ACHIEVEMENTS;
}

export function getAchievementDisplay(ach) {
  return {
    title: ach.title,
    desc: ach.desc
  };
}

export function getAchievementLevel(ach) {
  const jr = ensureJourneyRewards();
  const stored = jr.unlocked?.[ach.id];
  const storedLv = stored ? Math.min(5, Math.max(0, Number(stored.level) || 0)) : 0;
  const val = Math.max(0, Number(ach.getValue()) || 0);
  let reached = 0;
  for (let i = 0; i < ach.tiers.length; i += 1) {
    if (val >= ach.tiers[i]) reached = i + 1;
  }
  return Math.max(storedLv, reached);
}

export function getUnlockedTitles() {
  const titles = [DEFAULT_PASSPORT_TITLE];
  ACHIEVEMENTS.forEach((ach) => {
    if (getAchievementLevel(ach) >= 1) {
      titles.push({
        id: ach.id,
        emoji: ach.emoji,
        label: ach.rewardTitle
      });
    }
  });
  return titles;
}

export function getEquippedTitle() {
  const jr = ensureJourneyRewards();
  const unlocked = getUnlockedTitles();
  return unlocked.find((t) => t.id === jr.equippedTitleId) || unlocked[0];
}

export function setLearnerName(name) {
  if (isTrackingDisabled()) return;
  const jr = ensureJourneyRewards();
  jr.learnerName = String(name || '').trim().slice(0, 28);
  savePersistedData();
}

export function setEquippedTitle(titleId) {
  if (isTrackingDisabled()) return;
  const jr = ensureJourneyRewards();
  const unlocked = getUnlockedTitles();
  if (unlocked.some((t) => t.id === titleId)) {
    jr.equippedTitleId = titleId;
    savePersistedData();
  }
}

export function getJourneyPassportSummary() {
  const jr = ensureJourneyRewards();
  const currentStreak = getCurrentDayStreak();
  const bestStreak = getBestDayStreak();
  const totalDays = getAllActiveDayKeys().length;
  const thirtyMinDays = (jr.thirtyMinGoalDates || []).length;
  const todaySecs = getTodayActiveSeconds();
  const minsLeftFor30 = Math.max(0, Math.ceil((DAILY_TIME_GOAL_SECONDS - todaySecs) / 60));

  let unlockedStamps = 0;
  let maxedBadges = 0;
  let closestNext = null;

  ACHIEVEMENTS.forEach((ach) => {
    const lv = getAchievementLevel(ach);
    unlockedStamps += lv;
    if (lv >= 5) {
      maxedBadges += 1;
      return;
    }
    const rawVal = Math.max(0, Number(ach.getValue()) || 0);
    const nextTarget = ach.tiers[lv];
    const prevTarget = lv > 0 ? ach.tiers[lv - 1] : 0;
    const pct = Math.max(0, Math.min(99, ((rawVal - prevTarget) / Math.max(1, nextTarget - prevTarget)) * 100));
    if (!closestNext || pct > closestNext.pct) {
      closestNext = {
        ach,
        nextLevel: lv + 1,
        rawVal,
        nextTarget,
        pct
      };
    }
  });

  const name = jr.learnerName;
  const namePrefix = name ? `${name}, ` : '';
  let personalCheer = '';
  if (todaySecs >= DAILY_TIME_GOAL_SECONDS) {
    personalCheer = `Amazing work${name ? `, ${name}` : ''}! You hit your 30-minute goal today — come back tomorrow to keep your flame burning!`;
  } else if (todaySecs > 0 && minsLeftFor30 <= 15) {
    personalCheer = `${namePrefix}just ${minsLeftFor30} more minute${minsLeftFor30 === 1 ? '' : 's'} today to stamp The 30-Minute Club!`;
  } else if (closestNext && closestNext.pct >= 40) {
    personalCheer = `${namePrefix}you're ${Math.round(closestNext.pct)}% of the way to ${closestNext.ach.emoji} ${closestNext.ach.title} (Lv.${closestNext.nextLevel})!`;
  } else if (currentStreak >= 2) {
    personalCheer = `${namePrefix}your ${currentStreak}-day flame is glowing strong! Even 5 minutes tomorrow keeps it alive.`;
  } else {
    personalCheer = `Welcome${name ? ` back, ${name}` : ''}! Speak a few phrases today and watch your weekly flame strip light up.`;
  }

  return {
    learnerName: name,
    equippedTitle: getEquippedTitle(),
    unlockedTitles: getUnlockedTitles(),
    currentStreak,
    bestStreak,
    totalDays,
    thirtyMinDays,
    unlockedStamps,
    totalStamps: ACHIEVEMENTS.length * 5,
    maxedBadges,
    totalBadges: ACHIEVEMENTS.length,
    weekStrip: getCurrentWeekFlameStrip(),
    personalCheer
  };
}

const achievementQueue = [];
let achievementToastTimer = null;

export function showNextAchievementToast() {
  if (!achievementToastEl || achievementToastTimer !== null) return;
  const nextAch = achievementQueue.shift();
  if (!nextAch) return;

  if (achievementToastIconEl) {
    achievementToastIconEl.textContent = nextAch.badge || 'Lv';
  }
  if (achievementToastTitleEl) achievementToastTitleEl.textContent = nextAch.title;
  if (achievementToastDescEl) achievementToastDescEl.textContent = nextAch.desc;
  achievementToastEl.classList.remove('hidden', 'is-pop');
  void achievementToastEl.offsetWidth;
  achievementToastEl.classList.add('is-pop');
  playAchievementFanfare();

  achievementToastTimer = setTimeout(() => {
    achievementToastEl.classList.add('hidden');
    achievementToastEl.classList.remove('is-pop');
    achievementToastTimer = null;
    if (achievementQueue.length > 0) {
      setTimeout(showNextAchievementToast, 240);
    }
  }, 4600);
}

export function dismissAchievementToast() {
  if (achievementToastTimer !== null) {
    clearTimeout(achievementToastTimer);
    achievementToastTimer = null;
  }
  if (achievementToastEl) {
    achievementToastEl.classList.add('hidden');
    achievementToastEl.classList.remove('is-pop');
  }
  if (achievementQueue.length > 0) {
    setTimeout(showNextAchievementToast, 180);
  }
}

export function clearAchievementQueue() {
  achievementQueue.length = 0;
  dismissAchievementToast();
}

export function evaluateAllAchievements({ silent = false, outcome = null, recordActivity = false } = {}) {
  if (isTrackingDisabled()) return;
  const jr = ensureJourneyRewards();
  const now = new Date();
  const todayKey = getLocalDateKey(now);
  let statsChanged = false;

  const pushUniqueDate = (arrName, dateStr) => {
    if (!Array.isArray(jr[arrName])) jr[arrName] = [];
    if (!jr[arrName].includes(dateStr)) {
      jr[arrName].push(dateStr);
      jr[arrName].sort();
      statsChanged = true;
    }
  };

  // Record today's live activity for multi-day & personal ritual badges
  const hasActivityToday =
    recordActivity ||
    Boolean(outcome) ||
    getTodayActiveSeconds() > 0 ||
    (Number(state.dailyCounts?.[todayKey]) || 0) > 0;

  if (hasActivityToday) {
    // Check Welcome Back comeback if last active date was 2+ days ago
    if (jr.lastActiveDateKey && jr.lastActiveDateKey < todayKey) {
      const prevMs = parseLocalDateKeyMs(jr.lastActiveDateKey);
      const todayMs = parseLocalDateKeyMs(todayKey);
      if (Number.isFinite(prevMs) && Number.isFinite(todayMs)) {
        const gapDays = Math.round((todayMs - prevMs) / 86400000);
        if (gapDays >= 2) {
          jr.comebackCount = (Number(jr.comebackCount) || 0) + 1;
          statsChanged = true;
        }
      }
    }
    if (jr.lastActiveDateKey !== todayKey) {
      jr.lastActiveDateKey = todayKey;
      statsChanged = true;
    }
    pushUniqueDate('activeDaysHistory', todayKey);

    const dow = now.getDay();
    if (dow === 0 || dow === 6) {
      pushUniqueDate('weekendDaysPlayed', todayKey);
    }
    const hour = now.getHours();
    if (hour < 11) {
      pushUniqueDate('morningDaysPlayed', todayKey);
    } else if (hour >= 18) {
      pushUniqueDate('eveningDaysPlayed', todayKey);
    }
  }

  // Sync any historical 30-min daily study days + today's 30-min goal
  Object.entries(state.dailyActiveSeconds || {}).forEach(([dk, secs]) => {
    if ((Number(secs) || 0) >= DAILY_TIME_GOAL_SECONDS && /^\d{4}-\d{2}-\d{2}$/.test(dk)) {
      pushUniqueDate('thirtyMinGoalDates', dk);
    }
  });

  // Record joyful speaking moments from graded outcomes
  if (outcome && typeof outcome === 'object' && outcome.isCorrect) {
    const combo = Math.max(Number(outcome.currentStreak) || 0, Number(state.streak) || 0);
    if (combo > (Number(jr.bestCombo) || 0)) {
      jr.bestCombo = combo;
      statsChanged = true;
    }
    if (typeof outcome.pronunciationScore === 'number' && outcome.pronunciationScore >= 90) {
      jr.crispSpeechCount = (Number(jr.crispSpeechCount) || 0) + 1;
      statsChanged = true;
    }
    if (outcome.hadThreePlusMisses) {
      jr.comebackWordsCleared = (Number(jr.comebackWordsCleared) || 0) + 1;
      statsChanged = true;
    }
  }

  const nowIso = now.toISOString();
  let unlockedChanged = false;
  const learnerName = jr.learnerName;

  ACHIEVEMENTS.forEach((ach) => {
    const val = Math.max(0, Number(ach.getValue()) || 0);
    let reachedLevel = 0;
    for (let i = 0; i < ach.tiers.length; i += 1) {
      if (val >= ach.tiers[i]) reachedLevel = i + 1;
    }
    const prev = jr.unlocked[ach.id];
    const prevLevel = prev ? Math.min(5, Math.max(0, Number(prev.level) || 0)) : 0;
    const nextLevel = Math.max(prevLevel, reachedLevel);

    if (nextLevel > prevLevel) {
      const levelDates = { ...(prev?.levelDates || {}) };
      for (let lv = prevLevel + 1; lv <= nextLevel; lv += 1) {
        levelDates[lv] = todayKey;
      }
      jr.unlocked[ach.id] = {
        level: nextLevel,
        unlockedAt: nowIso,
        dateKey: todayKey,
        levelDates
      };
      unlockedChanged = true;
      if (!silent) {
        const titleReward = prevLevel === 0 ? ` · Title unlocked: ${ach.rewardTitle}` : '';
        achievementQueue.push({
          badge: `${nextLevel}/5`,
          title: `${ach.title} · Level ${nextLevel}/5`,
          desc: `Reached ${ach.formatTarget(ach.tiers[nextLevel - 1])}${titleReward}`
        });
      }
    }
  });

  if (unlockedChanged || statsChanged) {
    savePersistedData();
  }
  if (unlockedChanged && !silent) {
    showNextAchievementToast();
    if (state.activeView === 'path') {
      achievementHooks.onRenderPathView();
    }
  }
}

export function initAchievements(hooks = {}) {
  achievementHooks = { ...achievementHooks, ...hooks };
  if (achievementToastEl) {
    achievementToastEl.addEventListener('click', dismissAchievementToast);
  }
}
