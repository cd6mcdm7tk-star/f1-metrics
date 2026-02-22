/**
 * METRIK DELTA - Position Processor
 * Processes driver positions, gaps, and intervals from F1 Live Timing
 */

import type { ProcessedPosition } from '../types';

export class PositionProcessor {
  private positions: Map<number, ProcessedPosition> = new Map();

  /**
   * Process TimingData for positions
   */
  processTimingDataPositions(data: any) {
    if (!data || !data.Lines) return;

    Object.entries(data.Lines).forEach(([driverNumber, lineData]: [string, any]) => {
      const num = parseInt(driverNumber);
      if (isNaN(num)) return;

      const position: ProcessedPosition = {
        driver_number: num,
        position: lineData.Position ? parseInt(lineData.Position) : 0,
        gap_to_leader: lineData.GapToLeader || undefined,
        interval: lineData.IntervalToPositionAhead?.Value || undefined,
        status: lineData.KnockedOut ? 'OUT' : lineData.Stopped ? 'STOPPED' : 'RUNNING',
      };

      // Merge with existing data
      const existing = this.positions.get(num);
      if (existing) {
        this.positions.set(num, { ...existing, ...position });
      } else {
        this.positions.set(num, position);
      }
    });
  }

  /**
   * Process Position data (GPS-based positions)
   */
  processPositionData(data: any, compressedData?: string) {
    // If compressed data, use that instead
    const processData = compressedData || data;
    if (!processData || !processData.Position) return;

    Object.entries(processData.Position).forEach(([driverNumber, posData]: [string, any]) => {
      const num = parseInt(driverNumber);
      if (isNaN(num)) return;

      const existing = this.positions.get(num);
      if (existing && posData.Status) {
        existing.status = posData.Status;
      }
    });
  }

  /**
   * Process TopThree data
   */
  processTopThreeData(data: any) {
    if (!data || !data.Lines) return;

    Object.entries(data.Lines).forEach(([driverNumber, lineData]: [string, any]) => {
      const num = parseInt(driverNumber);
      if (isNaN(num)) return;

      const existing = this.positions.get(num);
      if (existing && lineData.Position) {
        existing.position = parseInt(lineData.Position);
      }
    });
  }

  /**
   * Get all positions sorted by position
   */
  getCurrentPositions(): ProcessedPosition[] {
    return Array.from(this.positions.values())
      .filter((p) => p.position > 0 && p.position <= 20)
      .sort((a, b) => a.position - b.position);
  }

  /**
   * Get specific driver position
   */
  getDriverPosition(driverNumber: number): ProcessedPosition | undefined {
    return this.positions.get(driverNumber);
  }

  /**
   * Get leader
   */
  getLeader(): ProcessedPosition | undefined {
    return this.getCurrentPositions().find((p) => p.position === 1);
  }

  /**
   * Get top N positions
   */
  getTopPositions(n: number): ProcessedPosition[] {
    return this.getCurrentPositions().slice(0, n);
  }

  /**
   * Clear all positions (for session change)
   */
  clear() {
    this.positions.clear();
  }
}