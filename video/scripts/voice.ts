// The voiceover's audio: each line spoken by Chatterbox through tts/speak.py,
// into public/voice, kept until its text, the reference voice or the settings
// (tts/settings.json, which the voice studio can change) change. With Rhubarb
// Lip Sync installed, each line also gets the mascot's mouth shapes.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import type { Lang } from '../src/i18n';
import type { MouthCue, Voiceover } from '../src/voice';
import type { HeardWord } from '../src/words';

const PYTHON = process.env.CHATTERBOX_PYTHON ?? path.join(homedir(), 'chatterbox/.venv/bin/python');
const RHUBARB = process.env.RHUBARB ?? path.join(homedir(), 'rhubarb/app/rhubarb');

interface Settings {
  model: string;
  /** Emotion: higher is more theatrical */
  exaggeration: number;
  /** Guidance: lower is slower and more deliberate */
  cfgWeight: number;
}
const settings = (): Settings => JSON.parse(readFileSync('tts/settings.json', 'utf8'));

/** The voice to clone, VOICE_FR / VOICE_EN or ~/chatterbox/voices/ref-<lang>.wav */
const reference = (lang: Lang) => process.env[`VOICE_${lang.toUpperCase()}`] ?? path.join(homedir(), 'chatterbox/voices', `ref-${lang}.wav`);

export const canSpeak = (lang: Lang): boolean => existsSync(PYTHON) && existsSync(reference(lang));

/** Speaks a video's lines, and lists them in public/voice/<lang>/<video>.json for the voice studio */
export function speak(texts: string[], lang: Lang, video: string): Voiceover {
  const ref = reference(lang);
  const SETTINGS = settings();
  const voice = [SETTINGS.model, ref, statSync(ref).mtimeMs, SETTINGS.exaggeration, SETTINGS.cfgWeight, lang].join('|');
  const lines = [...new Set(texts)].map(text => ({
    text,
    file: path.resolve('public/voice', lang, `${createHash('sha1').update(`${voice}|${text}`).digest('hex').slice(0, 16)}.wav`),
  }));
  const job = {
    model: SETTINGS.model, lang, reference: ref, exaggeration: SETTINGS.exaggeration, cfg_weight: SETTINGS.cfgWeight,
    rhubarb: existsSync(RHUBARB) ? RHUBARB : null, lines,
  };
  const run = spawnSync(PYTHON, ['tts/speak.py'], { input: JSON.stringify(job), encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] });
  if (run.status !== 0) throw new Error(`tts/speak.py failed (exit ${run.status})`);
  const result: Record<string, { seconds: number; words: HeardWord[]; mouth: MouthCue[] }> = JSON.parse(run.stdout);
  const spoken = lines.map(line => ({ text: line.text, file: path.basename(line.file), seconds: result[line.file].seconds }));
  writeFileSync(path.resolve('public/voice', lang, `${video}.json`), JSON.stringify({ video, lang, lines: spoken }, null, 2));
  return Object.fromEntries(lines.map(line => [line.text, { file: path.relative('public', line.file), ...result[line.file] }]));
}
