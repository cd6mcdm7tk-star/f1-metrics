// A made-up duel for the tests: a 2 km lap with one corner (T1, at 750 m)
// between two flat-out straights. The slower lap brakes 25 m earlier, is
// 8 km/h slower at the apex in a lower gear, and lifts on the way out.
import type { TelemetryDataMulti } from '../../../frontend/src/types/telemetry';
import { prepareDuel, type Duel } from './data';

const STEP = 5;
const distance = Array.from({ length: 401 }, (_, i) => i * STEP);
const APEX = 750, EXIT = 1000, TOP = 300;

interface Driving { brakeAt: number; minSpeed: number; gear: number; lift: boolean }

function lap({ brakeAt, minSpeed, gear, lift }: Driving) {
  const throttleRamp = (d: number) => Math.min(100, Math.max(0, ((d - APEX) / 120) * 100));
  return distance.map(d => {
    let speed = d < brakeAt ? TOP
      : d < APEX ? TOP - ((TOP - minSpeed) * (d - brakeAt)) / (APEX - brakeAt)
      : d < EXIT ? minSpeed + ((TOP - minSpeed) * (d - APEX)) / (EXIT - APEX)
      : TOP;
    // Lifting costs speed until the end of the exit
    if (lift && d > 810 && d < EXIT) speed -= Math.min(15, (d - 810) * 0.5);
    const throttle = d < brakeAt - 10 ? 100 : d < APEX ? 0 : lift && d > 810 && d < 840 ? 20 : throttleRamp(d);
    return { speed, throttle, brake: d >= brakeAt && d < APEX, gear: d >= 700 && d <= 800 ? gear : 8 };
  });
}

const fast = lap({ brakeAt: 600, minSpeed: 100, gear: 4, lift: false });
const slow = lap({ brakeAt: 575, minSpeed: 92, gear: 3, lift: true });

// Each lap's time at every point, from its speed
const times = (points: { speed: number }[]) => {
  const t = [0];
  for (let i = 1; i < points.length; i++) t.push(t[i - 1] + STEP / (((points[i].speed + points[i - 1].speed) / 2) / 3.6));
  return t;
};
const [tFast, tSlow] = [times(fast), times(slow)];

// The API's order: the slower lap first
export const RAW: TelemetryDataMulti = {
  drivers: [
    { driver: 'PIA', year: 2025, gp: 1, session: 'Q', lap: 17, lapTime: tSlow[tSlow.length - 1], sectors: { s1: 20, s2: 4, s3: tSlow[tSlow.length - 1] - 24 } },
    { driver: 'NOR', year: 2025, gp: 1, session: 'Q', lap: 19, lapTime: tFast[tFast.length - 1], sectors: { s1: 19.8, s2: 4.1, s3: tFast[tFast.length - 1] - 23.9 } },
  ],
  telemetry: distance.map((d, i) => ({
    distance: d,
    speeds: [slow[i].speed, fast[i].speed],
    throttles: [slow[i].throttle, fast[i].throttle],
    brakes: [slow[i].brake, fast[i].brake],
    gears: [slow[i].gear, fast[i].gear],
    rpms: [11000, 11000],
    deltas: [0, tFast[i] - tSlow[i]],
    x: d, y: 0,
  })),
  corners: [{ number: 1, letter: null, distance: APEX }],
  rotation: 0,
};

export const DRIVERS = [
  { abbreviation: 'NOR', number: '4', team: 'McLaren', fullName: 'Lando NORRIS' },
  { abbreviation: 'PIA', number: '81', team: 'McLaren', fullName: 'Oscar PIASTRI' },
];

export const testDuel = (): Duel => prepareDuel(RAW, DRIVERS, 'Melbourne');
