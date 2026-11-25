import {
  CATEGORIES,
  CATEGORY_ORDER,
  CATEGORY_REFERENCE_GUIDES,
  getAllVariationsForStructure,
  getDisplaySpanishForItem,
  getNextCategoryInOrder,
  getNumberMemoryTip,
  getNumbersWordIntroDetails,
  getPhraseMemoryTip,
  getSlotConfigForItem,
  getSpeakableSpanishForItem,
  tokenizeDisplaySpanishWithSlots
} from '../curriculum/index.js';
import { checkZeroVolumePrompt, speakSpanish } from './audio.js';
import { getTopicAnswerTotal, recordWordFirstShown } from './data-tracking.js';
import {
  answerInputEl,
  categoryNavEl,
  hudStageTitleEl,
  subjectCompleteModalBackdropEl,
  topicEducateBodyEl,
  topicEducateCloseXBtn,
  topicEducateModalBackdropEl,
  topicEducateSubtitleEl,
  topicEducateTagEl,
  topicEducateTitleEl
} from './dom.js';
import {
  getStageVocabRows,
  skipStageInProgression
} from './progression.js';
import {
  getActiveSkillPillars,
  isCategoryUnlocked,
  isTrackingDisabled,
  savePersistedData,
  state
} from './state.js';
import { normalizeSeenSkills } from './tracking-schema.js';
import { escapeHtmlText } from './utils.js';

let openVocabFillItemIds = new Set();
let guidebookJumpTimers = [];
let activeTopicEducateCatId = null;
let pendingWordIntroData = null;
let pendingSkipStageTarget = null;
const untrackedSeenTopicGuides = new Set();
const untrackedIntroducedItems = new Set();

export function clearUntrackedGuidebookSession() {
  untrackedSeenTopicGuides.clear();
  untrackedIntroducedItems.clear();
}

let guidebookHooks = {
  onCloseSettingsPopover: () => { },
  getSpokenText: () => '',
  onSlotChoiceChanged: () => { },
  isHandsFreeRunning: () => false,
  onOpenGuidebookView: () => { },
  onOpenGuidebookToCurrentStage: () => { },
  onAfterSkipStage: () => { }
};

export function toggleVocabFillDrawer(itemId) {
  if (!itemId) return false;
  if (openVocabFillItemIds.has(itemId)) {
    openVocabFillItemIds.delete(itemId);
    return false;
  }
  openVocabFillItemIds.add(itemId);
  return true;
}

export function clearGuidebookJumpTimers() {
  guidebookJumpTimers.forEach((id) => clearTimeout(id));
  guidebookJumpTimers = [];
}

export function resetGuidebookState() {
  clearGuidebookJumpTimers();
  openVocabFillItemIds.clear();
  activeTopicEducateCatId = null;
  if (topicEducateModalBackdropEl) topicEducateModalBackdropEl.classList.add('hidden');
  pendingWordIntroData = null;
  const wordIntroEl = document.getElementById('word-intro-modal-backdrop');
  if (wordIntroEl) wordIntroEl.classList.add('hidden');
}

export function buildUnitGrammarCardHTML(unitMeta) {
  if (!unitMeta || !Array.isArray(unitMeta.grammarRules) || unitMeta.grammarRules.length === 0) {
    return '';
  }
  return `
    <div class="a1-grammar-card">
      <div class="a1-grammar-title">${escapeHtmlText(unitMeta.grammarTitle || `${unitMeta.label} Notes`)}</div>
      <ul class="a1-grammar-list">
        ${unitMeta.grammarRules.map((rule) => `<li>${escapeHtmlText(rule)}</li>`).join('')}
      </ul>
    </div>
  `;
}

export function buildUnitTopicRulesHTML(unitId) {
  const content = getTopicEducateContent(unitId);
  if (!content.hasRules) {
    return buildUnitGrammarCardHTML(CATEGORIES[unitId]);
  }
  const isNew = isUserNewToTopic(unitId);
  const focusHTML = content.currentStageFocus
    ? `<div class="guidebook-rules-focus"><strong>Current focus:</strong> ${escapeHtmlText(content.currentStageFocus)}</div>`
    : '';
  const rulesListHTML =
    content.rules.length > 0
      ? `<ul class="a1-grammar-list">${content.rules.map((rule) => `<li>${escapeHtmlText(rule)}</li>`).join('')}</ul>`
      : '';
  return `
    <div class="a1-grammar-card guidebook-topic-rules-card">
      <div class="guidebook-topic-rules-header">
        <span class="a1-grammar-title guidebook-topic-rules-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span>Topic Rules</span>
          ${isNew ? '<span class="stage-educate-new-badge">New</span>' : ''}
        </span>
        <button type="button" class="stage-intro-toggle-btn guidebook-topic-rules-btn" data-open-topic-rules="${escapeHtmlText(unitId)}" title="Open full Topic Rules &amp; example patterns for ${escapeHtmlText(CATEGORIES[unitId]?.label || 'this unit')}">Open Rules</button>
      </div>
      ${focusHTML}
      ${rulesListHTML}
    </div>
  `;
}

