import {
  CATEGORIES,
  CATEGORY_ORDER,
  NUMBER_MAX,
  NUMBER_MIN,
  SPANISH_NUMBERS,
  getItemsForCategory,
  getSpeakableSpanishForItem
} from '../curriculum/index.js';
import { speakSpanish } from './audio.js';
import { pathBodyEl } from './dom.js';
import {
  buildStageVocabTableHTML,
  buildUnitTopicRulesHTML,
  openSkipStageModal,
  openTopicEducateModal,
  toggleVocabFillDrawer
} from './guidebook.js';
import {
  getA1OverallProgress,
  getProgressionSnapshot,
  getStageMasteryStatus,
  selectStageInProgression,
  undoSkipStageInProgression
} from './progression.js';
import {
  isCategoryCompleted,
  isCategoryUnlocked,
  isTrackingDisabled,
  savePersistedData,
  state
} from './state.js';
import { escapeHtmlText } from './utils.js';

let pathSelectedUnitId = null;
let openUnitCogId = null;
let pathUnitFadeTimer = null;
const openTimelineStageKeys = new Set();
let pathViewHooks = {
  onPracticeUnit: () => { },
  onStartRevisionDrill: () => { }
};

export function registerPathViewHooks(hooks = {}) {
  pathViewHooks = { ...pathViewHooks, ...hooks };
}

export function setPathExpandedUnitId(unitId) {
  pathSelectedUnitId = unitId;
}

export function closeUnitCogMenu() {
  if (!openUnitCogId) return false;
  openUnitCogId = null;
  renderPathView();
  return true;
}

export function focusUnitAndStageInPathView(catId, stageIdx = 0) {
  if (!catId || !CATEGORIES[catId]) return;
  pathSelectedUnitId = catId;
  openUnitCogId = null;
  openTimelineStageKeys.add(`${catId}:${stageIdx}`);
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
  const skippedSet = new Set(Array.isArray(prog.skippedStages) ? prog.skippedStages : []);

  return { unitMeta, unitSnap, unitUnlocked, unitDone, completedSet, skippedSet };
}

function getUnitShortName(label) {
  return String(label || '').replace(/^A1\.\d+\s+/, '').trim() || String(label || '');
}

const REVISION_UNIT_ID = '__revision__';

function getLowCompletionRevisionItems() {
  const rows = [];
  CATEGORY_ORDER.forEach((catId) => {
    const cat = CATEGORIES[catId];
    if (!cat) return;
    const unitCode = cat.a1Code || cat.label;
    if (catId === 'numbers') {
      for (let n = NUMBER_MIN; n <= NUMBER_MAX; n += 1) {
        const entry = state.counts?.[n];
        const c = Math.max(0, Number(entry?.correct) || 0);
        const inc = Math.max(0, Number(entry?.incorrect) || 0);
        const total = c + inc;
        if (total === 0) continue;
        const pct = Math.round((c / total) * 100);
        if (pct < 75) {
          rows.push({
            unitCode,
            es: SPANISH_NUMBERS[n] || String(n),
            en: String(n),
            correct: c,
            incorrect: inc,
            total,
            pct
          });
        }
      }
    } else {
      const items = getItemsForCategory(catId);
      items.forEach((item) => {
        const entry = state.phraseCounts?.[item.id];
        const c = Math.max(0, Number(entry?.correct) || 0);
        const inc = Math.max(0, Number(entry?.incorrect) || 0);
        const total = c + inc;
        if (total === 0) return;
        const pct = Math.round((c / total) * 100);
        if (pct < 75) {
          rows.push({
            unitCode,
            es: item.es,
            spokenEs: getSpeakableSpanishForItem(item) || item.es,
            en: item.en,
            correct: c,
            incorrect: inc,
            total,
            pct
          });
        }
      });
    }
  });
  rows.sort((a, b) => a.pct - b.pct || b.incorrect - a.incorrect || a.es.localeCompare(b.es));
  return rows;
}

