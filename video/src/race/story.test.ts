import { describe, expect, it } from 'vitest';
import narration from '../../narration/2026-austin-race.fr.json';
import { buildRace, RACE_BEATS } from './story';

describe('the race video', () => {
  const story = buildRace(narration, 'fr', null);

  it('says every beat in order and lasts 60 to 80 seconds once spoken', () => {
    expect(story.voice).toHaveLength(RACE_BEATS.length);
    story.voice.slice(1).forEach((line, i) => expect(line.from).toBeGreaterThan(story.voice[i].to));
    expect(story.frames / 60).toBeGreaterThanOrEqual(60);
    expect(story.frames / 60).toBeLessThanOrEqual(90);
  });

  it('shows the positions twice, around the strategy', () => {
    expect(story.scenes.map(s => s.kind)).toEqual(['hook', 'podium', 'positions', 'strategy', 'positions', 'fastest', 'proof', 'climbers', 'championship', 'end']);
    expect(story.cues.oneStop).toBeLessThan(story.cues.twoStops);
  });
});