function buildVocabFillDrawerHTML(item, variationKind) {
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
        <div class="fill-drawer-head">Pattern: <strong>${escapeHtmlText(item.structure.patternEs)}</strong> (${vars.length} scenarios)</div>
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

export function buildStageVocabTableHTML(catId, stageIndex) {
  const rows = getStageVocabRows(catId, stageIndex);
  if (!rows || rows.length === 0) return '';
  const bodyRowsHTML = rows
    .map((r) => {
      const total = Number(r.total) || 0;
      const correct = Number(r.correct) || 0;
      const accPct = total > 0 ? Math.round((correct / total) * 100) : 0;
      const rowCls = r.isProficient ? ' class="stage-vocab-row is-proficient"' : '';
      const rowTitle = total > 0
        ? ` title="${r.isProficient ? 'Proficient · ' : ''}${correct}/${total} correct (${accPct}%)"`
        : '';
      let indicatorHTML = '';
      if (total > 0) {
        const toneCls = r.isProficient
          ? 'is-gold'
          : accPct >= 80
            ? 'is-good'
            : accPct >= 50
              ? 'is-mid'
              : 'is-low';
        indicatorHTML = `<span class="stage-vocab-meter ${toneCls}" aria-hidden="true"><span class="stage-vocab-meter-fill" style="width: ${accPct}%"></span></span>`;
      }
      const hasVariations = Boolean(r.itemId && r.variationCount > 1);
      const isDrawerOpen = hasVariations && openVocabFillItemIds.has(r.itemId);
      const varPillHTML = hasVariations
        ? `<button type="button" class="vocab-var-pill${isDrawerOpen ? ' is-open' : ''}" data-toggle-vocab-fills="${escapeHtmlText(r.itemId)}" aria-expanded="${isDrawerOpen}" title="Click to browse fill words for this structure">${r.practicedVariations}/${r.variationCount} ${r.variationKind === 'options' ? 'options' : 'variations'} ${isDrawerOpen ? '▴' : '▾'}</button>`
        : '';
      const drawerRowHTML = isDrawerOpen
        ? `<tr class="vocab-fills-drawer-row" data-vocab-fills-for="${escapeHtmlText(r.itemId)}"><td colspan="2">${buildVocabFillDrawerHTML(r.item, r.variationKind)}</td></tr>`
        : '';
      const spokenEs = r.item ? getSpeakableSpanishForItem(r.item) : r.es;
      const speakBtnHTML = spokenEs
        ? `<button type="button" class="learn-audio-play-btn" data-speak-es="${escapeHtmlText(spokenEs)}" aria-label="Listen to ${escapeHtmlText(spokenEs)}" title="Hear pronunciation"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg></button>`
        : '';
      return `
      <tr${rowCls}${rowTitle}>
        <td class="stage-vocab-es"><div class="stage-vocab-es-inner">${speakBtnHTML}<span>${escapeHtmlText(r.es)}</span></div></td>
        <td class="stage-vocab-en"><div class="stage-vocab-en-inner"><span>${escapeHtmlText(r.en)}</span><span class="stage-vocab-en-actions">${varPillHTML}${indicatorHTML}</span></div></td>
      </tr>
      ${drawerRowHTML}
    `;
    })
    .join('');

  return `
    <div class="stage-vocab-table-wrap">
      <table class="stage-vocab-table">
        <thead>
          <tr>
            <th>Spanish</th>
            <th>English</th>
          </tr>
        </thead>
        <tbody>
          ${bodyRowsHTML}
        </tbody>
      </table>
    </div>
  `;
}

export function closeCategoryDropdown() {
  clearGuidebookJumpTimers();
}

export function renderCategoryNav() {
  if (!categoryNavEl) return;
  const isLearnView = state.activeView === 'path';
  const cls = [
    'control-pill',
    isLearnView ? 'active' : ''
  ]
    .filter(Boolean)
    .join(' ');
  categoryNavEl.innerHTML = `
    <button
      type="button"
      class="${cls}"
      data-category="${escapeHtmlText(state.activeCategory || CATEGORY_ORDER[0])}"
      aria-pressed="${isLearnView}"
      title="Open Learn — units, Topic Rules, vocabulary, and stage controls"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
      <span>Learn</span>
    </button>
  `;

  const btn = categoryNavEl.querySelector('.control-pill');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      guidebookHooks.onOpenGuidebookView();
    });
  }
}

export function openGuidebookToCurrentStageAnimated() {
  clearGuidebookJumpTimers();
  guidebookHooks.onOpenGuidebookToCurrentStage();
}

// Topic Rules & Education Modal
export function isTopicUntouched(catId) {
  if (!catId || !CATEGORIES[catId]) return false;
  if (getTopicAnswerTotal(catId) > 0) return false;
  const prog = state.categoryProgress && state.categoryProgress[catId];
  if (!prog) return true;
  const completedCount = Array.isArray(prog.completedStages) ? prog.completedStages.length : 0;
  return (prog.stageIndex || 0) === 0 && (prog.stageTotal || 0) === 0 && completedCount === 0;
}

export function isUserNewToTopic(catId) {
  if (!catId || !CATEGORIES[catId]) return false;
  if (isTrackingDisabled() && untrackedSeenTopicGuides.has(catId)) return false;
  const seen = state.seenTopicGuides instanceof Set && state.seenTopicGuides.has(catId);
  return isTopicUntouched(catId) && !seen;
}

