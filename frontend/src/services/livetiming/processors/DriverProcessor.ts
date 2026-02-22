/**
 * METRIK DELTA - Driver Processor
 * Processes driver information from F1 Live Timing
 */

import type { ProcessedDriver } from '../types';

export class DriverProcessor {
  private drivers: Map<number, ProcessedDriver> = new Map();

  /**
   * Process DriverList data
   */
  processDriverList(data: any) {
    if (!data) return;

    Object.entries(data).forEach(([driverNumber, driverData]: [string, any]) => {
      const num = parseInt(driverNumber);
      
      if (isNaN(num)) return;

      const driver: ProcessedDriver = {
        driver_number: num,
        broadcast_name: driverData.BroadcastName || driverData.Tla || '',
        full_name: driverData.FullName || '',
        name_acronym: driverData.Tla || driverData.BroadcastName || '',
        team_name: driverData.TeamName || '',
        team_colour: driverData.TeamColour || '#FFFFFF',
        line: driverData.Line || 0,
      };

      // Merge with existing data
      const existing = this.drivers.get(num);
      if (existing) {
        this.drivers.set(num, { ...existing, ...driver });
      } else {
        this.drivers.set(num, driver);
      }
    });
  }

  /**
   * Process TimingAppData for grid positions
   */
  processGridPositions(data: any) {
    if (!data || !data.Lines) return;

    Object.entries(data.Lines).forEach(([driverNumber, lineData]: [string, any]) => {
      const num = parseInt(driverNumber);
      if (isNaN(num)) return;

      const existing = this.drivers.get(num);
      if (existing && lineData.GridPos) {
        existing.grid_position = parseInt(lineData.GridPos);
      }
    });
  }

  /**
   * Get all drivers sorted by driver number
   */
  getAllDrivers(): ProcessedDriver[] {
    return Array.from(this.drivers.values()).sort(
      (a, b) => a.driver_number - b.driver_number
    );
  }

  /**
   * Get specific driver by number
   */
  getDriver(driverNumber: number): ProcessedDriver | undefined {
    return this.drivers.get(driverNumber);
  }

  /**
   * Get driver by team
   */
  getDriversByTeam(teamName: string): ProcessedDriver[] {
    return Array.from(this.drivers.values()).filter(
      (d) => d.team_name.toLowerCase() === teamName.toLowerCase()
    );
  }

  /**
   * Clear all drivers (for session change)
   */
  clear() {
    this.drivers.clear();
  }
}