import { useCurrentFrame } from 'remotion';
import { SAFE, VIDEO } from '../format';
import BarChart from '../kit/BarChart';
import { INK } from '../kit/ink';
import { EASE_OUT, OPENING, ramp } from '../kit/motion';
import { fitCamera } from '../kit/projection';
import Slam from '../kit/Slam';
import Stage from '../kit/Stage';
import type { Track } from '../kit/track';
import Track3D from '../kit/Track3D';
import VoiceCaption from '../kit/VoiceCaption';
import { DISPLAY, MONO } from '../theme';
import { costPerPoint, millions, totalLoss, type TeamAccounts } from './accounts';
import { Backdrop, CHART, EndScene as ClosingCard, kicker, ProofScene as AccountsProof, StandingsScene, stagger, WIDTH } from './common';
import type { MoneyBeat, MoneyStory } from './story';

export interface MoneySceneProps {
  accounts: TeamAccounts;
  /** The circuit the team's base is at, for the scenes set there */
  track: Track;
  story: MoneyStory;
  beat: MoneyBeat;
  from: number;
  series: string;
  episode: string;
}

/** The hook: what the team spent, there from the first frame, then the points it bought */
export function HookScene({ accounts, track, story, from, series, episode }: MoneySceneProps) {
  const frame = useCurrentFrame();
  const last = accounts.years[accounts.years.length - 1];
  return (
    <Stage series={series} episode={episode} scene={<Backdrop track={track} frame={frame} from={from} />}>
      <VoiceCaption line={story.beats.hook} top={300} />
      <div style={{ ...kicker, top: 560, left: 0, right: 0, textAlign: 'center' }}>DÉPENSES {last.year}</div>
      <Slam at={OPENING} frame={frame} top={610} size={230} named={story.cues.spent}>{`${millions(last.costs)} M£`}</Slam>
      <Slam at={story.cues.points} frame={frame} top={930} size={150} color={accounts.color}>{`${last.points} POINTS`}</Slam>
      <div style={{ ...kicker, top: 1100, left: 0, right: 0, textAlign: 'center', opacity: ramp(frame, story.cues.points + 10, story.cues.points + 30) }}>
        {last.position}E AU CHAMPIONNAT DES CONSTRUCTEURS
      </div>
    </Stage>
  );
}

export function RevenueScene({ accounts, story, from, series, episode }: MoneySceneProps) {
  const frame = useCurrentFrame();
  const { years } = accounts;
  const first = years[0], last = years[years.length - 1];
  const badge = ramp(frame, story.cues.double - 6, story.cues.double + 12, EASE_OUT);
  return (
    <Stage series={series} episode={episode}>
      <VoiceCaption line={story.beats.revenue} top={300} />
      <div style={kicker}>REVENUS · MILLIONS DE £</div>
      <BarChart
        bars={years.map((y, i) => ({ label: String(y.year), value: y.revenue, color: i === years.length - 1 ? accounts.color : INK.textGhost }))}
        shown={stagger(frame, Math.min(from + 10, story.cues.revenue - 30), years.length)} box={CHART} max={last.revenue * 1.15} format={v => millions(v)}
      />
      {badge > 0 && (
        <div style={{
          position: 'absolute', top: 1420, left: 0, right: 0, textAlign: 'center', opacity: badge, transform: `scale(${0.8 + 0.2 * badge})`,
          fontFamily: DISPLAY, fontWeight: 700, fontSize: 52, color: INK.bg,
        }}>
          <span style={{ background: INK.text, padding: '4px 18px' }}>×{millions(last.revenue / first.revenue, 1)} EN {last.year - first.year} ANS</span>
        </div>
      )}
    </Stage>
  );
}

export function LossesScene({ accounts, story, from, series, episode }: MoneySceneProps) {
  const frame = useCurrentFrame();
  const { years } = accounts;
  return (
    <Stage series={series} episode={episode}>
      <VoiceCaption line={story.beats.losses} top={300} />
      <div style={kicker}>PERTE DE L'EXERCICE · MILLIONS DE £</div>
      <BarChart
        bars={years.map(y => ({ label: String(y.year), value: y.loss, color: INK.brake }))}
        shown={stagger(frame, Math.min(from + 10, story.cues.losses - 20), years.length)} box={{ ...CHART, y: 640, h: 560 }}
        max={Math.max(...years.map(y => y.loss)) * 1.2} format={v => `−${millions(v)}`} down
      />
      <div style={{ ...kicker, top: 1250, left: 0, right: 0, textAlign: 'center', opacity: ramp(frame, story.cues.lossTotal - 12, story.cues.lossTotal) }}>
        AU TOTAL, DE {years[0].year} À {years[years.length - 1].year}
      </div>
      <Slam at={story.cues.lossTotal} frame={frame} top={1290} size={150} color={INK.brake}>{`−${millions(totalLoss(years))} M£`}</Slam>
    </Stage>
  );
}

