"""Masters a spoken line like a studio voice: its pauses tightened, faster
without the warble of a plain time-stretch, cleaned of rumble and boxiness,
evened out, as loud as the feeds it plays in, with no click at either end.

  python tts/master.py in.wav out.wav [--pace 1.12]

Runs in the Chatterbox environment, with pedalboard and pyloudnorm.
"""

import argparse
import warnings

import numpy as np
import pyloudnorm
from pedalboard import Compressor, Gain, HighpassFilter, Limiter, Pedalboard, PeakFilter, time_stretch
from pedalboard.io import AudioFile
from scipy.signal import resample_poly

SAMPLE_RATE = 48000
# Every line at the level TikTok and Reels play at, so none jumps out of the next (LUFS)
LOUDNESS = -14.0
# The peaks' ceiling (dBFS): room for the encoder's rounding
CEILING = -1.0
FADE = 0.01

# Silence is quieter than the line's peak by this much, in windows of WINDOW s
SILENCE_DB = -35.0
WINDOW = 0.01
# Silence kept before the first word and after the last (s)
LEAD = 0.06
TAIL = 0.15
# A pause inside the line is cut down to this (s)
PAUSE = 0.35

CHAIN = Pedalboard([
    HighpassFilter(cutoff_frequency_hz=80),
    # The cloned voice's boxiness, then a little presence for clarity
    PeakFilter(cutoff_frequency_hz=300, gain_db=-2.5, q=1.0),
    PeakFilter(cutoff_frequency_hz=3500, gain_db=1.5, q=0.9),
    Compressor(threshold_db=-20, ratio=2.5, attack_ms=5, release_ms=80),
])


def tighten(voice: np.ndarray, sample_rate: int) -> np.ndarray:
    """`voice` without the silence round it, and its long pauses cut down to PAUSE"""
    window = int(WINDOW * sample_rate)
    count = len(voice) // window
    if count == 0:
        return voice
    peaks = np.abs(voice[: count * window]).reshape(count, window).max(axis=1)
    sound = np.flatnonzero(peaks > peaks.max() * 10 ** (SILENCE_DB / 20))
    if len(sound) == 0:
        return voice
    first, last = sound[0], sound[-1]
    keep = np.zeros(count, dtype=bool)
    keep[max(0, first - int(LEAD / WINDOW)): last + 1 + int(TAIL / WINDOW)] = True
    # Each long pause loses its middle: what is cut is silence, so the splice can't click
    pause = int(PAUSE / WINDOW)
    for start, end in zip(sound[:-1], sound[1:]):
        if end - start - 1 > pause:
            keep[start + 1 + pause // 2: end - (pause - pause // 2)] = False
    samples = np.repeat(keep, window)
    samples = np.concatenate([samples, np.full(len(voice) - len(samples), keep[-1])])
    return voice[samples]


def master(audio: np.ndarray, sample_rate: int, pace: float = 1.0) -> np.ndarray:
    """A mono line at `sample_rate`, mastered at SAMPLE_RATE and spoken `pace` times faster."""
    voice = tighten(np.asarray(audio, dtype=np.float32).reshape(-1), sample_rate)
    if sample_rate != SAMPLE_RATE:
        voice = resample_poly(voice, SAMPLE_RATE, sample_rate).astype(np.float32)
    if pace != 1.0:
        # Rubber Band, keeping the voice's formants: no chipmunk, no warble
        voice = time_stretch(voice[np.newaxis, :], SAMPLE_RATE, stretch_factor=pace, high_quality=True, preserve_formants=True)[0]
    voice = CHAIN(voice[np.newaxis, :], SAMPLE_RATE)[0]
    meter = pyloudnorm.Meter(SAMPLE_RATE)
    with warnings.catch_warnings():
        # Peaks over the top are expected here: the limiter takes them
        warnings.simplefilter("ignore", UserWarning)
        voice = pyloudnorm.normalize.loudness(voice, meter.integrated_loudness(voice), LOUDNESS).astype(np.float32)
    # JUCE's limiter lifts its threshold to full scale: the gain after brings
    # it back down to the ceiling, the loudness back to LOUDNESS
    voice = Pedalboard([Limiter(threshold_db=CEILING, release_ms=60), Gain(gain_db=CEILING)])(voice[np.newaxis, :], SAMPLE_RATE)[0]
    fade = int(FADE * SAMPLE_RATE)
    voice[:fade] *= np.linspace(0, 1, fade, dtype=np.float32)
    voice[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)
    return voice


def master_file(source: str, target: str, pace: float = 1.0) -> None:
    """Masters the WAV at `source` into a mono WAV at `target`"""
    with AudioFile(source) as f:
        audio, rate = f.read(f.frames).mean(axis=0), f.samplerate
    with AudioFile(target, "w", SAMPLE_RATE, 1) as f:
        f.write(master(audio, rate, pace)[np.newaxis, :])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Master a spoken line")
    parser.add_argument("source")
    parser.add_argument("target")
    parser.add_argument("--pace", type=float, default=1.0, help="How much faster to speak it")
    args = parser.parse_args()
    master_file(args.source, args.target, args.pace)
