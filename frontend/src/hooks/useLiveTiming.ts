/**
 * METRIK DELTA - useLiveTiming Hook
 * Connects to the backend WebSocket relay and exposes live F1 telemetry.
 */

import { useState, useEffect, useRef } from 'react';
import { TelemetryManager } from '../services/livetiming/TelemetryManager';
import { SignalRClient } from '../services/livetiming/SignalRClient';
import type { TelemetryData } from '../services/livetiming/types';

export function useLiveTiming() {
  const [data,      setData]      = useState<TelemetryData | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<Error | null>(null);

  const managerRef = useRef<TelemetryManager | null>(null);

  useEffect(() => {
    const manager = new TelemetryManager();
    managerRef.current = manager;

    try {
      const url = SignalRClient.getWebSocketUrl();

      manager.connect(
        url,
        // onUpdate
        (telemetry: TelemetryData) => {
          setData(telemetry);
          setLoading(false);
        },
        // onConnected
        () => {
          setConnected(true);
          setLoading(false);
        },
      );
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Connection failed');
      setError(e);
      setLoading(false);
    }

    return () => {
      manager.disconnect();
    };
  }, []);

  return {
    // Flat accessors
    drivers:      data?.drivers     ?? [],
    positions:    data?.positions   ?? [],
    timing:       data?.timing      ?? [],
    timingStats:  data?.timingStats ?? [],
    weather:      data?.weather     ?? null,
    session:      data?.session     ?? null,
    raceControl:  data?.raceControl ?? [],
    carData:      data?.carData     ?? [],
    stints:       data?.stints      ?? [],
    pitStops:     data?.pitStops    ?? [],
    teamRadio:    data?.teamRadio   ?? { captures: [] },
    // State
    connected,
    loading,
    error,
  };
}
