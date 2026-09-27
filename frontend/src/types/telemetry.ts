export interface TelemetryPoint {
  distance: number;
  speed1: number;
  speed2: number;
  throttle1: number;
  throttle2: number;
  brake1: boolean;
  brake2: boolean;
  gear1: number;
  gear2: number;
  drs1: number;
  drs2: number;
  x: number;
  y: number;
  delta: number;
}

export interface TelemetryData {
  telemetry: TelemetryPoint[];
  lapTime1: number;
  lapTime2: number;
  driver1: string;
  driver2: string;
 sectors1?: {
    sector1: number | null;
    sector2: number | null;
    sector3: number | null;
  };
  sectors2?: {
    sector1: number | null;
    sector2: number | null;
    sector3: number | null;
  };
}

// ── Multi-lap types ──────────────────────────────────────────────────────────

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