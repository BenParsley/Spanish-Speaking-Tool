import re
import numpy as np

STRONG_VOWELS = set("aeoáéó")
WEAK_VOWELS = set("iuü")
ACCENTED_VOWELS = set("áéíóú")
ALL_VOWELS = STRONG_VOWELS | WEAK_VOWELS | ACCENTED_VOWELS

UNSTRESSED_FUNCTION_WORDS = {
    "el", "la", "los", "las", "un", "una", "unos", "unas",
    "de", "del", "al", "en", "con", "por", "para", "sin", "sobre", "entre", "hasta",
    "que", "como", "pero", "porque", "cuando", "donde",
    "me", "te", "se", "nos", "le", "les", "lo", "mi", "mis", "tu", "tus", "su", "sus",
}

WH_QUESTION_STARTERS = {
    "qué", "que", "cómo", "como", "cuándo", "cuando", "dónde", "donde",
    "adónde", "adonde", "quién", "quien", "quiénes", "quienes",
    "cuál", "cual", "cuáles", "cuales", "cuánto", "cuanto",
    "cuánta", "cuanta", "cuántos", "cuantos", "cuántas", "cuantas",
    "por",
}

SOUND_COACHING_TIPS: dict[str, str] = {
    "rr": "Roll 'rr' with a quick tongue-tip trill behind your top teeth.",
    "r": "Tap 'r' once lightly against the ridge behind your top teeth (like the 'tt' in 'butter').",
    "ch": "Make 'ch' crisp like English 'church' (don't soften it to 'sh').",
    "ll": "In Panama, pronounce 'll' smoothly like English 'y' in 'yes'.",
    "y": "Pronounce 'y' smoothly like a soft English 'y' in 'yes'.",
    "ñ": "Press the middle of your tongue to the roof of your mouth for 'ñ' (like 'ny' in 'canyon').",
    "j": "In Panama, 'j' sounds like a soft, breathy English 'h'.",
    "qu": "In 'qu', the 'u' is silent — say a clean, crisp 'k' without a puff of air.",
    "gu": "In 'gue/gui', the 'u' is silent — say a smooth hard 'g'.",
    "a": "Keep Spanish 'a' open and pure ('ah'), never turning into 'uh'.",
    "á": "Stress the accented 'á' clearly with an open 'ah' sound.",
    "e": "Keep Spanish 'e' short and pure ('eh'), without gliding into 'ay'.",
    "é": "Stress the accented 'é' cleanly ('eh') without an English 'ey' glide.",
    "i": "Keep Spanish 'i' crisp and bright ('ee').",
    "í": "Hold and stress 'í' cleanly as a bright 'ee'.",
    "o": "Keep Spanish 'o' short and rounded ('oh') — avoid gliding into 'oh-w'.",
    "ó": "Stress 'ó' firmly with a pure rounded 'oh' sound.",
    "u": "Round your lips firmly for a clean Spanish 'u' ('oo').",
    "ú": "Stress 'ú' clearly with rounded lips ('oo').",
    "t": "Touch the tip of your tongue directly to your upper teeth for a crisp, unaspirated 't'.",
    "d": "Tap 'd' gently behind your upper teeth (and soften it slightly between vowels).",
    "p": "Say 'p' cleanly without a strong puff of English breath.",
    "b": "Keep 'b' soft with lips barely touching between vowels.",
    "v": "In Spanish, 'v' is pronounced like a soft 'b' (lips together, not teeth on lip).",
    "s": "Keep 's' crisp at the start of words; Panamanian final '-s' can be light.",
    "z": "In Panama (seseo), pronounce 'z' like a clean 's'.",
    "c": "Pronounce 'ce/ci' like 's' (Panamanian seseo), and 'ca/co/cu' like crisp 'k'.",
    "x": "In Panamanian 'xopa', 'x' sounds like 'sh'/'ch'; elsewhere like 'ks' or 's'.",
}


def count_word_syllables(word: str) -> int:
    """Counts approximate Spanish syllable nuclei in a single lowercase word."""
    w = re.sub(r"[^a-záéíóúüñ]", "", word.lower())
    if not w:
        return 0
    # Strip silent 'u' in que/qui/gue/gui (not güe/güi)
    w = re.sub(r"([qg])u(?=[eiéí])", r"\1", w)
    w = w.replace("h", "")

    nuclei = 0
    i = 0
    while i < len(w):
        ch = w[i]
        if ch in ALL_VOWELS:
            nuclei += 1
            # Consume diphthong / triphthong (weak+strong, strong+weak, weak+weak)
            while i + 1 < len(w) and w[i + 1] in ALL_VOWELS:
                cur_v = w[i]
                nxt_v = w[i + 1]
                # Two strong vowels or accented weak vowel creates hiatus (new syllable)
                if (cur_v in STRONG_VOWELS and nxt_v in STRONG_VOWELS) or (
                    cur_v in ACCENTED_VOWELS and cur_v in set("íú")
                ) or (nxt_v in ACCENTED_VOWELS and nxt_v in set("íú")):
                    break
                i += 1
        i += 1
    return max(1, nuclei)


