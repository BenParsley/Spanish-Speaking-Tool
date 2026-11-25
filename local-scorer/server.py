import asyncio
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
import hashlib
import importlib.util
import json
import os
import shutil
import threading
import time
import uuid
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from asr_checker import FastSpanishASR
from audio_utils import PYAV_AVAILABLE, compress_long_pauses, decode_to_16k_mono, preprocess_audio
from gop_scorer import MODEL_ID as GOP_MODEL_ID, PanamaGOPScorer
from panama_g2p import (
    is_same_word_panama,
    match_slot_template,
    normalize_panamanian_phonetics,
    phonetic_similarity,
    strip_punctuation,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")
TTS_CACHE_DIR = os.path.join(BASE_DIR, ".tts-cache")


def _load_server_config() -> dict:
    defaults = {
        "asrModelSize": "small",
        "asrComputeType": "auto",
        "defaultMinScore": 90,
        "enableAgc": True,
        "enableSilenceTrim": True,
        "enableProsodyCoaching": True,
        "whisperBiasPrompt": False,
        "ttsVoiceFemale": "es-PA-MargaritaNeural",
        "ttsVoiceMale": "es-PA-RobertoNeural",
        "ttsVoiceEnglishFemale": "en-US-AriaNeural",
        "ttsVoiceEnglishMale": "en-US-GuyNeural",
    }
    try:
        if os.path.exists(CONFIG_PATH):
            with open(CONFIG_PATH, "r", encoding="utf-8") as fh:
                loaded = json.load(fh)
                if isinstance(loaded, dict):
                    defaults.update(loaded)
    except Exception:
        pass
    return defaults


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return bool(default)
    return raw.strip().lower() in ("1", "true", "yes", "on")


SERVER_CONFIG = _load_server_config()

ASR_MODEL_SIZE = os.getenv("LOCAL_SCORER_ASR_MODEL", str(SERVER_CONFIG.get("asrModelSize", "auto")))
ASR_COMPUTE_TYPE = os.getenv("LOCAL_SCORER_COMPUTE_TYPE", str(SERVER_CONFIG.get("asrComputeType", "auto")))
DEFAULT_MIN_SCORE = int(os.getenv("LOCAL_SCORER_MIN_SCORE", str(SERVER_CONFIG.get("defaultMinScore", 90))))
ENABLE_HIGHPASS = _env_bool("LOCAL_SCORER_ENABLE_HIGHPASS", bool(SERVER_CONFIG.get("enableHighPassFilter", True)))
ENABLE_AGC = _env_bool("LOCAL_SCORER_ENABLE_AGC", bool(SERVER_CONFIG.get("enableAgc", True)))
ENABLE_SILENCE_TRIM = _env_bool("LOCAL_SCORER_ENABLE_SILENCE_TRIM", bool(SERVER_CONFIG.get("enableSilenceTrim", True)))
ENABLE_PROSODY = _env_bool("LOCAL_SCORER_ENABLE_PROSODY", bool(SERVER_CONFIG.get("enableProsodyCoaching", True)))
WHISPER_BIAS_PROMPT = _env_bool("LOCAL_SCORER_WHISPER_BIAS_PROMPT", bool(SERVER_CONFIG.get("whisperBiasPrompt", False)))
SKIP_BACKGROUND_LOAD = _env_bool("LOCAL_SCORER_SKIP_AUTOLOAD", False)
TTS_AVAILABLE = importlib.util.find_spec("edge_tts") is not None
SERVER_START_TIME = time.time()

gop_scorer: PanamaGOPScorer | None = None
asr_engine: FastSpanishASR | None = None
model_status: str = "loading"  # "loading" | "ready" | "error"
model_load_error: str | None = None
model_load_duration_ms: float | None = None
inference_executor: ThreadPoolExecutor | None = None

server_stats = {
    "totalRequests": 0,
    "passedCount": 0,
    "failedCount": 0,
    "wrongWordCount": 0,
    "altRescoreCount": 0,
    "errorCount": 0,
    "totalLatencyMs": 0.0,
    "lastLatencyMs": None,
}


def _load_models_worker():
    """Loads Wav2Vec2 GOP and Faster-Whisper in a background thread so /health never blocks."""
    global gop_scorer, asr_engine, model_status, model_load_error, model_load_duration_ms
    t0 = time.perf_counter()
    try:
        model_status = "loading"
        model_load_error = None
        loaded_gop = PanamaGOPScorer()
        loaded_asr = FastSpanishASR(model_size=ASR_MODEL_SIZE, compute_type=ASR_COMPUTE_TYPE)
        gop_scorer = loaded_gop
        asr_engine = loaded_asr
        model_load_duration_ms = round((time.perf_counter() - t0) * 1000.0, 1)
        model_status = "ready"
    except Exception as exc:
        model_load_error = str(exc)
        model_status = "error"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global inference_executor
    inference_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="scorer")
    if not SKIP_BACKGROUND_LOAD and (gop_scorer is None or asr_engine is None):
        loader_thread = threading.Thread(target=_load_models_worker, name="model-loader", daemon=True)
        loader_thread.start()
    try:
        yield
    finally:
        if inference_executor is not None:
            inference_executor.shutdown(wait=False)
            inference_executor = None


