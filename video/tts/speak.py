"""Speaks a video's voiceover with Chatterbox, on Apple Silicon (mlx-audio),
masters each line at the voice's pace (master.py), times each word with
Whisper so the video can follow the voice, and works out the mouth shapes
with Rhubarb Lip Sync so the mascot can say it.

Reads a job as JSON on stdin:
    {"model": "mlx-community/chatterbox-multilingual-v3", "lang": "fr",
     "reference": "/path/to/voice.wav", "exaggeration": 0.7, "cfg_weight": 0.3,
     "pace": 1.12, "rhubarb": "/path/to/rhubarb" or null,
     "lines": [{"text": "...", "file": "/path/to/take.wav", "voice": "/path/to/line.wav"}]}
writes each line's take as Chatterbox says it, the line as it plays (voice),
its words' timing (<voice>.words.json) and its mouth shapes
(<voice>.mouth.json), keeping what is still up to date, and prints
{voice: {"seconds", "words", "mouth"}} as JSON on stdout. Progress goes to stderr.

Run with the Python that has mlx-audio (setup in the README's Videos section).
"""

import hashlib
import json
import subprocess
import sys
import tempfile
import wave
from contextlib import redirect_stdout
from pathlib import Path

import numpy as np

from master import master_file

WHISPER = "mlx-community/whisper-large-v3-turbo-asr-fp16"


def seconds(path: Path) -> float:
    with wave.open(str(path)) as audio:
        return audio.getnframes() / audio.getframerate()


def key_file(path: Path) -> Path:
    return path.with_suffix(".key")


def words_file(path: Path) -> Path:
    return path.with_suffix(".words.json")


def mouth_file(path: Path) -> Path:
    return path.with_suffix(".mouth.json")


def mouth(path: Path) -> list:
    return json.loads(mouth_file(path).read_text()) if mouth_file(path).exists() else []


def main() -> None:
    job = json.load(sys.stdin)
    voices = [Path(line["voice"]) for line in job["lines"]]

    # mlx-audio talks on stdout, which carries the result
    with redirect_stdout(sys.stderr):
        speak(job, [line for line in job["lines"] if not Path(line["file"]).exists()])
        for line in job["lines"]:
            master_line(Path(line["file"]), Path(line["voice"]), job["pace"])
        time_words(job["lang"], [v for v in voices if not words_file(v).exists()])
    shape_mouths(job.get("rhubarb"), job["lang"], [line for line in job["lines"] if not mouth_file(Path(line["voice"])).exists()])

    json.dump({str(v): {"seconds": seconds(v), "words": json.loads(words_file(v).read_text()), "mouth": mouth(v)} for v in voices}, sys.stdout)


def master_line(take: Path, voice: Path, pace: float) -> None:
    """Masters a take into the line that plays, again when the take, the pace or
    master.py has changed since; its words and mouth shapes are then worked out anew"""
    source = Path(__file__).with_name("master.py").read_bytes()
    key = hashlib.sha1(source + f"|{pace}|{take.stat().st_mtime_ns}".encode()).hexdigest()
    if voice.exists() and key_file(voice).exists() and key_file(voice).read_text() == key:
        return
    master_file(str(take), str(voice), pace)
    key_file(voice).write_text(key)
    words_file(voice).unlink(missing_ok=True)
    mouth_file(voice).unlink(missing_ok=True)


def speak(job: dict, todo: list[dict]) -> None:
    if not todo:
        return
    from mlx_audio.audio_io import write
    from mlx_audio.tts.utils import load

    model = load(job["model"])
    # The voice to clone, worked out once for every line
    conds = model.prepare_conditionals(job["reference"], 0, job["exaggeration"])
    for i, line in enumerate(todo, 1):
        print(f"[{i}/{len(todo)}] {line['text']}", file=sys.stderr)
        parts = model.generate(
            text=line["text"],
            conds=conds,
            exaggeration=job["exaggeration"],
            cfg_weight=job["cfg_weight"],
            lang_code=job["lang"],
            verbose=False,
        )
        audio = np.concatenate([np.array(part.audio) for part in parts])
        Path(line["file"]).parent.mkdir(parents=True, exist_ok=True)
        write(line["file"], audio, model.sample_rate, format="wav")


def time_words(lang: str, todo: list[Path]) -> None:
    """When each word is said, as Whisper hears it (seconds into the line)"""
    if not todo:
        return
    from mlx_audio.stt.utils import load

    model = load(WHISPER)
    for path in todo:
        result = model.generate(str(path), language=lang, word_timestamps=True)
        words = [
            {"word": w["word"].strip(), "start": round(w["start"], 3), "end": round(w["end"], 3)}
            for segment in result.segments
            for w in segment.get("words", [])
        ]
        words_file(path).write_text(json.dumps(words, ensure_ascii=False))


def shape_mouths(rhubarb: str | None, lang: str, todo: list[dict]) -> None:
    """The mouth shape at each moment (Rhubarb's A-H and X), in seconds into the line"""
    if not rhubarb or not todo:
        return
    for line in todo:
        path = Path(line["voice"])
        print(f"mouth: {line['text']}", file=sys.stderr)
        with tempfile.TemporaryDirectory() as scratch:
            output = Path(scratch, "mouth.json")
            args = [rhubarb, "-q", "-f", "json", "--extendedShapes", "GHX", "-o", str(output)]
            if lang == "en":
                # English words are recognised, better with the script to go by
                dialog = Path(scratch, "dialog.txt")
                dialog.write_text(line["text"])
                args += ["-r", "pocketSphinx", "--dialogFile", str(dialog)]
            else:
                args += ["-r", "phonetic"]
            subprocess.run([*args, str(path)], check=True)
            cues = json.loads(output.read_text())["mouthCues"]
        mouth_file(path).write_text(json.dumps(cues))


if __name__ == "__main__":
    main()
