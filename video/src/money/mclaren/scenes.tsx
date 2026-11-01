import type { ReactNode } from 'react';
import { useCurrentFrame } from 'remotion';
import { SAFE } from '../../format';
import BarChart from '../../kit/BarChart';
import { INK, inkOn } from '../../kit/ink';
import { EASE_OUT, OPENING, pulse, ramp } from '../../kit/motion';
import Slam from '../../kit/Slam';
import Stage from '../../kit/Stage';
import type { Track } from '../../kit/track';
import VoiceCaption from '../../kit/VoiceCaption';
import { DISPLAY, MONO } from '../../theme';
import { costPerPoint, millions } from '../accounts';
import { ASTON_MARTIN } from '../astonMartin';
import { Backdrop, CHART, centred, EndScene as ClosingCard, kicker, ProofScene as AccountsProof, StandingsScene, stagger, WIDTH, type SceneFrame } from '../common';
import { MCLAREN, withoutBonuses } from './data';
import type { McLarenStory } from './story';

export interface McLarenSceneProps extends SceneFrame {
  /** The 2025 finale's circuit, behind the opening */
  track: Track;
  story: McLarenStory;
}

const lastOf = <T,>(list: T[]): T => list[list.length - 1];
const { years, color } = MCLAREN;
const last = lastOf(years);
const place = (position: number) => (position === 1 ? '1ER' : `${position}E`);

/** A band in the team's colour sliding in at `at`, bumping when it is `named` again */
function Chip({ at, frame, top, named, children }: { at: number; frame: number; top: number; named?: number; children: ReactNode }) {
  const t = ramp(frame, at - 4, at + 14, EASE_OUT);
  return (
    <div style={{
      position: 'absolute', top, left: 0, right: 0, textAlign: 'center', opacity: t, transform: `translateX(${(1 - t) * -80}px)`,
      fontFamily: DISPLAY, fontWeight: 700, fontSize: 46, letterSpacing: '0.06em', color: inkOn(color),
    }}>
      <span style={{ background: color, padding: '6px 22px', display: 'inline-block', transform: `scale(${named == null ? 1 : pulse(frame, named)})` }}>{children}</span>
    </div>
  );
}

/** The hook: both titles and the loss, all there from the first frame, each bumping as the voice names it */
export function HookScene({ track, story, from, series, episode }: McLarenSceneProps) {
  const frame = useCurrentFrame();
  return (
    <Stage series={series} episode={episode} scene={<Backdrop track={track} frame={frame} from={from} />}>
      <VoiceCaption line={story.beats.hook} top={300} />
      <div style={centred(560)}>SAISON {last.year}</div>
      <Chip at={OPENING} frame={frame} top={620} named={story.cues.titles}>CHAMPION · CONSTRUCTEURS</Chip>
      <Chip at={OPENING} frame={frame} top={720} named={story.cues.driver}>CHAMPION · PILOTES · NORRIS</Chip>
      <div style={centred(920)}>RÉSULTAT NET {last.year}</div>
      <Slam at={OPENING} frame={frame} top={970} size={230} color={INK.brake} named={story.cues.lost}>{`−${millions(-last.result)} M£`}</Slam>
    </Stage>
  );
}

