import numpy as np
import torch
from faster_whisper import WhisperModel

NEUTRAL_PANAMA_PROMPT = (
    "Español de Panamá, nivel A1: hola, qué xopa, chévere, buenos días, buenas tardes, "
    "buenas noches, hasta luego, cero, uno, dos, tres, veintidós, cien, por favor, "
    "gracias, me llamo, tengo, quiero, sí, no."
)


class FastSpanishASR:
    def __init__(self, model_size: str = "auto", compute_type: str | None = None):
        use_cuda = torch.cuda.is_available()
        self.device = "cuda" if use_cuda else "cpu"
        resolved_model = (model_size or "auto").strip().lower()
        if resolved_model == "auto":
            # Auto-upgrade to large-v3-turbo when a CUDA GPU is present; keep fast 'small' on CPU
            resolved_model = "large-v3-turbo" if use_cuda else "small"
        resolved_compute = (compute_type or "").strip().lower()
        if not resolved_compute or resolved_compute == "auto":
            resolved_compute = "float16" if use_cuda else "int8"
        self.compute_type = resolved_compute
        self.model_size = resolved_model
        self.model = WhisperModel(self.model_size, device=self.device, compute_type=self.compute_type)

    def transcribe(self, audio_16k: np.ndarray, initial_prompt: str | None = None) -> dict:
        prompt = initial_prompt or NEUTRAL_PANAMA_PROMPT
        duration_sec = len(audio_16k) / 16000.0
        # For short utterances (<= 15s), disable aggressive Silero VAD because outer silence is
        # already trimmed and internal breaks are handled cleanly without dropping quiet words.
        use_vad = duration_sec > 15.0
        segments, info = self.model.transcribe(
            audio_16k,
            language="es",
            initial_prompt=prompt,
            beam_size=5,
            best_of=3,
            temperature=0.0,
            vad_filter=use_vad,
            no_speech_threshold=0.75,
            condition_on_previous_text=False,
        )
        texts = []
        logprobs = []
        segment_details = []
        for seg in segments:
            text_piece = seg.text.strip()
            texts.append(text_piece)
            avg_lp_val = float(seg.avg_logprob) if seg.avg_logprob is not None else None
            no_speech_val = (
                float(seg.no_speech_prob)
                if getattr(seg, "no_speech_prob", None) is not None
                else None
            )
            if avg_lp_val is not None:
                logprobs.append(avg_lp_val)
            segment_details.append({
                "startSec": round(float(seg.start), 3),
                "endSec": round(float(seg.end), 3),
                "text": text_piece,
                "avgLogprob": round(avg_lp_val, 3) if avg_lp_val is not None else None,
                "noSpeechProb": round(no_speech_val, 3) if no_speech_val is not None else None,
            })

        heard = " ".join(texts).strip()
        avg_lp = float(np.mean(logprobs)) if logprobs else -1.5
        return {
            "heard": heard,
            "avg_logprob": round(avg_lp, 3),
            "languageProb": round(float(getattr(info, "language_probability", 0.0) or 0.0), 3),
            "segments": segment_details,
        }
