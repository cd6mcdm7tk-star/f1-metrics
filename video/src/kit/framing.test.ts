import { describe, expect, it } from 'vitest';
import { framingAt, reframes, STILL } from './framing';

const line = (from: number, words: [string, number][]) => ({ from, said: words.map(([word, start]) => ({ word, start })) });

describe('the camera over a scene', () => {
  const timeline = {
    scenes: [{ from: 0, to: 400 }, { from: 400, to: 900 }],
    voice: [
      line(8, [['Cinq', 8], ['pilotes.', 40], ['Antonelli', 120], ['devant.', 160], ['Puis', 190]]),
      line(409, [['Au', 409], ['départ,', 430], ['Antonelli', 460], ['garde.', 500], ['Hadjar', 620]]),
    ],
  };

  it('reframes as the scene and each later sentence start, a second and a half apart at least', () => {
    expect(reframes(timeline, 100)).toEqual([0, 120]);
    expect(reframes(timeline, 500)).toEqual([400, 620]);
  });

  it('starts each scene wide, then eases to the next framing without a jump', () => {
    expect(framingAt([0, 120], 0, 60)).toEqual(STILL);
    const before = framingAt([0, 120], 119, 60);
    const at = framingAt([0, 120], 120, 60);
    const after = framingAt([0, 120], 160, 60);
    expect(at.scale).toBeCloseTo(before.scale, 2);
    expect(after.scale).toBeGreaterThan(1.05);
    expect(after.x).not.toBe(0);
  });

  it('drifts in while a sentence is said, but only so far', () => {
    expect(framingAt([0], 60, 60).scale).toBeGreaterThan(1);
    expect(framingAt([0], 6000, 60).scale).toBeLessThan(1.04);
  });
});