export function RescueScene({ story, from, series, episode }: McLarenSceneProps) {
  const frame = useCurrentFrame();
  const { cues } = story;
  const before = years[0];
  const blows: [number, string][] = [[cues.covid, 'COVID'], [cues.furlough, 'CHÔMAGE PARTIEL'], [cues.pay, 'SALAIRES EN BAISSE']];
  return (
    <Stage series={series} episode={episode}>
      <VoiceCaption line={story.beats.rescue} top={300} />
      <Slam at={from + 8} frame={frame} top={450} size={190}>2020</Slam>
      <div style={{ ...centred(650), opacity: ramp(frame, from + 16, from + 32) }}>{`${before.year} : −${millions(-before.result)} M£ DE PERTE`}</div>
      <div style={{ position: 'absolute', top: 720, left: SAFE.left, width: WIDTH, display: 'flex', justifyContent: 'center', gap: 18 }}>
        {blows.map(([at, label]) => {
          const t = ramp(frame, at - 4, at + 12, EASE_OUT);
          return (
            <span key={label} style={{
              opacity: t, transform: `scale(${0.8 + 0.2 * t})`, padding: '8px 16px', border: `2px solid ${INK.brake}`,
              fontFamily: MONO, fontSize: 24, letterSpacing: '0.12em', color: INK.text, whiteSpace: 'nowrap',
            }}>{label}</span>
          );
        })}
      </div>
      <div style={{ ...centred(900), opacity: ramp(frame, cues.heritage - 10, cues.heritage + 4) }}>VOITURES HISTORIQUES VENDUES AU GROUPE · PLUS-VALUE</div>
      <Slam at={cues.heritage} frame={frame} top={950} size={140}>{`+${millions(MCLAREN.rescue.heritageProfit)} M£`}</Slam>
      <div style={{ ...centred(1140), opacity: ramp(frame, cues.investors - 10, cues.investors + 4) }}>APPORTÉS PAR DES INVESTISSEURS EXTÉRIEURS</div>
      <Slam at={cues.investors} frame={frame} top={1190} size={140} color={color}>{`${millions(MCLAREN.rescue.investment)} M£`}</Slam>
    </Stage>
  );
}

export function RevenueScene({ story, from, series, episode }: McLarenSceneProps) {
  const frame = useCurrentFrame();
  // The heritage cars' sale swells 2020: the years compared leave it out
  const compared = years.filter(y => !y.oneOff);
  const first = compared[0];
  const badge = ramp(frame, story.cues.tripled - 6, story.cues.tripled + 12, EASE_OUT);
  return (
    <Stage series={series} episode={episode}>
      <VoiceCaption line={story.beats.revenue} top={300} />
      <div style={kicker}>REVENUS · MILLIONS DE £</div>
      <BarChart
        bars={compared.map((y, i) => ({ label: String(y.year), value: y.revenue, color: i === compared.length - 1 ? color : INK.textGhost }))}
        shown={stagger(frame, Math.min(from + 10, story.cues.revenue - 20), compared.length)} box={CHART} max={last.revenue * 1.15} format={v => millions(v)}
      />
      {badge > 0 && (
        <div style={{
          position: 'absolute', top: 1420, left: 0, right: 0, textAlign: 'center', opacity: badge, transform: `scale(${0.8 + 0.2 * badge})`,
          fontFamily: DISPLAY, fontWeight: 700, fontSize: 52, color: INK.bg,
        }}>
          <span style={{ background: INK.text, padding: '4px 18px' }}>×{millions(last.revenue / first.revenue, 1)} DEPUIS {first.year}</span>
        </div>
      )}
    </Stage>
  );
}

export function BonusScene({ story, series, episode }: McLarenSceneProps) {
  const frame = useCurrentFrame();
  const { shareBased, operatingResult } = MCLAREN.bonuses;
  const peak = shareBased[shareBased.length - 1].value;
  return (
    <Stage series={series} episode={episode}>
      <VoiceCaption line={story.beats.bonuses} top={300} />
      <div style={kicker}>PRIMES INDEXÉES SUR LA VALEUR DE L'ÉCURIE · M£</div>
      <BarChart
        bars={shareBased.map((b, i) => ({ label: String(b.year), value: b.value, color: i === shareBased.length - 1 ? INK.brake : INK.textGhost }))}
        shown={stagger(frame, story.cues.bonuses - 16, shareBased.length, 12)} box={{ ...CHART, y: 520, h: 580 }} max={peak * 1.2} format={v => millions(v)}
      />
      <div style={{ ...centred(1150), opacity: ramp(frame, story.cues.without - 10, story.cues.without + 4) }}>RÉSULTAT D'EXPLOITATION {last.year} SANS CES PRIMES</div>
      <Slam at={story.cues.without} frame={frame} top={1200} size={150} color={color}>{`+${millions(withoutBonuses(MCLAREN))} M£`}</Slam>
      <div style={{ ...centred(1370), opacity: ramp(frame, story.cues.without + 20, story.cues.without + 40) }}>{`AVEC : −${millions(-operatingResult)} M£`}</div>
    </Stage>
  );
}