def count_phrase_syllables(text: str) -> int:
    words = re.findall(r"[a-záéíóúüñ]+", text.lower())
    if not words:
        return 0
    return sum(count_word_syllables(w) for w in words)


def expected_stressed_syllable_index(word: str) -> tuple[int, int]:
    """
    Returns (stressed_syllable_index_0based, total_syllables) using standard
    Spanish orthographic stress rules.
    """
    w = re.sub(r"[^a-záéíóúüñ]", "", word.lower())
    if not w:
        return 0, 0
    w_clean = re.sub(r"([qg])u(?=[eiéí])", r"\1", w).replace("h", "")

    syllable_chunks = []
    i = 0
    while i < len(w_clean):
        if w_clean[i] in ALL_VOWELS:
            start = i
            while i + 1 < len(w_clean) and w_clean[i + 1] in ALL_VOWELS:
                cur_v = w_clean[i]
                nxt_v = w_clean[i + 1]
                if (cur_v in STRONG_VOWELS and nxt_v in STRONG_VOWELS) or (
                    cur_v in set("íú") or nxt_v in set("íú")
                ):
                    break
                i += 1
            syllable_chunks.append(w_clean[start : i + 1])
        i += 1

    total = len(syllable_chunks)
    if total <= 1:
        return 0, total

    # Rule 1: Explicit written accent always marks the stressed syllable
    for idx, chunk in enumerate(syllable_chunks):
        if any(c in ACCENTED_VOWELS for c in chunk):
            return idx, total

    # Rule 2: Ends in vowel, n, or s -> penultimate syllable
    if w[-1] in (ALL_VOWELS | {"n", "s"}):
        return max(0, total - 2), total

    # Rule 3: Ends in any other consonant -> final syllable
    return total - 1, total


def estimate_f0_hz(segment: np.ndarray, sr: int = 16000) -> float | None:
    """
    Lightweight normalized autocorrelation F0 estimator (75–380 Hz).
    Returns fundamental frequency in Hz, or None if unvoiced / too short.
    """
    if segment.size < int(sr * 0.025):
        return None
    seg = segment - float(np.mean(segment))
    energy = float(np.dot(seg, seg))
    if energy < 1e-5:
        return None

    min_lag = max(1, int(sr / 380.0))
    max_lag = min(segment.size - 1, int(sr / 75.0))
    if max_lag <= min_lag:
        return None

    # Center-clipped autocorrelation via FFT for speed
    n = 1
    while n < segment.size * 2:
        n *= 2
    spec = np.fft.rfft(seg, n=n)
    acf = np.fft.irfft(spec * np.conj(spec), n=n)[: max_lag + 1]
    if acf[0] <= 1e-8:
        return None

    acf_norm = acf[min_lag : max_lag + 1] / acf[0]
    best_rel = int(np.argmax(acf_norm))
    peak_val = float(acf_norm[best_rel])
    if peak_val < 0.32:
        return None
    best_lag = min_lag + best_rel
    return round(float(sr) / float(best_lag), 1)