export function getTopicEducateContent(catId) {
  const cat = CATEGORIES[catId];
  const guide = CATEGORY_REFERENCE_GUIDES[catId];
  if (!cat) {
    return {
      catId,
      tag: 'Topic Rules',
      title: 'Topic Rules',
      subtitle: '',
      currentStageLabel: '',
      currentStageFocus: '',
      rules: [],
      examples: [],
      hasRules: false
    };
  }

  const prog = state.categoryProgress?.[catId];
  const stageIdx = Math.min(
    Math.max(0, (cat.stages?.length || 1) - 1),
    Math.max(0, Number(prog?.stageIndex) || 0)
  );
  const currentStage = cat.stages?.[stageIdx] || null;

  const tokenizeRule = (str) =>
    new Set(
      String(str || '')
        .toLowerCase()
        .replace(/["'“”‘’¿¡?!.,:;()[\]/→-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3)
    );

  const rules = [];
  const addRuleIfDistinct = (raw) => {
    const text = String(raw || '').trim();
    if (!text) return;
    const tokens = tokenizeRule(text);
    const existingIdx = rules.findIndex((existing) => {
      const exTokens = tokenizeRule(existing);
      const smallerSize = Math.min(tokens.size, exTokens.size);
      if (smallerSize === 0) return existing.toLowerCase() === text.toLowerCase();
      let overlap = 0;
      tokens.forEach((t) => {
        if (exTokens.has(t)) overlap += 1;
      });
      return overlap / smallerSize >= 0.65;
    });

    if (existingIdx !== -1) {
      if (text.length > rules[existingIdx].length) {
        rules[existingIdx] = text;
      }
      return;
    }
    rules.push(text);
  };

  if (Array.isArray(cat.grammarRules)) {
    cat.grammarRules.forEach(addRuleIfDistinct);
  }
  if (guide && Array.isArray(guide.tips)) {
    guide.tips.forEach(addRuleIfDistinct);
  }

  const examples =
    guide && Array.isArray(guide.vocab)
      ? guide.vocab
        .filter((pair) => Array.isArray(pair) && pair.length >= 2)
        .map(([es, en]) => ({ es: String(es), en: String(en) }))
      : [];

  const currentStageFocus = String(currentStage?.focusRule || '').trim();
  const hasRules = rules.length > 0 || Boolean(currentStageFocus);

  return {
    catId,
    tag: cat.a1Code ? `${cat.a1Code} Topic Rules` : 'Topic Rules',
    title: `${cat.label} · Rules & Patterns`,
    subtitle: cat.subtitle || cat.description || '',
    currentStageLabel: currentStage?.label || '',
    currentStageFocus,
    rules,
    examples,
    hasRules
  };
}

export function syncTopicEducateButtonUI() {
  // Topic Rules are now displayed per unit inside the Guidebook screen.
}

export function openTopicEducateModal(catId = state.activeCategory) {
  if (!topicEducateModalBackdropEl || !CATEGORIES[catId]) return;
  const content = getTopicEducateContent(catId);
  if (!content.hasRules) return;

  guidebookHooks.onCloseSettingsPopover();
  closeCategoryDropdown();

  activeTopicEducateCatId = catId;
  if (topicEducateTagEl) {
    topicEducateTagEl.textContent = content.tag;
  }
  if (topicEducateTitleEl) {
    topicEducateTitleEl.textContent = content.title;
  }
  if (topicEducateSubtitleEl) {
    topicEducateSubtitleEl.textContent = content.subtitle;
  }

  if (topicEducateBodyEl) {
    const focusHTML = content.currentStageFocus
      ? `
        <div class="topic-educate-focus-card">
          <div class="topic-educate-focus-kicker">${escapeHtmlText(content.currentStageLabel || 'Current Stage Focus')}</div>
          <div class="topic-educate-focus-text">${escapeHtmlText(content.currentStageFocus)}</div>
        </div>
      `
      : '';

    const rulesHTML =
      content.rules.length > 0
        ? `
          <div class="topic-educate-section">
            <div class="topic-educate-section-title">Key Rules for ${escapeHtmlText(CATEGORIES[catId].label)}</div>
            <ul class="topic-educate-rules-list">
              ${content.rules.map((r) => `<li>${escapeHtmlText(r)}</li>`).join('')}
            </ul>
          </div>
        `
        : '';

    const examplesHTML =
      content.examples.length > 0
        ? `
          <div class="topic-educate-section">
            <div class="topic-educate-section-title">Example Patterns</div>
            <div class="topic-educate-examples-grid">
              ${content.examples
          .map(
            (ex) => `
                  <div class="topic-educate-example-chip">
                    <span class="topic-educate-example-es">${escapeHtmlText(ex.es)}</span>
                    <span class="topic-educate-example-en">${escapeHtmlText(ex.en)}</span>
                  </div>
                `
          )
          .join('')}
            </div>
          </div>
        `
        : '';

    topicEducateBodyEl.innerHTML = focusHTML + rulesHTML + examplesHTML;
    topicEducateBodyEl.scrollTop = 0;
  }

  topicEducateModalBackdropEl.classList.remove('hidden');
}

export function closeTopicEducateModal({ markSeen = true } = {}) {
  const closedCatId = activeTopicEducateCatId || state.activeCategory;
  activeTopicEducateCatId = null;
  if (topicEducateModalBackdropEl) {
    topicEducateModalBackdropEl.classList.add('hidden');
  }
  if (markSeen && closedCatId && CATEGORIES[closedCatId]) {
    if (isTrackingDisabled()) {
      untrackedSeenTopicGuides.add(closedCatId);
    } else {
      if (!(state.seenTopicGuides instanceof Set)) {
        state.seenTopicGuides = new Set();
      }
      if (!state.seenTopicGuides.has(closedCatId)) {
        state.seenTopicGuides.add(closedCatId);
        savePersistedData();
      }
    }
  }
  syncTopicEducateButtonUI(state.activeCategory);
  if (
    state.activeView === 'play' &&
    isCategoryUnlocked(state.activeCategory) &&
    !state.answered &&
    state.questionType !== 'speak' &&
    answerInputEl
  ) {
    setTimeout(() => answerInputEl.focus(), 20);
  }
}

export function maybeOpenNewTopicEducateModal(catId = state.activeCategory) {
  if (state.activeView !== 'play') return;
  if (typeof guidebookHooks.isHandsFreeRunning === 'function' && guidebookHooks.isHandsFreeRunning()) {
    return;
  }
  if (!catId || !CATEGORIES[catId] || !isCategoryUnlocked(catId)) return;
  if (!isUserNewToTopic(catId)) return;
  if (!getTopicEducateContent(catId).hasRules) return;
  if (
    subjectCompleteModalBackdropEl &&
    !subjectCompleteModalBackdropEl.classList.contains('hidden')
  ) {
    return;
  }
  openTopicEducateModal(catId);
}

export function openSkipStageModal(catId, stageIndex) {
  const cat = CATEGORIES[catId];
  const stage = cat?.stages?.[stageIndex];
  const backdropEl = document.getElementById('skip-stage-modal-backdrop');
  const titleEl = document.getElementById('skip-stage-modal-title');
  const descEl = document.getElementById('skip-stage-modal-desc');
  if (!cat || !stage || !backdropEl) return;

  pendingSkipStageTarget = { catId, stageIndex };
  const isFinal = stageIndex >= cat.stages.length - 1;
  const nextStage = !isFinal ? cat.stages[stageIndex + 1] : null;
  const nextUnit = isFinal ? getNextCategoryInOrder(catId) : null;

  if (titleEl) {
    titleEl.textContent = `Skip ${stage.shortTitle || `Stage ${stageIndex + 1}`}?`;
  }
  if (descEl) {
    if (nextStage) {
      descEl.textContent = `Mark "${cat.label} · ${stage.label}" as skipped and unlock "${nextStage.label}" right away? You can still review its words in the Guidebook anytime.`;
    } else if (nextUnit) {
      descEl.textContent = `Mark "${cat.label} · ${stage.label}" as skipped, complete ${cat.label}, and unlock ${nextUnit.label} right away?`;
    } else {
      descEl.textContent = `Mark "${cat.label} · ${stage.label}" as skipped and complete ${cat.label}?`;
    }
  }
  backdropEl.classList.remove('hidden');
}

export function closeSkipStageModal() {
  pendingSkipStageTarget = null;
  const backdropEl = document.getElementById('skip-stage-modal-backdrop');
  if (backdropEl) backdropEl.classList.add('hidden');
}

export function confirmSkipStageFromGuidebook() {
  const target = pendingSkipStageTarget;
  closeSkipStageModal();
  if (!target) return;
  const result = skipStageInProgression(target.catId, target.stageIndex);
  if (!result) return;
  guidebookHooks.onAfterSkipStage(result);
}

// New Word Introduction Modal — Syllable-aware Spanish phonetic guide & mouth-position notes
const ES_STRONG_VOWELS = new Set(['a', 'e', 'o', 'á', 'é', 'ó']);
const ES_WEAK_ACCENTED = new Set(['í', 'ú']);
const ES_ALL_VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'á', 'é', 'í', 'ó', 'ú', 'ü']);
const ES_INSEPARABLE_CLUSTERS = new Set([
  'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr'
]);

