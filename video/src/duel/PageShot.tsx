import { useCurrentFrame } from 'remotion';
import { cameraAt } from '../camera';
import Cartel from '../Cartel';
import { LABEL } from '../format';
import type { Lang } from '../i18n';
import PageCard from '../site/PageCard';
import SiteWindow from '../site/SiteWindow';
import type { Duel } from './data';
import Explainer from './Explainer';
import Hud, { HUD_LEFT } from './Hud';
import Marks from './Marks';
import type { PageStory } from './page';
import { replayDistance } from './story';
import ZoomLayer from './ZoomLayer';

const pad = (n: number) => String(n).padStart(2, '0');

/** The site's page in a card, its label beside the mascot's bubble */
export default function PageShot({ duel, story, lang }: { duel: Duel; story: PageStory; lang: Lang }) {
  const frame = useCurrentFrame();
  const cam = cameraAt(story.shots, frame);
  const distance = replayDistance(duel, story, frame);
  const beat = story.beats.find(b => frame >= b.from && frame < b.to);
  const chapter = beat && [...story.chapters].reverse().find(c => c.from <= frame && c.label === beat.kicker);
  const page = <SiteWindow telemetry={duel.telemetry} teams={duel.teams} replayDistance={distance} />;

  return (
    <PageCard
      cam={cam} backdrop={page}
      page={<>{page}{story.zooms.map(zoom => <ZoomLayer key={zoom.from} duel={duel} zoom={zoom} />)}</>}
      overlay={beat && <Marks duel={duel} beat={beat} cam={cam} />}
    >
      {beat && (
        <Cartel
          from={beat.from} to={beat.to} kicker={beat.kicker} title={beat.title} detail={beat.detail} maxWidth={HUD_LEFT - LABEL.left - 16}
          chapter={chapter && `${pad(chapter.index)} / ${pad(chapter.total)}`}
        />
      )}
      <Hud duel={duel} story={story} distance={distance} lang={lang} />
      {story.explainers.map(e => <Explainer key={e.from} {...e} />)}
    </PageCard>
  );
}