app = FastAPI(title="Local Panamanian Spanish Scorer", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


SKIP_VOICE_COMMANDS = {
    "skip",
    "eskip",
    "esquip",
    "skip it",
    "skip this",
    "skip word",
    "skip please",
    "pass",
    "saltar",
    "pasar",
}

REPEAT_VOICE_COMMANDS = {
    "repeat",
    "repeat prompt",
    "again",
    "say that again",
    "what was that",
    "hear it",
    "play it",
    "play again",
    "say it again",
    "repetir",
    "escuchar",
}

HEAR_SLOW_VOICE_COMMANDS = {
    "slow",
    "slower",
    "slowly",
    "hear spanish",
    "more slowly",
    "mas despacio",
    "más despacio",
    "despacio",
    "lento",
    "mas lento",
    "más lento",
}

WORD_BY_WORD_VOICE_COMMANDS = {
    "word by word",
    "palabra por palabra",
    "break it down",
}

RETRY_VOICE_COMMANDS = {
    "retry",
    "try again",
    "otra vez",
    "de nuevo",
    "intentar de nuevo",
}

NEXT_VOICE_COMMANDS = {
    "next",
    "continue",
    "next word",
    "neks",
    "siguiente",
    "continuar",
}

CANCEL_VOICE_COMMANDS = {
    "cancel",
    "redo",
    "start over",
    "cancelar",
    "borrar",
}

PAUSE_VOICE_COMMANDS = {
    "pause",
    "stop",
    "stop listening",
    "pausa",
    "parar",
    "detener",
}

VOICE_COMMAND_SETS = (
    ("skip", SKIP_VOICE_COMMANDS),
    ("repeat", REPEAT_VOICE_COMMANDS),
    ("hear_slow", HEAR_SLOW_VOICE_COMMANDS),
    ("word_by_word", WORD_BY_WORD_VOICE_COMMANDS),
    ("retry", RETRY_VOICE_COMMANDS),
    ("next", NEXT_VOICE_COMMANDS),
    ("cancel", CANCEL_VOICE_COMMANDS),
    ("pause", PAUSE_VOICE_COMMANDS),
)


def is_skip_command(heard: str, expected_es: str = "") -> bool:
    clean_heard = strip_punctuation(heard)
    if not clean_heard:
        return False
    if expected_es and clean_heard == strip_punctuation(expected_es):
        return False
    return clean_heard in SKIP_VOICE_COMMANDS


def is_repeat_command(heard: str, expected_es: str = "") -> bool:
    clean_heard = strip_punctuation(heard)
    if not clean_heard:
        return False
    if expected_es and clean_heard == strip_punctuation(expected_es):
        return False
    return clean_heard in REPEAT_VOICE_COMMANDS


def detect_voice_command(heard: str, expected_candidates: list[str] | None = None) -> str | None:
    clean_heard = strip_punctuation(heard)
    if not clean_heard:
        return None
    if expected_candidates:
        for cand in expected_candidates:
            if not cand:
                continue
            if clean_heard == strip_punctuation(cand) or is_same_word_panama(clean_heard, cand):
                return None
    for cmd_name, cmd_set in VOICE_COMMAND_SETS:
        if clean_heard in cmd_set:
            return cmd_name
    return None


def _timed_gop(wav, target_text: str, min_score: int) -> tuple[dict, float]:
    t0 = time.perf_counter()
    res = gop_scorer.score(wav, target_text, min_score=min_score, enable_prosody=ENABLE_PROSODY)
    return res, round((time.perf_counter() - t0) * 1000.0, 1)


def _timed_asr(wav, initial_prompt: str | None) -> tuple[dict, float]:
    t0 = time.perf_counter()
    res = asr_engine.transcribe(wav, initial_prompt=initial_prompt)
    return res, round((time.perf_counter() - t0) * 1000.0, 1)


@app.get("/health")
def health():
    total = server_stats["totalRequests"]
    models_ready = gop_scorer is not None and asr_engine is not None
    effective_status = "ready" if models_ready else model_status
    return {
        "ok": True,
        "modelsLoaded": models_ready,
        "modelStatus": effective_status,
        "loadError": model_load_error,
        "loadDurationMs": model_load_duration_ms,
        "ffmpegAvailable": shutil.which("ffmpeg") is not None,
        "ttsAvailable": TTS_AVAILABLE,
        "defaultMinScore": DEFAULT_MIN_SCORE,
        "device": gop_scorer.device if gop_scorer else None,
        "gopModel": GOP_MODEL_ID,
        "asrModel": getattr(asr_engine, "model_size", ASR_MODEL_SIZE) if asr_engine else ASR_MODEL_SIZE,
        "asrComputeType": asr_engine.compute_type if asr_engine else None,
        "features": {
            "parallelScoring": True,
            "pyavDecode": PYAV_AVAILABLE,
            "inMemoryFfmpegPipe": True,
            "highPassFilter": ENABLE_HIGHPASS,
            "silenceTrim": ENABLE_SILENCE_TRIM,
            "agc": ENABLE_AGC,
            "digraphGop": True,
            "fairFluency": True,
            "prosodyCoaching": ENABLE_PROSODY,
            "unbiasedAsr": not WHISPER_BIAS_PROMPT,
            "matchedAltRescore": True,
            "slotTemplateScoring": True,
        },
        "uptimeSeconds": round(time.time() - SERVER_START_TIME, 1),
        "stats": {
            "totalRequests": total,
            "passedCount": server_stats["passedCount"],
            "failedCount": server_stats["failedCount"],
            "wrongWordCount": server_stats["wrongWordCount"],
            "altRescoreCount": server_stats["altRescoreCount"],
            "errorCount": server_stats["errorCount"],
            "lastLatencyMs": server_stats["lastLatencyMs"],
            "avgLatencyMs": round(server_stats["totalLatencyMs"] / total, 1) if total > 0 else None,
        },
    }


@app.get("/tts")
async def synthesize_panamanian_tts(
    text: str = Query(..., min_length=1, max_length=240),
    gender: str = Query("female"),
    rate: float = Query(1.0),
    lang: str = Query("es"),
):
    if not TTS_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="Optional edge-tts package is not installed in local-scorer/.venv.",
        )
    import edge_tts  # type: ignore

    clean_text = text.strip()
    is_english = str(lang or "es").strip().lower().startswith("en")
    if is_english:
        voice = (
            str(SERVER_CONFIG.get("ttsVoiceEnglishMale", "en-US-GuyNeural"))
            if str(gender).lower() == "male"
            else str(SERVER_CONFIG.get("ttsVoiceEnglishFemale", "en-US-AriaNeural"))
        )
    else:
        voice = (
            str(SERVER_CONFIG.get("ttsVoiceMale", "es-PA-RobertoNeural"))
            if str(gender).lower() == "male"
            else str(SERVER_CONFIG.get("ttsVoiceFemale", "es-PA-MargaritaNeural"))
        )
    clamped_rate = max(0.5, min(1.5, float(rate)))
    pct_delta = int(round((clamped_rate - 1.0) * 100))
    rate_str = f"{pct_delta:+d}%"

    os.makedirs(TTS_CACHE_DIR, exist_ok=True)
    cache_key = hashlib.sha256(f"{voice}|{rate_str}|{clean_text}".encode("utf-8")).hexdigest()[:24]
    out_path = os.path.join(TTS_CACHE_DIR, f"{cache_key}.mp3")
    if not os.path.exists(out_path):
        tmp_path = os.path.join(TTS_CACHE_DIR, f"{cache_key}.{uuid.uuid4().hex[:8]}.tmp")
        try:
            communicate = edge_tts.Communicate(clean_text, voice=voice, rate=rate_str)
            await communicate.save(tmp_path)
            os.replace(tmp_path, out_path)
        except Exception as exc:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
            raise HTTPException(status_code=502, detail=f"Local neural TTS failed: {exc}")

    return FileResponse(out_path, media_type="audio/mpeg")