function splitSpanishWordSyllables(word) {
  const lower = String(word || '').toLowerCase();
  if (!lower) return [];
  // Tokenize keeping digraphs (ch, ll, rr, qu+e/i, gu+e/i) intact
  const tokens = [];
  for (let i = 0; i < lower.length; i += 1) {
    const ch = lower[i];
    const next = lower[i + 1] || '';
    const third = lower[i + 2] || '';
    if ((ch === 'c' && next === 'h') || (ch === 'l' && next === 'l') || (ch === 'r' && next === 'r')) {
      tokens.push(ch + next);
      i += 1;
    } else if ((ch === 'q' || ch === 'g') && next === 'u' && /[eiéí]/.test(third)) {
      tokens.push(ch + next);
      i += 1;
    } else {
      tokens.push(ch);
    }
  }

  const isVowel = (t) => t.length === 1 && ES_ALL_VOWELS.has(t);
  const isStrongOrAccWeak = (t) => ES_STRONG_VOWELS.has(t) || ES_WEAK_ACCENTED.has(t);

  // Build vowel nuclei (merging diphthongs, splitting hiatuses)
  const nuclei = [];
  let idx = 0;
  while (idx < tokens.length) {
    if (!isVowel(tokens[idx])) {
      idx += 1;
      continue;
    }
    const start = idx;
    let end = idx;
    while (end + 1 < tokens.length && isVowel(tokens[end + 1])) {
      const curr = tokens[end];
      const nxt = tokens[end + 1];
      if (isStrongOrAccWeak(curr) && isStrongOrAccWeak(nxt)) {
        break; // Hiatus: two strong vowels or accented weak vowel (e.g. dí-a, le-er)
      }
      end += 1;
    }
    nuclei.push({ start, end });
    idx = end + 1;
  }

  if (nuclei.length <= 1) return [lower];

  const splits = [0];
  for (let n = 0; n < nuclei.length - 1; n += 1) {
    const gapStart = nuclei[n].end + 1;
    const gapEnd = nuclei[n + 1].start;
    const cons = tokens.slice(gapStart, gapEnd);
    if (cons.length === 0) {
      splits.push(gapStart);
    } else if (cons.length === 1) {
      splits.push(gapStart);
    } else if (cons.length === 2) {
      const pair = cons[0] + cons[1];
      splits.push(ES_INSEPARABLE_CLUSTERS.has(pair) ? gapStart : gapStart + 1);
    } else {
      const lastTwo = cons[cons.length - 2] + cons[cons.length - 1];
      splits.push(ES_INSEPARABLE_CLUSTERS.has(lastTwo) ? gapEnd - 2 : gapEnd - 1);
    }
  }
  splits.push(tokens.length);

  const syllables = [];
  for (let s = 0; s < splits.length - 1; s += 1) {
    syllables.push(tokens.slice(splits[s], splits[s + 1]).join(''));
  }
  return syllables;
}

function getStressedSyllableIndex(word, syllables) {
  if (syllables.length <= 1) return 0;
  const accentIdx = syllables.findIndex((sy) => /[áéíóú]/.test(sy));
  if (accentIdx >= 0) return accentIdx;
  const clean = String(word || '').toLowerCase();
  if (/[aeiouns]$/.test(clean)) {
    return Math.max(0, syllables.length - 2);
  }
  return syllables.length - 1;
}

