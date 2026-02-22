/**
 * METRIK DELTA - Live Timing Page
 * Real-time F1 telemetry with METRIK DELTA design
 * 📱 MOBILE RESPONSIVE VERSION
 */

import React, { useState, useEffect } from 'react';
import { useLiveTiming } from '../hooks/useLiveTiming';
import { motion } from 'framer-motion';
import CountdownShowcase from '../components/CountdownShowcase';

export default function LiveTimingPage() {
  const {
    drivers,
    positions,
    timing,
    weather,
    session,
    raceControl,
    loading,
    connected,
    error,
  } = useLiveTiming();

  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);

  // Change page title
  useEffect(() => {
    document.title = 'F1 Live - METRIK DELTA';
    return () => {
      document.title = 'METRIK DELTA';
    };
  }, []);

  if (error) {
    return (
      <div className="relative min-h-screen bg-metrik-black overflow-hidden">
        
        <div className="relative z-10 container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 mb-6">
              <span className="text-4xl">❌</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-rajdhani font-black text-white mb-4">
              Connection Error
            </h1>
            <p className="text-base sm:text-lg text-metrik-silver mb-6">
              {error.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-metrik-turquoise text-metrik-black font-rajdhani font-bold rounded-lg hover:bg-metrik-turquoise/80 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <CountdownShowcase />;
  }

  return (
    <div className="relative min-h-screen bg-metrik-black overflow-hidden">

      {/* CONTENT */}
      <div className="relative z-10">
        {/* HEADER */}
        <SessionHeader 
          session={session} 
          weather={weather}
          connected={connected}
        />

        {/* MAIN GRID - 🔥 RESPONSIVE */}
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            
            {/* TIMING TABLE - 2 columns on large screens */}
            <div className="lg:col-span-2">
              <TimingTable
                drivers={drivers}
                positions={positions}
                timing={timing}
                selectedDriver={selectedDriver}
                onSelectDriver={setSelectedDriver}
              />
            </div>

            {/* RIGHT SIDEBAR - 1 column */}
            <div className="space-y-4 sm:space-y-6">
              {/* RACE CONTROL */}
              <RaceControlFeed messages={raceControl} />

              {/* WEATHER */}
              {weather && <WeatherWidget weather={weather} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SESSION HEADER - 🔥 RESPONSIVE
// ============================================

interface SessionHeaderProps {
  session: any;
  weather: any;
  connected: boolean;
}

function SessionHeader({ session, weather, connected }: SessionHeaderProps) {
  return (
    <div className="border-b border-metrik-turquoise/30 backdrop-blur-xl bg-metrik-card/80">
      <div className="container mx-auto px-4 py-3 sm:py-4">
        {/* 🔥 FLEX COL MOBILE, ROW DESKTOP */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          {/* LEFT - Session Info */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs sm:text-sm font-rajdhani font-bold text-metrik-silver">
                {connected ? 'LIVE' : 'DISCONNECTED'}
              </span>
            </div>

            {session && (
              <>
                <div className="hidden sm:block h-6 w-px bg-metrik-turquoise/30" />
                <h1 className="text-base sm:text-xl font-rajdhani font-black text-white">
                  {session.meeting_name || 'F1 Session'}
                </h1>
                <span className="text-xs sm:text-sm font-rajdhani font-bold text-metrik-turquoise">
                  {session.session_name || 'Live Timing'}
                </span>
              </>
            )}
          </div>

          {/* RIGHT - Weather - 🔥 RESPONSIVE */}
          {weather && (
            <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="text-metrik-silver">🌡️ Air:</span>
                <span className="font-rajdhani font-bold text-white">
                  {weather.air_temperature}°C
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-metrik-silver">🏁 Track:</span>
                <span className="font-rajdhani font-bold text-white">
                  {weather.track_temperature}°C
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// TIMING TABLE - 🔥 RESPONSIVE
// ============================================

interface TimingTableProps {
  drivers: any[];
  positions: any[];
  timing: any[];
  selectedDriver: number | null;
  onSelectDriver: (driverNumber: number | null) => void;
}

function TimingTable({ drivers, positions, timing, selectedDriver, onSelectDriver }: TimingTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-lg overflow-hidden"
    >
      {/* HEADER - 🔥 RESPONSIVE */}
      <div className="border-b border-metrik-turquoise/30 px-4 sm:px-6 py-3 sm:py-4">
        <h2 className="text-xl sm:text-2xl font-rajdhani font-black text-white">
          LIVE STANDINGS
        </h2>
      </div>

      {/* TABLE - 🔥 RESPONSIVE */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-metrik-turquoise/20 text-left">
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-rajdhani font-bold text-metrik-silver">POS</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-rajdhani font-bold text-metrik-silver">DRIVER</th>
              {/* 🔥 TEAM CACHÉ SUR MOBILE */}
              <th className="hidden sm:table-cell px-6 py-3 text-sm font-rajdhani font-bold text-metrik-silver">TEAM</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-rajdhani font-bold text-metrik-silver">GAP</th>
              {/* 🔥 LAST LAP CACHÉ SUR TRÈS PETIT ÉCRAN */}
              <th className="hidden md:table-cell px-6 py-3 text-sm font-rajdhani font-bold text-metrik-silver">LAST LAP</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-rajdhani font-bold text-metrik-silver">BEST</th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 sm:px-6 py-8 sm:py-12 text-center">
                  <p className="text-sm sm:text-base text-metrik-silver font-inter">
                    Waiting for session data...
                  </p>
                </td>
              </tr>
            ) : (
              positions.map((position) => {
                const driver = drivers.find(d => d.driver_number === position.driver_number);
                const driverTiming = timing.find(t => t.driver_number === position.driver_number);
                const isSelected = selectedDriver === position.driver_number;

                return (
                  <motion.tr
                    key={position.driver_number}
                    onClick={() => onSelectDriver(isSelected ? null : position.driver_number)}
                    className={`
                      border-b border-metrik-turquoise/10 cursor-pointer transition-colors
                      ${isSelected ? 'bg-metrik-turquoise/20' : 'hover:bg-metrik-turquoise/5'}
                    `}
                    whileHover={{ scale: 1.01 }}
                  >
                    {/* POSITION */}
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span className="text-xl sm:text-2xl font-rajdhani font-black text-white">
                        {position.position}
                      </span>
                    </td>

                    {/* DRIVER */}
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        {driver && (
                          <div
                            className="w-1 h-8 sm:h-12 rounded-full"
                            style={{ backgroundColor: `#${driver.team_colour}` }}
                          />
                        )}
                        <span className="text-base sm:text-lg font-rajdhani font-bold text-white">
                          {driver?.name_acronym || position.driver_number}
                        </span>
                      </div>
                    </td>

                    {/* TEAM - 🔥 CACHÉ SUR MOBILE */}
                    <td className="hidden sm:table-cell px-6 py-4">
                      <span className="text-sm font-inter text-metrik-silver">
                        {driver?.team_name || '-'}
                      </span>
                    </td>

                    {/* GAP */}
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span className="text-xs sm:text-sm font-inter text-metrik-silver">
                        {position.gap_to_leader || '-'}
                      </span>
                    </td>

                    {/* LAST LAP - 🔥 CACHÉ SUR TRÈS PETIT ÉCRAN */}
                    <td className="hidden md:table-cell px-6 py-4">
                      <span className="text-sm font-inter text-white">
                        {driverTiming?.last_lap_time || '-'}
                      </span>
                    </td>

                    {/* BEST LAP */}
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span className="text-xs sm:text-sm font-inter text-metrik-turquoise">
                        {driverTiming?.best_lap_time || '-'}
                      </span>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ============================================
// RACE CONTROL FEED - 🔥 RESPONSIVE
// ============================================

interface RaceControlFeedProps {
  messages: any[];
}

function RaceControlFeed({ messages }: RaceControlFeedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-lg overflow-hidden"
    >
      {/* HEADER - 🔥 RESPONSIVE */}
      <div className="border-b border-metrik-turquoise/30 px-4 sm:px-6 py-3 sm:py-4">
        <h2 className="text-lg sm:text-xl font-rajdhani font-black text-white">
          RACE CONTROL
        </h2>
      </div>

      {/* MESSAGES - 🔥 RESPONSIVE */}
      <div className="max-h-80 sm:max-h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="px-4 sm:px-6 py-8 sm:py-12 text-center">
            <p className="text-xs sm:text-sm text-metrik-silver font-inter">
              No race control messages
            </p>
          </div>
        ) : (
          <div className="space-y-2 p-3 sm:p-4">
            {messages.slice(0, 10).map((msg, index) => (
              <div
                key={index}
                className="p-2.5 sm:p-3 bg-metrik-black/50 border border-metrik-turquoise/20 rounded"
              >
                <p className="text-xs sm:text-sm font-inter text-white">
                  {msg.message}
                </p>
                {msg.timestamp && (
                  <p className="text-[10px] sm:text-xs font-inter text-metrik-silver mt-1">
                    {msg.timestamp}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// WEATHER WIDGET - 🔥 RESPONSIVE
// ============================================

interface WeatherWidgetProps {
  weather: any;
}

function WeatherWidget({ weather }: WeatherWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
      className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-lg p-4 sm:p-6"
    >
      <h2 className="text-lg sm:text-xl font-rajdhani font-black text-white mb-3 sm:mb-4">
        WEATHER
      </h2>
      
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div>
          <p className="text-xs sm:text-sm font-inter text-metrik-silver mb-1">Air Temp</p>
          <p className="text-xl sm:text-2xl font-rajdhani font-black text-white">
            {weather.air_temperature}°C
          </p>
        </div>
        <div>
          <p className="text-xs sm:text-sm font-inter text-metrik-silver mb-1">Track Temp</p>
          <p className="text-xl sm:text-2xl font-rajdhani font-black text-white">
            {weather.track_temperature}°C
          </p>
        </div>
        {weather.humidity && (
          <div>
            <p className="text-xs sm:text-sm font-inter text-metrik-silver mb-1">Humidity</p>
            <p className="text-xl sm:text-2xl font-rajdhani font-black text-white">
              {weather.humidity}%
            </p>
          </div>
        )}
        {weather.wind_speed && (
          <div>
            <p className="text-xs sm:text-sm font-inter text-metrik-silver mb-1">Wind</p>
            <p className="text-xl sm:text-2xl font-rajdhani font-black text-white">
              {weather.wind_speed} km/h
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}