import { describe, expect, it } from 'vitest';
import narration from '../../narration/money-aston-martin.fr.json';
import { buildMoney, MONEY_BEATS } from './story';

describe('the money episode', () => {
  const story = buildMoney(narration, 'fr', null);

  it('says every beat in order and lasts 60 to 80 seconds', () => {
    expect(story.voice).toHaveLength(MONEY_BEATS.length);
    story.voice.slice(1).forEach((line, i) => expect(line.from).toBeGreaterThan(story.voice[i].to));
    expect(story.frames / 60).toBeGreaterThanOrEqual(60);
    expect(story.frames / 60).toBeLessThanOrEqual(90);
  });

  it('waits for the words that name what is drawn, inside their lines', () => {
    const { cues, beats } = story;
    expect(cues.loans).toBeLessThan(cues.interest);
    expect(cues.interest).toBeLessThan(cues.operating);
    expect(cues.firstPoint).toBeLessThan(cues.lastPoint);
    expect(cues.standing).toBeGreaterThanOrEqual(beats.season.from);
    expect(cues.standing).toBeLessThanOrEqual(beats.season.to);
  });
});
