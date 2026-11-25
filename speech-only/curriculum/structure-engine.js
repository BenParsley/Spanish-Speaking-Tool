// Dynamic Structure + Fill-Word resolution engine for Panamanian Spanish A1.
// Resolves scenario structures into grammatically accurate Spanish & English turns
// with automatic gender/number agreement, al/del contractions, verb agreement,
// and smart non-repeating fill rotation.

import { FILL_BANKS } from './fill-banks.js';

export function applySpanishContractions(text) {
  return String(text || '')
    .replace(/\bde\s+el\b/gi, (m) => (m[0] === 'D' ? 'Del' : 'del'))
    .replace(/\ba\s+el\b/gi, (m) => (m[0] === 'A' ? 'Al' : 'al'))
    .replace(/\s+/g, ' ')
    .trim();
}

export function inflectSpanishAdj(adjEntry, gender = 'm', num = 's') {
  if (!adjEntry || typeof adjEntry !== 'object') return String(adjEntry || '');
  const g = gender === 'f' ? 'f' : 'm';
  const n = num === 'p' ? 'p' : 's';
  const key = `${g}${n}`;
  return adjEntry[key] || adjEntry.ms || adjEntry.es || '';
}

export function polishEnglishGrammar(text) {
  return String(text || '')
    .replace(/\ba ([aeiou])/gi, (match, vowel) => {
      // Keep "a" before consonant-sound words like "university", "one", "useful"
      return `an ${vowel}`;
    })
    .replace(/\ban (university|useful|one)\b/gi, 'a $1')
    .replace(/\bthere are (one|a|an)\b/gi, 'there is $1')
    .replace(/\b(at|to|for|in)\s+\1\b/gi, '$1')
    .replace(/\s+([?!.,])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeSpanishWords(text) {
  return String(text || '')
    .replace(/[¿¡?!.,;:()"']/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function normalizeWordToken(word) {
  return String(word || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñü]/g, '')
    .trim();
}

export function normalizeExtensionSlug(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

function extractPatternBaseTokens(patternEs) {
  const withoutSlots = String(patternEs || '')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/\+/g, ' ');
  const rawParts = withoutSlots.split(/[\s/]+/).filter(Boolean);
  const tokens = [];
  rawParts.forEach((raw) => {
    const cleanWithParens = raw.replace(/[¿¡?!.,;:"']/g, '').trim();
    if (!cleanWithParens) return;
    // Expand optional suffixes like cuesta(n), duele(n), abierto(a) BEFORE stripping parens
    const optMatch = cleanWithParens.match(/^([a-záéíóúñü]+)\(([a-záéíóúñü]+)\)$/i);
    if (optMatch) {
      tokens.push(normalizeWordToken(optMatch[1]));
      tokens.push(normalizeWordToken(optMatch[1] + optMatch[2]));
    } else {
      const clean = cleanWithParens.replace(/[()]/g, '').trim();
      const norm = normalizeWordToken(clean);
      if (norm) tokens.push(norm);
    }
  });
  return tokens;
}

function escapeRegexLiteral(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findEnglishSubstringSpan(haystack, needle, occupied = []) {
  const cleanNeedle = String(needle || '').trim();
  if (!cleanNeedle || !haystack) return null;
  const re = new RegExp(`(^|[^a-zA-Z0-9'])(${escapeRegexLiteral(cleanNeedle)})(?=$|[^a-zA-Z0-9'])`, 'gi');
  let m;
  while ((m = re.exec(haystack)) !== null) {
    const start = m.index + (m[1] ? m[1].length : 0);
    const end = start + m[2].length;
    const overlaps = occupied.some(([os, oe]) => start < oe && end > os);
    if (!overlaps) {
      return [start, end];
    }
  }
  return null;
}

function collectEnglishCandidatesForEntry(entry, patternEn = '') {
  if (!entry || typeof entry !== 'object') return [];
  const raw = [entry.en, entry.defEn, entry.indefEn, entry.plEn]
    .filter((s) => typeof s === 'string' && s.trim().length > 0)
    .map((s) => s.trim());

  const expanded = [];
  const add = (val) => {
    const trimmed = String(val || '').trim();
    if (trimmed && !expanded.includes(trimmed)) expanded.push(trimmed);
  };

  raw.forEach((s) => {
    // For "I [have / am] [symptom]" items, peel leading "have " / "am " so "I have" / "I am" stays in Base
    if (/\[have\s*\/\s*am\]/i.test(patternEn)) {
      const strippedVerb = s.replace(/^(?:have|am)\s+/i, '').trim();
      if (strippedVerb && strippedVerb !== s) {
        add(strippedVerb);
        add(polishEnglishGrammar(strippedVerb));
        return;
      }
    }
    add(s);
    const polished = polishEnglishGrammar(s);
    add(polished);
    if (/^a\s+[aeiou]/i.test(s)) {
      add(s.replace(/^a\s+/i, 'an '));
    }
    if (/^the\s+/i.test(s)) {
      add(s.replace(/^the\s+/i, ''));
    }
    if (/\s+weather$/i.test(s)) {
      add(s.replace(/\s+weather$/i, ''));
    }
  });

  // Sort longest first so multi-word fills match before shorter sub-variants
  return expanded.sort((a, b) => b.length - a.length);
}

function buildSegmentsFromExtSpans(enText, extSpans) {
  const text = String(enText || '');
  if (!text || !Array.isArray(extSpans) || extSpans.length === 0) return [];

  const sorted = extSpans
    .filter(([s, e]) => Number.isInteger(s) && Number.isInteger(e) && e > s)
    .sort((a, b) => a[0] - b[0]);
  if (sorted.length === 0) return [];

  // Merge adjacent extension spans separated only by whitespace
  const merged = [sorted[0].slice()];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = merged[merged.length - 1];
    const curr = sorted[i];
    const between = text.slice(prev[1], curr[0]);
    if (/^\s*$/.test(between)) {
      prev[1] = Math.max(prev[1], curr[1]);
    } else {
      merged.push(curr.slice());
    }
  }

  const rawSegs = [];
  let cursor = 0;
  merged.forEach(([s, e]) => {
    if (s > cursor) {
      rawSegs.push({ text: text.slice(cursor, s), role: 'base' });
    }
    rawSegs.push({ text: text.slice(s, e), role: 'extension' });
    cursor = e;
  });
  if (cursor < text.length) {
    rawSegs.push({ text: text.slice(cursor), role: 'base' });
  }

  // Clean whitespace and separate standalone boundary punctuation (like "," or "?")
  const cleaned = [];
  rawSegs.forEach((seg) => {
    const trimmed = seg.text.trim();
    if (!trimmed) return;
    if (seg.role === 'base') {
      if (/^[,?!.;:]+$/.test(trimmed)) {
        cleaned.push({ text: trimmed, role: 'punct' });
        return;
      }
      // Peel trailing comma so "good morning," -> Base "good morning" + punct ","
      const trailComma = trimmed.match(/^(.+?)(,)$/);
      if (trailComma) {
        cleaned.push({ text: trailComma[1].trim(), role: 'base' });
        cleaned.push({ text: trailComma[2], role: 'punct' });
        return;
      }
      // Peel leading comma
      const leadComma = trimmed.match(/^(,)(.+)$/);
      if (leadComma) {
        cleaned.push({ text: leadComma[1], role: 'punct' });
        cleaned.push({ text: leadComma[2].trim(), role: 'base' });
        return;
      }
    }
    cleaned.push({ text: trimmed, role: seg.role });
  });

  const hasBase = cleaned.some((s) => s.role === 'base');
  const hasExt = cleaned.some((s) => s.role === 'extension');
  return hasBase && hasExt ? cleaned : [];
}

function computeEnglishBaseExtensionSegments(en, item, fillInfo, hasExtension) {
  const enStr = String(en || '').trim();
  if (!hasExtension || !enStr) {
    return { enSegments: [], baseEn: enStr };
  }

  const patternEn = String(item?.structure?.patternEn || '');
  const patternEs = String(item?.structure?.patternEs || '');
  const slotMatches = patternEn.match(/\[[^\]]+\]/g) || [];
  const spans = [];

  if (fillInfo.isDualBank && fillInfo.entryA && fillInfo.entryB) {
    const baseTokenPoolEs = extractPatternBaseTokens(patternEs);
    const entryAIsBase = baseTokenPoolEs.length === 0 || slotMatches.length <= 1;
    if (entryAIsBase) {
      const candsB = collectEnglishCandidatesForEntry(fillInfo.entryB, patternEn);
      for (const cand of candsB) {
        const hit = findEnglishSubstringSpan(enStr, cand, spans);
        if (hit && (hit[1] - hit[0]) < enStr.length) {
          spans.push(hit);
          break;
        }
      }
    } else {
      const candsA = collectEnglishCandidatesForEntry(fillInfo.entryA, patternEn);
      for (const cand of candsA) {
        const hit = findEnglishSubstringSpan(enStr, cand, spans);
        if (hit) {
          spans.push(hit);
          break;
        }
      }
      const candsB = collectEnglishCandidatesForEntry(fillInfo.entryB, patternEn);
      for (const cand of candsB) {
        const hit = findEnglishSubstringSpan(enStr, cand, spans);
        if (hit) {
          spans.push(hit);
          break;
        }
      }
    }
  } else if (fillInfo.entryA) {
    // Handle article/possessive patterns where entry.defEn/indefEn/es includes the article ("the man", "a friend", "my mother")
    const leadLitMatch = patternEn.match(/^([^[]+)\[/);
    const leadLiteral = leadLitMatch ? leadLitMatch[1].trim() : '';
    const candsA = collectEnglishCandidatesForEntry(fillInfo.entryA, patternEn);

    let matchedSpan = null;
    for (const cand of candsA) {
      const hit = findEnglishSubstringSpan(enStr, cand, spans);
      if (hit) {
        const coversWhole = hit[0] === 0 && hit[1] >= enStr.replace(/[?!.]+$/, '').length;
        if (!coversWhole) {
          matchedSpan = hit;
          break;
        }
      }
    }

    if (!matchedSpan && leadLiteral) {
      // Split off leading English base literals (e.g., "the / a / an / my")
      const leadAlts = leadLiteral
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);
      for (const alt of leadAlts) {
        const re = new RegExp(`^(${escapeRegexLiteral(alt)})\\s+(.+)$`, 'i');
        const m = enStr.match(re);
        if (m) {
          const extStart = enStr.indexOf(m[2], m[1].length);
          const endClean = enStr.replace(/[?!.]+$/, '').length;
          if (extStart > 0 && endClean > extStart) {
            matchedSpan = [extStart, endClean];
            break;
          }
        }
      }
    }

    if (matchedSpan) {
      spans.push(matchedSpan);
    }
  }

  const enSegments = buildSegmentsFromExtSpans(enStr, spans);
  const baseEn =
    enSegments.length > 0
      ? enSegments
          .filter((s) => s.role === 'base')
          .map((s) => s.text)
          .join(' ')
          .trim()
      : enStr;
  return { enSegments, baseEn };
}

function computeBaseExtensionSplit(es, altEs, en, item, fillInfo) {
  const words = tokenizeSpanishWords(es);
  if (words.length < 2) {
    return {
      hasExtension: false,
      baseEs: es,
      baseAltEs: Array.isArray(altEs) ? altEs : [],
      baseEn: String(en || '').trim(),
      enSegments: [],
      extensionEs: '',
      extensionEn: '',
      extensionKey: '',
      extensionBank: fillInfo.bankName || '',
      baseWordIndices: words.map((_, i) => i),
      extensionWordIndices: []
    };
  }

  const patternEs = String(item?.structure?.patternEs || '');
  const baseTokenPool = extractPatternBaseTokens(patternEs);

  // Special case: dual-bank structures whose pattern has NO literal words (e.g., v_siempre: "[frequency] + [routine action]")
  // Treat Bank A (frequency adverb) as the Base and Bank B (routine action) as the Extension.
  let baseWordIndices = [];
  let extensionWordIndices = [];
  let extensionLabelEs = fillInfo.fillLabelEs || '';
  let extensionLabelEn = fillInfo.fillLabelEn || '';

  if (baseTokenPool.length === 0 && fillInfo.isDualBank && fillInfo.entryA && fillInfo.entryB) {
    const aWords = tokenizeSpanishWords(fillInfo.entryA.es || '');
    const aLen = aWords.length;
    if (aLen > 0 && aLen < words.length) {
      for (let i = 0; i < words.length; i += 1) {
        if (i < aLen) baseWordIndices.push(i);
        else extensionWordIndices.push(i);
      }
      extensionLabelEs = fillInfo.entryB.es || extensionLabelEs;
      extensionLabelEn = fillInfo.entryB.en || extensionLabelEn;
    }
  } else if (baseTokenPool.length > 0) {
    // Expand conjugated/inflected siblings that appear in base patterns (e.g. está/están, incluido/incluida/incluidos/incluidas, está/estás)
    const baseTokenSet = new Set(baseTokenPool);
    if (baseTokenSet.has('esta')) baseTokenSet.add('estan');
    if (baseTokenSet.has('esta')) baseTokenSet.add('estas');
    if (baseTokenSet.has('abierto') || baseTokenSet.has('abierta')) {
      baseTokenSet.add('abierto');
      baseTokenSet.add('abierta');
      baseTokenSet.add('abiertos');
      baseTokenSet.add('abiertas');
    }
    if (baseTokenSet.has('cerrado') || baseTokenSet.has('cerrada')) {
      baseTokenSet.add('cerrado');
      baseTokenSet.add('cerrada');
      baseTokenSet.add('cerrados');
      baseTokenSet.add('cerradas');
    }
    if (baseTokenSet.has('incluido') || baseTokenSet.has('incluida')) {
      baseTokenSet.add('incluido');
      baseTokenSet.add('incluida');
      baseTokenSet.add('incluidos');
      baseTokenSet.add('incluidas');
    }
    if (baseTokenSet.has('de')) baseTokenSet.add('del');
    if (baseTokenSet.has('a')) baseTokenSet.add('al');

    // Count how many times each base literal appears in patternEs so repeated articles inside extensions aren't stolen
    const maxBudget = {};
    baseTokenPool.forEach((tok) => {
      maxBudget[tok] = (maxBudget[tok] || 0) + 1;
    });
    const usedBudget = {};
    const takeFromBudget = (normTok) => {
      if (maxBudget[normTok] && (usedBudget[normTok] || 0) < maxBudget[normTok]) {
        usedBudget[normTok] = (usedBudget[normTok] || 0) + 1;
        return true;
      }
      // Check mapped siblings
      if ((normTok === 'estan' || normTok === 'estas') && maxBudget.esta && (usedBudget.esta || 0) < maxBudget.esta) {
        usedBudget.esta = (usedBudget.esta || 0) + 1;
        return true;
      }
      if (normTok === 'del' && maxBudget.de && (usedBudget.de || 0) < maxBudget.de) {
        usedBudget.de = (usedBudget.de || 0) + 1;
        return true;
      }
      if (normTok === 'al' && maxBudget.a && (usedBudget.a || 0) < maxBudget.a) {
        usedBudget.a = (usedBudget.a || 0) + 1;
        return true;
      }
      if (
        (normTok === 'incluidos' || normTok === 'incluidas') &&
        (maxBudget.incluido || maxBudget.incluida)
      ) {
        const k = maxBudget.incluido ? 'incluido' : 'incluida';
        if ((usedBudget[k] || 0) < maxBudget[k]) {
          usedBudget[k] = (usedBudget[k] || 0) + 1;
          return true;
        }
      }
      return false;
    };

    // Match pattern tokens respecting slot position (prefix vs suffix)
    // Walk words left-to-right and check if fill tokens occupy a contiguous span or if token matches base budget
    const fillCandidates = [];
    if (fillInfo.entryA) {
      [fillInfo.entryA.es, fillInfo.entryA.defEs, fillInfo.entryA.indefEs, fillInfo.entryA.plEs, fillInfo.entryA.ms, fillInfo.entryA.fs]
        .filter(Boolean)
        .forEach((s) => fillCandidates.push(s));
    }
    if (fillInfo.entryB) {
      [fillInfo.entryB.es, fillInfo.entryB.defEs, fillInfo.entryB.indefEs, fillInfo.entryB.plEs, fillInfo.entryB.ms, fillInfo.entryB.fs, fillInfo.entryB.mp, fillInfo.entryB.fp]
        .filter(Boolean)
        .forEach((s) => fillCandidates.push(s));
    }
    const normWords = words.map(normalizeWordToken);

    // First, detect exact slot positions from patternEs (e.g. "[place] está abierto", "buenos días, [person]", "¿cómo se dice [word] en español?")
    const slotMatch = patternEs.indexOf('[');
    const hasLeadingSlot = slotMatch >= 0 && patternEs.slice(0, slotMatch).replace(/[¿¡\s]/g, '').length === 0;

    if (hasLeadingSlot) {
      // Base words appear AFTER the leading slot (scan right-to-left for base words so leading extension articles stay extension!)
      const isBaseFlags = new Array(words.length).fill(false);
      for (let i = words.length - 1; i >= 0; i -= 1) {
        if (baseTokenSet.has(normWords[i]) && takeFromBudget(normWords[i])) {
          isBaseFlags[i] = true;
        }
      }
      isBaseFlags.forEach((isB, i) => {
        if (isB) baseWordIndices.push(i);
        else extensionWordIndices.push(i);
      });
    } else {
      // Base starts at the beginning (and may also have trailing words like "por favor" / "en español")
      // Match leading literal words before the first '[' and trailing literal words after the last ']'
      const firstBracket = patternEs.indexOf('[');
      const lastBracket = patternEs.lastIndexOf(']');
      const leadingBaseTokens = extractPatternBaseTokens(firstBracket >= 0 ? patternEs.slice(0, firstBracket) : patternEs);
      const trailingBaseTokens = extractPatternBaseTokens(lastBracket >= 0 ? patternEs.slice(lastBracket + 1) : '');

      const isBaseFlags = new Array(words.length).fill(false);
      // Match leading base tokens from left
      let leftMatched = 0;
      const leadingSet = new Set(leadingBaseTokens);
      if (leadingSet.has('esta')) { leadingSet.add('estan'); leadingSet.add('estas'); }
      if (leadingSet.has('de')) leadingSet.add('del');
      if (leadingSet.has('a')) leadingSet.add('al');
      for (let i = 0; i < words.length; i += 1) {
        if (leadingSet.has(normWords[i]) && takeFromBudget(normWords[i])) {
          isBaseFlags[i] = true;
          leftMatched += 1;
        } else {
          break;
        }
      }
      // Match trailing base tokens from right
      const trailingSet = new Set(trailingBaseTokens);
      for (let i = words.length - 1; i >= leftMatched; i -= 1) {
        if (trailingSet.has(normWords[i]) && takeFromBudget(normWords[i])) {
          isBaseFlags[i] = true;
        } else {
          break;
        }
      }
      // If dual-bank had an inner literal (e.g. "él / ella es [profession]" -> "él es doctor")
      if (baseWordIndices.length === 0 && isBaseFlags.every((f) => !f)) {
        for (let i = 0; i < words.length; i += 1) {
          if (baseTokenSet.has(normWords[i]) && takeFromBudget(normWords[i])) {
            isBaseFlags[i] = true;
          }
        }
      }
      isBaseFlags.forEach((isB, i) => {
        if (isB) baseWordIndices.push(i);
        else extensionWordIndices.push(i);
      });
    }
  }

  const hasExtension = baseWordIndices.length > 0 && extensionWordIndices.length > 0;
  if (!hasExtension) {
    return {
      hasExtension: false,
      baseEs: es,
      baseAltEs: Array.isArray(altEs) ? altEs : [],
      baseEn: String(en || '').trim(),
      enSegments: [],
      extensionEs: '',
      extensionEn: '',
      extensionKey: '',
      extensionBank: fillInfo.bankName || '',
      baseWordIndices: words.map((_, i) => i),
      extensionWordIndices: []
    };
  }

  const baseEs = baseWordIndices.map((i) => words[i]).join(' ');
  const extFromWords = extensionWordIndices.map((i) => words[i]).join(' ');
  const finalExtEs = extFromWords || extensionLabelEs;
  const finalExtEn = extensionLabelEn || finalExtEs;

  // Build valid base alternatives (e.g. item.es / item.altEs if short, plus altEs with extension words stripped)
  const baseAltSet = new Set([baseEs]);
  const extNormSet = new Set(extensionWordIndices.map((i) => normalizeWordToken(words[i])));
  (Array.isArray(altEs) ? altEs : []).forEach((cand) => {
    const cWords = tokenizeSpanishWords(cand);
    const kept = cWords.filter((w) => !extNormSet.has(normalizeWordToken(w)));
    if (kept.length > 0) baseAltSet.add(kept.join(' '));
  });
  // Also allow item's canonical short base forms when they don't contain different nouns (e.g. "¿cómo estás?", "buen día")
  if (item?.es && tokenizeSpanishWords(item.es).length <= baseWordIndices.length + 1) {
    baseAltSet.add(tokenizeSpanishWords(item.es).join(' '));
  }
  (item?.altEs || []).forEach((a) => {
    const aWords = tokenizeSpanishWords(a);
    if (aWords.length > 0 && aWords.length <= baseWordIndices.length + 1) {
      baseAltSet.add(aWords.join(' '));
    }
  });
  // Allow masculine/feminine & singular/plural base inflections when the user answers base-only without the extension
  const inflectionSwaps = [
    [/\babierta\b/gi, 'abierto'],
    [/\babierto\b/gi, 'abierta'],
    [/\bcerrada\b/gi, 'cerrado'],
    [/\bcerrado\b/gi, 'cerrada'],
    [/\bcercana\b/gi, 'cercano'],
    [/\bcercano\b/gi, 'cercana'],
    [/\bincluidas?\b/gi, 'incluido'],
    [/\bincluidos?\b/gi, 'incluida'],
    [/\bestán\b/gi, 'está'],
    [/\bduelen\b/gi, 'duele'],
    [/\bcuestan\b/gi, 'cuesta']
  ];
  Array.from(baseAltSet).forEach((cand) => {
    inflectionSwaps.forEach(([re, rep]) => {
      if (re.test(cand)) {
        baseAltSet.add(cand.replace(re, rep));
      }
    });
  });

  const { enSegments, baseEn } = computeEnglishBaseExtensionSegments(en, item, fillInfo, true);
  const slug = normalizeExtensionSlug(finalExtEs || fillInfo.fillKey || 'ext');
  const catPrefix = item?.categoryId || 'phrase';

  return {
    hasExtension: true,
    baseEs,
    baseAltEs: Array.from(baseAltSet).filter(Boolean),
    baseEn,
    enSegments,
    extensionEs: finalExtEs,
    extensionEn: finalExtEn,
    extensionKey: `${catPrefix}::${slug}`,
    extensionBank: fillInfo.bankName || '',
    baseWordIndices,
    extensionWordIndices
  };
}

function getBankEntries(bankRef) {
  if (Array.isArray(bankRef)) return bankRef;
  if (typeof bankRef === 'string') return FILL_BANKS[bankRef] || [];
  return [];
}

/**
 * Generates all valid concrete variations for a structure item.
 * Cached on the item object after first computation for zero runtime overhead.
 *
 * Supported structure shapes:
 * 1) { bank: 'bankKey', patternEs, patternEn, build: (entry) => ({ es, altEs?, en, altEn? }) }
 * 2) { banks: ['bankA', 'bankB'], filter?: (a, b) => bool, patternEs, patternEn, build: (a, b) => ({ es, altEs?, en, altEn? }) }
 */
export function getAllVariationsForStructure(item) {
  if (!item || !item.structure || typeof item.structure !== 'object') return [];
  if (Array.isArray(item._cachedVariations)) return item._cachedVariations;

  const st = item.structure;
  const variations = [];

  if (Array.isArray(st.banks) && st.banks.length === 2 && typeof st.build === 'function') {
    const bankA = getBankEntries(st.banks[0]);
    const bankB = getBankEntries(st.banks[1]);
    for (const a of bankA) {
      for (const b of bankB) {
        if (typeof st.filter === 'function' && !st.filter(a, b)) continue;
        const built = st.build(a, b);
        if (!built || !built.es || !built.en) continue;
        const es = applySpanishContractions(built.es);
        const en = polishEnglishGrammar(built.en);
        const altEs = Array.isArray(built.altEs)
          ? built.altEs.map(applySpanishContractions).filter(Boolean)
          : [];
        const altEn = Array.isArray(built.altEn)
          ? built.altEn.map(polishEnglishGrammar).filter(Boolean)
          : [];
        const fillLabelEs = [a.es || a.ms || a.defEs || '', b.es || b.ms || b.defEs || ''].filter(Boolean).join(' + ');
        const fillLabelEn = [a.en || a.defEn || '', b.en || b.defEn || ''].filter(Boolean).join(' + ');
        const fillKey = `${a.id || a.es}__${b.id || b.es}`;
        const split = computeBaseExtensionSplit(es, altEs, en, item, {
          isDualBank: true,
          entryA: a,
          entryB: b,
          fillKey,
          fillLabelEs,
          fillLabelEn,
          bankName: st.banks.map((x) => (typeof x === 'string' ? x : 'custom')).join('+')
        });
        variations.push({
          fillKey,
          es,
          altEs,
          en,
          altEn,
          fillLabelEs,
          fillLabelEn,
          ...split
        });
      }
    }
  } else if (st.bank && typeof st.build === 'function') {
    const bank = getBankEntries(st.bank);
    for (const entry of bank) {
      if (typeof st.filter === 'function' && !st.filter(entry)) continue;
      const built = st.build(entry);
      if (!built || !built.es || !built.en) continue;
      const es = applySpanishContractions(built.es);
      const en = polishEnglishGrammar(built.en);
      const altEs = Array.isArray(built.altEs)
        ? built.altEs.map(applySpanishContractions).filter(Boolean)
        : [];
      const altEn = Array.isArray(built.altEn)
        ? built.altEn.map(polishEnglishGrammar).filter(Boolean)
        : [];
      const fillLabelEs = entry.es || entry.ms || entry.defEs || '';
      const fillLabelEn = entry.en || entry.defEn || '';
      const fillKey = String(entry.id || entry.es || variations.length);
      const split = computeBaseExtensionSplit(es, altEs, en, item, {
        isDualBank: false,
        entryA: entry,
        entryB: null,
        fillKey,
        fillLabelEs,
        fillLabelEn,
        bankName: typeof st.bank === 'string' ? st.bank : 'custom'
      });
      variations.push({
        fillKey,
        es,
        altEs,
        en,
        altEn,
        fillLabelEs,
        fillLabelEn,
        ...split
      });
    }
  }

  item._cachedVariations = variations;
  return variations;
}

export function getStructureVariationCount(item) {
  if (!item || !item.structure) return 0;
  return getAllVariationsForStructure(item).length;
}

/**
 * Picks the next dynamic variation for a scenario structure item.
 * - Never repeats `recentFillKey` back-to-back when > 1 variation exists.
 * - Prioritizes unseen fills and missed fills (`i > c`), then lightly practiced fills.
 */
export function resolveDynamicQuestionInstance(
  item,
  { fillStatsByItem = null, recentFillKey = '', forceFillKey = '', deterministicFirst = false } = {}
) {
  if (!item || !item.structure) return null;
  const variations = getAllVariationsForStructure(item);
  if (variations.length === 0) return null;

  let chosen = null;
  if (forceFillKey) {
    chosen = variations.find((v) => v.fillKey === forceFillKey) || null;
  }

  if (!chosen && deterministicFirst) {
    chosen = variations.find((v) => v.fillKey !== recentFillKey) || variations[0];
  }

  if (!chosen) {
    const itemFillStats =
      fillStatsByItem && typeof fillStatsByItem === 'object' ? fillStatsByItem[item.id] || {} : {};
    const candidates =
      variations.length > 1 && recentFillKey
        ? variations.filter((v) => v.fillKey !== recentFillKey)
        : variations;

    const weights = candidates.map((v) => {
      const rec = itemFillStats[v.fillKey];
      const c = Math.max(0, Number(rec?.c) || 0);
      const i = Math.max(0, Number(rec?.i) || 0);
      if (c === 0 && i === 0) return 6.0; // Unseen fill word -> highest priority
      if (i > c) return 5.0; // Struggling fill word -> reinforce
      if (c === 1) return 2.5;
      return 0.6; // Already practiced well -> still occasionally revisit
    });

    const totalWeight = weights.reduce((acc, w) => acc + w, 0);
    let r = Math.random() * totalWeight;
    chosen = candidates[candidates.length - 1];
    for (let idx = 0; idx < candidates.length; idx += 1) {
      r -= weights[idx];
      if (r <= 0) {
        chosen = candidates[idx];
        break;
      }
    }
  }

  return {
    itemId: item.id,
    isDynamic: true,
    fillKey: chosen.fillKey,
    es: chosen.es,
    altEs: chosen.altEs,
    en: chosen.en,
    altEn: chosen.altEn,
    hasExtension: Boolean(chosen.hasExtension),
    baseEs: chosen.baseEs || chosen.es,
    baseAltEs: Array.isArray(chosen.baseAltEs) ? chosen.baseAltEs : [],
    baseEn: chosen.baseEn || chosen.en,
    enSegments: Array.isArray(chosen.enSegments) ? chosen.enSegments : [],
    extensionEs: chosen.extensionEs || '',
    extensionEn: chosen.extensionEn || '',
    extensionKey: chosen.extensionKey || '',
    extensionBank: chosen.extensionBank || '',
    baseWordIndices: Array.isArray(chosen.baseWordIndices) ? chosen.baseWordIndices : [],
    extensionWordIndices: Array.isArray(chosen.extensionWordIndices) ? chosen.extensionWordIndices : [],
    patternEs: item.structure.patternEs || '',
    patternEn: item.structure.patternEn || '',
    variationCount: variations.length
  };
}
