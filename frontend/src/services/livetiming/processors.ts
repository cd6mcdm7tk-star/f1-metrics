/**
 * METRIK DELTA - F1 Data Processors
 * Parse raw F1 SignalR feed topics into typed structures.
 */

import type { ProcessedDriver, ProcessedPosition, ProcessedTiming } from './types';

// ── DriverProcessor ──────────────────────────────────────────────────────────

export class DriverProcessor {
  private drivers: Map<number, ProcessedDriver> = new Map();

  processDriverList(data: any) {
    for (const [num, line] of Object.entries(data as Record<string, any>)) {
      const driverNum = parseInt(num);
      if (isNaN(driverNum)) continue;
      const existing = this.drivers.get(driverNum) || { driver_number: driverNum } as ProcessedDriver;
      this.drivers.set(driverNum, {
        ...existing,
        driver_number:  driverNum,
        broadcast_name: line.BroadcastName  ?? existing.broadcast_name ?? '',
        full_name:      line.FullName        ?? existing.full_name,
        name_acronym:   line.Tla             ?? existing.name_acronym  ?? String(driverNum),
        team_name:      line.TeamName        ?? existing.team_name     ?? '',
        team_colour:    line.TeamColour      ?? existing.team_colour   ?? '00D2BE',
        line:           line.Line            ?? existing.line,
      });
    }
  }

  processGridPositions(data: any) {
    if (!data?.Lines) return;
    for (const [num, line] of Object.entries(data.Lines as Record<string, any>)) {
      const driverNum = parseInt(num);
      if (isNaN(driverNum)) continue;
      const existing = this.drivers.get(driverNum) || { driver_number: driverNum } as ProcessedDriver;
      if (line.GridPos !== undefined) {
        this.drivers.set(driverNum, {
          ...existing,
          grid_position: parseInt(line.GridPos) || existing.grid_position,
        });
      }
    }
  }

  getAllDrivers(): ProcessedDriver[] {
    return Array.from(this.drivers.values());
  }
}

// ── PositionProcessor ────────────────────────────────────────────────────────

export class PositionProcessor {
  private positions: Map<number, ProcessedPosition> = new Map();

  /** Extract race order (Position, Gap, Interval) from TimingData.Lines */
  processTimingDataPositions(data: any) {
    if (!data?.Lines) return;
    for (const [num, line] of Object.entries(data.Lines as Record<string, any>)) {
      const driverNum = parseInt(num);
      if (isNaN(driverNum)) continue;
      const existing = this.positions.get(driverNum) || { driver_number: driverNum, position: 0 };
      this.positions.set(driverNum, {
        ...existing,
        position:      parseInt(line.Position) || existing.position,
        gap_to_leader: line.GapToLeader                      ?? existing.gap_to_leader,
        interval:      line.IntervalToPositionAhead?.Value   ?? existing.interval,
        status:        line.Status                           ?? existing.status,
      });
    }
  }

  getCurrentPositions(): ProcessedPosition[] {
    return Array.from(this.positions.values()).sort((a, b) => a.position - b.position);
  }
}

// ── TimingProcessor ──────────────────────────────────────────────────────────

export class TimingProcessor {
  private timing: Map<number, ProcessedTiming> = new Map();

  processTimingData(data: any) {
    if (!data?.Lines) return;
    for (const [num, line] of Object.entries(data.Lines as Record<string, any>)) {
      const driverNum = parseInt(num);
      if (isNaN(driverNum)) continue;
      const existing = this.timing.get(driverNum) || { driver_number: driverNum };
      const updated: ProcessedTiming = { ...existing };

      if (line.LastLapTime?.Value)  updated.last_lap_time  = line.LastLapTime.Value;
      if (line.BestLapTime?.Value)  updated.best_lap_time  = line.BestLapTime.Value;
      if (line.NumberOfLaps != null) updated.number_of_laps = parseInt(line.NumberOfLaps);

      if (line.Sectors) {
        if (line.Sectors['0']?.Value)          updated.sector1          = line.Sectors['0'].Value;
        if (line.Sectors['0']?.OverallFastest != null) updated.sector1_fastest  = !!line.Sectors['0'].OverallFastest;
        if (line.Sectors['0']?.PersonalFastest != null) updated.sector1_personal = !!line.Sectors['0'].PersonalFastest;
        if (line.Sectors['0']?.Segments) {
          updated.sector1_segments = Object.values(line.Sectors['0'].Segments).map((s: any) => s.Status ?? 0);
        }
        if (line.Sectors['1']?.Value)          updated.sector2          = line.Sectors['1'].Value;
        if (line.Sectors['1']?.OverallFastest != null) updated.sector2_fastest  = !!line.Sectors['1'].OverallFastest;
        if (line.Sectors['1']?.PersonalFastest != null) updated.sector2_personal = !!line.Sectors['1'].PersonalFastest;
        if (line.Sectors['1']?.Segments) {
          updated.sector2_segments = Object.values(line.Sectors['1'].Segments).map((s: any) => s.Status ?? 0);
        }
        if (line.Sectors['2']?.Value)          updated.sector3          = line.Sectors['2'].Value;
        if (line.Sectors['2']?.OverallFastest != null) updated.sector3_fastest  = !!line.Sectors['2'].OverallFastest;
        if (line.Sectors['2']?.PersonalFastest != null) updated.sector3_personal = !!line.Sectors['2'].PersonalFastest;
        if (line.Sectors['2']?.Segments) {
          updated.sector3_segments = Object.values(line.Sectors['2'].Segments).map((s: any) => s.Status ?? 0);
        }
      }

      if (line.Speeds) {
        updated.speeds = {
          i1: line.Speeds.I1?.Value != null ? parseFloat(line.Speeds.I1.Value) : updated.speeds?.i1,
          i2: line.Speeds.I2?.Value != null ? parseFloat(line.Speeds.I2.Value) : updated.speeds?.i2,
          fl: line.Speeds.FL?.Value != null ? parseFloat(line.Speeds.FL.Value) : updated.speeds?.fl,
          st: line.Speeds.ST?.Value != null ? parseFloat(line.Speeds.ST.Value) : updated.speeds?.st,
        };
      }

      this.timing.set(driverNum, updated);
    }
  }

  getAllTiming(): ProcessedTiming[] {
    return Array.from(this.timing.values());
  }
}
