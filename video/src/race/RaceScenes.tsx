import { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { analyse } from '../duel/analysis';
import { interpolate } from '../duel/data';
import { SAFE, VIDEO } from '../format';
import BumpChart from '../kit/BumpChart';
import DuelHud from '../kit/DuelHud';
import Headline, { headline } from '../kit/Headline';
import { INK, inkOn } from '../kit/ink';
import { EASE_OUT, landing, ramp } from '../kit/motion';
import { fitCamera } from '../kit/projection';
import ProofCard from '../kit/ProofCard';
import Slam from '../kit/Slam';
import Stage from '../kit/Stage';
import { valueAt, type Track } from '../kit/track';
import Track3D from '../kit/Track3D';
import VoiceCaption from '../kit/VoiceCaption';
import { BRAND_NAME, DISPLAY, MONO, SITE } from '../theme';
import type { Compound, RaceDriver, RaceWeekend } from './data';
import type { RaceFacts } from './facts';
import type { RaceStory } from './story';

export interface RaceSceneProps {
  race: RaceWeekend;
  facts: RaceFacts;
  story: RaceStory;
  track: Track;
  from: number;
  to: number;
  series: string;
  episode: string;
}

const WIDTH = SAFE.right - SAFE.left;
/** The top finishers the charts follow */
const FOLLOWED = 8;
const linear = (t: number) => t;
const kicker = { position: 'absolute' as const, left: SAFE.left, top: 460, fontFamily: MONO, fontSize: 24, letterSpacing: '0.2em', color: INK.textSub };
const gapText = (s: number) => `+${s.toFixed(3).replace('.', ',')}`;
const driverOf = (race: RaceWeekend, code: string) => race.drivers.find(d => d.code === code)!;

/** The hook: the winner's day as a title, over a lap of the circuit; both already there on the first frame */
export function HookScene({ race, facts, story, track, series, episode }: RaceSceneProps) {
  const frame = useCurrentFrame();
  const { hook } = story.beats;
  const ground = useMemo(() => track.points.map(p => ({ ...p, z: 0 })), [track]);
  const camera = fitCamera(ground, 0.95 + 0.15 * ramp(frame, 0, hook.to + 40, linear), 0.5, 40, { x: 24, y: 820, w: VIDEO.width - 48, h: 660 }, VIDEO);
  // One lap round the circuit while the hook is said
  const lap = race.duel.distance;
  const car = lap[Math.round(ramp(frame, 0, hook.to, linear) * (lap.length - 1))];
  const winner = facts.winner;
  return (
    <Stage series={series} episode={episode} scene={<Track3D track={track} camera={camera} width={34} car={{ distance: car, color: winner.color, trail: 700 }} />}>
      <Headline
        lines={headline(`${winner.name}\n*${facts.lapsLed[winner.code]}* tours en tête\nsur ${race.totalLaps}`)} size={108}
        style={{ position: 'absolute', top: 290, left: SAFE.left, width: WIDTH, transform: `scale(${landing(frame)})`, transformOrigin: 'left top' }}
      />
    </Stage>
  );
}

/** The podium: second and third either side of the winner, rising as they are named */
export function PodiumScene({ facts, story, from, series, episode }: RaceSceneProps) {
  const frame = useCurrentFrame();
  const [first, second, third] = facts.podium;
  const steps: { driver: RaceDriver; place: number; height: number; at: number; x: number }[] = [
    { driver: second, place: 2, height: 380, at: story.cues.second, x: SAFE.left },
    { driver: first, place: 1, height: 520, at: from + 6, x: SAFE.left + WIDTH / 3 },
    { driver: third, place: 3, height: 280, at: story.cues.third, x: SAFE.left + (2 * WIDTH) / 3 },
  ];
  const floor = 1380;
  return (
    <Stage series={series} episode={episode}>
      <VoiceCaption line={story.beats.podium} top={300} />
      {steps.map(({ driver, place, height, at, x }) => {
        const t = ramp(frame, at - 10, at + 16, EASE_OUT);
        const h = height * t;
        return (
          <div key={driver.code}>
            <div style={{ position: 'absolute', left: x + 8, width: WIDTH / 3 - 16, top: floor - h, height: h, background: driver.color, opacity: 0.9 }}>
              <div style={{ textAlign: 'center', marginTop: 18, fontFamily: DISPLAY, fontWeight: 700, fontSize: 110, color: inkOn(driver.color), opacity: t }}>{place}</div>
            </div>
            <div style={{ position: 'absolute', left: x, width: WIDTH / 3, top: floor - h - 150, textAlign: 'center', opacity: t, color: INK.text }}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 56, letterSpacing: '0.04em' }}>{driver.code}</div>
              <div style={{ fontFamily: MONO, fontSize: 24, color: INK.textSub, marginTop: 4 }}>{place === 1 ? 'VAINQUEUR' : `${gapText(driver.gap ?? 0)} s`}</div>
            </div>
          </div>
        );
      })}
    </Stage>
  );
}

