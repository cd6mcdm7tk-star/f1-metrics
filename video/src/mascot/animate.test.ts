import { describe, expect, it } from 'vitest';
import type { VoiceLine } from '../voice';
import { blinkAt, earFlick, faceAt, lookAt, noise, poseAt, talkEnergy, visemeAt } from './animate';
import { FACES } from './face';

const mouth: VoiceLine['mouth'] = [{ from: 10, to: 20, value: 'D' }, { from: 20, to: 30, value: 'B' }];
const line: VoiceLine = { from: 10, to: 40, text: 'Oui.', words: [], said: [{ word: 'Oui.', start: 10 }], mouth, moods: [] };

describe('noise', () => {
  it('gives the same value for the same input, within [0, 1)', () => {
    expect(noise(3, 1)).toBe(noise(3, 1));
    for (let n = 0; n < 50; n++) {
      expect(noise(n)).toBeGreaterThanOrEqual(0);
      expect(noise(n)).toBeLessThan(1);
    }
  });
});

describe('visemeAt', () => {
  it('follows the cues and rests between them', () => {
    expect(visemeAt(mouth, 9)).toBe('X');
    expect(visemeAt(mouth, 10)).toBe('D');
    expect(visemeAt(mouth, 20)).toBe('B');
    expect(visemeAt(mouth, 30)).toBe('X');
  });
});

describe('talkEnergy', () => {
  it('is 0 in silence and grows while the mouth is wide open', () => {
    expect(talkEnergy(mouth, 5)).toBe(0);
    expect(talkEnergy(mouth, 19)).toBe(1);
    expect(talkEnergy(mouth, 24)).toBeCloseTo((5 * 1 + 5 * 0.3) / 10);
  });
});

describe('blinkAt', () => {
  const blinks = (fps: number) => {
    const starts: number[] = [];
    for (let f = 1; f < fps * 30; f++) if (blinkAt(f, fps) > 0 && blinkAt(f - 1, fps) === 0) starts.push(f);
    return starts;
  };

  it('blinks every 2.5 to 5 seconds, shutting the eyes fully', () => {
    const starts = blinks(60);
    expect(starts.length).toBeGreaterThanOrEqual(6);
    starts.slice(1).forEach((start, i) => {
      expect(start - starts[i]).toBeGreaterThanOrEqual(150);
      expect(start - starts[i]).toBeLessThanOrEqual(300);
    });
    expect(Math.max(...Array.from({ length: 20 }, (_, i) => blinkAt(starts[0] + i, 60)))).toBe(1);
  });

  it('keeps the eyes open between blinks', () => {
    expect(blinkAt(0, 60)).toBe(0);
    expect(blinkAt(47, 60)).toBe(0);
  });
});

describe('earFlick', () => {
  it('twitches one ear at a time and is still otherwise', () => {
    expect(earFlick(0, 60)).toEqual([0, 0]);
    let twitched = false;
    for (let f = 0; f < 600; f++) {
      const [left, right] = earFlick(f, 60);
      expect(left === 0 || right === 0).toBe(true);
      expect(Math.max(left, right)).toBeLessThanOrEqual(14);
      twitched ||= left + right > 0;
    }
    expect(twitched).toBe(true);
  });
});

describe('lookAt', () => {
  it('starts on the viewer and stays near them', () => {
    expect(lookAt(0, 60)).toEqual({ x: 0, y: 0 });
    for (let f = 0; f < 1200; f += 7) {
      const look = lookAt(f, 60);
      expect(Math.abs(look.x)).toBeLessThanOrEqual(0.3);
      expect(Math.abs(look.y)).toBeLessThanOrEqual(0.15);
    }
  });
});

describe('faceAt', () => {
  const moods = [{ from: 100, expression: 'surprised' as const }, { from: 200, expression: 'ironic' as const }];

  it('is neutral before the first expression and eases into each one', () => {
    expect(faceAt(moods, 50, 12)).toEqual(FACES.neutral);
    expect(faceAt(moods, 112, 12)).toEqual(FACES.surprised);
    expect(faceAt(moods, 106, 12).ears[0]).toBeGreaterThan(FACES.surprised.ears[0]);
    expect(faceAt(moods, 106, 12).ears[0]).toBeLessThan(FACES.neutral.ears[0]);
    expect(faceAt(moods, 260, 12)).toEqual(FACES.ironic);
  });

  it('eases from where the face was when an expression cuts in early', () => {
    const quick = [{ from: 100, expression: 'surprised' as const }, { from: 104, expression: 'disappointed' as const }];
    const before = faceAt(quick, 104, 12);
    expect(before.ears[0]).not.toBe(FACES.surprised.ears[0]);
    expect(faceAt(quick, 104, 12)).toEqual(faceAt(quick.slice(0, 1), 104, 12));
  });
});

describe('poseAt', () => {
  it('says the line, and rests on the expression\'s own mouth in silence', () => {
    expect(poseAt([line], 15, 60).mouth).toBe('D');
    expect(poseAt([line], 35, 60).mouth).toBe(FACES.neutral.rest);
    const surprised = { ...line, moods: [{ from: 0, expression: 'surprised' as const }] };
    expect(poseAt([surprised], 35, 60).mouth).toBe('E');
  });

  it('keeps the face of one line into the next', () => {
    const next = { ...line, from: 50, to: 80, mouth: [{ from: 50, to: 60, value: 'C' as const }], moods: [] };
    const ironic = { ...line, moods: [{ from: 0, expression: 'ironic' as const }] };
    const pose = poseAt([ironic, next], 55, 60);
    expect(pose.mouth).toBe('C');
    expect(pose.face.lids).toEqual(FACES.ironic.lids);
  });
});
