import { AbsoluteFill, Html5Audio, Sequence, staticFile, type CalculateMetadataFunction } from 'remotion';
import { VIDEO } from '../format';
import type { Lang } from '../i18n';
import { toVoiceLine, type MouthCue, type Voiceover, type VoiceLine } from '../voice';
import type { HeardWord } from '../words';
import Subtitle, { SUBTITLE_TOP } from '../Subtitle';
import MascotShot from './MascotShot';
import { parseMoods } from './script';

// One line of a video's voiceover said by the mascot, to see it act. The line
// has to be recorded already: rendering the video speaks its lines.

export type MascotLineProps = {
  lang: Lang;
  /** The video whose voiceover holds the line, e.g. 2025-melbourne-q-nor-pia */
  video: string;
  /** The line as written, expression tags included */
  script: string;
  line: VoiceLine | null;
  audio: string | null;
};

const LEAD = 12;
const TAIL = 40;

const load = async <T,>(file: string): Promise<T> => (await fetch(staticFile(file))).json() as Promise<T>;

export const calculateMascotLine: CalculateMetadataFunction<MascotLineProps> = async ({ props }) => {
  const { text } = parseMoods(props.script);
  const folder = `voice/${props.lang}`;
  const manifest = await load<{ lines: { text: string; file: string; seconds: number }[] }>(`${folder}/${props.video}.json`);
  const entry = manifest.lines.find(l => l.text === text);
  if (!entry) throw new Error(`Not in ${props.video}'s ${props.lang} voiceover yet (render the video first): "${text}"`);
  const base = `${folder}/${entry.file.replace(/\.wav$/, '')}`;
  const [words, mouth] = await Promise.all([load<HeardWord[]>(`${base}.words.json`), load<MouthCue[]>(`${base}.mouth.json`)]);
  const voiceover: Voiceover = { [text]: { file: `${folder}/${entry.file}`, seconds: entry.seconds, words, mouth } };
  const line = toVoiceLine(props.script, LEAD, props.lang, VIDEO.fps, voiceover);
  return { durationInFrames: line.to + TAIL, props: { ...props, line, audio: voiceover[text].file } };
};

export default function MascotLine({ line, audio }: MascotLineProps) {
  if (!line || !audio) return null;
  return (
    <AbsoluteFill>
      <MascotShot lines={[line]} from={0} to={line.to + TAIL} />
      <Subtitle line={line} top={SUBTITLE_TOP} />
      <Sequence from={line.from}>
        <Html5Audio src={staticFile(audio)} />
      </Sequence>
    </AbsoluteFill>
  );
}