/** Places lap by lap for the top finishers: the start, then the race up to the winner's lead coming back */
export function PositionsScene({ race, facts, story, from, to, series, episode }: RaceSceneProps) {
  const frame = useCurrentFrame();
  const inLead = from >= story.beats.lead.from - 30;
  // The grid first, then each lap: point n is the end of lap n - 1
  const lines = race.drivers.filter(d => d.position != null).slice(0, FOLLOWED).map(d => ({ code: d.code, color: d.color, places: [d.grid, ...race.positions[d.code]] }));
  const second = facts.leaders.find(l => l.code !== facts.winner.code);
  const loser = Object.entries(facts.firstLap).filter(([code]) => lines.some(l => l.code === code)).sort((a, b) => a[1] - b[1])[0];
  const upTo = inLead
    ? 4 + ((second ? second.to + 2 : race.totalLaps + 1) - 4) * ramp(frame, from + 6, story.cues.pits, linear)
    : 1 + 3 * ramp(frame, from + 6, to - 10, linear);
  return (
    <Stage series={series} episode={episode}>
      <VoiceCaption line={inLead ? story.beats.lead : story.beats.start} top={300} />
      <div style={kicker}>POSITIONS TOUR PAR TOUR · TOP {FOLLOWED}</div>
      <BumpChart
        lines={lines} upTo={upTo} laps={race.totalLaps + 1} span={inLead ? [1, race.totalLaps + 1] : [1, 4]} places={10} box={{ x: SAFE.left, y: 560, w: WIDTH, h: 820 }}
        tick={lap => (lap === 1 ? 'GRILLE' : `T${lap - 1}`)}
        ticks={[1, 2, 3, 4, 11, 21, 31, 41, 51, race.totalLaps + 1].filter(l => (inLead ? l === 1 || l > 4 : l <= 4))}
        highlight={inLead ? second?.code : frame >= story.cues.firstLap - 10 ? loser?.[0] : undefined}
        band={inLead && second ? { from: second.from + 1, to: second.to + 1, label: `${second.code} EN TÊTE`, shown: ramp(frame, story.cues.leads - 10, story.cues.leads + 10) } : undefined}
      />
      {!inLead && loser && (
        <div style={{ position: 'absolute', top: 1450, left: SAFE.left, opacity: ramp(frame, story.cues.firstLap, story.cues.firstLap + 14, EASE_OUT), fontFamily: DISPLAY, fontWeight: 700, fontSize: 40, color: INK.bg }}>
          <span style={{ background: INK.text, padding: '4px 14px' }}>{loser[0]} · P{driverOf(race, loser[0]).grid} → P{race.positions[loser[0]][0]} AU 1ER TOUR</span>
        </div>
      )}
    </Stage>
  );
}

const COMPOUND: Record<Compound, { color: string; letter: string }> = {
  SOFT: { color: '#e8423a', letter: 'T' },
  MEDIUM: { color: '#f5c518', letter: 'M' },
  HARD: { color: '#f2e6d8', letter: 'D' },
  INTERMEDIATE: { color: '#3fae49', letter: 'I' },
  WET: { color: '#2b7bd6', letter: 'P' },
};

