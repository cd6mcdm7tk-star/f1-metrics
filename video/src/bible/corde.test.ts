import { describe, expect, it } from 'vitest';
import narration from '../../narration/bible-01-corde.fr.json';
import { buildCorde, CORDE_BEATS } from './corde';

describe('the apex episode', () => {
  const story = buildCorde(narration, 'fr', null);

  it('says every beat in order, without overlap', () => {
    expect(story.voice).toHaveLength(CORDE_BEATS.length);
    story.voice.slice(1).forEach((line, i) => expect(line.from).toBeGreaterThan(story.voice[i].to));
  });

  it('lasts at least the minute TikTok pays for', () => {
    expect(story.frames / 60).toBeGreaterThanOrEqual(60);
  });

  it('cuts scenes back to back, each over its own lines', () => {
    expect(story.scenes.map(s => s.kind)).toEqual(['fly', 'schema', 'proof', 'payoff', 'end']);
    expect(story.scenes[0].from).toBe(0);
    story.scenes.slice(1).forEach((scene, i) => expect(scene.from).toBe(story.scenes[i].to));
    expect(story.scenes[story.scenes.length - 1].to).toBe(story.frames);
    expect(story.scenes[1].from).toBeLessThan(story.beats.middle.from);
    expect(story.scenes[1].from).toBeGreaterThan(story.beats.braking.to);
  });

  it('waits for the words that name what is drawn', () => {
    const { cues, beats } = story;
    const within = (frame: number, beat: keyof typeof beats) => frame >= beats[beat].from && frame <= beats[beat].to;
    expect(within(cues.apex, 'line')).toBe(true);
    expect(cues.outside).toBeLessThan(cues.apex);
    expect(cues.apex).toBeLessThan(cues.out);
    expect(within(cues.pole, 'payoff')).toBe(true);
    expect(cues.gain).toBeLessThan(cues.pole);
  });
});
