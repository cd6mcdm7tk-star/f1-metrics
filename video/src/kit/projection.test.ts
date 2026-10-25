import { describe, expect, it } from 'vitest';
import { blendCamera, fitCamera, mixAngle, NEAR, orbit, projector } from './projection';

const VIEW = { width: 1000, height: 1000 };
const VIEW_TALL = { width: 1080, height: 1920 };
const origin = { x: 0, y: 0, z: 0 };

describe('projection', () => {
  it('puts the target at the centre of the screen, from any angle', () => {
    for (const pitch of [0.2, 0.8, Math.PI / 2]) {
      const p = projector(orbit(origin, 500, 1.1, pitch), VIEW).point(origin)!;
      expect(p.x).toBeCloseTo(500);
      expect(p.y).toBeCloseTo(500);
      expect(p.depth).toBeCloseTo(500);
    }
  });

  it('films the ground from above like a map, its heading pointing up the screen', () => {
    const project = projector(orbit(origin, 500, 0, Math.PI / 2), VIEW);
    const east = project.point({ x: 100, y: 0, z: 0 })!;
    const north = project.point({ x: 0, y: 100, z: 0 })!;
    // Looking east from above: east is up the screen, north to the left
    expect(east.y).toBeLessThan(500);
    expect(east.x).toBeCloseTo(500);
    expect(north.x).toBeLessThan(500);
  });

  it('draws nearer things bigger', () => {
    const project = projector(orbit(origin, 300, 0, 0.4), VIEW);
    const near = project.point({ x: -100, y: 0, z: 0 })!;
    const far = project.point({ x: 100, y: 0, z: 0 })!;
    expect(near.scale).toBeGreaterThan(far.scale);
    expect(near.y).toBeGreaterThan(far.y);
  });

  it('cuts segments at the near plane and drops what is behind', () => {
    const camera = orbit(origin, 100, 0, 0);
    const project = projector(camera, VIEW);
    expect(project.point(camera.eye)).toBeNull();
    const behind = { x: camera.eye.x - 50, y: 0, z: 0 };
    expect(project.segment(behind, { x: behind.x - 10, y: 0, z: 0 })).toBeNull();
    const [a] = project.segment(behind, origin)!;
    expect(a.depth).toBeCloseTo(NEAR);
  });

  it('frames a set of points inside a screen rectangle', () => {
    const points = [{ x: -800, y: -300, z: 0 }, { x: 900, y: 400, z: 0 }, { x: 200, y: -500, z: 0 }];
    const rect = { x: 100, y: 800, w: 800, h: 600 };
    const camera = fitCamera(points, 0.4, 0.8, 40, rect, VIEW_TALL);
    const shown = points.map(p => projector(camera, VIEW_TALL).point(p)!);
    const xs = shown.map(p => p.x), ys = shown.map(p => p.y);
    for (const p of shown) {
      expect(p.x).toBeGreaterThanOrEqual(rect.x - 1);
      expect(p.x).toBeLessThanOrEqual(rect.x + rect.w + 1);
      expect(p.y).toBeGreaterThanOrEqual(rect.y - 1);
      expect(p.y).toBeLessThanOrEqual(rect.y + rect.h + 1);
    }
    // As large as fits: it fills the rectangle one way
    expect(Math.max(Math.max(...xs) - Math.min(...xs) - rect.w, Math.max(...ys) - Math.min(...ys) - rect.h)).toBeGreaterThan(-2);
  });

  it('blends two cameras and turns the short way round', () => {
    const a = orbit(origin, 100, 0, 0.5), b = orbit({ x: 50, y: 0, z: 0 }, 300, 0, 1.2);
    expect(blendCamera(a, b, 0).eye).toEqual(a.eye);
    expect(blendCamera(a, b, 1).target).toEqual(b.target);
    expect(blendCamera(a, b, 0.5).fov).toBe(40);
    expect(mixAngle(3, -3, 0.5)).toBeCloseTo(Math.PI, 1);
  });
});
