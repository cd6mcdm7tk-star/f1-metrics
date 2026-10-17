"""Voice studio: listen to the videos' voiceovers, try Chatterbox on any line
with any voice and settings, and choose the voice and settings the videos use.

    ~/chatterbox/.venv/bin/python tts/studio.py    (from video/; opens in the browser)

The interface is in French, for the person producing the videos.
"""

import json
import os
import shutil
import subprocess
import time
from contextlib import redirect_stdout
from pathlib import Path

import gradio as gr
import numpy as np

VIDEO = Path(__file__).resolve().parent.parent
SETTINGS = VIDEO / "tts" / "settings.json"
SPOKEN = VIDEO / "public" / "voice"
VOICES = Path(os.environ.get("VOICES_DIR", Path.home() / "chatterbox" / "voices"))
LANGS = {"Français": "fr", "Anglais": "en"}

_model = None
# The voices worked out so far, by file and when it last changed
_conds: dict[tuple[str, float], object] = {}


def settings() -> dict:
    return json.loads(SETTINGS.read_text())


def model():
    """Chatterbox, loaded once (the first generation takes a little longer)"""
    global _model
    if _model is None:
        from mlx_audio.tts.utils import load

        with redirect_stdout(open(os.devnull, "w")):
            _model = load(settings()["model"])
    return _model


def voices() -> list[str]:
    return sorted(p.name for p in VOICES.glob("*.wav"))


# ── Our videos ──────────────────────────────────────────────────────────────


def productions() -> dict[str, Path]:
    """Each video's spoken lines, as `npm run render` lists them"""
    found = {}
    # French first
    for manifest in sorted(SPOKEN.glob("*/*.json"), key=lambda m: (m.stem, m.parent.name != "fr")):
        data = json.loads(manifest.read_text())
        found[f"{data['video']} · {data['lang'].upper()}"] = manifest
    return found


# ── Trying a line ───────────────────────────────────────────────────────────


def generate(text: str, lang: str, voice: str, recorded: str | None, exaggeration: float, cfg_weight: float, temperature: float):
    if not text.strip():
        raise gr.Error("Écris d'abord un texte.")
    reference = recorded or str(VOICES / voice)
    tts = model()
    key = (reference, os.path.getmtime(reference))
    if key not in _conds:
        _conds[key] = tts.prepare_conditionals(reference, 0, exaggeration)
    start = time.time()
    with redirect_stdout(open(os.devnull, "w")):
        parts = tts.generate(
            text=text,
            conds=_conds[key],
            exaggeration=exaggeration,
            cfg_weight=cfg_weight,
            temperature=temperature,
            lang_code=LANGS[lang],
            verbose=False,
        )
        audio = np.concatenate([np.array(part.audio) for part in parts])
    seconds = len(audio) / tts.sample_rate
    info = f"{seconds:.1f} s de voix, générées en {time.time() - start:.1f} s ({len(text) / seconds:.0f} caractères par seconde)"
    return (tts.sample_rate, audio), info


def adopt_settings(exaggeration: float, cfg_weight: float) -> str:
    current = settings()
    current.update(exaggeration=round(exaggeration, 2), cfgWeight=round(cfg_weight, 2))
    SETTINGS.write_text(json.dumps(current, indent=2) + "\n")
    return f"Réglages enregistrés pour les vidéos : expressivité {exaggeration:.2f}, guidage {cfg_weight:.2f}. Les phrases seront réenregistrées au prochain rendu."


def adopt_voice(recorded: str | None, voice: str, lang: str) -> tuple[str, gr.Dropdown]:
    """Makes a voice the videos' voice for a language, keeping the previous one"""
    code = LANGS[lang]
    target = VOICES / f"ref-{code}.wav"
    source = recorded or str(VOICES / voice)
    if Path(source).resolve() == target.resolve():
        return f"C'est déjà la voix des vidéos en {lang.lower()}.", gr.Dropdown(choices=voices(), value=voice)
    if target.exists():
        shutil.copy(target, VOICES / f"ref-{code}-{time.strftime('%Y%m%d-%H%M%S')}.wav")
    # 24 kHz mono, as Chatterbox expects
    subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@24000", "-c", "1", source, str(target)], check=True)
    return (
        f"Voix des vidéos en {lang.lower()} remplacée (l'ancienne est gardée dans {VOICES}). Les phrases seront réenregistrées au prochain rendu.",
        gr.Dropdown(choices=voices(), value=target.name),
    )


# ── Interface ───────────────────────────────────────────────────────────────

current = settings()

with gr.Blocks(title="Studio voix · METRIK DELTA") as studio:
    gr.Markdown("# Studio voix · METRIK DELTA")

    with gr.Tab("Nos vidéos"):
        choice = gr.Dropdown(choices=list(productions()), label="Vidéo", value=next(iter(productions()), None))

        @gr.render(inputs=choice)
        def lines(selected: str | None):
            manifest = productions().get(selected or "")
            if not manifest:
                gr.Markdown("Aucune voix enregistrée pour l'instant : lance `npm run render`.")
                return
            data = json.loads(manifest.read_text())
            for i, line in enumerate(data["lines"], 1):
                with gr.Row(equal_height=True):
                    gr.Markdown(f"**{i}.** {line['text']}  \n*{line['seconds']:.1f} s*")
                    gr.Audio(str(manifest.parent / line["file"]), show_label=False, interactive=False)

    with gr.Tab("Essayer"):
        with gr.Row():
            with gr.Column():
                text = gr.Textbox(label="Texte", lines=4, value="Quatre-vingt-quatre millièmes. Moins qu'un battement de cils.")
                lang = gr.Radio(list(LANGS), value="Français", label="Langue")
                voice = gr.Dropdown(choices=voices(), value="ref-fr.wav" if "ref-fr.wav" in voices() else None, label="Voix de référence")
                recorded = gr.Audio(sources=["microphone", "upload"], type="filepath", label="…ou enregistre / importe une voix (10 s, au calme)")
                exaggeration = gr.Slider(0, 2, value=current["exaggeration"], step=0.05, label="Expressivité (plus haut = plus théâtral)")
                cfg_weight = gr.Slider(0, 1, value=current["cfgWeight"], step=0.05, label="Guidage (plus bas = plus lent, plus posé)")
                temperature = gr.Slider(0.3, 1.2, value=0.8, step=0.05, label="Température (plus haut = plus varié, moins sûr)")
                go = gr.Button("Générer", variant="primary")
            with gr.Column():
                output = gr.Audio(label="Résultat", interactive=False)
                info = gr.Markdown()
                gr.Markdown("### Adopter pour les vidéos")
                keep_settings = gr.Button("Utiliser ces réglages pour les vidéos")
                keep_voice = gr.Button("Utiliser cette voix pour les vidéos (dans la langue choisie)")
                adopted = gr.Markdown()

        go.click(generate, [text, lang, voice, recorded, exaggeration, cfg_weight, temperature], [output, info])
        keep_settings.click(adopt_settings, [exaggeration, cfg_weight], adopted)
        keep_voice.click(adopt_voice, [recorded, voice, lang], [adopted, voice])


if __name__ == "__main__":
    studio.launch(inbrowser=True)
