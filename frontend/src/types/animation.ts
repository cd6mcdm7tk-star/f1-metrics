export interface DriverData {
  x: number;
  y: number;
  speed: number;
  throttle: number;
  brake: boolean;
  gear: number;
  drs?: number;
  time?: number;
}

export interface AnimationPoint {
  distance: number;
  driver1: DriverData;
  driver2: DriverData;
  gap?: number;
}

export interface GapDataPoint {
  distance: number;
  gap: number;
}

export interface AnimationEvent {
  distance: number;
  type: string;
  leader: string;
}

export interface DriverInfo {
  code: string;
  team: string;
  compound: string;
}

export interface EnhancedAnimationData {
  animation: AnimationPoint[];
  gapData: GapDataPoint[];
  events: AnimationEvent[];
  lapTime1: number;
  lapTime2: number;
  totalDistance: number;
  driver1Info: DriverInfo;
  driver2Info: DriverInfo;
}

export interface RaceAnimationPoint {
  lapNumber: number;
  distance?: number;
  time?: number;
  driver1: DriverData;
  driver2: DriverData;
}

export interface RaceAnimationData {
  animation: RaceAnimationPoint[];
  totalLaps: number;
  driver1: string;
  driver2: string;
  totalTime?: number;
}
