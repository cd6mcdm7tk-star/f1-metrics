// /api/telemetry/multi

export interface LapRef {
  year: number;
  gp: number;
  session: string;
  driver: string;
  lap?: number; // undefined = fastest lap
}

export interface DriverMeta {
  driver: string;
  year: number;
  gp: number;
  session: string;
  lap: number;
  lapTime: number | null;
  sectors: { s1: number | null; s2: number | null; s3: number | null };
}

export interface TelemetryPointMulti {
  distance: number;
  speeds: number[];
  throttles: number[];
  brakes: boolean[];
  gears: number[];
  rpms: number[];
  deltas: number[]; // delta vs lap[0] in seconds; deltas[0] = 0 always
  x: number;
  y: number;
}

export interface CircuitCorner {
  number: number;
  letter: string | null;
  distance: number;
}

export interface TelemetryDataMulti {
  drivers: DriverMeta[];
  telemetry: TelemetryPointMulti[];
  corners: CircuitCorner[];
  rotation: number;
}