/** Each top finisher's tyres over the race, a bar per stint, with the number of stops */
export function StrategyScene({ race, facts, story, from, to, series, episode }: RaceSceneProps) {
  const frame = useCurrentFrame();
  const drivers = race.drivers.filter(d => d.position != null).slice(0, FOLLOWED);
  const grow = ramp(frame, from + 6, to - 20, linear);
  const width = WIDTH - 260;
  const lapX = (lap: number) => ((lap - 1) / race.totalLaps) * width;
  const lit = (code: string) => (facts.stops[code] === 1 ? frame >= story.cues.oneStop - 6 && code === facts.winner.code : frame >= story.cues.twoStops - 6 && facts.stops[code] >= 2);
  return (
    <Stage series={series} episode={episode}>
      <VoiceCaption line={story.beats.strategy} top={300} />
      <div style={kicker}>PNEUS · T TENDRES · M MEDIUMS · D DURS</div>
      <div style={{ position: 'absolute', top: 540, left: SAFE.left, width: WIDTH }}>
        {drivers.map((d, i) => {
          const picked = lit(d.code);
          const anyLit = frame >= story.cues.oneStop - 6;
          return (
            <div key={d.code} style={{ display: 'flex', alignItems: 'center', height: 104, opacity: anyLit && !picked ? 0.35 : 1 }}>
              <span style={{ width: 120, fontFamily: DISPLAY, fontWeight: 700, fontSize: 36, color: INK.text }}>{i + 1}. {d.code}</span>
              <div style={{ position: 'relative', width, height: 46 }}>
                {race.stints[d.code].map(stint => {
                  const end = Math.min(stint.to, race.totalLaps * grow);
                  if (end < stint.from) return null;
                  return (
                    <div key={stint.from} style={{
                      position: 'absolute', left: lapX(stint.from), width: Math.max(0, lapX(end + 1) - lapX(stint.from) - 4), top: 0, bottom: 0,
                      background: COMPOUND[stint.compound].color, color: INK.bg, fontFamily: DISPLAY, fontWeight: 700, fontSize: 30, paddingLeft: 10, overflow: 'hidden',
                    }}>
                      {COMPOUND[stint.compound].letter}
                    </div>
                  );
                })}
              </div>
              <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 22, color: picked ? INK.text : INK.textSub }}>{facts.stops[d.code]} ARRÊT{facts.stops[d.code] > 1 ? 'S' : ''}</span>
            </div>
          );
        })}
      </div>
    </Stage>
  );
}

/** The race's fastest lap against the winner's lap of the same number, both cars on the same clock */
export function FastestScene({ race, story, track, from, to, series, episode }: RaceSceneProps) {
  const frame = useCurrentFrame();
  const { duel, fastest } = race;
  const ground = useMemo(() => track.points.map(p => ({ ...p, z: 0 })), [track]);
  const camera = fitCamera(ground, 0.95 + 0.12 * ramp(frame, from, to), 0.6, 40, { x: 24, y: 520, w: VIDEO.width - 48, h: 470 }, VIDEO);
  const lapTime = duel.time[0][duel.time[0].length - 1];
  const clock = lapTime * ramp(frame, from + 10, to - 10, linear);
  const at = [0, 1].map(i => interpolate(duel.time[i], duel.distance, clock));
  const drivers = duel.drivers.map(d => driverOf(race, d.code));
  const tyreAge = (code: string) => {
    const stint = race.stints[code].find(s => s.from <= fastest.lap && s.to >= fastest.lap);
    return stint ? fastest.lap - stint.from : null;
  };
  const points = duel.telemetry.telemetry;
  const reading = (i: 0 | 1) => {
    const lap = duel.order[i];
    return {
      code: drivers[i].code, color: drivers[i].color,
      speed: valueAt(points, at[i], p => p.speeds[lap]), gear: Math.round(valueAt(points, at[i], p => p.gears[lap])),
      throttle: valueAt(points, at[i], p => p.throttles[lap]), brake: valueAt(points, at[i], p => (p.brakes[lap] ? 1 : 0)) > 0.5,
    };
  };
  const gap = interpolate(duel.distance, duel.time[1], at[0]) - clock;
  return (
    <Stage series={series} episode={episode} scene={
      <Track3D track={track} camera={camera} width={30} cars={[
        { distance: at[1], color: drivers[1].color, trail: 300, tag: drivers[1].code },
        { distance: at[0], color: drivers[0].color, trail: 400, tag: drivers[0].code },
      ]} />
    }>
      <VoiceCaption line={story.beats.fastest} top={300} />
      <div style={{ ...kicker, top: 440 }}>TOUR {fastest.lap} · PNEUS DE {drivers.map(d => `${d.code} : ${tyreAge(d.code)} TOURS`).join(' · ')}</div>
      <Slam at={story.cues.quicker} frame={frame} top={1030} size={90} color={drivers[0].color}>{`−${(duel.drivers[1].lapTime - duel.drivers[0].lapTime).toFixed(3).replace('.', ',')} s`}</Slam>
      <DuelHud readings={[reading(0), reading(1)]} gap={`${drivers[0].code} ${gap >= 0 ? '+' : '−'}${Math.abs(gap).toFixed(2).replace('.', ',')} s`} top={1150} left={SAFE.left} width={WIDTH} />
    </Stage>
  );
}

