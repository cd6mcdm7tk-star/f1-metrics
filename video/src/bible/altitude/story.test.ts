import { describe, expect, it } from 'vitest';
import narration from '../../../narration/bible-02-altitude.fr.json';
import { ALTITUDE_BEATS, buildAltitude } from './story';

describe('the altitude episode', () => {
  const story = buildAltitude(narration, 'fr', null);

  // Without a recording the lines are timed by their length, about 30 % longer than spoken
  it('says every beat in order and lasts 60 to 80 seconds once spoken', () => {
    expect(story.voice).toHaveLength(ALTITUDE_BEATS.length);
    story.voice.slice(1).forEach((line, i) => expect(line.from).toBeGreaterThan(story.voice[i].to));
    expect(story.frames / 60).toBeGreaterThanOrEqual(70);
    expect(story.frames / 60).toBeLessThanOrEqual(105);
  });

  it('cuts scenes back to back, each over its own lines', () => {
    expect(story.scenes.map(s => s.kind)).toEqual(['fly', 'air', 'speeds', 'proof', 'payoff', 'end']);
    story.scenes.slice(1).forEach((scene, i) => expect(scene.from).toBe(story.scenes[i].to));
    expect(story.scenes[1].from).toBeGreaterThan(story.beats.altitude.to);
    expect(story.scenes[1].from).toBeLessThan(story.beats.downforce.from);
  });

  it('waits for the words that name what is drawn, in the order they are said', () => {
    const { cues } = story;
    const order: (keyof typeof cues)[] = [
      'monza', 'monaco', 'flat', 'top', 'climb', 'metres', 'thin', 'pressed', 'lessGrip', 'wings', 'lost',
      'resistance', 'glide', 'turbo', 'brakes', 'bars', 'mexico', 'ahead', 'topMark', 'turnOne', 'wingsOf', 'speedOf', 'suffer',
    ];
    order.slice(1).forEach((cue, i) => expect(cues[cue]).toBeGreaterThan(cues[order[i]]));
  });
});
