import { CATEGORIES, CATEGORY_ORDER } from '../curriculum/index.js';
import {
  JOURNEY_CATEGORIES,
  ensureJourneyRewards,
  formatAchievementTarget,
  getAchievementDisplay,
  getAchievementLevel,
  getActiveAchievements,
  getJourneyPassportSummary,
  setEquippedTitle,
  setLearnerName
} from './achievements.js';
import {
  pathBodyEl,
  pathCategorySubtitleEl,
  pathCategoryTitleEl
} from './dom.js';
import { buildStageVocabTableHTML, buildUnitGrammarCardHTML, toggleVocabFillDrawer } from './guidebook.js';
import {
  getA1OverallProgress,
  getProgressionSnapshot,
  getStageMasteryStatus
} from './progression.js';
import {
  getHighestUnlockedCategoryId,
  isCategoryCompleted,
  isCategoryUnlocked,
  state
} from './state.js';
import { escapeHtmlText, formatDateKeyLabel } from './utils.js';

let pathExpandedUnitId = null;
const openTimelineStageKeys = new Set();
let activeAchievementScope = 'all';
let pathViewHooks = {
  onPracticeUnit: () => { }
};

export function registerPathViewHooks(hooks = {}) {
  pathViewHooks = { ...pathViewHooks, ...hooks };
}

export function setPathExpandedUnitId(unitId) {
  pathExpandedUnitId = unitId;
}

export function clearOpenTimelineStageKeys() {
  openTimelineStageKeys.clear();
}

export function deleteTimelineStagesForCategory(catId) {
  Array.from(openTimelineStageKeys).forEach((sKey) => {
    if (sKey.startsWith(`${catId}:`)) {
      openTimelineStageKeys.delete(sKey);
    }
  });
}

export function getUnitTimelineSkills(unitId) {
  const unitMeta = CATEGORIES[unitId];
  const unitSnap = getProgressionSnapshot(unitId);
  const unitUnlocked = unitSnap.isUnlocked;
  const unitDone = unitUnlocked && isCategoryCompleted(unitId);
  const prog = unitSnap.progress;
  const completedSet = new Set(Array.isArray(prog.completedStages) ? prog.completedStages : []);

  return { unitMeta, unitSnap, unitUnlocked, unitDone, completedSet };
}