function spanishSyllableToEnglishSound(syllable, { isWordFinal = false } = {}) {
  const s = String(syllable || '').toLowerCase();
  if (s === 'y') return 'ee';
  if (s === 'hay') return 'eye';
  if (s === 'hoy') return 'oy';
  if (s === 'soy') return 'soy';
  if (s === 'muy') return 'mwee';

  // Normalize accents while preserving sound structure
  let out = s
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ch/g, '\u0001')
    .replace(/qu(?=[ei])/g, 'k')
    .replace(/gu(?=[ei])/g, 'g')
    .replace(/gü(?=[ei])/g, 'gw')
    .replace(/ll/g, 'y')
    .replace(/ñ/g, 'ny')
    .replace(/c(?=[ei])/g, 's')
    .replace(/z/g, 's')
    .replace(/h/g, '')
    .replace(/j/g, 'h')
    .replace(/g(?=[ei])/g, 'h')
    .replace(/c/g, 'k')
    .replace(/\u0001/g, 'ch')
    .replace(/v/g, 'b');

  // Protect diphthongs before expanding standalone vowels so English respellings never double-expand
  const diphthongs = [
    [/ue/g, 'weh'],
    [/ua/g, 'wah'],
    [/ui/g, 'wee'],
    [/uo/g, 'woh'],
    [/ie/g, 'yeh'],
    [/ia/g, 'yah'],
    [/io/g, 'yoh'],
    [/iu/g, 'yoo'],
    [/ai|ay/g, 'eye'],
    [/ei|ey/g, 'ay'],
    [/oi|oy/g, 'oy'],
    [/au/g, 'ow'],
    [/eu/g, 'eh-oo']
  ];
  const tokens = [];
  diphthongs.forEach(([re, repl]) => {
    out = out.replace(re, () => {
      const id = tokens.length;
      tokens.push(repl);
      return `\u0010${id}\u0011`;
    });
  });

  // Convert remaining standalone Spanish vowels
  out = out
    .replace(/a/g, 'ah')
    .replace(/e/g, 'eh')
    .replace(/i/g, 'ee')
    .replace(/o/g, 'oh')
    .replace(/u/g, 'oo');

  // Restore protected diphthong respellings
  out = out.replace(/\u0010(\d+)\u0011/g, (_, idxStr) => tokens[Number(idxStr)] || '');

  // Clean accidental double-h from vowel + h
  const res = out.replace(/hh+/g, 'h');
  if (isWordFinal && res === 'de') return 'deh';
  return res;
}

export function buildSpanishPronunciationBreakdown(esText) {
  const src = String(esText || '').trim();
  if (!src) {
    return {
      phoneticPlain: '',
      phoneticHTML: '',
      notes: []
    };
  }

  const tokens = tokenizeDisplaySpanishWithSlots(src);
  const phoneticWordsPlain = [];
  const phoneticWordsHTML = [];
  const spanishOnlyWords = [];

  tokens.forEach((tok) => {
    if (tok.type === 'punct') return;
    if (tok.type === 'slot') {
      phoneticWordsPlain.push(tok.text);
      phoneticWordsHTML.push(`<span class="word-intro-slot-tag">${escapeHtmlText(tok.text)}</span>`);
      return;
    }
    const word = String(tok.text || '').replace(/[¿?¡!.,;:()]/g, '').trim();
    if (!word) return;
    spanishOnlyWords.push(word);
    const lw = word.toLowerCase();
    if (lw === 'xopá' || lw === 'xopa') {
      phoneticWordsPlain.push('soh-PAH');
      phoneticWordsHTML.push('soh-<strong class="word-intro-stress">PAH</strong>');
      return;
    }
    const syllables = splitSpanishWordSyllables(word);
    const stressIdx = getStressedSyllableIndex(word, syllables);
    const plainParts = [];
    const htmlParts = [];
    syllables.forEach((syl, idx) => {
      const sound = spanishSyllableToEnglishSound(syl, { isWordFinal: idx === syllables.length - 1 });
      if (idx === stressIdx) {
        const up = sound.toUpperCase();
        plainParts.push(up);
        htmlParts.push(`<strong class="word-intro-stress">${escapeHtmlText(up)}</strong>`);
      } else {
        plainParts.push(sound);
        htmlParts.push(escapeHtmlText(sound));
      }
    });
    phoneticWordsPlain.push(plainParts.join('-'));
    phoneticWordsHTML.push(htmlParts.join('-'));
  });

  if (phoneticWordsPlain.length === 0) {
    return {
      phoneticPlain: '',
      phoneticHTML: '',
      notes: []
    };
  }

  const raw = spanishOnlyWords.join(' ');
  const notes = [];
  if (/xop[aá]/i.test(raw)) {
    notes.push('Panama slang: "xopá" sounds like "soh-PAH" (backwards for "qué pasó").');
  }
  if (/(?:^|[^c])h/i.test(raw)) {
    notes.push('Silent H: never pronounce the "h" — start straight on the vowel.');
  }
  if (/ll/i.test(raw)) {
    notes.push('Double LL: pronounced smoothly like English "y" in "yes".');
  }
  if (/ñ/i.test(raw)) {
    notes.push('Tilde Ñ: say "ny" like in "canyon" or "lasagna".');
  }
  if (/j|g[eiéí]/i.test(raw)) {
    notes.push('Soft J / GE / GI: say a light, breathy English "h" (like "hello").');
  }
  if (/qu[eiéí]/i.test(raw)) {
    notes.push('Silent U in QU: skip the "u" and pronounce a crisp "k".');
  }
  if (/gu[eiéí]/i.test(raw)) {
    notes.push('Silent U in GUE/GUI: skip the "u" and say a clean hard "g".');
  }
  if (/rr|\br/i.test(raw)) {
    notes.push('Rolled R: give a quick tongue-tip trill behind your top teeth.');
  }
  if (/v/i.test(raw)) {
    notes.push('Soft V: Spanish "v" sounds almost like a gentle "b" with lips barely touching.');
  }
  if (/z|c[eiéí]/i.test(raw)) {
    notes.push('Seseo: pronounce "z" and "ce/ci" like a clean "s" sound.');
  }

  const trimmedNotes = notes.slice(0, 2);
  trimmedNotes.push('Punch the BOLD syllables slightly louder; keep vowels short and pure.');

  return {
    phoneticPlain: phoneticWordsPlain.join('  '),
    phoneticHTML: phoneticWordsHTML.join(' &nbsp; '),
    notes: trimmedNotes
  };
}

