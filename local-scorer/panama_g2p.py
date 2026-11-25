import re

_UNITS = {
    0: "cero", 1: "uno", 2: "dos", 3: "tres", 4: "cuatro",
    5: "cinco", 6: "seis", 7: "siete", 8: "ocho", 9: "nueve",
    10: "diez", 11: "once", 12: "doce", 13: "trece", 14: "catorce",
    15: "quince", 16: "dieciseis", 17: "diecisiete", 18: "dieciocho", 19: "diecinueve",
    20: "veinte", 21: "veintiuno", 22: "veintidos", 23: "veintitres", 24: "veinticuatro",
    25: "veinticinco", 26: "veintiseis", 27: "veintisiete", 28: "veintiocho", 29: "veintinueve",
}
_TENS = {
    30: "treinta", 40: "cuarenta", 50: "cincuenta",
    60: "sesenta", 70: "setenta", 80: "ochenta", 90: "noventa",
}
_HUNDREDS = {
    100: "cien", 200: "doscientos", 300: "trescientos", 400: "cuatrocientos",
    500: "quinientos", 600: "seiscientos", 700: "setecientos", 800: "ochocientos", 900: "novecientos",
}


def _int_to_spanish_words(n: int) -> str:
    if n in _UNITS:
        return _UNITS[n]
    if n < 100:
        t = (n // 10) * 10
        u = n % 10
        return _TENS[t] if u == 0 else f"{_TENS[t]} y {_UNITS[u]}"
    if n == 100:
        return "cien"
    if n < 200:
        return f"ciento {_int_to_spanish_words(n - 100)}"
    if n < 1000:
        h = (n // 100) * 100
        rem = n % 100
        return _HUNDREDS[h] if rem == 0 else f"{_HUNDREDS[h]} {_int_to_spanish_words(rem)}"
    if n == 1000:
        return "mil"
    return str(n)


def expand_digits_to_spanish(text: str) -> str:
    """Converts standalone Arabic digits (0–1000) in ASR output into Spanish words."""
    def _repl(match: re.Match) -> str:
        val = int(match.group(0))
        if 0 <= val <= 1000:
            return _int_to_spanish_words(val)
        return match.group(0)

    return re.sub(r"\b\d{1,4}\b", _repl, text)


def strip_punctuation(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[¿?¡!.,;:()'\"…\-]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_panamanian_phonetics(text: str) -> str:
    """
    Normalizes Spanish text into an approximate Panamanian sound string
    for fair comparison and GOP character/allophone tolerances.
    """
    t = expand_digits_to_spanish(strip_punctuation(text))
    # Panamanian slang: 'xopa'/'xopá' is often transcribed by ASR as 'sopa' or 'chopa'
    t = re.sub(r"\b(xopa|xopá|chopa)\b", "sopa", t)
    replacements = [
        ("qu", "k"),
        ("gu(?=[eiéí])", "g"),
        ("c(?=[eiéí])", "s"),   # Seseo: c(e/i) -> s
        ("z", "s"),              # Seseo: z -> s
        ("v", "b"),              # Betacism: v/b merge
        ("ll", "y"),             # Yeísmo: ll/y merge
        ("ch", "č"),
        ("rr", "R"),
        ("ñ", "ɲ"),
        ("h", ""),               # Silent h
        ("j", "x"),
        ("g(?=[eiéí])", "x"),
        ("c", "k"),
        ("á", "a"),
        ("é", "e"),
        ("í", "i"),
        ("ó", "o"),
        ("ú", "u"),
        ("ü", "u"),
    ]
    for pattern, repl in replacements:
        t = re.sub(pattern, repl, t)

    # Panamanian syllable/word-final -s aspiration/elision tolerance
    t = re.sub(r"s(?=\s|$)", "", t)
    return re.sub(r"\s+", " ", t).strip()


def _levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, start=1):
        curr = [i]
        for j, cb in enumerate(b, start=1):
            cost = 0 if ca == cb else 1
            curr.append(min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost))
        prev = curr
    return prev[-1]


def phonetic_similarity(heard: str, expected: str) -> float:
    """Returns normalized phonetic similarity in [0.0, 1.0] under Panamanian rules."""
    h_norm = normalize_panamanian_phonetics(heard).replace(" ", "")
    e_norm = normalize_panamanian_phonetics(expected).replace(" ", "")
    if not h_norm or not e_norm:
        return 0.0
    if h_norm == e_norm:
        return 1.0
    dist = _levenshtein(h_norm, e_norm)
    return max(0.0, 1.0 - dist / float(max(len(h_norm), len(e_norm))))


def is_same_word_panama(heard: str, expected: str) -> bool:
    """Checks if heard ASR transcript matches expected text under Panamanian rules."""
    if not heard or not expected:
        return False
    h_norm = normalize_panamanian_phonetics(heard)
    e_norm = normalize_panamanian_phonetics(expected)
    if not h_norm or not e_norm:
        return False
    if h_norm == e_norm:
        return True
    if h_norm.replace(" ", "") == e_norm.replace(" ", ""):
        return True
    return False


def match_slot_template(heard: str, slot_template: dict | None) -> tuple[bool, str]:
    """
    Validates an open-ended Spanish utterance against a grammatical slot template:
    e.g. prefixEs=['soy de', 'yo soy de'], suffixEs=[], midEs=[].
    Requires a matching Spanish frame plus at least one spoken word in each slot.
    Returns (matched, reason).
    """
    if not heard or not isinstance(slot_template, dict):
        return False, "Missing transcript or slot template."

    h_norm = normalize_panamanian_phonetics(heard)
    if not h_norm:
        return False, "No recognizable Spanish speech."
    h_words = h_norm.split()

    raw_prefixes = slot_template.get("prefixEs") or []
    norm_prefixes = sorted(
        {normalize_panamanian_phonetics(str(p)) for p in raw_prefixes if str(p).strip()},
        key=len,
        reverse=True,
    )

    remainder = None
    if norm_prefixes:
        for p_norm in norm_prefixes:
            if not p_norm:
                continue
            p_words = p_norm.split()
            if len(h_words) <= len(p_words):
                continue
            head_str = " ".join(h_words[: len(p_words)])
            if head_str == p_norm:
                remainder = " ".join(h_words[len(p_words) :]).strip()
                break
            if len(p_norm.replace(" ", "")) >= 6 and phonetic_similarity(head_str, p_norm) >= 0.88:
                remainder = " ".join(h_words[len(p_words) :]).strip()
                break
        if not remainder:
            pattern_hint = str(slot_template.get("patternEs") or "").strip()
            return False, f'Expected frame "{pattern_hint}" with your own word in the slot.'
    else:
        remainder = h_norm

    raw_suffixes = slot_template.get("suffixEs") or []
    norm_suffixes = sorted(
        {normalize_panamanian_phonetics(str(s)) for s in raw_suffixes if str(s).strip()},
        key=len,
        reverse=True,
    )
    slot_body = remainder
    if norm_suffixes:
        rem_words = remainder.split()
        matched_suffix = False
        for s_norm in norm_suffixes:
            s_words = s_norm.split()
            if len(rem_words) <= len(s_words):
                continue
            tail_str = " ".join(rem_words[-len(s_words) :])
            if tail_str == s_norm or (
                len(s_norm.replace(" ", "")) >= 5 and phonetic_similarity(tail_str, s_norm) >= 0.86
            ):
                slot_body = " ".join(rem_words[: -len(s_words)]).strip()
                matched_suffix = True
                break
        if not matched_suffix or not slot_body:
            pattern_hint = str(slot_template.get("patternEs") or "").strip()
            return False, f'Missing ending for pattern "{pattern_hint}".'

    raw_mids = slot_template.get("midEs") or []
    norm_mids = [normalize_panamanian_phonetics(str(m)) for m in raw_mids if str(m).strip()]
    if norm_mids:
        matched_mid = False
        padded_body = f" {slot_body} "
        for m_norm in norm_mids:
            marker = f" {m_norm} "
            if marker in padded_body:
                before, after = padded_body.split(marker, 1)
                if before.strip() and after.strip():
                    matched_mid = True
                    break
        if not matched_mid:
            pattern_hint = str(slot_template.get("patternEs") or "").strip()
            return False, f'Expected full pattern "{pattern_hint}".'

    if not slot_body.strip():
        pattern_hint = str(slot_template.get("patternEs") or "").strip()
        return False, f'Please fill in the open slot for "{pattern_hint}".'

    return True, "Matched open-slot Spanish frame."
