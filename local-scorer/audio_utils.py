import io
import os
import subprocess
import tempfile
import numpy as np
import soundfile as sf

try:
    import av  # type: ignore
    PYAV_AVAILABLE = True
except Exception:
    av = None
    PYAV_AVAILABLE = False


def _decode_with_pyav(raw_bytes: bytes) -> np.ndarray | None:
    if not PYAV_AVAILABLE or av is None:
        return None
    try:
        chunks: list[np.ndarray] = []
        with av.open(io.BytesIO(raw_bytes), mode="r") as container:
            audio_streams = [s for s in container.streams if s.type == "audio"]
            if not audio_streams:
                return None
            resampler = av.AudioResampler(format="fltp", layout="mono", rate=16000)
            for frame in container.decode(audio_streams[0]):
                resampled_list = resampler.resample(frame)
                if not isinstance(resampled_list, list):
                    resampled_list = [resampled_list]
                for rf in resampled_list:
                    if rf is None:
                        continue
                    arr = rf.to_ndarray()
                    if arr.ndim > 1:
                        arr = arr[0]
                    chunks.append(np.asarray(arr, dtype=np.float32))
            # Flush resampler tail
            flushed = resampler.resample(None)
            if flushed:
                if not isinstance(flushed, list):
                    flushed = [flushed]
                for rf in flushed:
                    if rf is None:
                        continue
                    arr = rf.to_ndarray()
                    if arr.ndim > 1:
                        arr = arr[0]
                    chunks.append(np.asarray(arr, dtype=np.float32))
        if not chunks:
            return None
        audio = np.concatenate(chunks).astype(np.float32)
        return audio if audio.size > 0 else None
    except Exception:
        return None


def decode_to_16k_mono(raw_bytes: bytes) -> tuple[np.ndarray, str]:
    """
    Decode incoming audio bytes into 16 kHz mono float32 PCM.
    Tries in-process PyAV first (~10-20 ms, zero subprocess overhead),
    falling back to in-memory FFmpeg piping and temp-file decoding if needed.
    """
    if not raw_bytes:
        raise ValueError("Empty audio buffer.")

    # Fastest path: in-process PyAV (bundled with faster-whisper)
    pyav_audio = _decode_with_pyav(raw_bytes)
    if pyav_audio is not None and pyav_audio.size > 0:
        return pyav_audio, "pyav"

    # Second path: stream directly through FFmpeg stdin/stdout pipes
    try:
        proc = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                "pipe:0",
                "-ac",
                "1",
                "-ar",
                "16000",
                "-f",
                "f32le",
                "-acodec",
                "pcm_f32le",
                "pipe:1",
            ],
            input=raw_bytes,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            timeout=15,
        )
        usable_len = len(proc.stdout) - (len(proc.stdout) % 4)
        if usable_len >= 4:
            audio = np.frombuffer(proc.stdout[:usable_len], dtype=np.float32).copy()
            if audio.size > 0:
                return np.nan_to_num(audio, nan=0.0, posinf=0.0, neginf=0.0).astype(np.float32, copy=False), "pipe"
    except Exception:
        pass

    # Fallback path: temp file for seek-required containers (e.g. certain mp4/m4a headers)
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
        tmp_in.write(raw_bytes)
        in_path = tmp_in.name
    out_path = in_path + ".wav"
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", in_path, "-ac", "1", "-ar", "16000", "-f", "wav", out_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True,
            timeout=15,
        )
        audio, _ = sf.read(out_path, dtype="float32")
        if audio.ndim > 1:
            audio = np.mean(audio, axis=1).astype(np.float32)
        clean_audio = np.nan_to_num(np.asarray(audio, dtype=np.float32), nan=0.0, posinf=0.0, neginf=0.0)
        return clean_audio.astype(np.float32, copy=False), "tempfile"
    finally:
        for p in (in_path, out_path):
            if os.path.exists(p):
                try:
                    os.remove(p)
                except OSError:
                    pass


def compute_audio_stats(wav: np.ndarray, sr: int = 16000) -> dict:
    wav = np.nan_to_num(np.asarray(wav, dtype=np.float32), nan=0.0, posinf=0.0, neginf=0.0)
    sample_count = int(len(wav))
    duration_ms = round((sample_count / float(sr)) * 1000.0, 1)
    abs_wav = np.abs(wav) if sample_count > 0 else np.empty(0, dtype=np.float32)
    peak = float(np.max(abs_wav)) if sample_count > 0 else 0.0
    rms = float(np.sqrt(np.mean(np.square(wav)))) if sample_count > 0 else 0.0
    rms_db = round(float(20.0 * np.log10(max(rms, 1e-7))), 1)

    # Detect sustained flat-top clipping rather than isolated single-sample / Opus resampler peaks
    clipped_samples = 0
    clipped_ratio = 0.0
    max_clip_run = 0
    if sample_count > 0 and peak >= 0.995:
        clipped_mask = abs_wav >= 0.995
        clipped_samples = int(np.sum(clipped_mask))
        active_samples = max(1, int(np.sum(abs_wav >= 0.01)))
        clipped_ratio = clipped_samples / float(active_samples)
        if clipped_samples >= 6:
            # Longest consecutive run of clipped samples
            padded = np.concatenate(([False], clipped_mask, [False]))
            edges = np.flatnonzero(padded[1:] != padded[:-1])
            if edges.size >= 2:
                max_clip_run = int(np.max(edges[1::2] - edges[0::2]))

    clipping_detected = bool(
        clipped_samples >= 80 and clipped_ratio >= 0.015 and max_clip_run >= 6
    )

    return {
        "sampleCount": sample_count,
        "durationMs": duration_ms,
        "peakAmplitude": round(peak, 4),
        "rmsDb": rms_db,
        "clippedSamples": clipped_samples,
        "clippedRatio": round(clipped_ratio, 4),
        "maxClipRun": max_clip_run,
        "clippingDetected": clipping_detected,
    }


