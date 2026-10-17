import { interpolate, useCurrentFrame } from 'remotion';
import Cartel from '../Cartel';
import { formatLapTime, type Lang } from '../i18n';
import PageCard from '../site/PageCard';
import SiteWindow from '../site/SiteWindow';
import { SITE } from '../theme';
import type { Recap } from './data';
import type { RecapStory } from './story';
import { RECAP_STRINGS } from './strings';

/** The winner's and the runner-up's best laps on the site's telemetry page,
 * replayed while the camera creeps in */
export default function TelemetryScene({ recap, story, scene, lang }: { recap: Recap; story: RecapStory; scene: { from: number; to: number }; lang: Lang }) {
  const frame = useCurrentFrame();
  const duel = recap.duel;
  const lapLength = duel.distance[duel.distance.length - 1];
  const progress = interpolate(frame, [scene.from + 6, scene.to - 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const page = <SiteWindow telemetry={duel.telemetry} teams={duel.teams} replayDistance={progress * lapLength} />;
  const cam = { ...story.telemetry, scale: story.telemetry.scale * (1 + 0.2 * progress) };
  const [a, b] = duel.drivers;
  return (
    <PageCard cam={cam} page={page} backdrop={page}>
      <Cartel
        from={scene.from} to={scene.to} kicker={SITE}
        title={RECAP_STRINGS[lang].siteTitle(a.name, formatLapTime(a.lapTime, lang), b.name, formatLapTime(b.lapTime, lang))}
      />
    </PageCard>
  );
}
