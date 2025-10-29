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
}

export interface TelemetryData {
  telemetry: TelemetryPoint[];
  lapTime1: number;
  lapTime2: number;
  driver1: string;
  driver2: string;
}