export function buildSpanishPronunciationGuide(esText) {
  const b = buildSpanishPronunciationBreakdown(esText);
  if (!b.phoneticPlain) return '';
  return `${b.phoneticPlain} — ${b.notes.join(' ')}`;
}

export function getWordIntroKey(catId, itemOrNum) {
  if (catId === 'numbers') return `num:${itemOrNum}`;
  return itemOrNum?.id ? String(itemOrNum.id) : '';
}

export function getWordIntroDetails(catId, stageIndex, itemOrNum) {
  if (catId === 'numbers') {
    const numDetails = getNumbersWordIntroDetails(itemOrNum, stageIndex, buildSpanishPronunciationGuide);
    const memoryTip = getNumberMemoryTip(itemOrNum);
    return {
      ...numDetails,
      item: null,
      slotConfig: null,
      chosenSlot: '',
      ttsEs: numDetails.es,
      pronunciationBreakdown: buildSpanishPronunciationBreakdown(numDetails.es),
      tip: memoryTip || numDetails.tip
    };
  }

  const stageMeta = CATEGORIES[catId]?.stages?.[stageIndex] || {};
  const item = itemOrNum;
  const activeInst =
    state.currentInstance && state.currentInstance.itemId === item.id
      ? state.currentInstance
      : null;
  const effectiveItem = activeInst
    ? { ...item, es: activeInst.es, en: activeInst.en, altEs: activeInst.altEs, altEn: activeInst.altEn }
    : item;
  const slotConfig = getSlotConfigForItem(item);
  const chosenSlot = String(state.selectedSlotChoices?.[item.id] || '').trim();
  const displayEs = activeInst ? activeInst.es : getDisplaySpanishForItem(effectiveItem, chosenSlot);
  const ttsEs = activeInst ? activeInst.es : getSpeakableSpanishForItem(effectiveItem, chosenSlot);
  const en = effectiveItem.en;
  const patternEs = activeInst?.patternEs || item.slotTemplate?.patternEs || '';
  const memoryTip = getPhraseMemoryTip(item);
  const tip =
    memoryTip ||
    stageMeta.focusRule ||
    `Connect "${en}" directly to "${displayEs}" when speaking aloud.`;

  return {
    introKey: item.id,
    stageKey: `${catId}:${stageIndex}`,
    item,
    slotConfig,
    chosenSlot,
    es: displayEs,
    ttsEs,
    en,
    patternEs,
    pronunciation: buildSpanishPronunciationGuide(displayEs),
    pronunciationBreakdown: buildSpanishPronunciationBreakdown(displayEs),
    tip
  };
}

export function isWordEligibleForIntro(catId, stageIndex, itemOrNum) {
  if (state.activeView !== 'play') return false;
  const awardEl = document.getElementById('stage-complete-award-modal-backdrop');
  const nextEl = document.getElementById('next-stage-preview-modal-backdrop');
  if (
    (awardEl && !awardEl.classList.contains('hidden')) ||
    (nextEl && !nextEl.classList.contains('hidden')) ||
    (subjectCompleteModalBackdropEl && !subjectCompleteModalBackdropEl.classList.contains('hidden')) ||
    (topicEducateModalBackdropEl && !topicEducateModalBackdropEl.classList.contains('hidden'))
  ) {
    return false;
  }
  if (state.activeCategory === 'numbers' && state.questionType === 'dictation') return false;
  const introKey = getWordIntroKey(catId, itemOrNum);
  const stageKey = `${catId}:${stageIndex}`;
  if (!introKey) return false;
  if (state.skippedIntroStages?.has(stageKey)) return false;
  if (state.skippedIntroWords?.has(introKey)) return false;
  if (state.introducedItems?.has(introKey)) return false;
  if (isTrackingDisabled() && untrackedIntroducedItems.has(introKey)) return false;

  const entry = catId === 'numbers' ? state.counts?.[itemOrNum] : state.phraseCounts?.[itemOrNum?.id];
  const total = (Number(entry?.correct) || 0) + (Number(entry?.incorrect) || 0);
  if (total > 0) return false;
  const seen = normalizeSeenSkills(entry?.seenSkills, entry?.streaks);
  return !getActiveSkillPillars().some((k) => seen[k]);
}

function renderClickableWordIntroSpanish(esEl, esText) {
  if (!esEl) return;
  const tokens = tokenizeDisplaySpanishWithSlots(esText);
  if (tokens.length === 0) {
    esEl.textContent = '';
    return;
  }
  let html = '';
  tokens.forEach((tok, idx) => {
    const prefix = idx > 0 && tok.type !== 'punct' ? ' ' : '';
    if (tok.type === 'slot') {
      html += `${prefix}<span class="slot-placeholder-chip" title="Say your own answer here">${escapeHtmlText(tok.text)}</span>`;
    } else if (tok.type === 'punct') {
      html += `<span class="slot-punct">${escapeHtmlText(tok.text)}</span>`;
    } else {
      html += `${prefix}<button type="button" class="word-intro-word-btn" data-intro-word="${escapeHtmlText(tok.spoken)}" title="Click to hear &quot;${escapeHtmlText(tok.spoken)}&quot;">${escapeHtmlText(tok.text)}</button>`;
    }
  });
  esEl.innerHTML = html;
}