@app.post("/score-pronunciation")
async def score_pronunciation(
    audio: UploadFile = File(...),
    expectedEs: str = Form(""),
    altExpectedEs: str = Form("[]"),
    slotTemplate: str = Form(""),
    baseEs: str = Form(""),
    baseAltEs: str = Form("[]"),
    extensionEs: str = Form(""),
    baseWordIndices: str = Form("[]"),
    extensionWordIndices: str = Form("[]"),
    mode: str = Form("scripted"),  # "scripted" | "open"
    minScore: int = Form(DEFAULT_MIN_SCORE),
):
    t_req_start = time.perf_counter()
    if gop_scorer is None or asr_engine is None:
        server_stats["errorCount"] += 1
        detail = (
            f"Local scoring models failed to load: {model_load_error}"
            if model_status == "error" and model_load_error
            else "Local scoring models are still loading."
        )
        raise HTTPException(status_code=503, detail=detail)

    raw_bytes = await audio.read()
    input_bytes = len(raw_bytes)
    if input_bytes < 400:
        server_stats["errorCount"] += 1
        raise HTTPException(status_code=400, detail="Audio clip too short.")

    t_dec0 = time.perf_counter()
    try:
        raw_wav, decode_method = decode_to_16k_mono(raw_bytes)
    except Exception as exc:
        server_stats["errorCount"] += 1
        raise HTTPException(status_code=400, detail=f"Audio decode failed: {exc}")
    decode_ms = round((time.perf_counter() - t_dec0) * 1000.0, 1)

    t_pre0 = time.perf_counter()
    wav, audio_stats = preprocess_audio(
        raw_wav,
        enable_trim=ENABLE_SILENCE_TRIM,
        enable_agc=ENABLE_AGC,
        enable_highpass=ENABLE_HIGHPASS,
    )
    asr_wav, pauses_compressed = compress_long_pauses(wav)
    audio_stats["decodeMethod"] = decode_method
    audio_stats["pausesCompressedForAsr"] = pauses_compressed
    preprocess_ms = round((time.perf_counter() - t_pre0) * 1000.0, 1)

    loop = asyncio.get_running_loop()
    executor = inference_executor

    if mode == "open" or not expectedEs.strip():
        asr_res, asr_ms = await loop.run_in_executor(executor, _timed_asr, asr_wav, None)
        heard = asr_res["heard"]
        if not heard:
            total_ms = round((time.perf_counter() - t_req_start) * 1000.0, 1)
            server_stats["totalRequests"] += 1
            server_stats["failedCount"] += 1
            server_stats["wrongWordCount"] += 1
            server_stats["totalLatencyMs"] += total_ms
            server_stats["lastLatencyMs"] = total_ms
            return {
                "heard": "",
                "heardTranslation": "",
                "wrongWord": True,
                "score": 0,
                "accuracy": 0,
                "fluency": 0,
                "passed": False,
                "feedback": "No Spanish speech detected — try speaking louder.",
                "prosodyTip": "",
                "scoredTargetEs": "",
                "debug": {
                    "mode": "open",
                    "expectedEs": expectedEs,
                    "inputBytes": input_bytes,
                    "contentType": audio.content_type or "",
                    "audio": audio_stats,
                    "timingsMs": {
                        "decodeFfmpegMs": decode_ms,
                        "preprocessMs": preprocess_ms,
                        "asrTranscribeMs": asr_ms,
                        "gopScoreMs": 0.0,
                        "wallModelMs": asr_ms,
                        "altRescoreMs": 0.0,
                        "totalServerMs": total_ms,
                    },
                    "asr": asr_res,
                    "gop": None,
                },
            }

        gop_res, gop_ms = await loop.run_in_executor(executor, _timed_gop, wav, heard, 70)
        total_ms = round((time.perf_counter() - t_req_start) * 1000.0, 1)
        passed = bool(gop_res["score"] >= 70)

        server_stats["totalRequests"] += 1
        server_stats["passedCount" if passed else "failedCount"] += 1
        server_stats["totalLatencyMs"] += total_ms
        server_stats["lastLatencyMs"] = total_ms

        return {
            "heard": heard,
            "heardTranslation": "",
            "wrongWord": False,
            "score": gop_res["score"],
            "accuracy": gop_res["accuracy"],
            "fluency": gop_res["fluency"],
            "passed": passed,
            "feedback": gop_res["feedback"],
            "prosodyTip": str((gop_res.get("prosody") or {}).get("tip") or ""),
            "scoredTargetEs": heard,
            "debug": {
                "mode": "open",
                "expectedEs": expectedEs,
                "inputBytes": input_bytes,
                "contentType": audio.content_type or "",
                "audio": audio_stats,
                "timingsMs": {
                    "decodeFfmpegMs": decode_ms,
                    "preprocessMs": preprocess_ms,
                    "asrTranscribeMs": asr_ms,
                    "gopScoreMs": gop_ms,
                    "wallModelMs": round(asr_ms + gop_ms, 1),
                    "altRescoreMs": 0.0,
                    "totalServerMs": total_ms,
                },
                "asr": asr_res,
                "gop": {
                    "scoredTargetEs": heard,
                    "ctcHeard": gop_res["ctc_heard"],
                    "weakChars": gop_res["weak_chars"],
                    "alignedTokens": gop_res["aligned_tokens"],
                    "expectedTokens": gop_res["expected_tokens"],
                    "totalFrames": gop_res["total_frames"],
                    "charDetails": gop_res["char_details"],
                    "fluencyDetails": gop_res.get("fluency_details") or {},
                    "prosody": gop_res.get("prosody") or {},
                },
            },
        }

    effective_min_score = max(50, min(98, int(minScore)))
    asr_prompt = f"Frase esperada: {expectedEs}" if WHISPER_BIAS_PROMPT else None

    # Run Wav2Vec2 GOP (on full timing wav) and Faster-Whisper ASR (on pause-compressed wav) in parallel
    t_wall0 = time.perf_counter()
    (gop_res, gop_ms), (asr_res, asr_ms) = await asyncio.gather(
        loop.run_in_executor(executor, _timed_gop, wav, expectedEs, effective_min_score),
        loop.run_in_executor(executor, _timed_asr, asr_wav, asr_prompt),
    )
    wall_model_ms = round((time.perf_counter() - t_wall0) * 1000.0, 1)

    asr_heard = str(asr_res.get("heard") or "").strip()
    ctc_heard = str(gop_res.get("ctc_heard") or "").strip()
    heard = asr_heard or ctc_heard

    try:
        parsed_alts = json.loads(altExpectedEs) if altExpectedEs else []
    except Exception:
        parsed_alts = []
    try:
        parsed_slot = json.loads(slotTemplate) if slotTemplate else None
        if not isinstance(parsed_slot, dict):
            parsed_slot = None
    except Exception:
        parsed_slot = None
    raw_candidates = [expectedEs] + [
        str(c).strip() for c in parsed_alts if isinstance(c, str) and str(c).strip()
    ]
    if parsed_slot:
        expected_candidates = [
            c for c in raw_candidates
            if "[" not in c and match_slot_template(c, parsed_slot)[0]
        ]
    else:
        expected_candidates = raw_candidates

    detected_cmd = (
        detect_voice_command(asr_heard, expected_candidates)
        or detect_voice_command(ctc_heard, expected_candidates)
    )
    if detected_cmd:
        total_ms = round((time.perf_counter() - t_req_start) * 1000.0, 1)
        server_stats["totalRequests"] += 1
        if detected_cmd == "skip":
            server_stats["failedCount"] += 1
        server_stats["totalLatencyMs"] += total_ms
        server_stats["lastLatencyMs"] = total_ms
        cmd_feedback = (
            f'Skipped — "{expectedEs}"'
            if detected_cmd == "skip"
            else f'Playing "{expectedEs}" — listen and speak again.'
            if detected_cmd == "repeat"
            else f'Voice command "{detected_cmd}" detected.'
        )
        return {
            "heard": heard,
            "heardTranslation": "",
            "voiceCommand": detected_cmd,
            "skipped": detected_cmd == "skip",
            "wrongWord": False,
            "score": 0,
            "accuracy": 0,
            "fluency": 0,
            "passed": False,
            "feedback": cmd_feedback,
            "prosodyTip": "",
            "scoredTargetEs": expectedEs,
            "debug": {
                "mode": "scripted",
                "expectedEs": expectedEs,
                "scoredTargetEs": expectedEs,
                "inputBytes": input_bytes,
                "contentType": audio.content_type or "",
                "audio": audio_stats,
                "timingsMs": {
                    "decodeFfmpegMs": decode_ms,
                    "preprocessMs": preprocess_ms,
                    "gopScoreMs": gop_ms,
                    "asrTranscribeMs": asr_ms,
                    "wallModelMs": wall_model_ms,
                    "altRescoreMs": 0.0,
                    "totalServerMs": total_ms,
                },
                "panamaNormalization": {
                    "expectedPhonetic": normalize_panamanian_phonetics(expectedEs),
                    "heardPhonetic": normalize_panamanian_phonetics(heard),
                    "matched": False,
                    "matchedCandidate": None,
                    "matchSource": f"voice_command_{detected_cmd}",
                    "wrongWordTriggered": False,
                    "reason": f'Voice command "{detected_cmd.upper()}" detected.',
                },
                "asr": asr_res,
                "gop": None,
            },
        }
    # Dual-recognizer match: check Whisper transcript first (exact candidates, then open-slot frame),
    # then Wav2Vec2 Spanish CTC transcript, then high-similarity phonetic match.
    matched_cand = next(
        (cand for cand in expected_candidates if is_same_word_panama(asr_heard, cand)),
        None,
    )
    match_source = "asr_exact" if matched_cand else None
    if not matched_cand and parsed_slot and asr_heard:
        slot_ok, _ = match_slot_template(asr_heard, parsed_slot)
        if slot_ok:
            matched_cand = asr_heard
            heard = asr_heard
            match_source = "slot_template_asr"
    if not matched_cand and ctc_heard:
        matched_cand = next(
            (cand for cand in expected_candidates if is_same_word_panama(ctc_heard, cand)),
            None,
        )
        if matched_cand:
            heard = ctc_heard
            match_source = "ctc_exact"
    if not matched_cand and parsed_slot and ctc_heard:
        slot_ok, _ = match_slot_template(ctc_heard, parsed_slot)
        if slot_ok:
            matched_cand = ctc_heard
            heard = ctc_heard
            match_source = "slot_template_ctc"
    if not matched_cand and gop_res["score"] >= 72:
        best_sim = 0.0
        best_cand = None
        best_transcript = heard
        for transcript in (asr_heard, ctc_heard):
            if not transcript:
                continue
            for cand in expected_candidates:
                if len(normalize_panamanian_phonetics(cand).replace(" ", "")) < 5:
                    continue
                sim = phonetic_similarity(transcript, cand)
                if sim > best_sim:
                    best_sim = sim
                    best_cand = cand
                    best_transcript = transcript
        if best_cand and best_sim >= 0.86:
            matched_cand = best_cand
            heard = best_transcript
            match_source = f"phonetic_fuzzy({best_sim:.2f})"
    panama_match = matched_cand is not None

    # If the learner spoke a valid alternative phrase or open-slot phrase, re-score GOP against it
    scored_target = expectedEs
    alt_rescore_ms = 0.0
    if matched_cand and strip_punctuation(matched_cand) != strip_punctuation(expectedEs):
        gop_res, alt_rescore_ms = await loop.run_in_executor(
            executor, _timed_gop, wav, matched_cand, effective_min_score
        )
        scored_target = matched_cand
        server_stats["altRescoreCount"] += 1

    # Base-only rating support: when baseEs + extensionEs are supplied, rate ONLY the base
    # for the question's pass/fail score while independently evaluating the extension.
    clean_base_es = str(baseEs or "").strip()
    clean_ext_es = str(extensionEs or "").strip()
    base_only_rated = bool(clean_base_es and clean_ext_es)

    try:
        parsed_base_alts = json.loads(baseAltEs) if baseAltEs else []
        if not isinstance(parsed_base_alts, list):
            parsed_base_alts = []
    except Exception:
        parsed_base_alts = []
    try:
        parsed_base_idx = set(int(i) for i in (json.loads(baseWordIndices) if baseWordIndices else []))
    except Exception:
        parsed_base_idx = set()
    try:
        parsed_ext_idx = set(int(i) for i in (json.loads(extensionWordIndices) if extensionWordIndices else []))
    except Exception:
        parsed_ext_idx = set()

    def _phrase_contains_segment(transcript: str, segment: str) -> bool:
        t_phon = normalize_panamanian_phonetics(transcript)
        s_phon = normalize_panamanian_phonetics(segment)
        if not t_phon or not s_phon:
            return False
        if is_same_word_panama(transcript, segment):
            return True
        if f" {s_phon} " in f" {t_phon} ":
            return True
        t_words = t_phon.split()
        s_words = s_phon.split()
        if not s_words or len(t_words) < len(s_words):
            return False
        # Subsequence window fuzzy check for Panamanian pronunciation variations
        win = len(s_words)
        for i in range(0, len(t_words) - win + 1):
            slice_str = " ".join(t_words[i : i + win])
            if slice_str == s_phon or phonetic_similarity(slice_str, s_phon) >= 0.85:
                return True
        return False

    base_matched = panama_match
    base_matched_cand = matched_cand
    ext_matched = False
    extension_included = False
    base_rescored_only = False
    base_score_val = None
    ext_score_val = None
    ext_passed_val = None

    def _strip_base_from_transcript(transcript: str, base_cand: str) -> str:
        t_words = normalize_panamanian_phonetics(transcript).split()
        b_words = normalize_panamanian_phonetics(base_cand).split()
        if not t_words:
            return ""
        rem = list(t_words)
        # Remove matched base words (in order)
        for bw in b_words:
            for idx, tw in enumerate(rem):
                if tw == bw or (len(bw) >= 3 and phonetic_similarity(tw, bw) >= 0.82):
                    rem.pop(idx)
                    break
        # Ignore optional leading subject pronouns so "yo quiero" isn't mistaken for an extension attempt
        optional_pronouns = {"yo", "tu", "el", "ella", "usted", "nosotros", "nosotras", "ellos", "ellas", "ustedes"}
        while rem and rem[0] in optional_pronouns:
            rem.pop(0)
        return " ".join(rem).strip()

    def _compute_active_word_indices(target_text: str, base_cand: str) -> tuple[set[int], set[int]]:
        if strip_punctuation(target_text) == strip_punctuation(expectedEs) and parsed_base_idx:
            return parsed_base_idx, parsed_ext_idx
        t_words = strip_punctuation(target_text).split()
        b_words = strip_punctuation(base_cand).split()
        if not t_words or not b_words:
            return parsed_base_idx, parsed_ext_idx
        t_phon = [normalize_panamanian_phonetics(w) for w in t_words]
        b_phon = [normalize_panamanian_phonetics(w) for w in b_words]
        used_base: set[int] = set()
        cursor = 0
        for bp in b_phon:
            for idx in range(cursor, len(t_phon)):
                if idx not in used_base and (t_phon[idx] == bp or phonetic_similarity(t_phon[idx], bp) >= 0.82):
                    used_base.add(idx)
                    cursor = idx + 1
                    break
        if not used_base:
            return parsed_base_idx, parsed_ext_idx
        ext_set = {i for i in range(len(t_words)) if i not in used_base}
        return used_base, ext_set

    if base_only_rated:
        base_candidates = [clean_base_es] + [
            str(c).strip() for c in parsed_base_alts if isinstance(c, str) and str(c).strip()
        ]
        # Verify base_matched explicitly (avoid passing if an altEs contained only an extension word)
        explicit_base_hit = None
        explicit_base_tr = None
        for tr in (asr_heard, ctc_heard):
            if not tr:
                continue
            hit_b = next((bc for bc in base_candidates if _phrase_contains_segment(tr, bc)), None)
            if hit_b:
                explicit_base_hit = hit_b
                explicit_base_tr = tr
                break

        slot_matched = bool(
            parsed_slot
            and any(bool(tr) and match_slot_template(tr, parsed_slot)[0] for tr in (asr_heard, ctc_heard))
        )
        if slot_matched:
            base_matched = True
            base_matched_cand = explicit_base_hit or clean_base_es
        elif explicit_base_hit:
            base_matched = True
            base_matched_cand = explicit_base_hit
            if not panama_match:
                heard = explicit_base_tr or heard
                match_source = match_source or "base_only_match"
        elif panama_match and matched_cand:
            # Only count panama_match as base_matched if matched_cand actually contains a base candidate
            has_base_in_cand = any(_phrase_contains_segment(matched_cand, bc) for bc in base_candidates)
            base_matched = has_base_in_cand
            if has_base_in_cand:
                base_matched_cand = clean_base_es

        is_any_slot_ext = clean_ext_es == "__slot_any__"
        if is_any_slot_ext:
            ext_matched = slot_matched
        else:
            ext_direct = any(
                bool(tr) and _phrase_contains_segment(tr, clean_ext_es)
                for tr in (asr_heard, ctc_heard)
            )
            # Also accept alternate valid slot/quantity extensions when full phrase or slot template matched
            full_phrase_has_ext = bool(
                panama_match
                and matched_cand
                and not any(is_same_word_panama(matched_cand, bc) for bc in base_candidates)
                and len(_strip_base_from_transcript(matched_cand, base_matched_cand or clean_base_es)) >= 2
            )
            ext_matched = bool(ext_direct or slot_matched or full_phrase_has_ext)

        extension_included = bool(ext_matched)
        if not extension_included and base_matched and not is_any_slot_ext:
            # Check whether the learner attempted the extension (with mispronunciation) vs omitted it
            for tr in (asr_heard, ctc_heard):
                if not tr:
                    continue
                rem_str = _strip_base_from_transcript(tr, base_matched_cand or clean_base_es)
                if len(rem_str) >= 2 and phonetic_similarity(rem_str, normalize_panamanian_phonetics(clean_ext_es)) >= 0.45:
                    extension_included = True
                    break

        # If the learner matched the base ONLY (did not include extension), rescore GOP directly against the base target
        # so the omitted optional extension never penalizes the base score or weak-char list!
        if base_matched and not extension_included and base_matched_cand:
            gop_res, extra_ms = await loop.run_in_executor(
                executor, _timed_gop, wav, base_matched_cand, effective_min_score
            )
            alt_rescore_ms = round(alt_rescore_ms + extra_ms, 1)
            scored_target = base_matched_cand
            base_rescored_only = True
            base_score_val = int(gop_res["score"])
            ext_score_val = None
        else:
            active_base_idx, active_ext_idx = _compute_active_word_indices(
                scored_target, base_matched_cand or clean_base_es
            )
            char_details_all = gop_res.get("char_details") or []
            base_char_scores = [
                int(c.get("score", 0))
                for c in char_details_all
                if c.get("wordIndex") in active_base_idx
            ]
            ext_char_scores = [
                int(c.get("score", 0))
                for c in char_details_all
                if c.get("wordIndex") in active_ext_idx
            ]
            if base_char_scores:
                base_score_val = int(round(sum(base_char_scores) / len(base_char_scores)))
            else:
                base_score_val = int(gop_res["score"])
            if extension_included:
                if ext_char_scores:
                    ext_score_val = int(round(sum(ext_char_scores) / len(ext_char_scores)))
                else:
                    ext_score_val = int(gop_res["score"]) if ext_matched else 0
            else:
                ext_score_val = None

    expected_phon = normalize_panamanian_phonetics(scored_target)
    heard_phon = normalize_panamanian_phonetics(heard)
    slot_pattern_hint = str((parsed_slot or {}).get("patternEs") or "").strip()

    wrong_word = False
    wrong_word_reason = f'Understood "{heard}" matched "{base_matched_cand or matched_cand}" under Panamanian phonetic rules.'
    if not heard or not strip_punctuation(heard):
        wrong_word = True
        wrong_word_reason = (
            f'No recognizable Spanish speech understood — expected pattern "{slot_pattern_hint}".'
            if slot_pattern_hint
            else f'No recognizable Spanish speech understood — expected "{expectedEs}".'
        )
    elif not (base_matched if base_only_rated else panama_match):
        wrong_word = True
        wrong_word_reason = (
            f'Understood "{heard}", which does not match expected pattern "{slot_pattern_hint}".'
            if slot_pattern_hint
            else f'Understood "{heard}", which does not match expected base "{clean_base_es or expectedEs}".'
        )

    if not heard or not strip_punctuation(heard):
        score = 0
    elif wrong_word:
        score = min(int(base_score_val if base_score_val is not None else gop_res["score"]), 45)
    elif base_only_rated and base_score_val is not None:
        score = int(base_score_val)
    else:
        score = gop_res["score"]

    # Passing rule: > 80% is always accepted as Correct (and warm-up minScore <= 80 also honored).
    # Scores between 81 and 89 (or with weak sounds) pass as Correct with a "could be improved" flag.
    pass_threshold = effective_min_score if effective_min_score <= 80 else 81
    passed = bool(not wrong_word and score >= pass_threshold)
    if base_only_rated:
        ext_passed_val = bool(extension_included and ext_matched and (ext_score_val or 0) >= pass_threshold)
        if base_rescored_only:
            base_weak_chars = list(gop_res.get("weak_chars") or [])
        else:
            active_base_idx_final, _ = _compute_active_word_indices(
                scored_target, base_matched_cand or clean_base_es
            )
            base_weak_chars = [
                c.get("ch")
                for c in (gop_res.get("char_details") or [])
                if c.get("wordIndex") in active_base_idx_final and int(c.get("score", 100)) < 80
            ]
        needs_pronunciation_improvement = bool(
            passed and (score < 90 or len(base_weak_chars) > 0)
        )
    else:
        needs_pronunciation_improvement = bool(
            passed and (score < 90 or len(gop_res["weak_chars"]) > 0)
        )
    if wrong_word and heard and strip_punctuation(heard):
        feedback = (
            f'Heard "{heard}" — expected pattern: "{slot_pattern_hint}".'
            if slot_pattern_hint
            else f'Heard "{heard}" instead of "{expectedEs}".'
        )
    elif wrong_word:
        feedback = (
            f'Could not understand — expected pattern: "{slot_pattern_hint}".'
            if slot_pattern_hint
            else f'Could not understand "{expectedEs}" — try speaking clearly.'
        )
    elif needs_pronunciation_improvement:
        feedback = gop_res["feedback"] or "Pronunciation could be improved — articulate every sound clearly."
    elif not passed:
        feedback = gop_res["feedback"] or f'Score {score}/100 — must be above 80% to pass.'
    else:
        feedback = gop_res["feedback"]

    prosody_tip = "" if wrong_word else str((gop_res.get("prosody") or {}).get("tip") or "")
    total_ms = round((time.perf_counter() - t_req_start) * 1000.0, 1)

    server_stats["totalRequests"] += 1
    server_stats["passedCount" if passed else "failedCount"] += 1
    if wrong_word:
        server_stats["wrongWordCount"] += 1
    server_stats["totalLatencyMs"] += total_ms
    server_stats["lastLatencyMs"] = total_ms

    return {
        "heard": heard,
        "heardTranslation": heard if wrong_word else "",
        "wrongWord": wrong_word,
        "score": score,
        "accuracy": gop_res["accuracy"],
        "fluency": gop_res["fluency"],
        "passed": passed,
        "needsPronunciationImprovement": needs_pronunciation_improvement,
        "feedback": feedback,
        "prosodyTip": prosody_tip,
        "scoredTargetEs": scored_target,
        "baseOnlyRated": base_only_rated,
        "baseRescoredOnly": base_rescored_only if base_only_rated else False,
        "baseEs": clean_base_es if base_only_rated else "",
        "baseScore": int(score) if base_only_rated else None,
        "baseMatched": bool(base_matched) if base_only_rated else None,
        "extensionEs": clean_ext_es if base_only_rated else "",
        "extensionIncluded": bool(extension_included) if base_only_rated else False,
        "extensionScore": int(ext_score_val) if (base_only_rated and ext_score_val is not None) else None,
        "extensionMatched": bool(ext_matched) if base_only_rated else None,
        "extensionPassed": bool(ext_passed_val) if (base_only_rated and ext_passed_val is not None) else None,
        "debug": {
            "mode": "scripted",
            "expectedEs": expectedEs,
            "scoredTargetEs": scored_target,
            "inputBytes": input_bytes,
            "contentType": audio.content_type or "",
            "audio": audio_stats,
            "timingsMs": {
                "decodeFfmpegMs": decode_ms,
                "preprocessMs": preprocess_ms,
                "gopScoreMs": gop_ms,
                "asrTranscribeMs": asr_ms,
                "wallModelMs": wall_model_ms,
                "altRescoreMs": alt_rescore_ms,
                "totalServerMs": total_ms,
            },
            "panamaNormalization": {
                "expectedPhonetic": expected_phon,
                "heardPhonetic": heard_phon,
                "matched": panama_match,
                "matchedCandidate": matched_cand,
                "matchSource": match_source,
                "wrongWordTriggered": wrong_word,
                "reason": wrong_word_reason,
            },
            "asr": asr_res,
            "gop": {
                "scoredTargetEs": scored_target,
                "rawGopScore": gop_res["score"],
                "ctcHeard": gop_res["ctc_heard"],
                "weakChars": gop_res["weak_chars"],
                "alignedTokens": gop_res["aligned_tokens"],
                "expectedTokens": gop_res["expected_tokens"],
                "totalFrames": gop_res["total_frames"],
                "charDetails": gop_res["char_details"],
                "fluencyDetails": gop_res.get("fluency_details") or {},
                "prosody": gop_res.get("prosody") or {},
            },
        },
    }
