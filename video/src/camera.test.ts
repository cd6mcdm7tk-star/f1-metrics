import { describe, expect, it } from 'vitest';
import { blend, cameraAt, fit, type Camera } from './camera';

const screenOf = (cam: Camera, x: number, y: number) => ({ x: 540 + (x - cam.x) * cam.scale, y: 960 + (y - cam.y) * cam.scale });

describe('fit', () => {
  it('shows the rectangle as large as fits, centred in the focus area', () => {
    const cam = fit({ x: 100, y: 100, w: 200, h: 100 }, { x: 0, y: 400, w: 800, h: 800 });
    expect(cam.scale).toBe(4);
    expect(screenOf(cam, 200, 150)).toEqual({ x: 400, y: 800 });
  });

  it('can put the rectangle at the top of the focus area instead', () => {
    const cam = fit({ x: 100, y: 100, w: 200, h: 100 }, { x: 0, y: 400, w: 800, h: 800 }, 'top');
    expect(screenOf(cam, 200, 100)).toEqual({ x: 400, y: 400 });
  });
});

describe('blend', () => {
  const a = { x: 0, y: 0, scale: 1 }, b = { x: 100, y: 50, scale: 4 };

  it('starts and ends on each camera', () => {
    expect(blend(a, b, 0)).toEqual(a);
    expect(blend(a, b, 1)).toEqual(b);
  });

  it('zooms geometrically', () => {
    expect(blend(a, b, 0.5).scale).toBeCloseTo(2, 9);
  });
});

describe('cameraAt', () => {
  const a = { x: 0, y: 0, scale: 1 }, b = { x: 100, y: 0, scale: 1 };
  const shots = [{ from: 0, blend: 1, camera: () => a }, { from: 10, blend: 20, camera: () => b }];

  it('holds a shot until the next one starts, then eases into it', () => {
    expect(cameraAt(shots, 5)).toEqual(a);
    expect(cameraAt(shots, 10)).toEqual(a);
    expect(cameraAt(shots, 20).x).toBeCloseTo(50, 9);
    expect(cameraAt(shots, 30)).toEqual(b);
  });

  it("moves without jumps: never faster than the ease's peak, 3× the average", () => {
    for (let f = 0; f < 40; f++) expect(Math.abs(cameraAt(shots, f + 1).x - cameraAt(shots, f).x)).toBeLessThanOrEqual(3 * (100 / 20));
  });
});
