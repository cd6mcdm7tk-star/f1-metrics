import { describe, expect, it } from 'vitest';
import narration from '../../../narration/money-mclaren.fr.json';
import { buildMcLaren, MCLAREN_BEATS } from './story';

describe("McLaren's money episode", () => {
  const story = buildMcLaren(narration, 'fr', null);

  // Without a recording the lines are timed by their length, about 30 % longer
  // than spoken (Aston Martin: 83 s estimated, 64 s spoken; this one: 90 s, 70 s)
  it('says every beat in order and lasts 60 to 80 seconds once spoken', () => {
    expect(story.voice).toHaveLength(MCLAREN_BEATS.length);
    story.voice.slice(1).forEach((line, i) => expect(line.from).toBeGreaterThan(story.voice[i].to));
    expect(story.frames / 60).toBeGreaterThanOrEqual(60);
    expect(story.frames / 60).toBeLessThanOrEqual(100);
  });

  it('waits for the words that name what is drawn, in the order they are said', () => {
    const { cues } = story;
    expect(cues.titles).toBeLessThan(cues.driver);
    expect(cues.driver).toBeLessThan(cues.lost);
    expect(cues.covid).toBeLessThan(cues.furlough);
    expect(cues.furlough).toBeLessThan(cues.pay);
    expect(cues.heritage).toBeLessThan(cues.investors);
    expect(cues.bonuses).toBeLessThan(cues.without);
    expect(cues.buyout).toBeLessThan(cues.directors);
    expect(cues.topEarner).toBeLessThan(cues.profit);
    expect(cues.ourPoint).toBeLessThan(cues.theirPoint);
  });
});