function renderWordIntroPronunciation(pronEl, esText, cachedBreakdown = null) {
  if (!pronEl) return;
  const breakdown = cachedBreakdown || buildSpanishPronunciationBreakdown(esText);
  const notesHTML = (breakdown.notes || [])
    .map((note) => `<li>${escapeHtmlText(note)}</li>`)
    .join('');
  pronEl.innerHTML = `
    <div class="word-intro-phonetic-line">${breakdown.phoneticHTML}</div>
    ${notesHTML ? `<ul class="word-intro-pron-notes">${notesHTML}</ul>` : ''}
  `;
}

export function markWordIntroducedInHandsFree(details) {
  if (!details || !details.introKey) return;
  if (isTrackingDisabled()) {
    untrackedIntroducedItems.add(details.introKey);
    return;
  }
  if (details.item) {
    recordWordFirstShown(details.item.categoryId || state.activeCategory, details.item);
  } else if (typeof details.introKey === 'string' && details.introKey.startsWith('num:')) {
    recordWordFirstShown('numbers', Number(details.introKey.slice(4)));
  }
  if (!(state.introducedItems instanceof Set)) state.introducedItems = new Set();
  state.introducedItems.add(details.introKey);
  savePersistedData();
}

export function openWordIntroModal(details, { playAudioOnClose = false } = {}) {
  const backdropEl = document.getElementById('word-intro-modal-backdrop');
  const glowWrapEl = document.getElementById('word-intro-glow-wrap');
  const tagEl = document.getElementById('word-intro-tag');
  const patternEl = document.getElementById('word-intro-pattern');
  const esEl = document.getElementById('word-intro-es');
  const enEl = document.getElementById('word-intro-en');
  const slotBarEl = document.getElementById('word-intro-slot-bar');
  const slotLabelEl = document.getElementById('word-intro-slot-label');
  const slotSelectEl = document.getElementById('word-intro-slot-select');
  const pronEl = document.getElementById('word-intro-pronunciation');
  const tipEl = document.getElementById('word-intro-tip');
  if (!backdropEl || !details) return false;

  const ttsEs = details.ttsEs || details.es;
  pendingWordIntroData = { ...details, ttsEs, playAudioOnClose };
  if (details.item) {
    recordWordFirstShown(details.item.categoryId || state.activeCategory, details.item);
  } else if (typeof details.introKey === 'string' && details.introKey.startsWith('num:')) {
    recordWordFirstShown('numbers', Number(details.introKey.slice(4)));
  }
  const wordCount = tokenizeDisplaySpanishWithSlots(details.es || '').filter((t) => t.type !== 'punct').length;
  if (tagEl) {
    tagEl.textContent = wordCount > 1 ? 'New Phrase Unlocked' : 'New Word Unlocked';
  }
  if (patternEl) {
    if (details.slotConfig?.slotType === 'personal') {
      patternEl.textContent = `Unique ending · Say your own ${details.slotConfig.placeholder.replace(/^\[|\]$/g, '').toLowerCase()}`;
      patternEl.classList.remove('hidden');
    } else if (details.slotConfig?.slotType === 'spanish_options') {
      patternEl.textContent = 'Open-ended · Pick from 15 common answers or say your own';
      patternEl.classList.remove('hidden');
    } else if (details.patternEs) {
      patternEl.textContent = `Pattern: ${details.patternEs}`;
      patternEl.classList.remove('hidden');
    } else {
      patternEl.textContent = '';
      patternEl.classList.add('hidden');
    }
  }
  renderClickableWordIntroSpanish(esEl, details.es);
  if (enEl) enEl.textContent = details.en;

  if (slotBarEl && slotSelectEl) {
    const cfg = details.slotConfig;
    if (cfg && cfg.slotType === 'spanish_options' && Array.isArray(cfg.options) && cfg.options.length > 0) {
      if (slotLabelEl) {
        slotLabelEl.textContent = `${cfg.dropdownLabel || '15 common Spanish answers'}:`;
      }
      const chosen = String(details.chosenSlot || '').trim();
      const optsHTML = [
        '<option value="">Choose a Spanish example (15 options)…</option>',
        ...cfg.options.map(
          (opt) =>
            `<option value="${escapeHtmlText(opt.es)}">${escapeHtmlText(opt.es)} — ${escapeHtmlText(opt.en)}</option>`
        )
      ].join('');
      slotSelectEl.innerHTML = optsHTML;
      slotSelectEl.value = cfg.options.some((o) => o.es === chosen) ? chosen : '';
      slotBarEl.classList.remove('hidden');
    } else {
      slotBarEl.classList.add('hidden');
      slotSelectEl.innerHTML = '';
    }
  }

  renderWordIntroPronunciation(pronEl, details.es, details.pronunciationBreakdown);
  if (tipEl) tipEl.textContent = details.tip;

  backdropEl.classList.remove('hidden');
  if (glowWrapEl) {
    glowWrapEl.classList.remove('is-unlock-glow');
    void glowWrapEl.offsetWidth;
    glowWrapEl.classList.add('is-unlock-glow');
  }
  if (Number(state.volume) > 0 && 'speechSynthesis' in window) {
    speakSpanish(ttsEs);
  }
  return true;
}