def trim_silence(
    wav: np.ndarray,
    sr: int = 16000,
    frame_ms: int = 20,
    pad_ms: int = 80,
    min_keep_ms: int = 180,
) -> tuple[np.ndarray, dict]:
    """
    Trims leading and trailing silence using short-time frame RMS energy,
    preserving onset/offset padding so CTC alignment does not clip word edges.
    """
    total_samples = int(len(wav))
    orig_ms = round((total_samples / float(sr)) * 1000.0, 1)
    frame_len = max(1, int(sr * frame_ms / 1000))
    n_frames = total_samples // frame_len

    meta_untrimmed = {
        "trimmed": False,
        "originalDurationMs": orig_ms,
        "trimmedDurationMs": orig_ms,
        "trimmedStartMs": 0.0,
        "trimmedEndMs": 0.0,
    }
    if n_frames < 4:
        return wav, meta_untrimmed

    frames = wav[: n_frames * frame_len].reshape(n_frames, frame_len)
    frame_rms = np.sqrt(np.mean(np.square(frames), axis=1))
    peak_rms = float(np.max(frame_rms))
    if peak_rms < 0.004:
        return wav, meta_untrimmed

    noise_floor = float(np.percentile(frame_rms, 15))
    threshold = max(0.008, noise_floor * 2.2, peak_rms * 0.12)
    active = np.where(frame_rms >= threshold)[0]
    if active.size == 0:
        return wav, meta_untrimmed

    pad_samples = int(sr * pad_ms / 1000)
    start_sample = max(0, int(active[0]) * frame_len - pad_samples)
    end_sample = min(total_samples, (int(active[-1]) + 1) * frame_len + pad_samples)

    min_keep_samples = int(sr * min_keep_ms / 1000)
    if (end_sample - start_sample) < min_keep_samples:
        return wav, meta_untrimmed

    trimmed = wav[start_sample:end_sample]
    trimmed_ms = round((len(trimmed) / float(sr)) * 1000.0, 1)
    start_cut_ms = round((start_sample / float(sr)) * 1000.0, 1)
    end_cut_ms = round(((total_samples - end_sample) / float(sr)) * 1000.0, 1)

    return trimmed, {
        "trimmed": bool(start_sample > 0 or end_sample < total_samples),
        "originalDurationMs": orig_ms,
        "trimmedDurationMs": trimmed_ms,
        "trimmedStartMs": start_cut_ms,
        "trimmedEndMs": end_cut_ms,
    }


def normalize_audio_gain(
    wav: np.ndarray,
    sr: int = 16000,
    target_rms_db: float = -20.0,
    max_gain_db: float = 18.0,
    min_active_rms_db: float = -55.0,
) -> tuple[np.ndarray, float]:
    """
    Auto-Gain Control (AGC): brings quiet recordings closer to target RMS while
    preventing clipping and avoiding amplifying digital silence.
    """
    if wav.size == 0:
        return wav, 0.0

    frame_len = max(1, int(sr * 0.02))
    n_frames = len(wav) // frame_len
    if n_frames >= 3:
        frames = wav[: n_frames * frame_len].reshape(n_frames, frame_len)
        frame_rms = np.sqrt(np.mean(np.square(frames), axis=1))
        top_k = max(1, int(np.ceil(n_frames * 0.3)))
        active_rms = float(np.mean(np.sort(frame_rms)[-top_k:]))
    else:
        active_rms = float(np.sqrt(np.mean(np.square(wav))))

    active_rms_db = float(20.0 * np.log10(max(active_rms, 1e-7)))
    if active_rms_db < min_active_rms_db:
        return wav, 0.0

    delta_db = max(-12.0, min(max_gain_db, target_rms_db - active_rms_db))
    if abs(delta_db) < 1.0:
        return wav, 0.0

    gain_linear = float(10.0 ** (delta_db / 20.0))
    scaled = (wav * gain_linear).astype(np.float32)

    peak = float(np.max(np.abs(scaled)))
    if peak > 0.95:
        limiter = 0.95 / peak
        scaled = (scaled * limiter).astype(np.float32)
        gain_linear *= limiter

    actual_gain_db = round(float(20.0 * np.log10(max(gain_linear, 1e-6))), 1)
    return scaled, actual_gain_db


