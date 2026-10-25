import { describe, expect, it } from 'vitest';
import { alongLine, cornerGeometry, fractionAt, lineAt, partOf, racingLine } from './schematic';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('corner schematic', () => {
  const g = cornerGeometry(40, 30, 4, 140);

  it('puts the racing line on one circle through turn-in, apex and exit', () => {
    const { centre, radius, turnIn, apex, exit } = g.line;
    expect(dist(centre, turnIn)).toBeCloseTo(radius);
    expect(dist(centre, apex)).toBeCloseTo(radius);
    expect(dist(centre, exit)).toBeCloseTo(radius);
  });

  it('keeps the line on the road, half a car from the edges', () => {
    expect(g.line.turnIn.x).toBeCloseTo(-(g.outer - 4));
    expect(g.line.exit.y).toBeCloseTo(g.outer - 4);
    expect(Math.hypot(g.line.apex.x, g.line.apex.y)).toBeCloseTo(g.inner + 4);
  });

  it('is a much wider circle than the middle of the road', () => {
    expect(g.line.radius).toBeGreaterThan(g.middle * 2);
  });

  it('runs both lines from the approach to the exit', () => {
    for (const line of [lineAt(g.middle, g.reach), racingLine(g)]) {
      expect(line[0].y).toBe(-g.reach);
      expect(line[line.length - 1].x).toBe(g.reach);
    }
    // The racing line passes the apex
    const line = racingLine(g);
    expect(Math.min(...line.map(p => dist(p, g.line.apex)))).toBeLessThan(2);
  });
});

describe('drawing a line bit by bit', () => {
  const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];

  it('cuts a polyline by length', () => {
    expect(partOf(square, 0.25)).toEqual([{ x: 0, y: 0 }, { x: 5, y: 0 }]);
    expect(partOf(square, 0.75)).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }]);
    expect(partOf(square, 1)).toBe(square);
  });

  it('places a point along it, with its direction, and finds it back', () => {
    const p = alongLine(square, 0.75);
    expect(p).toMatchObject({ x: 10, y: 5 });
    expect(p.heading).toBeCloseTo(Math.PI / 2);
    expect(fractionAt(square, { x: 10, y: 0 })).toBeCloseTo(0.5);
  });
});
