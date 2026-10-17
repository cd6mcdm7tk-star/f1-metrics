import { useMemo } from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { ReferenceArea, ReferenceLine } from 'recharts';
import { teammateColors } from '../../../frontend/src/utils/teamColors';
import { blend } from '../camera';
import Cartel from '../Cartel';
import { CARD } from '../format';
import { formatGap, type Lang } from '../i18n';
import PageCard from '../site/PageCard';
import { LapsWindow } from '../site/SiteWindow';
import { BRAND, DISPLAY, MONO, SITE } from '../theme';
import type { Recap } from './data';
import { paceChart } from './pace';
import type { RaceFacts } from './race';
import { REVEAL, type RecapStory } from './story';
import { RECAP_STRINGS } from './strings';

const ease = Easing.bezier(0.65, 0, 0.35, 1);

/** The top two's laps on the site's lap chart, drawn lap by lap as the voice
 * explains how to read it; the camera then closes in on the laps from the
 * restart, where their pace splits */
export default function PaceScene({ recap, facts, story, scene, lang }: { recap: Recap; facts: RaceFacts; story: RecapStory; scene: { from: number; to: number }; lang: Lang }) {
  const frame = useCurrentFrame();
  const s = RECAP_STRINGS[lang];
  const total = facts.totalLaps;
  const restart = facts.restart;
  const { drivers, rows, domain, codes, colorOf } = useMemo(() => {
    const chart = paceChart(recap);
    const codes = chart.drivers.map(d => d.code);
    const teamOf = (code: string) => chart.drivers.find(d => d.code === code)?.team;
    const second = teammateColors(codes, (a, b) => teamOf(a) === teamOf(b));
    return { ...chart, codes, colorOf: (code: string) => second[code] ?? chart.drivers.find(d => d.code === code)!.color };
  }, [recap]);

  // Drawn up to the restart's lap by the time the voice names it, the rest after
  const zoom = story.pace.at;
  const drawn = zoom != null && restart != null
    ? interpolate(frame, [scene.from + 6, zoom, zoom + 40], [1, restart, total], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : interpolate(frame, [scene.from + 6, scene.from + REVEAL + 40], [1, total], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const shown = rows.map(row => (Number(row.lapNumber) <= drawn ? row : { ...row, ...Object.fromEntries(codes.map(c => [c, null])) }));
  const closeIn = zoom != null ? interpolate(frame, [zoom - 4, zoom + 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease }) : 0;
  const lateIn = zoom != null ? interpolate(frame, [zoom + 30, zoom + 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const cam = story.pace.late ? blend(story.pace.whole, story.pace.late, closeIn) : story.pace.whole;

  const late = drivers.map(d => facts.pace.find(p => p.driver === d)?.late ?? null);
  const split = restart != null && late.every((t): t is number => t != null);
  const [quicker] = split && late[1]! < late[0]! ? [drivers[1]] : [drivers[0]];

  const chart = (
    <LapsWindow rows={shown} drivers={codes} colorOf={colorOf} yDomain={domain}>
      {split && <ReferenceArea x1={restart} x2={total} fill={BRAND.bg} fillOpacity={0.09 * lateIn} ifOverflow="visible" />}
      {split && drivers.map((d, i) => (
        <ReferenceLine
          key={d.code} segment={[{ x: restart, y: late[i]! }, { x: total, y: late[i]! }]}
          stroke={colorOf(d.code)} strokeWidth={2.5} strokeDasharray="7 5" strokeOpacity={lateIn} ifOverflow="visible"
        />
      ))}
    </LapsWindow>
  );

  return (
    <PageCard cam={cam} page={chart} backdrop={chart}>
      <Cartel
        from={scene.from} to={scene.to} kicker={SITE} title={s.paceTitle}
        detail={s.paceDetail}
      />
      {split && (
        <div style={{
          position: 'absolute', right: 1080 - CARD.x - CARD.w + 28, top: CARD.y + 28, padding: '12px 20px 14px', borderRadius: 12,
          background: BRAND.bg, color: BRAND.text, opacity: lateIn, transform: `scale(${0.85 + 0.15 * lateIn})`, transformOrigin: '100% 0',
        }}>
          <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: '0.18em', textTransform: 'uppercase', color: BRAND.textSub }}>{s.fromLap(restart!)}</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 48, lineHeight: 1.05 }}>
            {quicker.code} −{formatGap(Math.abs(late[0]! - late[1]!), lang, 2)}<span style={{ fontSize: 30 }}> {s.perLap}</span>
          </div>
        </div>
      )}
    </PageCard>
  );
}