export function CampusScene({ accounts, track, story, from, series, episode }: MoneySceneProps) {
  const frame = useCurrentFrame();
  const ground = track.points.map(p => ({ ...p, z: 0 }));
  const camera = fitCamera(ground, 0.6 + 0.25 * ramp(frame, from, story.beats.campus.to + 30), 0.75, 40, { x: 40, y: 520, w: VIDEO.width - 80, h: 640 }, VIDEO);
  const tunnel = ramp(frame, story.cues.tunnel - 6, story.cues.tunnel + 12, EASE_OUT);
  return (
    <Stage series={series} episode={episode} scene={<Track3D track={track} camera={camera} width={30} />}>
      <VoiceCaption line={story.beats.campus} top={300} />
      <div style={{ ...kicker, top: 470 }}>SILVERSTONE · LE CAMPUS DE L'ÉCURIE</div>
      {tunnel > 0 && (
        <div style={{ position: 'absolute', top: 1180, left: SAFE.left, opacity: tunnel, fontFamily: DISPLAY, fontWeight: 700, fontSize: 40, letterSpacing: '0.08em', color: INK.bg }}>
          <span style={{ background: INK.text, padding: '4px 14px' }}>SOUFFLERIE · EN SERVICE EN {accounts.latest.year}</span>
        </div>
      )}
      <Slam at={story.cues.facilities} frame={frame} top={1250} size={160}>{`${millions(accounts.latest.facilities)} M£`}</Slam>
      <div style={{ ...kicker, top: 1420, left: 0, right: 0, textAlign: 'center', opacity: ramp(frame, story.cues.facilities + 8, story.cues.facilities + 24) }}>
        D'INSTALLATIONS · BÂTIMENTS, SOUFFLERIE, MACHINES
      </div>
    </Stage>
  );
}

export function DebtScene({ accounts, story, series, episode }: MoneySceneProps) {
  const frame = useCurrentFrame();
  const { years, latest } = accounts;
  return (
    <Stage series={series} episode={episode}>
      <VoiceCaption line={story.beats.debt} top={300} />
      <Slam at={story.cues.loans} frame={frame} top={450} size={150}>{`${millions(latest.loans)} M£`}</Slam>
      <div style={{ ...kicker, top: 610, left: 0, right: 0, textAlign: 'center', opacity: ramp(frame, story.cues.loans + 6, story.cues.loans + 20) }}>D'EMPRUNTS</div>
      <div style={{ ...kicker, top: 720, opacity: ramp(frame, story.cues.interest - 10, story.cues.interest + 6) }}>INTÉRÊTS PAYÉS · MILLIONS DE £</div>
      <BarChart
        bars={years.map((y, i) => ({ label: String(y.year), value: y.interest, color: i === years.length - 1 ? INK.brake : INK.textGhost }))}
        shown={stagger(frame, story.cues.interest - 8, years.length, 8)} box={{ ...CHART, y: 770, h: 680 }}
        max={Math.max(...years.map(y => y.interest)) * 1.2} format={v => millions(v, v < 10 ? 1 : 0)}
        line={{ value: latest.operatingLoss, label: `PERTE D'EXPLOITATION ${latest.year} · ${millions(latest.operatingLoss)} M£`, shown: ramp(frame, story.cues.operating - 6, story.cues.operating + 10) }}
      />
    </Stage>
  );
}

/** One dot per employee, out of a thousand */
const DOTS = { cols: 40, rows: 25, size: 14, gap: 8 };

