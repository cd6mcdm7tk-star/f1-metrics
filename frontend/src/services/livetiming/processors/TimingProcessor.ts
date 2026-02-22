/**
 * METRIK DELTA - Timing Processor
 * Processes lap times, sector times, and speeds from F1 Live Timing
 */

import type { ProcessedTiming } from '../types';

export class TimingProcessor {
  private timing: Map<number, ProcessedTiming> = new Map();

  /**
   * Process TimingData
   */
  processTimingData(data: any) {
    if (!data || !data.Lines) return;

    Object.entries(data.Lines).forEach(([driverNumber, lineData]: [string, any]) => {
      const num = parseInt(driverNumber);
      if (isNaN(num)) return;

      const timing: ProcessedTiming = {
        driver_number: num,
      };

      // Last lap time
      if (lineData.LastLapTime?.Value) {
        timing.last_lap_time = lineData.LastLapTime.Value;
      }

      // Best lap time
      if (lineData.BestLapTime?.Value) {
        timing.best_lap_time = lineData.BestLapTime.Value;
      }

      // Number of laps
      if (lineData.NumberOfLaps) {
        timing.number_of_laps = parseInt(lineData.NumberOfLaps);
      }

      // Sectors
      if (lineData.Sectors) {
        timing.sector1 = lineData.Sectors['0']?.Value || lineData.Sectors['0']?.PreviousValue;
        timing.sector2 = lineData.Sectors['1']?.Value || lineData.Sectors['1']?.PreviousValue;
        timing.sector3 = lineData.Sectors['2']?.Value || lineData.Sectors['2']?.PreviousValue;
      }

      // Speeds
      if (lineData.Speeds) {
        timing.speeds = {
          i1: lineData.Speeds.I1?.Value ? parseInt(lineData.Speeds.I1.Value) : undefined,
          i2: lineData.Speeds.I2?.Value ? parseInt(lineData.Speeds.I2.Value) : undefined,
          fl: lineData.Speeds.FL?.Value ? parseInt(lineData.Speeds.FL.Value) : undefined,
          st: lineData.Speeds.ST?.Value ? parseInt(lineData.Speeds.ST.Value) : undefined,
        };
      }

      // Merge with existing data
      const existing = this.timing.get(num);
      if (existing) {
        this.timing.set(num, { ...existing, ...timing });
      } else {
        this.timing.set(num, timing);
      }
    });
  }

  /**
   * Get all timing data sorted by driver number
   */
  getAllTiming(): ProcessedTiming[] {
    return Array.from(this.timing.values()).sort(
      (a, b) => a.driver_number - b.driver_number
    );
  }

  /**
   * Get specific driver timing
   */
  getDriverTiming(driverNumber: number): ProcessedTiming | undefined {
    return this.timing.get(driverNumber);
  }

  /**
   * Get fastest lap
   */
  getFastestLap(): { driverNumber: number; time: string } | null {
    let fastest: { driverNumber: number; time: string } | null = null;
    let fastestMs = Infinity;

    this.timing.forEach((timing) => {
      if (timing.best_lap_time) {
        const ms = this.lapTimeToMs(timing.best_lap_time);
        if (ms < fastestMs) {
          fastestMs = ms;
          fastest = {
            driverNumber: timing.driver_number,
            time: timing.best_lap_time,
          };
        }
      }
    });

    return fastest;
  }

  /**
   * Get drivers with personal best in last lap
   */
  getDriversWithPersonalBest(): number[] {
    const driversWithPB: number[] = [];

    this.timing.forEach((timing) => {
      if (
        timing.last_lap_time &&
        timing.best_lap_time &&
        timing.last_lap_time === timing.best_lap_time
      ) {
        driversWithPB.push(timing.driver_number);
      }
    });

    return driversWithPB;
  }

  /**
   * Convert lap time string (1:23.456) to milliseconds
   */
  private lapTimeToMs(timeStr: string): number {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]);
      const seconds = parseFloat(parts[1]);
      return (minutes * 60 + seconds) * 1000;
    }
    return Infinity;
  }

  /**
   * Clear all timing (for session change)
   */
  clear() {
    this.timing.clear();
  }
}