/** The same two laps on the site's charts, at the corner the faster one gained most in */
export function ProofScene({ race, story, from, series, episode }: RaceSceneProps) {
  const frame = useCurrentFrame();
  const { duel } = race;
  const corner = useMemo(() => analyse(duel).sections.flatMap(s => s.corners).reduce((a, b) => (b.gapChange > a.gapChange ? b : a)), [duel]);
  const [faster, slower] = duel.drivers;
  const card = ramp(frame, from + 6, from + 30, EASE_OUT);
  return (
    <Stage series={series} episode={episode}>
      <Headline lines={headline('La *preuve*')} size={110} reveal={() => ramp(frame, from, from + 18, EASE_OUT)} style={{ position: 'absolute', top: 270, left: SAFE.left }} />
      <div style={{ position: 'absolute', top: 392, left: SAFE.left, fontFamily: MONO, fontSize: 22, letterSpacing: '0.14em', color: INK.textSub, textTransform: 'uppercase' }}>
        Télémétrie réelle · {race.location} {race.year} · Tour {race.fastest.lap} · {faster.code} – {slower.code}
      </div>
      <div style={{ opacity: card, transform: `translateY(${(1 - card) * 120}px) scale(${0.94 + 0.06 * card})` }}>
        <ProofCard
          duel={duel} window={[corner.apexAt - 230, corner.apexAt + 170]} top={440} left={SAFE.left} width={WIDTH} until="throttle"
          marks={[{ from: corner.apexAt - 60, to: corner.apexAt + 100, label: `${faster.code} −${corner.gapChange.toFixed(2).replace('.', ',')} S ICI`, shown: ramp(frame, story.cues.everywhere - 10, story.cues.everywhere + 10, EASE_OUT) }]}
        />
      </div>
      <VoiceCaption line={story.beats.proof} top={1120} />
    </Stage>
  );
}

/** The day's climbers: the best among the points, and the best of all */
export function ClimbersScene({ facts, story, series, episode }: RaceSceneProps) {
  const frame = useCurrentFrame();
  const inPoints = facts.climbers.find(c => c.driver.position! <= 10 && c.gained > 0);
  const overall = facts.climbers[0];
  const cards = [inPoints && { ...inPoints, at: story.cues.norris }, overall !== inPoints && { ...overall, at: story.cues.bortoleto }]
    .filter((c): c is NonNullable<typeof inPoints> & { at: number } => !!c);
  return (
    <Stage series={series} episode={episode}>
      <VoiceCaption line={story.beats.climbers} top={300} />
      {cards.map(({ driver, gained, at }, i) => {
        const t = ramp(frame, at - 8, at + 16, EASE_OUT);
        const place = Math.round(driver.grid! - gained * t);
        return (
          <div key={driver.code} style={{
            position: 'absolute', left: SAFE.left, width: WIDTH, top: 500 + i * 440, height: 380, opacity: Math.min(1, t * 2), transform: `translateX(${(1 - t) * -80}px)`,
            background: 'rgba(36,6,10,0.82)', border: '1px solid rgba(242,230,216,0.16)', color: INK.text,
          }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 12, background: driver.color }} />
            <div style={{ position: 'absolute', left: 44, top: 30, fontFamily: DISPLAY, fontWeight: 700, fontSize: 64 }}>{driver.name.toUpperCase()}</div>
            <div style={{ position: 'absolute', left: 44, top: 110, fontFamily: MONO, fontSize: 22, letterSpacing: '0.14em', color: INK.textSub }}>{driver.team.toUpperCase()}</div>
            <div style={{ position: 'absolute', left: 44, bottom: 40, fontFamily: DISPLAY, fontWeight: 700, fontSize: 130, fontVariantNumeric: 'tabular-nums' }}>
              P{driver.grid} <span style={{ color: INK.textSub }}>→</span> P{place}
            </div>
            <div style={{ position: 'absolute', right: 40, bottom: 56, fontFamily: DISPLAY, fontWeight: 700, fontSize: 64, color: INK.bg }}>
              <span style={{ background: driver.color, color: inkOn(driver.color), padding: '4px 16px' }}>+{gained}</span>
            </div>
          </div>
        );
      })}
    </Stage>
  );
}