export function StaffScene({ accounts, story, from, series, episode }: MoneySceneProps) {
  const frame = useCurrentFrame();
  const counted = accounts.years.filter(y => y.staff && y.payroll);
  // The headcount climbs year by year from the scene's start, each year held a
  // moment, reaching the last as the voice names it
  const step = Math.max(20, (story.cues.staff - from - 10) / Math.max(1, counted.length - 1));
  const reached = counted.map((_, i) => ramp(frame, from + 4 + i * step, from + 24 + i * step, EASE_OUT));
  const index = reached.reduce((last, t, i) => (t > 0 ? i : last), 0);
  const previous = index > 0 ? counted[index - 1].staff! : 0;
  const shownStaff = Math.round(previous + (counted[index].staff! - previous) * reached[index]);
  const width = DOTS.cols * (DOTS.size + DOTS.gap);
  return (
    <Stage series={series} episode={episode}>
      <VoiceCaption line={story.beats.staff} top={300} />
      <div style={{ position: 'absolute', top: 450, left: SAFE.left, width: WIDTH, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 110, color: INK.text, fontVariantNumeric: 'tabular-nums' }}>{shownStaff}</span>
        <span style={{ fontFamily: MONO, fontSize: 26, letterSpacing: '0.16em', color: INK.textSub }}>SALARIÉS · {counted[index].year}</span>
      </div>
      <div style={{ position: 'absolute', top: 590, left: (VIDEO.width - width) / 2, width, display: 'flex', flexWrap: 'wrap', gap: DOTS.gap }}>
        {Array.from({ length: DOTS.cols * DOTS.rows }, (_, i) => (
          <div key={i} style={{
            width: DOTS.size, height: DOTS.size, borderRadius: '50%',
            background: i < shownStaff ? (i < previous ? INK.text : accounts.color) : 'rgba(242,230,216,0.08)',
          }} />
        ))}
      </div>
      <div style={{ ...kicker, top: 1150, opacity: ramp(frame, story.cues.payroll - 10, story.cues.payroll + 6) }}>MASSE SALARIALE · MILLIONS DE £</div>
      <BarChart
        bars={counted.map((y, i) => ({ label: String(y.year), value: y.payroll!, color: i === counted.length - 1 ? accounts.color : INK.textGhost }))}
        shown={stagger(frame, story.cues.payroll - 8, counted.length, 8)} box={{ x: SAFE.left, y: 1150, w: WIDTH, h: 380 }}
        max={Math.max(...counted.map(y => y.payroll!)) * 1.25} format={v => millions(v)}
      />
    </Stage>
  );
}

export function PointsScene({ accounts, story, series, episode }: MoneySceneProps) {
  const frame = useCurrentFrame();
  const prices = costPerPoint(accounts.years);
  const byYear = new Map(accounts.years.map(y => [y.year, y]));
  const shown = prices.map((_, i) => ramp(
    frame,
    story.cues.firstPoint + ((story.cues.lastPoint - story.cues.firstPoint) * i) / Math.max(1, prices.length - 1) - 10,
    story.cues.firstPoint + ((story.cues.lastPoint - story.cues.firstPoint) * i) / Math.max(1, prices.length - 1) + 20,
    EASE_OUT,
  ));
  return (
    <Stage series={series} episode={episode}>
      <VoiceCaption line={story.beats.points} top={300} />
      <div style={kicker}>CE QUE COÛTE UN POINT · MILLIONS DE £</div>
      <BarChart
        bars={prices.map((p, i) => {
          const y = byYear.get(p.year)!;
          return { label: String(p.year), value: p.value, color: i === prices.length - 1 ? accounts.color : INK.textGhost, note: `${y.points} PTS · ${y.position}E` };
        })}
        shown={shown} box={{ ...CHART, h: 780 }} max={Math.max(...prices.map(p => p.value)) * 1.2} format={v => millions(v, 1)}
      />
      <div style={{ position: 'absolute', top: 1400, left: SAFE.left, width: WIDTH, fontFamily: MONO, fontSize: 19, lineHeight: 1.5, letterSpacing: '0.06em', color: INK.textSub, opacity: ramp(frame, story.cues.lastPoint, story.cues.lastPoint + 20) }}>
        DÉPENSES TOTALES ÷ POINTS AU CHAMPIONNAT. LE PLAFOND BUDGÉTAIRE NE COUVRE PAS TOUT : SALAIRES DES PILOTES, MARKETING…
      </div>
    </Stage>
  );
}

export const SeasonScene = ({ accounts, story, from, series, episode }: MoneySceneProps) => (
  <StandingsScene season={accounts.season} team={accounts.team} color={accounts.color} line={story.beats.season} at={story.cues.standing} from={from} series={series} episode={episode} />
);

export const ProofScene = ({ accounts, story, from, series, episode }: MoneySceneProps) => (
  <AccountsProof scan={accounts.scan} company={accounts.company} number={accounts.number} line={story.beats.proof} at={story.cues.accounts} from={from} series={series} episode={episode} />
);

export const EndScene = ({ story, from, series, episode }: MoneySceneProps) => (
  <ClosingCard title={'Quelle écurie\n*ensuite* ?'} line={story.beats.end} from={from} series={series} episode={episode} />
);
