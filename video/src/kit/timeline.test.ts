import { describe, expect, it } from 'vitest';
import { buildTimeline } from './timeline';

describe('a video told beat by beat', () => {
  const sceneOf = { hook: 'open', grid: 'open', end: 'close' } as const;
  const script = { hook: 'Cinq pilotes en moins de trois dixièmes.', grid: 'Antonelli en pole.', end: 'Rendez-vous demain.' };
  const story = buildTimeline(['hook', 'grid', 'end'], sceneOf, script, {}, 'fr', null);

  it('leaves a shorter pause between two lines of a scene than across a cut', () => {
    const [hook, grid, end] = story.voice;
    expect(grid.from - hook.to).toBeLessThan(end.from - grid.to);
  });

  it('lasts over a minute however short the script, for TikTok to pay for it', () => {
    expect(story.frames).toBe(61 * 60);
    expect(story.scenes[story.scenes.length - 1].to).toBe(story.frames);
  });
});