export function renderPathView() {
  if (!pathBodyEl) return;
  const a1Overall = getA1OverallProgress();
  const isRevisionSelected = pathSelectedUnitId === REVISION_UNIT_ID;
  const selectedUnitId = isRevisionSelected
    ? REVISION_UNIT_ID
    : pathSelectedUnitId && CATEGORIES[pathSelectedUnitId]
      ? pathSelectedUnitId
      : (CATEGORIES[state.activeCategory] ? state.activeCategory : CATEGORY_ORDER[0]);
  const revisionItems = getLowCompletionRevisionItems();

  // 1. Left Visual Progression Rail (A1.1 -> A1.8 -> A1)
  const railNodesHTML = CATEGORY_ORDER.map((unitId, unitIdx) => {
    const { unitMeta, unitSnap, unitUnlocked, unitDone, completedSet, skippedSet } =
      getUnitTimelineSkills(unitId);
    const isSelected = unitId === selectedUnitId;
    const isActiveUnit = unitId === state.activeCategory;
    const code = unitMeta.a1Code || `A1.${unitIdx + 1}`;
    const shortName = getUnitShortName(unitMeta.label);
    const totalStages = unitMeta.stages.length;
    const doneStages = unitDone ? totalStages : completedSet.size;

    const segmentsHTML = unitMeta.stages
      .map((_, sIdx) => {
        const isSkipped = skippedSet.has(sIdx);
        const isDone = unitDone || completedSet.has(sIdx);
        const isCur = isActiveUnit && sIdx === unitSnap.stageIndex;
        const segCls = isSkipped
          ? 'is-skipped'
          : isDone
            ? 'is-done'
            : isCur
              ? 'is-current'
              : '';
        return `<span class="learn-rail-seg ${segCls}"></span>`;
      })
      .join('');

    const itemCls = [
      'learn-rail-item',
      unitDone ? 'is-done' : '',
      isActiveUnit ? 'is-active-unit' : '',
      isSelected ? 'is-selected' : ''
    ]
      .filter(Boolean)
      .join(' ');

    return `
      <button type="button" class="${itemCls}" data-select-unit="${unitId}" aria-current="${isSelected ? 'true' : 'false'}">
        <span class="learn-rail-dot" aria-hidden="true">${unitIdx + 1}</span>
        <span class="learn-rail-meta">
          <span class="learn-rail-top">
            <span class="learn-rail-code">${escapeHtmlText(code)}</span>
            <span class="learn-rail-count">${doneStages}/${totalStages}</span>
          </span>
          <span class="learn-rail-name">${escapeHtmlText(shortName)}</span>
          <span class="learn-rail-segs" aria-hidden="true">${segmentsHTML}</span>
        </span>
      </button>
    `;
  }).join('');

  const allA1Done = a1Overall.completedUnits === a1Overall.totalUnits;
  const railCapstoneHTML = `
    <div class="learn-rail-capstone${allA1Done ? ' is-done' : ''}">
      <span class="learn-rail-dot" aria-hidden="true">A1</span>
      <span class="learn-rail-capstone-text">A1 · ${a1Overall.completedUnits}/${a1Overall.totalUnits}</span>
    </div>
  `;

  const revisionBtnHTML = `
    <div class="learn-rail-gap" aria-hidden="true"></div>
    <div class="learn-rail-revision-wrap">
      <button type="button" class="learn-rail-revision-btn${isRevisionSelected ? ' is-selected' : ''}" data-select-unit="${REVISION_UNIT_ID}" aria-current="${isRevisionSelected ? 'true' : 'false'}">
        <span class="learn-rail-revision-label">Revision</span>
        <span class="learn-rail-revision-count">${revisionItems.length}</span>
      </button>
    </div>
  `;

  // 2. Right Workspace: either Revision (<75%) or Selected Unit
  let workspaceInnerHTML = '';

  if (isRevisionSelected) {
    const revRowsHTML = revisionItems.length === 0
      ? '<div class="learn-revision-empty">No words below 75% accuracy.</div>'
      : `
        <div class="stage-vocab-table-wrap learn-revision-table-wrap">
          <table class="stage-vocab-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Spanish</th>
                <th>English</th>
                <th class="num-col">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              ${revisionItems
                .map(
                  (r) => `
                <tr>
                  <td><span class="learn-revision-unit-tag">${escapeHtmlText(r.unitCode)}</span></td>
                  <td class="stage-vocab-es"><div class="stage-vocab-es-inner"><button type="button" class="learn-audio-play-btn" data-speak-es="${escapeHtmlText(r.spokenEs || r.es)}" aria-label="Listen to ${escapeHtmlText(r.spokenEs || r.es)}" title="Hear pronunciation"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg></button><span>${escapeHtmlText(r.es)}</span></div></td>
                  <td class="stage-vocab-en">${escapeHtmlText(r.en)}</td>
                  <td class="num-col learn-revision-pct-cell" title="${r.correct}/${r.total} correct (${r.incorrect} missed)">${r.pct}% <span class="learn-revision-frac">(${r.correct}/${r.total})</span></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;

    workspaceInnerHTML = `
      <div class="learn-unit-bar">
        <div class="learn-unit-bar-left">
          <span class="learn-unit-code learn-unit-code--rev">REV</span>
          <div class="learn-unit-heading">
            <span class="learn-unit-title">Revision</span>
            <span class="learn-unit-sub">Words below 75% completion rate (${revisionItems.length})</span>
          </div>
        </div>
        ${revisionItems.length > 0 ? '<div class="learn-unit-bar-actions"><button type="button" class="unit-practice-btn learn-revision-play-btn" data-start-revision-drill title="Practice all words below 75% accuracy in Play mode">Play Revision</button></div>' : ''}
      </div>
      ${revRowsHTML}
    `;
  } else {
  const { unitMeta, unitSnap, unitUnlocked, unitDone, completedSet, skippedSet } =
    getUnitTimelineSkills(selectedUnitId);
  const selectedIdx = CATEGORY_ORDER.indexOf(selectedUnitId);
  const unitCode = unitMeta.a1Code || `A1.${selectedIdx + 1}`;
  const isCurrentUnit = unitUnlocked && selectedUnitId === state.activeCategory;
  const isCogOpen = openUnitCogId === selectedUnitId;

  const cogMenuHTML = isCogOpen
    ? `
      <div class="unit-cog-menu learn-cog-menu" data-unit-cog-menu="${selectedUnitId}" role="dialog" aria-label="Stage options for ${escapeHtmlText(unitMeta.label)}">
        <div class="unit-cog-menu-header">
          <span class="unit-cog-menu-title">${escapeHtmlText(unitMeta.label)}</span>
          <button type="button" class="unit-cog-close-btn" data-cog-close aria-label="Close stage options">✕</button>
        </div>
        <div class="unit-cog-stage-list">
          ${unitMeta.stages
            .map((stage, stageIdx) => {
              const sKey = `${selectedUnitId}:${stageIdx}`;
              const isActiveStage = selectedUnitId === state.activeCategory && stageIdx === unitSnap.stageIndex;
              const isDoneStage = unitDone || completedSet.has(stageIdx);
              const isSkippedStage = skippedSet.has(stageIdx);
              const isIntroOff = Boolean(state.skippedIntroStages?.has(sKey));
              const examBadge = stage.isExam ? ' <span class="exam-stage-badge">EXAM</span>' : '';
              const goControl = isActiveStage
                ? '<span class="stage-current-badge" title="Currently active stage">Current</span>'
                : `<button type="button" class="stage-go-btn" data-cog-go-stage="${sKey}" title="Play ${escapeHtmlText(stage.label)}">${stage.isExam ? 'Take Exam' : 'Play'}</button>`;
              const introControl = `<button type="button" class="stage-intro-toggle-btn${isIntroOff ? ' is-off' : ''}" data-cog-toggle-intro="${sKey}" title="Toggle new-word introduction popups for this stage">${isIntroOff ? 'Intros: Off' : 'Intros: On'}</button>`;
              const skipControl = isSkippedStage
                ? `<button type="button" class="unit-cog-undo-skip-btn" data-cog-undo-skip-stage="${sKey}" title="Undo skip for ${escapeHtmlText(stage.label)}">Undo Skip</button>`
                : isDoneStage
                  ? '<span class="unit-cog-status-tag is-done">Done</span>'
                  : `<button type="button" class="unit-cog-skip-btn" data-cog-skip-stage="${sKey}" title="Skip ${escapeHtmlText(stage.label)}">Skip</button>`;
              return `
                <div class="unit-cog-stage-row">
                  <span class="unit-cog-stage-name">${escapeHtmlText(stage.label)}${examBadge}</span>
                  <div class="unit-cog-stage-actions">
                    ${goControl}
                    ${introControl}
                    ${skipControl}
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `
    : '';

  // Horizontal Stage Progression Stepper
  const stepperHTML = unitMeta.stages
    .map((stage, stageIdx) => {
      const isDone = unitDone || completedSet.has(stageIdx);
      const isSkipped = skippedSet.has(stageIdx);
      const isActiveInApp = selectedUnitId === state.activeCategory && stageIdx === unitSnap.stageIndex;
      const isStageCurrent = unitUnlocked && !unitDone && stageIdx === unitSnap.stageIndex;
      const sKey = `${selectedUnitId}:${stageIdx}`;
      const isExpanded = openTimelineStageKeys.has(sKey);
      const stepCls = [
        'learn-step-node',
        isSkipped ? 'is-skipped' : isDone ? 'is-done' : isActiveInApp ? 'is-current' : isStageCurrent ? 'is-progress' : '',
        stage.isExam ? 'is-exam' : '',
        isExpanded ? 'is-open' : ''
      ]
        .filter(Boolean)
        .join(' ');
      const circleContent = stage.isExam ? 'E' : String(stageIdx + 1);
      const shortTitle = stage.shortTitle || `Stage ${stageIdx + 1}`;
      const connectorHTML =
        stageIdx < unitMeta.stages.length - 1
          ? `<span class="learn-step-connector${isDone ? ' is-done' : ''}" aria-hidden="true"></span>`
          : '';
      return `
        <button type="button" class="${stepCls}" data-jump-stage="${sKey}" title="${escapeHtmlText(stage.label)}">
          <span class="learn-step-circle" aria-hidden="true">${circleContent}</span>
          <span class="learn-step-label">${escapeHtmlText(shortTitle)}</span>
        </button>
        ${connectorHTML}
      `;
    })
    .join('');

  // Stage Cards (clean, connected vertical track; no Go/Intro/Skip buttons on stage pills)
  const stagesHTML = unitMeta.stages
    .map((stage, stageIdx) => {
      const isStageDone = unitDone || (unitUnlocked && completedSet.has(stageIdx));
      const isStageSkipped = unitUnlocked && skippedSet.has(stageIdx);
      const isActiveInApp = selectedUnitId === state.activeCategory && stageIdx === unitSnap.stageIndex;
      const isStageCurrent = unitUnlocked && !unitDone && stageIdx === unitSnap.stageIndex;
      const stageSeen = isStageDone && !isStageSkipped ? getStageMasteryStatus(selectedUnitId, stageIdx) : null;
      const isStageMastered = Boolean(isStageDone && !isStageSkipped && stageSeen?.seenComplete);
      const stageCompoundKey = `${selectedUnitId}:${stageIdx}`;
      const isStageVocabOpen = openTimelineStageKeys.has(stageCompoundKey);
      const stageCls = [
        'learn-stage-card',
        isActiveInApp ? 'is-active' : isStageSkipped ? 'is-skipped' : isStageMastered ? 'is-completed' : isStageDone || isStageCurrent ? 'is-done' : '',
        isStageVocabOpen ? 'is-vocab-open' : ''
      ]
        .filter(Boolean)
        .join(' ');

      const stageStatus = isStageSkipped
        ? 'Skipped'
        : isStageMastered
          ? 'Mastered'
          : isStageDone
            ? `${stageSeen.seenCount}/${stageSeen.totalCount} seen`
            : isActiveInApp
              ? `Active · ${unitSnap.phaseShort}`
              : isStageCurrent
                ? `In Progress · ${unitSnap.phaseShort}`
                : 'Open';

      const nodeBadge = stage.isExam ? 'E' : String(stageIdx + 1);
      const examBadgeHTML = stage.isExam ? '<span class="exam-stage-badge">EXAM · 90%</span>' : '';

      return `
        <div class="${stageCls}" data-toggle-stage="${stageCompoundKey}" data-stage-card="${stageCompoundKey}" role="button" tabindex="0" aria-expanded="${isStageVocabOpen}">
          <div class="learn-stage-spine" aria-hidden="true">
            <span class="learn-stage-node">${nodeBadge}</span>
          </div>
          <div class="learn-stage-content">
            <div class="learn-stage-top">
              <span class="learn-stage-title">${escapeHtmlText(stage.label)}${examBadgeHTML}</span>
              <span class="learn-stage-right">
                <span class="path-stage-badge">${escapeHtmlText(stageStatus)}</span>
                <span class="stage-expand-chevron">${isStageVocabOpen ? '▴' : '▾'}</span>
              </span>
            </div>
            <div class="learn-stage-desc">${escapeHtmlText(stage.desc)}</div>
            <div class="timeline-stage-collapse${isStageVocabOpen ? ' is-open' : ''}" aria-hidden="${!isStageVocabOpen}">
              <div class="timeline-stage-collapse-inner">
                ${buildStageVocabTableHTML(selectedUnitId, stageIdx)}
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  const topicRulesHTML = buildUnitTopicRulesHTML(selectedUnitId);

  workspaceInnerHTML = `
    <div class="learn-unit-bar">
      <div class="learn-unit-bar-left">
        <span class="learn-unit-code">${escapeHtmlText(unitCode)}</span>
        <div class="learn-unit-heading">
          <span class="learn-unit-title">${escapeHtmlText(getUnitShortName(unitMeta.label))}</span>
          <span class="learn-unit-sub">${escapeHtmlText(unitMeta.subtitle)}</span>
        </div>
      </div>
      <div class="learn-unit-bar-actions">
        ${unitUnlocked && !isCurrentUnit ? `<button type="button" class="unit-practice-btn" data-practice-unit="${selectedUnitId}" title="Play ${escapeHtmlText(unitMeta.label)}">Play</button>` : ''}
        <button type="button" class="unit-cog-btn${isCogOpen ? ' is-open' : ''}" data-unit-cog="${selectedUnitId}" aria-expanded="${isCogOpen}" aria-label="Stage options for ${escapeHtmlText(unitMeta.label)}" title="Stage options (Play, Intros, Skip)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
    ${cogMenuHTML}
    <div class="learn-stage-stepper" role="navigation" aria-label="Stages in ${escapeHtmlText(unitMeta.label)}">
      ${stepperHTML}
    </div>
    ${topicRulesHTML}
    <div class="learn-stages-list">
      ${stagesHTML}
    </div>
  `;
  }

  pathBodyEl.innerHTML = `
    <div class="learn-roadmap">
      <aside class="learn-rail" aria-label="A1 Units">
        <div class="learn-rail-list">
          ${railNodesHTML}
          ${railCapstoneHTML}
        </div>
        ${revisionBtnHTML}
      </aside>
      <div class="learn-workspace-pane">
        ${workspaceInnerHTML}
      </div>
    </div>
  `;

  // Wire left rail unit & revision selection with smooth fade-out -> fade-in
  pathBodyEl.querySelectorAll('[data-select-unit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetUnit = btn.dataset.selectUnit;
      if (!targetUnit) return;
      if (targetUnit !== REVISION_UNIT_ID && !CATEGORIES[targetUnit]) return;
      if (targetUnit === selectedUnitId) return;
      if (pathUnitFadeTimer !== null) {
        clearTimeout(pathUnitFadeTimer);
        pathUnitFadeTimer = null;
      }
      const paneEl = pathBodyEl.querySelector('.learn-workspace-pane');
      if (paneEl) {
        paneEl.classList.add('is-fading-out');
        pathUnitFadeTimer = setTimeout(() => {
          pathUnitFadeTimer = null;
          pathSelectedUnitId = targetUnit;
          openUnitCogId = null;
          renderPathView();
          const newPaneEl = pathBodyEl.querySelector('.learn-workspace-pane');
          if (newPaneEl) {
            newPaneEl.classList.add('is-fading-out');
            void newPaneEl.offsetWidth;
            newPaneEl.classList.remove('is-fading-out');
          }
        }, 160);
      } else {
        pathSelectedUnitId = targetUnit;
        openUnitCogId = null;
        renderPathView();
      }
    });
  });

  // Wire horizontal stepper jump-to-stage
  pathBodyEl.querySelectorAll('[data-jump-stage]').forEach((stepBtn) => {
    stepBtn.addEventListener('click', () => {
      const sKey = stepBtn.dataset.jumpStage;
      if (!sKey) return;
      openTimelineStageKeys.add(sKey);
      renderPathView();
      const cardEl = pathBodyEl.querySelector(`[data-stage-card="${sKey}"]`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });

  // Wire Topic Rules modal button
  pathBodyEl.querySelectorAll('[data-open-topic-rules]').forEach((rulesBtn) => {
    rulesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const unitId = rulesBtn.dataset.openTopicRules;
      if (!unitId || !CATEGORIES[unitId]) return;
      openTopicEducateModal(unitId);
    });
  });

  // Wire per-unit Cog menu
  pathBodyEl.querySelectorAll('[data-unit-cog]').forEach((cogBtn) => {
    cogBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const unitId = cogBtn.dataset.unitCog;
      if (!unitId) return;
      openUnitCogId = openUnitCogId === unitId ? null : unitId;
      renderPathView();
    });
  });

  pathBodyEl.querySelectorAll('[data-unit-cog-menu]').forEach((menuEl) => {
    menuEl.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  });

  pathBodyEl.querySelectorAll('[data-cog-close]').forEach((closeBtn) => {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeUnitCogMenu();
    });
  });

  pathBodyEl.querySelectorAll('[data-cog-go-stage]').forEach((goBtn) => {
    goBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sKey = goBtn.dataset.cogGoStage;
      if (!sKey || !sKey.includes(':')) return;
      const [unitId, idxStr] = sKey.split(':');
      const stageIndex = Number(idxStr);
      if (!unitId || !Number.isInteger(stageIndex)) return;
      openUnitCogId = null;
      selectStageInProgression(unitId, stageIndex);
    });
  });

  pathBodyEl.querySelectorAll('[data-cog-toggle-intro]').forEach((toggleBtn) => {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isTrackingDisabled()) return;
      const sKey = toggleBtn.dataset.cogToggleIntro;
      if (!sKey) return;
      if (!(state.skippedIntroStages instanceof Set)) state.skippedIntroStages = new Set();
      if (state.skippedIntroStages.has(sKey)) {
        state.skippedIntroStages.delete(sKey);
      } else {
        state.skippedIntroStages.add(sKey);
      }
      savePersistedData();
      renderPathView();
    });
  });

  pathBodyEl.querySelectorAll('[data-cog-skip-stage]').forEach((skipBtn) => {
    skipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sKey = skipBtn.dataset.cogSkipStage;
      if (!sKey || !sKey.includes(':')) return;
      const [unitId, idxStr] = sKey.split(':');
      const stageIndex = Number(idxStr);
      if (!unitId || !Number.isInteger(stageIndex)) return;
      openUnitCogId = null;
      openSkipStageModal(unitId, stageIndex);
    });
  });

  pathBodyEl.querySelectorAll('[data-cog-undo-skip-stage]').forEach((undoBtn) => {
    undoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sKey = undoBtn.dataset.cogUndoSkipStage;
      if (!sKey || !sKey.includes(':')) return;
      const [unitId, idxStr] = sKey.split(':');
      const stageIndex = Number(idxStr);
      if (!unitId || !Number.isInteger(stageIndex)) return;
      undoSkipStageInProgression(unitId, stageIndex);
      renderPathView();
    });
  });

  // Wire vocab variation drawers
  pathBodyEl.querySelectorAll('[data-toggle-vocab-fills]').forEach((varBtn) => {
    varBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const itemId = varBtn.dataset.toggleVocabFills;
      if (!itemId) return;
      toggleVocabFillDrawer(itemId);
      renderPathView();
    });
  });

  // Wire stage card expand/collapse
  pathBodyEl.querySelectorAll('[data-toggle-stage]').forEach((stageEl) => {
    const toggleStageCard = (e) => {
      e.stopPropagation();
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

  // Wire audio replay buttons on Learn vocab & Revision rows
  pathBodyEl.querySelectorAll('[data-speak-es]').forEach((audioBtn) => {
    audioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const text = audioBtn.dataset.speakEs;
      if (!text) return;
      audioBtn.classList.add('is-playing');
      speakSpanish(text);
      setTimeout(() => audioBtn.classList.remove('is-playing'), 900);
    });
  });

  // Wire Play Revision drill button
  pathBodyEl.querySelectorAll('[data-start-revision-drill]').forEach((revBtn) => {
    revBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      pathViewHooks.onStartRevisionDrill();
    });
  });

  // Wire Play unit button
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
