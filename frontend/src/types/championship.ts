export interface DriverStanding {
  position: number;
  driver: string;
  code: string;
  team: string;
  points: number;
  wins: number;
}

export interface ConstructorStanding {
  position: number;
  team: string;
  points: number;
  wins: number;
}

export interface RaceResult {
  position: number;
  driver: string;
  code: string;
  team: string;
  grid: number;
  points: number;
  status: string;
  time: string | null;
}

export interface RaceResultsData {
  results: RaceResult[];
  raceName: string;
  circuitName: string;
  date: string;
}

export interface StandingsAfterRace {
  drivers: DriverStanding[];
  constructors: ConstructorStanding[];
}

export interface Circuit {
  round: number;
  name: string;
  location: string;
  country: string;
  date: string | null;
}