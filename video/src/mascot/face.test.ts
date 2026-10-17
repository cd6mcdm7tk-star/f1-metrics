import { describe, expect, it } from 'vitest';
import { blendFaces, FACES, MOUTHS, mouthOutline } from './face';

describe('blendFaces', () => {
  it('starts on the first face and ends on the second', () => {
    expect(blendFaces(FACES.neutral, FACES.surprised, 0)).toEqual(FACES.neutral);
    expect(blendFaces(FACES.neutral, FACES.surprised, 1)).toEqual(FACES.surprised);
  });

  it('moves every feature halfway and switches the resting mouth at the middle', () => {
    const half = blendFaces(FACES.neutral, FACES.disappointed, 0.5);
    expect(half.ears).toEqual([(18 + 132) / 2, (18 + 132) / 2]);
    expect(half.tilt).toBe(-2);
    expect(blendFaces(FACES.neutral, FACES.pleased, 0.49).rest).toBe('X');
    expect(blendFaces(FACES.neutral, FACES.pleased, 0.5).rest).toBe('grin');
  });
});

describe('mouthOutline', () => {
  it('has no outline for closed lips', () => {
    expect(mouthOutline(MOUTHS.A, 300, 484)).toBeNull();
    expect(mouthOutline(MOUTHS.X, 300, 484)).toBeNull();
  });

  it('opens a quarter above the lips and the rest below', () => {
    const wide = mouthOutline(MOUTHS.D, 300, 484)!;
    expect(wide.top).toBeCloseTo(484 - 54 * 0.25);
    expect(wide.bottom).toBeCloseTo(484 + 54 * 0.75);
    expect(wide.d.startsWith('M 254 484')).toBe(true);
  });

  it('draws round mouths as an ellipse of their size', () => {
    const round = mouthOutline(MOUTHS.F, 300, 484)!;
    expect(round.bottom - round.top).toBeCloseTo(MOUTHS.F.height);
    expect(round.d).toContain(' A 18 15 ');
  });
});
