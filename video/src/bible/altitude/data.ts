// La Bible F1, episode 2: why cars are as fast at Mexico as at Monza with
// Monaco's wings. The lap it flies along, the air up there, and the top
// speeds that prove it.
import type { DuelQuery } from '../../api';
import type { Duel } from '../../duel/data';
import { cornerBraking } from '../../kit/figures';

/** Mexico's 2025 pole against the runner-up */
export const ALTITUDE_QUERY: DuelQuery = { year: 2025, gp: 20, session: 'Q', drivers: ['NOR', 'LEC'] };

/** Mexico City's altitude (m) */
export const MEXICO_ALTITUDE = 2240;

/** Air density at an altitude, as a share of sea level's, in the standard atmosphere (ISA troposphere) */
export function airDensity(altitude: number): number {
  const seaLevel = 288.15;
  const temperature = seaLevel - 0.0065 * altitude;
  // Pressure falls as (T/T0)^5.2559; density is pressure over temperature
  return (temperature / seaLevel) ** 4.2559;
}

/** The median of the 20 drivers' top speeds on their best 2025 qualifying
 * lap (km/h), from metrikdelta.com's database, slowest circuit first */
export const TOP_SPEEDS: { circuit: string; speed: number }[] = [
  { circuit: 'Monaco', speed: 288.5 },
  { circuit: 'Vegas', speed: 331 },
  { circuit: 'Bakou', speed: 337 },
  { circuit: 'Spa', speed: 340 },
  { circuit: 'Monza', speed: 348 },
  { circuit: 'Mexico', speed: 350 },
];

/** What the episode quotes from the pole lap against the runner-up's */
export interface AltitudeFacts {
  /** Turn 1's marker (m) */
  corner: number;
  /** Each lap's top speed down the main straight (km/h), and where the pole lap reaches it (m) */
  top: [number, number];
  topAt: number;
  /** Where the pole lap brakes for turn 1, and how far it was flat out before (m) */
  brakeAt: number;
  flatOut: number;
}

/** Flat out, as the site counts it (% throttle) */
const FLAT = 98;

export function altitudeFacts(duel: Duel): AltitudeFacts {
  const corner = duel.telemetry.corners.find(c => c.number === 1)?.distance;
  if (corner == null) throw new Error('The altitude episode needs turn 1 on the lap');
  const [pole, rival] = duel.order.map(lap => cornerBraking(duel.telemetry, lap, corner));
  const lap = duel.order[0];
  const brakeAt = pole.brakeAt ?? pole.topAt;
  // From the last lift before the straight (the line, if none on this lap) to the braking point
  const lift = duel.telemetry.telemetry.filter(p => p.distance < brakeAt && p.throttles[lap] < FLAT).pop();
  return { corner, top: [pole.top, rival.top], topAt: pole.topAt, brakeAt, flatOut: brakeAt - (lift?.distance ?? 0) };
}