def analyze_prosody(
    audio_16k: np.ndarray,
    target_text: str,
    char_details: list[dict],
    sr: int = 16000,
) -> dict:
    """
    Analyzes Spanish syllable stress on multisyllabic content words and
    rising pitch contour on yes/no questions. Returns advisory coaching info.
    """
    result = {
        "stressChecked": False,
        "stressMatched": True,
        "stressWord": None,
        "questionChecked": False,
        "questionIntonation": None,
        "pitchRatio": None,
        "tip": "",
    }
    if audio_16k.size < int(sr * 0.12) or not char_details:
        return result

    # 1. Word-level syllable stress analysis
    words = re.findall(r"[a-záéíóúüñ]+", target_text.lower())
    by_word: dict[int, list[dict]] = {}
    for cd in char_details:
        widx = cd.get("wordIndex")
        if widx is not None:
            by_word.setdefault(int(widx), []).append(cd)

    stress_issue_word = None
    stress_expected_idx = None
    stress_total_syl = None

    for widx, word in enumerate(words):
        if word in UNSTRESSED_FUNCTION_WORDS:
            continue
        exp_idx, total_syl = expected_stressed_syllable_index(word)
        if total_syl < 2:
            continue
        tokens = by_word.get(widx, [])
        # Collect vowel-group spans matching syllable nuclei
        vowel_spans = []
        i = 0
        while i < len(tokens):
            ch = str(tokens[i].get("ch", ""))
            if len(ch) == 1 and ch in ALL_VOWELS:
                s_ms = float(tokens[i].get("startMs", 0.0))
                e_ms = float(tokens[i].get("endMs", s_ms))
                # Merge adjacent vowels forming a diphthong
                while i + 1 < len(tokens):
                    nxt_ch = str(tokens[i + 1].get("ch", ""))
                    if len(nxt_ch) == 1 and nxt_ch in ALL_VOWELS:
                        if (ch in STRONG_VOWELS and nxt_ch in STRONG_VOWELS) or (
                            ch in set("íú") or nxt_ch in set("íú")
                        ):
                            break
                        e_ms = float(tokens[i + 1].get("endMs", e_ms))
                        ch = nxt_ch
                        i += 1
                    else:
                        break
                vowel_spans.append((s_ms, e_ms))
            i += 1

        if len(vowel_spans) != total_syl:
            continue

        prominences = []
        for s_ms, e_ms in vowel_spans:
            s_i = max(0, int((s_ms / 1000.0) * sr))
            e_i = min(audio_16k.size, max(s_i + 160, int((e_ms / 1000.0) * sr)))
            seg = audio_16k[s_i:e_i]
            rms = float(np.sqrt(np.mean(np.square(seg)))) if seg.size > 0 else 0.0
            dur = max(0.02, (e_ms - s_ms) / 1000.0)
            f0 = estimate_f0_hz(seg, sr=sr)
            prominences.append((rms, dur, f0))

        max_rms = max((p[0] for p in prominences), default=0.0)
        max_dur = max((p[1] for p in prominences), default=0.02)
        if max_rms < 0.01:
            continue

        scores = []
        for rms, dur, f0 in prominences:
            norm_e = rms / max_rms
            norm_d = dur / max_dur
            scores.append(0.65 * norm_e + 0.35 * norm_d)

        result["stressChecked"] = True
        exp_score = scores[exp_idx]
        best_idx = int(np.argmax(scores))
        best_score = scores[best_idx]
        # Flag only clear stress mismatch (expected syllable notably weaker than peak)
        if best_idx != exp_idx and exp_score < best_score * 0.72:
            stress_issue_word = word
            stress_expected_idx = exp_idx
            stress_total_syl = total_syl
            break

    if stress_issue_word:
        result["stressMatched"] = False
        result["stressWord"] = stress_issue_word
        pos_label = (
            "last"
            if stress_expected_idx == (stress_total_syl - 1)
            else ("second-to-last" if stress_expected_idx == (stress_total_syl - 2) else f"syllable {stress_expected_idx + 1}")
        )
        result["tip"] = f"Watch word stress on '{stress_issue_word}' — emphasize the {pos_label} syllable."

    # 2. Question intonation check (for yes/no questions without a WH-word starter)
    is_question = "?" in target_text or "¿" in target_text
    first_word = words[0] if words else ""
    is_yes_no_q = is_question and first_word not in WH_QUESTION_STARTERS
    if is_yes_no_q:
        frame_len = int(sr * 0.04)
        hop = int(sr * 0.02)
        f0_vals = []
        for pos in range(0, max(0, audio_16k.size - frame_len), hop):
            val = estimate_f0_hz(audio_16k[pos : pos + frame_len], sr=sr)
            if val is not None:
                f0_vals.append(val)
        if len(f0_vals) >= 6:
            split = max(2, int(len(f0_vals) * 0.65))
            early_f0 = float(np.median(f0_vals[:split]))
            late_f0 = float(np.median(f0_vals[split:]))
            if early_f0 > 0:
                ratio = round(late_f0 / early_f0, 3)
                result["questionChecked"] = True
                result["pitchRatio"] = ratio
                if ratio >= 1.04:
                    result["questionIntonation"] = "rising"
                elif ratio <= 0.94:
                    result["questionIntonation"] = "falling"
                    if not result["tip"]:
                        result["tip"] = "Raise your pitch slightly at the end for a natural Spanish yes/no question."
                else:
                    result["questionIntonation"] = "flat"

    return result


def build_coaching_feedback(
    weak_chars: list[str],
    overall: int,
    min_score: int = 90,
    fluency_details: dict | None = None,
    prosody: dict | None = None,
) -> str:
    """
    Produces concise, actionable Panamanian Spanish articulation, pacing, or
    prosody coaching feedback.
    """
    if weak_chars:
        unique_weak = list(dict.fromkeys(weak_chars))
        primary = unique_weak[0]
        tip = SOUND_COACHING_TIPS.get(primary)
        if len(unique_weak) == 1 and tip:
            return f"Focus on '{primary}': {tip}"
        listed = ", ".join(unique_weak[:3])
        if tip:
            return f"Unclear on '{listed}'. {tip}"
        return f"Unclear sounds on: '{listed}' — articulate every sound clearly."

    if fluency_details:
        if fluency_details.get("pauseCount", 0) > 0 and fluency_details.get("maxPauseMs", 0) >= 480:
            return "Good sounds — try connecting the words smoothly without pausing mid-phrase."
        rate = fluency_details.get("syllablesPerSec")
        if isinstance(rate, (int, float)) and rate > 7.5 and overall < min_score:
            return "A bit too fast — slow down slightly so each Spanish vowel rings clearly."
        if isinstance(rate, (int, float)) and rate < 1.8 and overall < min_score:
            return "Good clarity — try speaking at a slightly steadier, natural rhythm."

    if prosody and prosody.get("tip") and overall < 98:
        return str(prosody["tip"])

    if overall < min_score:
        return f"Pronunciation below {min_score}% threshold — articulate each vowel crisply."

    return ""