/** The top five of the drivers' standings, each bar growing by the race's points, and the leader's margin */
export function ChampionshipScene({ race, facts, story, from, series, episode }: RaceSceneProps) {
  const frame = useCurrentFrame();
  const before = new Map(race.standings);
  const top = facts.standings.slice(0, 5);
  const max = top[0][1];
  const grow = ramp(frame, from + 20, from + 70, EASE_OUT);
  return (
    <Stage series={series} episode={episode}>
      <VoiceCaption line={story.beats.championship} top={300} />
      <div style={kicker}>CHAMPIONNAT PILOTES · APRÈS {race.location.toUpperCase()}</div>
      <div style={{ position: 'absolute', top: 530, left: SAFE.left, width: WIDTH }}>
        {top.map(([code, points], i) => {
          const driver = driverOf(race, code);
          const was = before.get(code) ?? 0;
          const now = was + (points - was) * grow;
          return (
            <div key={code} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 110px', alignItems: 'center', gap: 16, height: 92, opacity: i === 0 || frame < story.cues.lead ? 1 : 0.55 }}>
              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 38, color: INK.text }}>{i + 1}. {code}</span>
              <div style={{ height: 34, background: 'rgba(242,230,216,0.06)', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(was / max) * 100}%`, background: driver.color, opacity: 0.55 }} />
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(now / max) * 100}%`, background: driver.color }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 32, textAlign: 'right', color: INK.text, fontVariantNumeric: 'tabular-nums' }}>{Math.round(now)}</span>
            </div>
          );
        })}
      </div>
      <Slam at={story.cues.lead} frame={frame} top={1060} size={130} color={facts.winner.color}>{`+${facts.lead} PTS`}</Slam>
      <div style={{ ...kicker, top: 1210, left: 0, right: 0, textAlign: 'center', opacity: ramp(frame, story.cues.lead + 6, story.cues.lead + 20) }}>D'AVANCE POUR {facts.winner.code}</div>
      <div style={{ position: 'absolute', top: 1290, left: 0, right: 0, textAlign: 'center', opacity: ramp(frame, story.cues.left - 6, story.cues.left + 10, EASE_OUT), fontFamily: DISPLAY, fontWeight: 700, fontSize: 52, color: INK.bg }}>
        <span style={{ background: INK.text, padding: '4px 18px' }}>{facts.pointsLeft} POINTS ENCORE EN JEU</span>
      </div>
    </Stage>
  );
}

export function EndScene({ race, story, title, from, series, episode }: RaceSceneProps & { title: string }) {
  const frame = useCurrentFrame();
  const brand = ramp(frame, from + 50, from + 70, EASE_OUT);
  return (
    <Stage series={series} episode={episode}>
      {race.next && (
        <div style={{ position: 'absolute', top: 300, left: 0, right: 0, textAlign: 'center', fontFamily: MONO, fontSize: 26, letterSpacing: '0.3em', color: INK.textSub, opacity: ramp(frame, from + 4, from + 20) }}>
          PROCHAINE COURSE · {race.next.toUpperCase()}
        </div>
      )}
      <Headline
        lines={headline(title)} size={130} reveal={i => ramp(frame, from + 10 + i * 6, from + 26 + i * 6, EASE_OUT)}
        style={{ position: 'absolute', top: 360, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      />
      <VoiceCaption line={story.beats.end} top={660} />
      <div style={{ position: 'absolute', top: 1360, left: 0, right: 0, textAlign: 'center', opacity: brand, transform: `translateY(${(1 - brand) * 30}px)` }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 64, letterSpacing: '0.16em', color: INK.text }}>{BRAND_NAME}</div>
        <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 26, letterSpacing: '0.14em', color: INK.textSub }}>{SITE}</div>
      </div>
    </Stage>
  );
}
