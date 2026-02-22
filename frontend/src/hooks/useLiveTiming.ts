/**
 * METRIK DELTA - useLiveTiming Hook
 * React hook for F1 Live Timing data
 */

import { useState, useEffect, useRef } from 'react';
import { TelemetryManager } from '../services/livetiming/TelemetryManager';
import { SignalRClient } from '../services/livetiming/SignalRClient';
import type { TelemetryData } from '../services/livetiming/types';

interface UseLiveTimingOptions {
  autoConnect?: boolean;
  onError?: (error: Error) => void;
}

export function useLiveTiming(options: UseLiveTimingOptions = {}) {
  const { autoConnect = true, onError } = options;

  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const telemetryManagerRef = useRef<TelemetryManager | null>(null);
  const wsRef = useRef<any>(null);

  /**
   * Connect to F1 Live Timing
   */
  const connect = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🚀 METRIK DELTA - Starting Live Timing connection...');

      // Step 1: Negotiate and get WebSocket URL
      const { url, subscribeMessage } = await SignalRClient.connect();

      // Step 2: Create TelemetryManager
      if (!telemetryManagerRef.current) {
        telemetryManagerRef.current = new TelemetryManager();
      }

      // Step 3: Connect to WebSocket
      telemetryManagerRef.current.connect(url, (data: TelemetryData) => {
        setTelemetryData(data);
        setLoading(false);
        
        // Log data for debugging
        if (data.drivers.length > 0) {
          console.log('📊 Drivers:', data.drivers.length);
        }
        if (data.positions.length > 0) {
          console.log('🏁 Positions:', data.positions.length);
        }
      });

      // Step 4: Subscribe to topics after connection
      setTimeout(() => {
        if (telemetryManagerRef.current) {
          (telemetryManagerRef.current as any).wsManager.send(subscribeMessage);
          console.log('✅ Subscribed to F1 topics');
        }
      }, 1000);

      setConnected(true);
      console.log('✅ METRIK DELTA - Connected to F1 Live Timing');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Connection failed');
      setError(error);
      setLoading(false);
      setConnected(false);
      console.error('❌ Connection error:', error);
      
      if (onError) {
        onError(error);
      }
    }
  };

  /**
   * Disconnect from F1 Live Timing
   */
  const disconnect = () => {
    if (telemetryManagerRef.current) {
      telemetryManagerRef.current.disconnect();
      telemetryManagerRef.current = null;
    }
    setConnected(false);
    setTelemetryData(null);
    console.log('🔌 METRIK DELTA - Disconnected from F1 Live Timing');
  };

  /**
   * Auto-connect on mount
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, []);

  /**
   * Helper: Get driver by number
   */
  const getDriver = (driverNumber: number) => {
    return telemetryData?.drivers.find(d => d.driver_number === driverNumber);
  };

  /**
   * Helper: Get position by driver number
   */
  const getPosition = (driverNumber: number) => {
    return telemetryData?.positions.find(p => p.driver_number === driverNumber);
  };

  /**
   * Helper: Get timing by driver number
   */
  const getTiming = (driverNumber: number) => {
    return telemetryData?.timing.find(t => t.driver_number === driverNumber);
  };

  return {
    // Data
    telemetryData,
    drivers: telemetryData?.drivers || [],
    positions: telemetryData?.positions || [],
    timing: telemetryData?.timing || [],
    weather: telemetryData?.weather,
    session: telemetryData?.session,
    raceControl: telemetryData?.raceControl || [],

    // State
    loading,
    connected,
    error,

    // Actions
    connect,
    disconnect,

    // Helpers
    getDriver,
    getPosition,
    getTiming,
  };
}