def highpass_filter_80hz(wav: np.ndarray, sr: int = 16000, cutoff_hz: float = 80.0) -> np.ndarray:
    """
    Zero-phase 2nd-order Butterworth-style high-pass filter via FFT (removes DC offset,
    desk rumble, and AC/fan hum below ~80 Hz in <1 ms with pure NumPy).
    """
    n = int(wav.size)
    if n < 64:
        return wav
    x = wav.astype(np.float32, copy=False)
    x = x - float(np.mean(x))
    freqs = np.fft.rfftfreq(n, d=1.0 / float(sr))
    # Smooth 2nd-order high-pass magnitude response; zero at DC
    ratio = np.divide(cutoff_hz, freqs, out=np.full_like(freqs, 1e9), where=freqs > 0)
    gain = 1.0 / np.sqrt(1.0 + np.power(ratio, 4.0))
    gain[0] = 0.0
    spec = np.fft.rfft(x) * gain
    filtered = np.fft.irfft(spec, n=n)
    return filtered.astype(np.float32)


def preprocess_audio(
    raw_wav: np.ndarray,
    sr: int = 16000,
    enable_trim: bool = True,
    enable_agc: bool = True,
    enable_highpass: bool = True,
) -> tuple[np.ndarray, dict]:
    """
    Computes raw mic stats (preserving accurate quiet/clipping diagnostics),
    then optionally applies an 80 Hz high-pass rumble filter, trims dead silence,
    and applies gentle Auto-Gain Control.
    """
    wav = np.nan_to_num(np.asarray(raw_wav, dtype=np.float32), nan=0.0, posinf=0.0, neginf=0.0)
    stats = compute_audio_stats(wav, sr=sr)

    if enable_highpass:
        wav = highpass_filter_80hz(wav, sr=sr, cutoff_hz=80.0)
    stats["highPassApplied"] = bool(enable_highpass)

    if enable_trim:
        wav, trim_meta = trim_silence(wav, sr=sr)
    else:
        trim_meta = {
            "trimmed": False,
            "originalDurationMs": stats["durationMs"],
            "trimmedDurationMs": stats["durationMs"],
            "trimmedStartMs": 0.0,
            "trimmedEndMs": 0.0,
        }

    if enable_agc:
        wav, gain_db = normalize_audio_gain(wav, sr=sr)
    else:
        gain_db = 0.0

    stats.update(trim_meta)
    stats["gainAppliedDb"] = gain_db
    return wav, stats


def compress_long_pauses(
    wav: np.ndarray,
    sr: int = 16000,
    frame_ms: int = 20,
    max_pause_ms: int = 300,
    keep_pause_ms: int = 160,
) -> tuple[np.ndarray, int]:
    """
    Shortens long internal dead-air breaks (> max_pause_ms) down to keep_pause_ms
    for ASR transcription so mid-sentence pauses do not cause Whisper to drop words
    or hallucinate. Returns (compressed_wav, pauses_compressed_count).
    """
    total_samples = int(len(wav))
    frame_len = max(1, int(sr * frame_ms / 1000))
    n_frames = total_samples // frame_len
    if n_frames < 10:
        return wav, 0

    frames = wav[: n_frames * frame_len].reshape(n_frames, frame_len)
    frame_rms = np.sqrt(np.mean(np.square(frames), axis=1))
    peak_rms = float(np.max(frame_rms))
    if peak_rms < 0.008:
        return wav, 0

    noise_floor = float(np.percentile(frame_rms, 15))
    silence_thresh = max(0.007, noise_floor * 2.0, peak_rms * 0.09)
    is_silent = frame_rms < silence_thresh

    max_silent_frames = max(1, int(max_pause_ms / frame_ms))
    keep_silent_frames = max(1, int(keep_pause_ms / frame_ms))

    chunks: list[np.ndarray] = []
    compressed_count = 0
    i = 0
    while i < n_frames:
        if not is_silent[i]:
            j = i
            while j < n_frames and not is_silent[j]:
                j += 1
            chunks.append(wav[i * frame_len : j * frame_len])
            i = j
        else:
            j = i
            while j < n_frames and is_silent[j]:
                j += 1
            run_len = j - i
            if run_len > max_silent_frames and i > 0 and j < n_frames:
                # Internal long break: keep only a natural short pause
                chunks.append(wav[i * frame_len : (i + keep_silent_frames) * frame_len])
                compressed_count += 1
            else:
                chunks.append(wav[i * frame_len : j * frame_len])
            i = j

    rem = wav[n_frames * frame_len :]
    if rem.size > 0:
        chunks.append(rem)

    if compressed_count == 0 or not chunks:
        return wav, 0
    return np.concatenate(chunks).astype(np.float32), compressed_count
