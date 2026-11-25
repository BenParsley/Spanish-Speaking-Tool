import re
import numpy as np
import torch
import torch.nn.functional as F
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

from coaching import analyze_prosody, build_coaching_feedback, count_phrase_syllables

MODEL_ID = "jonatasgrosman/wav2vec2-large-xlsr-53-spanish"
VOWELS = set("aeiouáéíóúü")
FRONT_VOWELS = set("eiéí")
ACCENT_TO_BASE_VOWEL = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ü": "u"}
BASE_TO_ACCENT_VOWEL = {"a": "á", "e": "é", "i": "í", "o": "ó", "u": "ú"}


class PanamaGOPScorer:
    def __init__(self, device: str | None = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.processor = Wav2Vec2Processor.from_pretrained(MODEL_ID)
        self.model = Wav2Vec2ForCTC.from_pretrained(MODEL_ID).to(self.device)
        self.model.eval()
        self.vocab = self.processor.tokenizer.get_vocab()
        self.blank_id = self.processor.tokenizer.pad_token_id

    def _text_to_token_items(self, text: str) -> list[dict]:
        """
        Converts Spanish text into CTC token items while respecting Spanish
        digraphs (ch, ll, rr, silent-u qu/gu) and Panamanian phonetic context.
        """
        clean = re.sub(r"[¿?¡!.,;:()'\"-]", "", text.lower()).strip()
        clean = re.sub(r"\s+", " ", clean)

        items: list[dict] = []
        word_idx = 0
        group_id = 0
        i = 0
        n = len(clean)

        while i < n:
            ch = clean[i]
            if ch == " ":
                word_idx += 1
                i += 1
                continue

            prev_ch = clean[i - 1] if i > 0 else " "
            next_ch = clean[i + 1] if i + 1 < n else " "
            next2_ch = clean[i + 2] if i + 2 < n else " "

            # Digraph: 'ch' (preserve 'h' inside 'ch' instead of dropping it!)
            if ch == "c" and next_ch == "h" and "c" in self.vocab and "h" in self.vocab:
                gid = group_id
                group_id += 1
                items.append({
                    "ch": "c",
                    "unit": "ch",
                    "group_id": gid,
                    "word_idx": word_idx,
                    "tid": self.vocab["c"],
                    "is_coda_s": False,
                    "is_soft_d": False,
                    "is_seseo": False,
                    "is_yeismo": False,
                    "is_qu": False,
                    "is_gu": False,
                    "is_jota": False,
                    "is_digraph": True,
                })
                items.append({
                    "ch": "h",
                    "unit": "ch",
                    "group_id": gid,
                    "word_idx": word_idx,
                    "tid": self.vocab["h"],
                    "is_coda_s": False,
                    "is_soft_d": False,
                    "is_seseo": False,
                    "is_yeismo": False,
                    "is_qu": False,
                    "is_gu": False,
                    "is_jota": False,
                    "is_digraph": True,
                })
                i += 2
                continue

            # Standalone silent 'h'
            if ch == "h":
                i += 1
                continue

            # Digraph: 'qu' before e/i -> 'u' is silent in Spanish!
            if ch == "q" and next_ch == "u" and next2_ch in FRONT_VOWELS:
                q_tid = self.vocab.get("q", self.vocab.get("c"))
                if q_tid is not None:
                    gid = group_id
                    group_id += 1
                    items.append({
                        "ch": "q",
                        "unit": "qu",
                        "group_id": gid,
                        "word_idx": word_idx,
                        "tid": q_tid,
                        "is_coda_s": False,
                        "is_soft_d": False,
                        "is_seseo": False,
                        "is_yeismo": False,
                        "is_qu": True,
                        "is_gu": False,
                        "is_jota": False,
                        "is_digraph": True,
                    })
                i += 2
                continue

            # Digraph: 'gu' before e/i -> 'u' is silent (not 'güe'/'güi')
            if ch == "g" and next_ch == "u" and next2_ch in FRONT_VOWELS:
                if "g" in self.vocab:
                    gid = group_id
                    group_id += 1
                    items.append({
                        "ch": "g",
                        "unit": "gu",
                        "group_id": gid,
                        "word_idx": word_idx,
                        "tid": self.vocab["g"],
                        "is_coda_s": False,
                        "is_soft_d": False,
                        "is_seseo": False,
                        "is_yeismo": False,
                        "is_qu": False,
                        "is_gu": True,
                        "is_jota": False,
                        "is_digraph": True,
                    })
                i += 2
                continue

            # Digraph: 'll' -> Panamanian yeísmo (shares credit with 'y')
            if ch == "l" and next_ch == "l" and "l" in self.vocab:
                gid = group_id
                group_id += 1
                for _ in range(2):
                    items.append({
                        "ch": "l",
                        "unit": "ll",
                        "group_id": gid,
                        "word_idx": word_idx,
                        "tid": self.vocab["l"],
                        "is_coda_s": False,
                        "is_soft_d": False,
                        "is_seseo": False,
                        "is_yeismo": True,
                        "is_qu": False,
                        "is_gu": False,
                        "is_jota": False,
                        "is_digraph": True,
                    })
                i += 2
                continue

            # Digraph: 'rr' -> rolled Spanish trill
            if ch == "r" and next_ch == "r" and "r" in self.vocab:
                gid = group_id
                group_id += 1
                for _ in range(2):
                    items.append({
                        "ch": "r",
                        "unit": "rr",
                        "group_id": gid,
                        "word_idx": word_idx,
                        "tid": self.vocab["r"],
                        "is_coda_s": False,
                        "is_soft_d": False,
                        "is_seseo": False,
                        "is_yeismo": False,
                        "is_qu": False,
                        "is_gu": False,
                        "is_jota": False,
                        "is_digraph": True,
                    })
                i += 2
                continue

            if ch not in self.vocab:
                base_ch = ACCENT_TO_BASE_VOWEL.get(ch)
                if not base_ch or base_ch not in self.vocab:
                    i += 1
                    continue

            is_coda_s = ch == "s" and (next_ch == " " or next_ch not in VOWELS)
            is_soft_d = ch == "d" and (prev_ch in VOWELS and next_ch in VOWELS)
            is_seseo = ch == "z" or (ch == "c" and next_ch in FRONT_VOWELS)
            is_jota = ch == "j" or (ch == "g" and next_ch in FRONT_VOWELS)
            # Panamanian slang ("xopá" -> "sopá") & word-initial 'x' pronounced /s/
            is_panama_xopa_s = ch == "x" and prev_ch == " "
            base_vowel = ACCENT_TO_BASE_VOWEL.get(ch)
            # Align accented vowels using base vowel when available (Wav2Vec2 Spanish CTC
            # emits unaccented vowels far more reliably than accented tokens); align
            # word-initial 'x' ("xopá") using 's' so Panamanian pronunciation aligns cleanly.
            if is_panama_xopa_s and "s" in self.vocab:
                align_tid = self.vocab["s"]
            elif base_vowel and base_vowel in self.vocab:
                align_tid = self.vocab[base_vowel]
            else:
                align_tid = self.vocab[ch]
            gid = group_id
            group_id += 1
            items.append({
                "ch": ch,
                "unit": ch,
                "group_id": gid,
                "word_idx": word_idx,
                "tid": align_tid,
                "orig_tid": self.vocab.get(ch, align_tid),
                "base_vowel": base_vowel,
                "is_coda_s": is_coda_s,
                "is_soft_d": is_soft_d,
                "is_seseo": is_seseo,
                "is_panama_xopa_s": is_panama_xopa_s,
                "is_yeismo": ch == "y",
                "is_qu": False,
                "is_gu": False,
                "is_jota": is_jota,
                "is_digraph": False,
            })
            i += 1

        return items

    def _ctc_forced_align(self, log_probs: np.ndarray, token_ids: list[int]) -> list[tuple[int, int, int]]:
        """
        Aligns non-blank token_ids across T acoustic frames using CTC DP.
        Returns list of (token_id, start_frame, end_frame).
        """
        T = log_probs.shape[0]
        if not token_ids or T < len(token_ids):
            return []

        ext = [self.blank_id]
        for tid in token_ids:
            ext.extend([tid, self.blank_id])
        S = len(ext)

        dp = np.full((T, S), -1e9, dtype=np.float32)
        bp = np.zeros((T, S), dtype=np.int32)
        dp[0, 0] = log_probs[0, ext[0]]
        if S > 1:
            dp[0, 1] = log_probs[0, ext[1]]

        for t in range(1, T):
            for s in range(S):
                best_prev = s
                best_val = dp[t - 1, s]
                if s > 0 and dp[t - 1, s - 1] > best_val:
                    best_val = dp[t - 1, s - 1]
                    best_prev = s - 1
                if s > 1 and ext[s] != self.blank_id and ext[s] != ext[s - 2]:
                    if dp[t - 1, s - 2] > best_val:
                        best_val = dp[t - 1, s - 2]
                        best_prev = s - 2
                dp[t, s] = best_val + log_probs[t, ext[s]]
                bp[t, s] = best_prev

        state = S - 1 if dp[T - 1, S - 1] > dp[T - 1, S - 2] else S - 2
        path = [0] * T
        for t in range(T - 1, -1, -1):
            path[t] = state
            state = bp[t, state]

        spans = []
        for idx, tid in enumerate(token_ids):
            target_s = 2 * idx + 1
            frames = [t for t, st in enumerate(path) if st == target_s]
            if frames:
                spans.append((tid, frames[0], frames[-1]))
        return spans

    def _compute_fair_fluency(self, target_text: str, char_details: list[dict]) -> tuple[int, dict]:
        """
        Fair A1 fluency score based on a natural syllable-rate band (2.2–6.5 syl/s)
        plus inter-word pause detection (penalizing mid-phrase breaks > 420 ms).
        """
        if not char_details:
            return 0, {
                "syllables": 0,
                "speechSec": 0.0,
                "syllablesPerSec": 0.0,
                "pauseCount": 0,
                "maxPauseMs": 0.0,
                "rateScore": 0.0,
                "pausePenalty": 0.0,
            }

        start_ms = float(char_details[0]["startMs"])
        end_ms = float(char_details[-1]["endMs"])
        speech_sec = max(0.15, (end_ms - start_ms) / 1000.0)
        syllables = max(1, count_phrase_syllables(target_text))
        syl_per_sec = syllables / speech_sec

        # Natural comfort band: clear A1 speaking (2.2–6.5 syl/s) receives 100
        if 2.2 <= syl_per_sec <= 6.5:
            rate_score = 100.0
        elif syl_per_sec < 2.2:
            rate_score = max(45.0, 100.0 - (2.2 - syl_per_sec) * 35.0)
        else:
            rate_score = max(55.0, 100.0 - (syl_per_sec - 6.5) * 20.0)

        # Inter-word pause check (gaps > 420 ms between words inside a single phrase)
        pause_count = 0
        max_pause_ms = 0.0
        pause_penalty = 0.0
        for idx in range(1, len(char_details)):
            prev_cd = char_details[idx - 1]
            cur_cd = char_details[idx]
            if cur_cd.get("wordIndex") != prev_cd.get("wordIndex"):
                gap_ms = max(0.0, float(cur_cd["startMs"]) - float(prev_cd["endMs"]))
                if gap_ms > max_pause_ms:
                    max_pause_ms = gap_ms
                if gap_ms > 420.0:
                    pause_count += 1
                    pause_penalty += (gap_ms - 420.0) / 28.0
        pause_penalty = min(35.0, pause_penalty)

        fluency = int(round(max(0.0, min(100.0, rate_score - pause_penalty))))
        return fluency, {
            "syllables": syllables,
            "speechSec": round(speech_sec, 2),
            "syllablesPerSec": round(syl_per_sec, 2),
            "pauseCount": pause_count,
            "maxPauseMs": round(max_pause_ms, 1),
            "rateScore": round(rate_score, 1),
            "pausePenalty": round(pause_penalty, 1),
        }

    @torch.inference_mode()
    def score(
        self,
        audio_16k: np.ndarray,
        target_text: str,
        min_score: int = 90,
        enable_prosody: bool = True,
    ) -> dict:
        inputs = self.processor(audio_16k, sampling_rate=16000, return_tensors="pt")
        logits = self.model(inputs.input_values.to(self.device)).logits[0]
        log_probs = F.log_softmax(logits, dim=-1).cpu().numpy()

        pred_ids = torch.argmax(logits, dim=-1)
        ctc_heard = self.processor.decode(pred_ids).strip()

        items = self._text_to_token_items(target_text)
        token_ids = [it["tid"] for it in items]
        total_frames = int(log_probs.shape[0])
        audio_ms = (len(audio_16k) / 16000.0) * 1000.0
        frame_ms = audio_ms / max(1, total_frames)

        spans = self._ctc_forced_align(log_probs, token_ids)
        if not spans or len(spans) != len(items):
            return {
                "score": 0,
                "accuracy": 0,
                "fluency": 0,
                "ctc_heard": ctc_heard,
                "weak_chars": [],
                "char_details": [],
                "fluency_details": {},
                "prosody": {},
                "total_frames": total_frames,
                "aligned_tokens": len(spans),
                "expected_tokens": len(items),
                "feedback": "Could not detect clear speech — try speaking closer to the mic.",
            }

        s_id = self.vocab.get("s")
        b_id = self.vocab.get("b")
        v_id = self.vocab.get("v")
        y_id = self.vocab.get("y")
        l_id = self.vocab.get("l")
        c_id = self.vocab.get("c")
        k_id = self.vocab.get("k")
        j_id = self.vocab.get("j")
        g_id = self.vocab.get("g")

        # Score each CTC token, then group multi-token digraphs (ch, ll, rr) into single units
        grouped: dict[int, dict] = {}
        group_order: list[int] = []

        for idx, (tid, t_start, t_end) in enumerate(spans):
            meta = items[idx]
            ch = meta["ch"]
            frame_slice = log_probs[t_start : t_end + 1]

            alt_ids = [tid]
            orig_tid = meta.get("orig_tid")
            if orig_tid is not None and orig_tid != tid:
                alt_ids.append(orig_tid)
            flags: list[str] = []
            # Accented & unaccented vowels share the same Spanish acoustic vowel quality
            base_v = meta.get("base_vowel")
            if base_v and base_v in self.vocab:
                alt_ids.append(self.vocab[base_v])
                flags.append("accent_vowel")
            elif ch in BASE_TO_ACCENT_VOWEL and BASE_TO_ACCENT_VOWEL[ch] in self.vocab:
                alt_ids.append(self.vocab[BASE_TO_ACCENT_VOWEL[ch]])
            if meta.get("is_panama_xopa_s") and s_id is not None:
                alt_ids.append(s_id)
                flags.append("panama_xopa_s")
            if meta["is_seseo"] and s_id is not None:
                alt_ids.append(s_id)
                flags.append("seseo")
            if ch in ("b", "v") and b_id is not None and v_id is not None:
                alt_ids.extend([b_id, v_id])
                flags.append("betacism")
            if meta["is_yeismo"] and y_id is not None and l_id is not None:
                alt_ids.extend([y_id, l_id])
                flags.append("yeismo")
            if meta["is_qu"]:
                for alt in (c_id, k_id):
                    if alt is not None:
                        alt_ids.append(alt)
                flags.append("digraph_qu")
            if meta["is_gu"] and g_id is not None:
                alt_ids.append(g_id)
                flags.append("digraph_gu")
            if meta["is_jota"]:
                for alt in (j_id, g_id):
                    if alt is not None:
                        alt_ids.append(alt)
                flags.append("panama_jota")

            alt_ids = list(dict.fromkeys(alt_ids))
            target_lp = float(np.mean(np.max(frame_slice[:, alt_ids], axis=-1)))
            competitor = np.copy(frame_slice)
            competitor[:, self.blank_id] = -1e9
            best_lp = float(np.mean(np.max(competitor, axis=-1)))
            raw_gop = target_lp - best_lp  # <= 0; near 0 means clean match
            gop = raw_gop

            # Panamanian tolerances: soft/aspirated coda 's' and intervocalic 'd'
            if meta["is_coda_s"] and gop > -3.5:
                gop = max(gop, -0.35)
                flags.append("panama_coda_s")
            if meta["is_soft_d"] and gop > -2.8:
                gop = max(gop, -0.45)
                flags.append("panama_soft_d")

            if meta["is_digraph"] and meta["unit"] in ("ch", "ll", "rr"):
                flags.append(f"digraph_{meta['unit']}")

            gid = meta["group_id"]
            if gid not in grouped:
                group_order.append(gid)
                grouped[gid] = {
                    "unit": meta["unit"],
                    "word_idx": meta["word_idx"],
                    "t_start": t_start,
                    "t_end": t_end,
                    "raw_gops": [raw_gop],
                    "adj_gops": [gop],
                    "flags": list(flags),
                }
            else:
                g_entry = grouped[gid]
                g_entry["t_start"] = min(g_entry["t_start"], t_start)
                g_entry["t_end"] = max(g_entry["t_end"], t_end)
                g_entry["raw_gops"].append(raw_gop)
                g_entry["adj_gops"].append(gop)
                for fl in flags:
                    if fl not in g_entry["flags"]:
                        g_entry["flags"].append(fl)

        char_scores: list[float] = []
        weak_chars: list[str] = []
        char_details: list[dict] = []

        for gid in group_order:
            g_entry = grouped[gid]
            unit = g_entry["unit"]
            avg_raw = float(np.mean(g_entry["raw_gops"]))
            avg_adj = float(np.mean(g_entry["adj_gops"]))
            # Aggressive GOP mapping: [-3.85, 0.0] -> [0, 100]
            char_pct = max(0.0, min(100.0, 100.0 + avg_adj * 26.0))
            char_scores.append(char_pct)
            if char_pct < 80.0:
                weak_chars.append(unit)
            char_details.append({
                "ch": unit,
                "wordIndex": g_entry["word_idx"],
                "startMs": round(g_entry["t_start"] * frame_ms, 1),
                "endMs": round((g_entry["t_end"] + 1) * frame_ms, 1),
                "rawGop": round(avg_raw, 3),
                "adjustedGop": round(avg_adj, 3),
                "score": round(char_pct, 1),
                "flags": g_entry["flags"],
            })

        accuracy = int(round(float(np.mean(char_scores))))
        fluency, fluency_details = self._compute_fair_fluency(target_text, char_details)
        overall = int(round(accuracy * 0.90 + fluency * 0.10))

        prosody = (
            analyze_prosody(audio_16k, target_text, char_details)
            if enable_prosody
            else {}
        )
        feedback = build_coaching_feedback(
            weak_chars=weak_chars,
            overall=overall,
            min_score=min_score,
            fluency_details=fluency_details,
            prosody=prosody,
        )

        return {
            "score": overall,
            "accuracy": accuracy,
            "fluency": fluency,
            "ctc_heard": ctc_heard,
            "weak_chars": weak_chars,
            "char_details": char_details,
            "fluency_details": fluency_details,
            "prosody": prosody,
            "total_frames": total_frames,
            "aligned_tokens": len(spans),
            "expected_tokens": len(items),
            "feedback": feedback,
        }