export function renderPathView() {
  if (!pathBodyEl) return;
  const a1Overall = getA1OverallProgress();

  if (pathCategoryTitleEl) {
    pathCategoryTitleEl.textContent = 'CEFR A1 Certification Timeline';
  }
  if (pathCategorySubtitleEl) {
    pathCategorySubtitleEl.textContent = state.speakOnlyMode
      ? 'Achieve Speaking proficiency across every A1 unit.'
      : 'Achieve proficiency in Reading, Writing, Listening, and Speaking across every A1 unit.';
  }

  const expandedTargetId = pathExpandedUnitId === null ? state.activeCategory : pathExpandedUnitId;

  const timelineUnitsHTML = CATEGORY_ORDER.map((unitId, unitIdx) => {
    const {
      unitMeta,
      unitSnap,
      unitUnlocked,
      unitDone,
      completedSet
    } = getUnitTimelineSkills(unitId);

    const isCurrentUnit = unitUnlocked && !unitDone && unitId === getHighestUnlockedCategoryId();
    const isExpanded = expandedTargetId === unitId;

    const nodeCls = [
      'timeline-node',
      unitDone ? 'is-done' : isCurrentUnit ? 'is-current' : !unitUnlocked ? 'is-locked' : ''
    ]
      .filter(Boolean)
      .join(' ');
    const markerLabel = unitDone ? '✓' : `A1.${unitIdx + 1}`;

    const stagesHTML = unitMeta.stages
      .map((stage, stageIdx) => {
        const isStageDone = unitDone || (unitUnlocked && completedSet.has(stageIdx));
        const isStageSkipped =
          unitUnlocked &&
          Array.isArray(unitSnap.progress?.skippedStages) &&
          unitSnap.progress.skippedStages.includes(stageIdx);
        const isStageCurrent = unitUnlocked && !unitDone && stageIdx === unitSnap.stageIndex;
        const stageSeen = isStageDone && !isStageSkipped ? getStageMasteryStatus(unitId, stageIdx) : null;
        const isStageMastered = Boolean(isStageDone && !isStageSkipped && stageSeen?.seenComplete);
        const stageCompoundKey = `${unitId}:${stageIdx}`;
        const isStageVocabOpen = openTimelineStageKeys.has(stageCompoundKey);
        const stageCls = [
          'timeline-stage-item',
          'is-clickable',
          isStageSkipped ? 'is-skipped' : isStageMastered ? 'is-completed' : isStageDone || isStageCurrent ? 'is-active' : 'is-locked',
          isStageVocabOpen ? 'is-vocab-open' : ''
        ]
          .filter(Boolean)
          .join(' ');

        const stageStatus = !unitUnlocked
          ? 'Locked'
          : isStageSkipped
            ? 'Skipped'
            : isStageMastered
              ? 'Mastered ✓'
              : isStageDone
                ? `Unlocked · ${stageSeen.seenCount}/${stageSeen.totalCount} seen`
                : isStageCurrent
                  ? `Active · ${unitSnap.phaseShort}`
                  : 'Locked';

        const examBadgeHTML = stage.isExam ? '<span class="exam-stage-badge">EXAM · 90%</span>' : '';
        const isStageBlurred = state.blurLockedContent !== false && (!unitUnlocked || (!isStageDone && !isStageCurrent));
        return `
          <div class="${stageCls}" data-toggle-stage="${stageCompoundKey}" role="button" tabindex="${isStageBlurred ? '-1' : '0'}" aria-disabled="${isStageBlurred}" aria-expanded="${isStageVocabOpen}" title="${isStageBlurred ? '' : `Click to view Spanish &amp; English covered in ${escapeHtmlText(stage.label)}`}">
            <div class="timeline-stage-row-top">
              <span class="timeline-stage-title">${escapeHtmlText(stage.label)}${examBadgeHTML} <span class="stage-expand-chevron">${isStageVocabOpen ? '▴' : '▾'}</span></span>
              <span class="path-stage-badge">${escapeHtmlText(stageStatus)}</span>
            </div>
            <div class="timeline-stage-desc">${escapeHtmlText(stage.desc)}</div>
            <div class="timeline-stage-collapse${isStageVocabOpen ? ' is-open' : ''}" aria-hidden="${!isStageVocabOpen}">
              <div class="timeline-stage-collapse-inner">
                ${buildStageVocabTableHTML(unitId, stageIdx)}
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    const grammarHTML = buildUnitGrammarCardHTML(unitMeta);

    const isUnitBlurred = state.blurLockedContent !== false && !unitUnlocked;
    return `
      <div class="${nodeCls}${isExpanded ? ' is-expanded' : ''}" data-unit-node="${unitId}">
        <div class="timeline-marker" aria-hidden="true">${markerLabel}</div>
        <div class="timeline-unit-card">
          <div class="timeline-unit-header" data-toggle-unit="${unitId}" role="button" tabindex="${isUnitBlurred ? '-1' : '0'}" aria-disabled="${isUnitBlurred}" aria-expanded="${isExpanded}">
            <div class="timeline-unit-header-info">
              <div class="timeline-unit-title-row">
                <span class="timeline-unit-title">${escapeHtmlText(unitMeta.label)}</span>
              </div>
              <div class="timeline-unit-goal">${escapeHtmlText(unitMeta.subtitle)}</div>
            </div>
            <div class="timeline-unit-header-right">
              ${unitUnlocked && !isCurrentUnit ? `<button type="button" class="unit-practice-btn" data-practice-unit="${unitId}" title="Switch to practice ${escapeHtmlText(unitMeta.label)}">Practice</button>` : ''}
              <span class="timeline-unit-badge timeline-unit-toggle-arrow${isExpanded ? ' is-open' : ''}" aria-hidden="true">
                <svg class="timeline-arrow-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            </div>
          </div>
          <div class="timeline-unit-collapse${isExpanded ? ' is-open' : ''}" aria-hidden="${!isExpanded}">
            <div class="timeline-unit-collapse-inner">
              <div class="timeline-unit-details">
                ${grammarHTML}
                <div class="timeline-stages">${stagesHTML}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const allA1Done = a1Overall.completedUnits === a1Overall.totalUnits;
  const capstoneGoalText = state.speakOnlyMode
    ? allA1Done
      ? `All ${a1Overall.totalUnits} CEFR A1 units certified in Speaking.`
      : `Demonstrate Speaking proficiency across all ${a1Overall.totalUnits} units.`
    : allA1Done
      ? `All ${a1Overall.totalUnits} CEFR A1 units certified across Reading, Writing, Listening, and Speaking.`
      : `Demonstrate Reading, Writing, Listening, and Speaking proficiency across all ${a1Overall.totalUnits} units.`;
  const capstoneHTML = `
    <div class="timeline-node${allA1Done ? ' is-done' : ''}">
      <div class="timeline-marker" aria-hidden="true">${allA1Done ? '✓' : 'A1'}</div>
      <div class="timeline-capstone-card">
        <div class="timeline-capstone-info">
          <div class="timeline-unit-title">CEFR A1 Spanish (Panama) Certification</div>
          <div class="timeline-unit-goal">${capstoneGoalText}</div>
        </div>
        <span class="timeline-unit-badge">${allA1Done ? 'A1 Certified' : `${a1Overall.completedUnits} / ${a1Overall.totalUnits} Units`}</span>
      </div>
    </div>
  `;

  const visibleAchievements = getActiveAchievements();
  const passport = getJourneyPassportSummary();
  const jr = ensureJourneyRewards();

  const scopeFilterHTML = JOURNEY_CATEGORIES.map((cat) => {
    const count =
      cat.id === 'all'
        ? visibleAchievements.length
        : visibleAchievements.filter((a) => a.category === cat.id).length;
    const isAct = activeAchievementScope === cat.id;
    return `<button type="button" class="ach-scope-tab${isAct ? ' is-active' : ''}" data-ach-scope="${cat.id}" aria-pressed="${isAct}">${cat.emoji} ${escapeHtmlText(cat.label)} (${count})</button>`;
  }).join('');

  const filteredAchievements = visibleAchievements.filter((ach) => {
    if (activeAchievementScope === 'all') return true;
    return ach.category === activeAchievementScope;
  });

  const weekFlameHTML = passport.weekStrip
    .map((day) => {
      const cls = [
        'journey-week-day',
        day.lit ? 'is-lit' : '',
        day.hit30m ? 'is-30m' : '',
        day.isToday ? 'is-today' : '',
        day.isFuture ? 'is-future' : ''
      ]
        .filter(Boolean)
        .join(' ');
      const icon = day.hit30m ? '🌟' : day.lit ? '🔥' : day.isToday ? '○' : '·';
      const tip = day.hit30m
        ? `${day.label}: 30m goal crushed!`
        : day.lit
          ? `${day.label}: Active study logged`
          : day.isToday
            ? `${day.label} (Today): Light up today's flame!`
            : `${day.label}`;
      return `
        <div class="${cls}" title="${escapeHtmlText(tip)}">
          <span class="journey-week-flame" aria-hidden="true">${icon}</span>
          <span class="journey-week-label">${day.label}</span>
        </div>
      `;
    })
    .join('');

  const titleChipsHTML = passport.unlockedTitles
    .map((t) => {
      const equipped = t.id === passport.equippedTitle.id;
      return `<button type="button" class="passport-title-chip${equipped ? ' is-equipped' : ''}" data-equip-title="${escapeHtmlText(t.id)}" aria-pressed="${equipped}" title="Equip title: ${escapeHtmlText(t.label)}">${t.emoji} ${escapeHtmlText(t.label)}</button>`;
    })
    .join('');

  const passportHeading = passport.learnerName
    ? `${passport.learnerName}'s Spanish Passport`
    : 'My Spanish Passport';

  const achievementsHTML = filteredAchievements.map((ach) => {
    const entry = jr.unlocked?.[ach.id];
    const level = getAchievementLevel(ach);
    const rawVal = Math.max(0, Number(ach.getValue()) || 0);
    const isAchUnlocked = level >= 1;
    const isMaxed = level >= 5;
    const nextTarget = isMaxed ? ach.tiers[4] : ach.tiers[level];
    const prevTarget = level > 0 ? ach.tiers[level - 1] : 0;
    const barPct = isMaxed
      ? 100
      : Math.max(
        0,
        Math.min(100, Math.round(((rawVal - prevTarget) / Math.max(1, nextTarget - prevTarget)) * 100))
      );
    const valText = ach.formatValue ? ach.formatValue(rawVal) : formatAchievementTarget(rawVal);
    const targetText = ach.formatTarget(nextTarget);
    const progressText = `${valText} / ${targetText}`;
    const statusLabel = isMaxed
      ? entry?.dateKey
        ? `Stamped Gold · ${formatDateKeyLabel(entry.dateKey)}`
        : 'Stamped Gold ✨'
      : isAchUnlocked
        ? `Stamp ${level}/5 · Next: ${targetText}`
        : `Unlocks title "${ach.rewardTitle}" at ${targetText}`;
    const tierPipsHTML = ach.tiers
      .map((tierTarget, idx) => {
        const tierNum = idx + 1;
        const pipCls =
          tierNum <= level
            ? ' is-done'
            : tierNum === level + 1
              ? ' is-next'
              : '';
        return `<span class="achievement-tier-pip${pipCls}" title="Stamp ${tierNum}: ${escapeHtmlText(ach.formatTarget(tierTarget))}">${escapeHtmlText(ach.formatTarget(tierTarget))}</span>`;
      })
      .join('');

    const disp = getAchievementDisplay(ach);

    return `
      <div class="achievement-card${isAchUnlocked ? ' is-unlocked' : ''}${isMaxed ? ' is-maxed' : ''}">
        <div class="achievement-card-icon achievement-card-emoji" aria-hidden="true">${ach.emoji}</div>
        <div class="achievement-card-body">
          <div class="achievement-card-top">
            <span class="achievement-card-title">${escapeHtmlText(disp.title)}</span>
            <div class="achievement-card-badges">
              <span class="achievement-scope-badge is-global">${escapeHtmlText(ach.categoryLabel)}</span>
              <span class="achievement-level-badge">${level}/5 ★</span>
            </div>
          </div>
          <div class="achievement-card-desc">${escapeHtmlText(disp.desc)}</div>
          <div class="achievement-progress-row">
            <div class="achievement-progress-track" aria-hidden="true">
              <div class="achievement-progress-fill" style="width: ${barPct}%"></div>
            </div>
            <span class="achievement-progress-text">${escapeHtmlText(progressText)}</span>
          </div>
          <div class="achievement-tiers">
            ${tierPipsHTML}
          </div>
          <div class="achievement-card-status">${escapeHtmlText(statusLabel)}</div>
        </div>
      </div>
    `;
  }).join('');

  pathBodyEl.innerHTML = `
    <div class="a1-cert-hero">
      <div class="a1-overview-top">
        <div class="a1-overview-title">CEFR A1 Certification (A0 → A1)</div>
      </div>
    </div>
    <div class="a1-timeline">
      ${timelineUnitsHTML}
      ${capstoneHTML}
    </div>
    <div class="path-achievements-section" id="path-achievements-section">
      <div class="journey-passport-card" id="journey-passport-card">
        <div class="journey-passport-top">
          <div class="journey-passport-identity">
            <span class="journey-passport-emblem" aria-hidden="true">${passport.equippedTitle.emoji}</span>
            <div class="journey-passport-titles">
              <div class="journey-passport-heading">${escapeHtmlText(passportHeading)}</div>
              <div class="journey-passport-rank">${escapeHtmlText(passport.equippedTitle.label)} · ${passport.unlockedStamps} / ${passport.totalStamps} Stamps Earned</div>
            </div>
          </div>
          <form id="passport-name-form" class="passport-name-form">
            <input id="passport-name-input" class="passport-name-input" type="text" maxlength="28" placeholder="Your name..." value="${escapeHtmlText(passport.learnerName)}" aria-label="Personalize your Spanish Passport name" />
            <button type="submit" class="settings-test-btn passport-name-save-btn">Save</button>
          </form>
        </div>

        <div class="journey-passport-stats">
          <div class="journey-stat-pill">
            <span class="journey-stat-num">🔥 ${passport.currentStreak}d</span>
            <span class="journey-stat-lbl">Current Streak</span>
          </div>
          <div class="journey-stat-pill">
            <span class="journey-stat-num">📅 ${passport.totalDays}d</span>
            <span class="journey-stat-lbl">Days Played</span>
          </div>
          <div class="journey-stat-pill">
            <span class="journey-stat-num">⏱️ ${passport.thirtyMinDays}</span>
            <span class="journey-stat-lbl">30m Goals Hit</span>
          </div>
          <div class="journey-stat-pill">
            <span class="journey-stat-num">🏆 ${passport.maxedBadges}/${passport.totalBadges}</span>
            <span class="journey-stat-lbl">Gold Badges</span>
          </div>
        </div>

        <div class="journey-week-strip" aria-label="This week's active study flame strip">
          ${weekFlameHTML}
        </div>

        <div class="journey-cheer-banner" id="journey-cheer-banner">
          <span>✨ ${escapeHtmlText(passport.personalCheer)}</span>
        </div>

        <div class="passport-titles-row">
          <span class="passport-titles-label">Unlocked Titles:</span>
          <div class="passport-titles-list">${titleChipsHTML}</div>
        </div>
      </div>

      <div class="ach-scope-filter" role="group" aria-label="Filter Journey Stamps by Category">
        ${scopeFilterHTML}
      </div>
      <div class="path-achievements-grid">
        ${achievementsHTML}
      </div>
    </div>
  `;

  const nameForm = document.getElementById('passport-name-form');
  if (nameForm) {
    nameForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = document.getElementById('passport-name-input');
      setLearnerName(inp ? inp.value : '');
      renderPathView();
    });
  }

  pathBodyEl.querySelectorAll('[data-equip-title]').forEach((chipBtn) => {
    chipBtn.addEventListener('click', () => {
      const tId = chipBtn.dataset.equipTitle;
      if (!tId) return;
      setEquippedTitle(tId);
      renderPathView();
    });
  });

  pathBodyEl.querySelectorAll('[data-ach-scope]').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      const nextScope = tabBtn.dataset.achScope;
      if (!nextScope || nextScope === activeAchievementScope) return;
      activeAchievementScope = nextScope;
      renderPathView();
    });
  });

  pathBodyEl.querySelectorAll('[data-toggle-vocab-fills]').forEach((varBtn) => {
    varBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const itemId = varBtn.dataset.toggleVocabFills;
      if (!itemId) return;
      toggleVocabFillDrawer(itemId);
      renderPathView();
    });
  });

  pathBodyEl.querySelectorAll('[data-toggle-stage]').forEach((stageEl) => {
    const toggleStageCard = (e) => {
      e.stopPropagation();
      const parentNode = stageEl.closest('.timeline-node');
      if (
        state.blurLockedContent !== false &&
        (stageEl.classList.contains('is-locked') || (parentNode && parentNode.classList.contains('is-locked')))
      ) {
        return;
      }
      const sKey = stageEl.dataset.toggleStage;
      if (!sKey) return;
      const shouldOpen = !openTimelineStageKeys.has(sKey);
      if (shouldOpen) {
        openTimelineStageKeys.add(sKey);
      } else {
        openTimelineStageKeys.delete(sKey);
      }
      stageEl.classList.toggle('is-vocab-open', shouldOpen);
      stageEl.setAttribute('aria-expanded', String(shouldOpen));
      const chevEl = stageEl.querySelector('.stage-expand-chevron');
      if (chevEl) chevEl.textContent = shouldOpen ? '▴' : '▾';
      const collapseEl = stageEl.querySelector('.timeline-stage-collapse');
      if (collapseEl) {
        collapseEl.classList.toggle('is-open', shouldOpen);
        collapseEl.setAttribute('aria-hidden', String(!shouldOpen));
      }
    };
    stageEl.addEventListener('click', toggleStageCard);
    stageEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleStageCard(e);
      }
    });
  });

  pathBodyEl.querySelectorAll('[data-toggle-unit]').forEach((headerEl) => {
    const toggleFn = () => {
      const parentNode = headerEl.closest('.timeline-node');
      if (state.blurLockedContent !== false && parentNode && parentNode.classList.contains('is-locked')) {
        return;
      }
      const unitId = headerEl.dataset.toggleUnit;
      if (!unitId) return;
      const currentExpanded =
        pathExpandedUnitId === null ? state.activeCategory : pathExpandedUnitId;
      const nextExpanded = currentExpanded === unitId ? '__none__' : unitId;
      pathExpandedUnitId = nextExpanded;

      pathBodyEl.querySelectorAll('[data-unit-node]').forEach((nodeEl) => {
        const nodeUnitId = nodeEl.dataset.unitNode;
        const shouldOpen = nodeUnitId === nextExpanded;
        nodeEl.classList.toggle('is-expanded', shouldOpen);
        const hEl = nodeEl.querySelector('[data-toggle-unit]');
        if (hEl) hEl.setAttribute('aria-expanded', String(shouldOpen));
        const arrowEl = nodeEl.querySelector('.timeline-unit-toggle-arrow');
        if (arrowEl) arrowEl.classList.toggle('is-open', shouldOpen);
        const collapseEl = nodeEl.querySelector('.timeline-unit-collapse');
        if (collapseEl) {
          collapseEl.classList.toggle('is-open', shouldOpen);
          collapseEl.setAttribute('aria-hidden', String(!shouldOpen));
        }
      });
    };
    headerEl.addEventListener('click', toggleFn);
    headerEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleFn();
      }
    });
  });

  pathBodyEl.querySelectorAll('[data-practice-unit]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetUnit = btn.dataset.practiceUnit;
      if (targetUnit && CATEGORIES[targetUnit] && isCategoryUnlocked(targetUnit)) {
        pathViewHooks.onPracticeUnit(targetUnit);
      }
    });
  });
}
