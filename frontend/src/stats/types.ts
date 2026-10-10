// The season bundle served by the backend's /api/season/{year}: Jolpica
// (Ergast) data cut down to the fields used here, under Jolpica's own names.

export interface JolpicaDriver {
  driverId: string;
  code?: string;
  givenName: string;
  familyName: string;
  permanentNumber?: string;
}

export interface ResultEntry {
  position: string;
  Driver: JolpicaDriver;
  points?: string;
  grid?: string;
  status?: string;
  Constructor?: { name: string };
  FastestLap?: { rank: string };
}

export interface SeasonRace {
  round: string;
  raceName: string;
  Results?: ResultEntry[];
  QualifyingResults?: ResultEntry[];
  SprintResults?: ResultEntry[];
}

export interface SeasonBundle {
  year: number;
  results: SeasonRace[];
  qualifying: SeasonRace[];
  sprints: SeasonRace[];
  driverStandings: { position?: string; points: string; Driver: JolpicaDriver; Constructors?: { name: string }[] }[];
  constructorStandings: { position?: string; points: string; Constructor: { name: string } }[];
}

// ── Derived for the page ────────────────────────────────────────────────────

export interface DriverStats {
  wins: number;
  podiums: number;
  poles: number;
  poleWins: number;
  points: number;       // official, sprints included
  racePoints: number;   // Grands Prix only
  dnfs: number;
  dnfCauses: string[];
  raceFinishes: number[];
  qualiPositions: number[];
  avgRacePosition: number;
  avgQualiPosition: number;
  qualiWins: number;    // head-to-head
  raceWins: number;     // head-to-head
  fastestLaps: number;
}

export interface DriverInfo {
  code: string;
  name: string;
  team: string;
  stats: DriverStats;
}

export interface RaceLogEntry {
  round: number;
  raceName: string;
  pos1: number | null; // null = DNF
  pos2: number | null;
}

export interface SprintH2H {
  sqWins1: number; sqWins2: number;
  sWins1: number; sWins2: number;
  totalSprints: number;
}

export interface H2HData {
  year: number;
  totalRaces: number;
  driver1: DriverInfo;
  driver2: DriverInfo;
  raceLog: RaceLogEntry[];
  sprint: SprintH2H | null;
}

export interface SeasonDriver {
  code: string;
  team: string;
}

export interface StandingEntry {
  position: number | null; // null = unclassified
  code: string;
  name: string;
  team: string;
  points: number;
}

export interface ConstructorStanding {
  position: number | null; // null = unclassified
  name: string;
  points: number;
}

export interface RaceClassification {
  raceName: string;
  results: { position: number; code: string; name: string; team: string }[];
}

export type HoveredMetric = { kind: 'stat'; statKey: string } | { kind: 'race'; round: number } | null;
