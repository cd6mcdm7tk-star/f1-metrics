import { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE_OUT, landing, ramp } from '../kit/motion';
import { SAFE, VIDEO } from '../format';
import Headline, { headline } from '../kit/Headline';
import { fitCamera } from '../kit/projection';
import Stage from '../kit/Stage';
import { type Track } from '../kit/track';
import Track3D from '../kit/Track3D';
import VoiceCaption from '../kit/VoiceCaption';
import type { PoleSession } from './data';
import type { PoleFacts } from './facts';
import { DETAILS, type PoleStory } from './story';
import TopSix, { gapText, lapTime } from './TopSix';

export interface SceneProps {
  session: PoleSession;
  facts: PoleFacts;
  story: PoleStory;
  track: Track;
  from: number;
  series: string;
  episode: string;
  /** The hook's title, from the script, in place of how close the top was */
  title?: string;
}

/** Under the hook's title, the whole circuit */
const OVERVIEW = { x: 24, y: 800, w: VIDEO.width - 48, h: 680 };

/** "5 pilotes en moins de 3 dixièmes", from the facts */
function hookTitle({ count, gap }: PoleFacts['within']): string {
  const limit = gap < 1 ? `*${Math.round(gap * 10)} dixième${gap >= 0.2 ? 's' : ''}*` : `*${gap} seconde${gap > 1 ? 's' : ''}*`;
  return `*${count}* pilotes\nen moins de\n${limit}`;
}

const linear = (t: number) => t;

/** The hook: how close it was, over the pole lap drawn round the circuit as a
 * streak of light, the title and the car already there on the first frame */
export function HookScene({ session, facts, story, track, series, episode, title }: SceneProps) {
  const frame = useCurrentFrame();
  const { hook } = story.beats;
  const ground = useMemo(() => track.points.map(p => ({ ...p, z: 0 })), [track]);
  const camera = fitCamera(ground, 0.95 + 0.15 * ramp(frame, 0, hook.to + 40, linear), 0.5, 40, OVERVIEW, VIDEO);
  const pole = session.drivers[0];
  const lap = session.duel.distance;
  const car = lap[Math.min(lap.length - 1, Math.round(ramp(frame, 0, hook.to, linear) * (lap.length - 1)))];
  return (
    <Stage series={series} episode={episode} scene={<Track3D track={track} camera={camera} width={34} car={{ distance: car, color: pole.color, trail: 600 }} />}>
      <Headline
        lines={headline(title ?? hookTitle(facts.within))} size={112}
        style={{ position: 'absolute', top: 290, left: SAFE.left, width: SAFE.right - SAFE.left, transform: `scale(${landing(frame)})`, transformOrigin: 'left top' }}
      />
    </Stage>
  );
}

/** The grid, from sixth to pole, each card landing as its driver is named */
export function GridScene({ session, facts, story, series, episode }: SceneProps) {
  const frame = useCurrentFrame();
  const shown = story.named.map(at => ramp(frame, at - 6, at + 14, (t: number) => t));
  return (
    <Stage series={series} episode={episode}>
      <TopSix drivers={session.drivers} gaps={facts.gaps} shown={shown} />
      <VoiceCaption line={story.beats.grid} top={300} />
    </Stage>
  );
}

/** What each of P3 to P6 is about, as a figure under their card: the gap to
 * the teammate ahead, or a better time from an earlier segment, or the gap
 * to the car ahead */
function detailFigure(index: number, session: PoleSession, facts: PoleFacts): string {
  const driver = session.drivers[index];
  const teammate = facts.teammates.find(t => t.behind === driver)?.ahead;
  const earlier = facts.earlier.find(e => e.driver === driver);
  if (!teammate && earlier) return `Q${earlier.segment} · ${lapTime(earlier.time)} → P${earlier.wouldBe}`;
  const ahead = teammate ?? session.drivers[index - 1];
  return `À ${gapText(driver.time - ahead.time).slice(1)} s de ${ahead.code}`;
}

/** The details: the grid again, each of P3 to P6 picked out in turn with a figure */
export function DetailsScene({ session, facts, story, from, series, episode }: SceneProps) {
  const frame = useCurrentFrame();
  const current = [...DETAILS].reverse().find(d => frame >= story.beats[d.beat].from - 10) ?? DETAILS[0];
  const index = session.drivers.findIndex(d => d.position === current.position);
  const start = story.beats[current.beat].from - 10;
  const shown = session.drivers.map((_, i) => ramp(frame, from + i * 3, from + i * 3 + 14, (t: number) => t));
  return (
    <Stage series={series} episode={episode}>
      <TopSix
        drivers={session.drivers} gaps={facts.gaps} shown={shown}
        focus={{ index, amount: ramp(frame, start, start + 16, EASE_OUT), figure: detailFigure(index, session, facts) }}
      />
      {DETAILS.map(d => <VoiceCaption key={d.beat} line={story.beats[d.beat]} top={300} />)}
    </Stage>
  );
}