export function closeWordIntroModal({ skipStage = false } = {}) {
  const backdropEl = document.getElementById('word-intro-modal-backdrop');
  if (backdropEl) backdropEl.classList.add('hidden');
  const data = pendingWordIntroData;
  pendingWordIntroData = null;
  if (data) {
    if (isTrackingDisabled()) {
      untrackedIntroducedItems.add(data.introKey);
    } else {
      if (!(state.introducedItems instanceof Set)) state.introducedItems = new Set();
      state.introducedItems.add(data.introKey);
      if (skipStage) {
        if (!(state.skippedIntroStages instanceof Set)) state.skippedIntroStages = new Set();
        state.skippedIntroStages.add(data.stageKey);
        renderCategoryNav();
      }
      savePersistedData();
    }
    if (data.playAudioOnClose && state.activeView === 'play' && 'speechSynthesis' in window) {
      speakSpanish(guidebookHooks.getSpokenText());
    }
  }
  if (
    state.activeView === 'play' &&
    isCategoryUnlocked(state.activeCategory) &&
    !state.answered &&
    state.questionType !== 'speak' &&
    answerInputEl
  ) {
    setTimeout(() => answerInputEl.focus(), 20);
  }
}

export function initGuidebookModule(hooks = {}) {
  guidebookHooks = { ...guidebookHooks, ...hooks };

  if (hudStageTitleEl) {
    hudStageTitleEl.addEventListener('click', (e) => {
      e.stopPropagation();
      openGuidebookToCurrentStageAnimated();
    });
    hudStageTitleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        openGuidebookToCurrentStageAnimated();
      }
    });
  }

  if (topicEducateCloseXBtn) {
    topicEducateCloseXBtn.addEventListener('click', () => {
      closeTopicEducateModal({ markSeen: true });
    });
  }
  if (topicEducateModalBackdropEl) {
    topicEducateModalBackdropEl.addEventListener('click', (e) => {
      if (e.target === topicEducateModalBackdropEl) {
        closeTopicEducateModal({ markSeen: true });
      }
    });
  }

  const backdropEl = document.getElementById('word-intro-modal-backdrop');
  const esEl = document.getElementById('word-intro-es');
  const slotSelectEl = document.getElementById('word-intro-slot-select');
  const pronEl = document.getElementById('word-intro-pronunciation');
  const hearBtn = document.getElementById('word-intro-hear-btn');
  const hearSlowBtn = document.getElementById('word-intro-hear-slow-btn');
  const skipStageBtn = document.getElementById('word-intro-skip-stage-btn');
  const continueBtn = document.getElementById('word-intro-continue-btn');
  if (slotSelectEl) {
    slotSelectEl.addEventListener('change', (e) => {
      if (!pendingWordIntroData || !pendingWordIntroData.item) return;
      const item = pendingWordIntroData.item;
      const val = String(e.target.value || '').trim();
      if (!state.selectedSlotChoices || typeof state.selectedSlotChoices !== 'object') {
        state.selectedSlotChoices = {};
      }
      state.selectedSlotChoices[item.id] = val;
      const displayEs = getDisplaySpanishForItem(item, val);
      const ttsEs = getSpeakableSpanishForItem(item, val);
      const breakdown = buildSpanishPronunciationBreakdown(displayEs);
      pendingWordIntroData.chosenSlot = val;
      pendingWordIntroData.es = displayEs;
      pendingWordIntroData.ttsEs = ttsEs;
      pendingWordIntroData.pronunciationBreakdown = breakdown;
      renderClickableWordIntroSpanish(esEl, displayEs);
      renderWordIntroPronunciation(pronEl, displayEs, breakdown);
      guidebookHooks.onSlotChoiceChanged();
      if (val && Number(state.volume) > 0 && 'speechSynthesis' in window) {
        speakSpanish(ttsEs);
      }
    });
  }
  if (esEl) {
    esEl.addEventListener('click', (e) => {
      const wordBtn = e.target.closest('.word-intro-word-btn');
      if (!wordBtn) return;
      const word = wordBtn.dataset.introWord || wordBtn.textContent || '';
      if (!word) return;
      if (checkZeroVolumePrompt()) return;
      esEl.querySelectorAll('.word-intro-word-btn.is-speaking').forEach((el) => {
        el.classList.remove('is-speaking');
      });
      wordBtn.classList.add('is-speaking');
      speakSpanish(word, 0.85);
      setTimeout(() => {
        wordBtn.classList.remove('is-speaking');
      }, 900);
    });
  }
  if (hearBtn) {
    hearBtn.addEventListener('click', () => {
      if (!pendingWordIntroData) return;
      if (checkZeroVolumePrompt()) return;
      speakSpanish(pendingWordIntroData.ttsEs || pendingWordIntroData.es);
    });
  }
  if (hearSlowBtn) {
    hearSlowBtn.addEventListener('click', () => {
      if (!pendingWordIntroData) return;
      if (checkZeroVolumePrompt()) return;
      speakSpanish(pendingWordIntroData.ttsEs || pendingWordIntroData.es, 0.75);
    });
  }
  if (skipStageBtn) {
    skipStageBtn.addEventListener('click', () => closeWordIntroModal({ skipStage: true }));
  }
  if (continueBtn) {
    continueBtn.addEventListener('click', () => closeWordIntroModal({ skipStage: false }));
  }
  if (backdropEl) {
    backdropEl.addEventListener('click', (e) => {
      if (e.target === backdropEl) closeWordIntroModal({ skipStage: false });
    });
  }

  const skipStageBackdropEl = document.getElementById('skip-stage-modal-backdrop');
  const skipStageCancelBtn = document.getElementById('skip-stage-cancel-btn');
  const skipStageConfirmBtn = document.getElementById('skip-stage-confirm-btn');
  if (skipStageCancelBtn) {
    skipStageCancelBtn.addEventListener('click', closeSkipStageModal);
  }
  if (skipStageConfirmBtn) {
    skipStageConfirmBtn.addEventListener('click', confirmSkipStageFromGuidebook);
  }
  if (skipStageBackdropEl) {
    skipStageBackdropEl.addEventListener('click', (e) => {
      if (e.target === skipStageBackdropEl) closeSkipStageModal();
    });
  }
}
