"""Speaks a video's voiceover with Chatterbox, on Apple Silicon (mlx-audio),
times each word with Whisper so the video can follow the voice, and works out
the mouth shapes with Rhubarb Lip Sync so the mascot can say it.

Reads a job as JSON on stdin:
    {"model": "mlx-community/chatterbox-multilingual-v3", "lang": "fr",
     "reference": "/path/to/voice.wav", "exaggeration": 0.7, "cfg_weight": 0.3,
     "rhubarb": "/path/to/rhubarb" or null,
     "lines": [{"text": "...", "file": "/path/to/line.wav"}]}
writes each line's WAV, its words' timing (<line>.words.json) and its mouth
shapes (<line>.mouth.json), keeping files that already exist, and prints
{file: {"seconds", "words", "mouth"}} as JSON on stdout. Progress goes to stderr.

Run with the Python that has mlx-audio (setup in the README's Videos section).
"""

import json
import subprocess
import sys
import tempfile
import wave
from contextlib import redirect_stdout
from pathlib import Path

import numpy as np

WHISPER = "mlx-community/whisper-large-v3-turbo-asr-fp16"


def seconds(path: Path) -> float:
    with wave.open(str(path)) as audio:
        return audio.getnframes() / audio.getframerate()


def words_file(path: Path) -> Path:
    return path.with_suffix(".words.json")


def mouth_file(path: Path) -> Path:
    return path.with_suffix(".mouth.json")


def mouth(path: Path) -> list:
    return json.loads(mouth_file(path).read_text()) if mouth_file(path).exists() else []


def main() -> None:
    job = json.load(sys.stdin)
    files = [Path(line["file"]) for line in job["lines"]]

    # mlx-audio talks on stdout, which carries the result
    with redirect_stdout(sys.stderr):
        speak(job, [line for line in job["lines"] if not Path(line["file"]).exists()])
        time_words(job["lang"], [f for f in files if not words_file(f).exists()])
    shape_mouths(job.get("rhubarb"), job["lang"], [line for line in job["lines"] if not mouth_file(Path(line["file"])).exists()])

    json.dump({str(f): {"seconds": seconds(f), "words": json.loads(words_file(f).read_text()), "mouth": mouth(f)} for f in files}, sys.stdout)


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
        path = Path(line["file"])
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