export function PayoutScene({ story, series, episode }: McLarenSceneProps) {
  const frame = useCurrentFrame();
  const { cues } = story;
  const before = years[years.length - 2];
  const { directors, topEarner } = MCLAREN.bonuses;
  return (
    <Stage series={series} episode={episode}>
      <VoiceCaption line={story.beats.payout} top={300} />
      <div style={{ ...centred(470), opacity: ramp(frame, cues.buyout - 10, cues.buyout + 6) }}>SEPTEMBRE {last.year} · LE GROUPE RACHÈTE TOUTES LES PARTS</div>
      <Slam at={cues.directors} frame={frame} top={530} size={170} color={INK.brake}>{`${millions(directors)} M£`}</Slam>
      <div style={{ ...centred(710), opacity: ramp(frame, cues.directors + 6, cues.directors + 20) }}>PRIMES DES DIRIGEANTS · {last.year}</div>
      <BarChart
        bars={[
          { label: 'LE MIEUX PAYÉ', value: topEarner, color: INK.brake, note: String(last.year) },
          { label: `BÉNÉFICE ${before.year}`, value: before.result, color: INK.textGhost, note: "TOUTE L'ÉCURIE" },
        ]}
        shown={[ramp(frame, cues.topEarner - 6, cues.topEarner + 20, EASE_OUT), ramp(frame, cues.profit - 6, cues.profit + 20, EASE_OUT)]}
        box={{ ...CHART, y: 790, h: 640 }} max={topEarner * 1.2} format={v => millions(v)}
      />
    </Stage>
  );
}

export function PointsScene({ story, series, episode }: McLarenSceneProps) {
  const frame = useCurrentFrame();
  const ours = lastOf(costPerPoint(years)).value;
  const rival = lastOf(ASTON_MARTIN.years);
  const theirs = lastOf(costPerPoint(ASTON_MARTIN.years)).value;
  return (
    <Stage series={series} episode={episode}>
      <VoiceCaption line={story.beats.points} top={300} />
      <div style={kicker}>CE QUE COÛTE UN POINT EN {last.year} · MILLIONS DE £</div>
      <BarChart
        bars={[
          { label: MCLAREN.team.toUpperCase(), value: ours, color, note: `${last.points} PTS · ${place(last.position)}` },
          { label: ASTON_MARTIN.team.toUpperCase(), value: theirs, color: ASTON_MARTIN.color, note: `${rival.points} PTS · ${place(rival.position!)}` },
        ]}
        shown={[ramp(frame, story.cues.ourPoint - 8, story.cues.ourPoint + 20, EASE_OUT), ramp(frame, story.cues.theirPoint - 8, story.cues.theirPoint + 20, EASE_OUT)]}
        box={{ ...CHART, h: 780 }} max={theirs * 1.2} format={v => millions(v, 1)}
      />
      <div style={{ position: 'absolute', top: 1400, left: SAFE.left, width: WIDTH, fontFamily: MONO, fontSize: 19, lineHeight: 1.5, letterSpacing: '0.06em', color: INK.textSub, opacity: ramp(frame, story.cues.theirPoint, story.cues.theirPoint + 20) }}>
        DÉPENSES TOTALES ÷ POINTS AU CHAMPIONNAT, PRIMES COMPRISES. LE PLAFOND BUDGÉTAIRE NE COUVRE PAS TOUT.
      </div>
    </Stage>
  );
}

export const SeasonScene = ({ story, from, series, episode }: McLarenSceneProps) => (
  <StandingsScene season={MCLAREN.season} team={MCLAREN.team} color={color} line={story.beats.season} at={story.cues.standing} from={from} series={series} episode={episode} />
);

export const ProofScene = ({ story, from, series, episode }: McLarenSceneProps) => (
  <AccountsProof scan={MCLAREN.scan} company={MCLAREN.company} number={MCLAREN.number} line={story.beats.proof} at={story.cues.accounts} from={from} series={series} episode={episode} />
);

export const EndScene = ({ story, from, series, episode }: McLarenSceneProps) => (
  <ClosingCard title={'Demain :\n*Williams*'} line={story.beats.end} from={from} series={series} episode={episode} />
);
