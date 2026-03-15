/**
 * METRIK DELTA - Live Timing Page
 * Real-time F1 telemetry — design METRIK DELTA
 * Widgets: Timing Table · Car Telemetry · Race Control · Weather · Tyre Strategy
 */

import React, { useState, useEffect } from 'react';
import SEO from '../components/SEO';
import { useLiveTiming } from '../hooks/useLiveTiming';
import CountdownShowcase from '../components/CountdownShowcase';
import { useSubscription } from '../hooks/useSubscription';
import UpgradeModal from '../components/UpgradeModal';
import { Lock, Radio, Cloud, Activity } from 'lucide-react';
import TrackMapWidget from '../components/livetiming/TrackMapWidget';
import TeamRadioWidget from '../components/livetiming/TeamRadioWidget';

// ─── Team colours ────────────────────────────────────────────────────────────
const TEAM_COLORS: Record<string, string> = {
  'Red Bull Racing': '#3671C6', 'McLaren': '#FF8700', 'Ferrari': '#E8002D',
  'Mercedes': '#27F4D2', 'Aston Martin': '#229971', 'Alpine': '#FF87BC',
  'Williams': '#00A0DE', 'Racing Bulls': '#6692FF', 'Kick Sauber': '#00E701',
  'Haas F1 Team': '#B6BABD',
};

function teamColor(teamName?: string): string {
  if (!teamName) return '#00D2BE';
  for (const [key, color] of Object.entries(TEAM_COLORS)) {
    if (teamName.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#00D2BE';
}

// ─── Compound badge ───────────────────────────────────────────────────────────
const COMPOUND_COLORS: Record<string, string> = {
  SOFT: '#E8002D', MEDIUM: '#FFD700', HARD: '#FFFFFF',
  INTERMEDIATE: '#39B54A', WET: '#0067FF',
};
function CompoundBadge({ compound }: { compound?: string }) {
  const c = (compound || '').toUpperCase();
  const color = COMPOUND_COLORS[c] || '#888';
  const letter = c[0] || '?';
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black"
      style={{ backgroundColor: color, color: c === 'HARD' || c === 'MEDIUM' ? '#000' : '#fff' }}
    >
      {letter}
    </span>
  );
}

// ─── DRS indicator ────────────────────────────────────────────────────────────
function DRSBadge({ active }: { active: boolean }) {
  return (
    <span className={`text-[10px] font-black px-1 rounded ${active ? 'bg-green-500 text-black' : 'text-gray-600'}`}>
      DRS
    </span>
  );
}

// ─── Segment dot colors ───────────────────────────────────────────────────────
function segmentColor(status: number): string {
  if (status === 2048) return '#a855f7'; // purple
  if (status === 2049) return '#22c55e'; // green
  if (status === 2051) return '#eab308'; // yellow/amber
  if (status === 0)    return '#4b5563'; // gray
  return '#ffffff';                       // white/unknown
}

// ─── Sector time cell ─────────────────────────────────────────────────────────
function SectorCell({ value, fastest, personal, segments }: {
  value?: string; fastest?: boolean; personal?: boolean; segments?: number[];
}) {
  if (!value) return <td className="px-2 py-3 text-center text-gray-600 text-xs">—</td>;
  let className = 'px-2 py-3 text-center text-xs font-mono rounded';
  if (fastest)       className += ' text-purple-400 bg-purple-900/30';
  else if (personal) className += ' text-green-400 bg-green-900/30';
  else               className += ' text-gray-300';
  return (
    <td className={className}>
      <div>{value}</div>
      {segments && segments.length > 0 && (
        <div className="flex items-center justify-center gap-0.5 mt-1">
          {segments.map((s, i) => (
            <div
              key={i}
              className="rounded-full flex-shrink-0"
              style={{ width: 4, height: 4, backgroundColor: segmentColor(s) }}
            />
          ))}
        </div>
      )}
    </td>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function LiveTimingPage() {
  const {
    drivers, positions, timing, timingStats, weather,
    session, raceControl, carData, stints,
    gpsPositions, trackHistory, teamRadio,
    connected, loading, error,
  } = useLiveTiming();

  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [mobileTab, setMobileTab] = useState<'Timing' | 'Map' | 'Radio' | 'Control' | 'Weather'>('Timing');
  const { isPremium } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [circuitPoints, setCircuitPoints] = useState<{ x: number; y: number }[] | undefined>(undefined);

  // Fetch static circuit map from backend when session changes
  useEffect(() => {
    const shortName = session?.circuit_short_name;
    if (!shortName) return;
    let cancelled = false;
    fetch(`/api/livetiming/circuit-map?circuit_short_name=${encodeURIComponent(shortName)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled && data?.points?.length) {
          setCircuitPoints(data.points);
        }
      })
      .catch(() => { /* ignore errors, fall back to trackHistory */ });
    return () => { cancelled = true; };
  }, [session?.circuit_short_name]);

  const isLive = connected && positions.length > 0;

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <>
        <SEO path="/live-timing" title="F1 Live Timing - METRIK DELTA" description="Follow Formula 1 sessions in real-time." />
        <div className="min-h-screen bg-metrik-black flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-rajdhani font-black text-white mb-3">Connection Error</h1>
            <p className="text-metrik-silver mb-6">{error.message}</p>
            <button onClick={() => window.location.reload()}
              className="px-6 py-3 bg-metrik-turquoise text-black font-bold rounded-lg">
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── No live session ──────────────────────────────────────────────────────
  if (loading || !isLive) {
    return <CountdownShowcase />;
  }

  // ── Paywall ───────────────────────────────────────────────────────────────
  if (!isPremium) {
    return (
      <div className="relative min-h-screen bg-metrik-black overflow-hidden">
        {/* Blurred preview */}
        <div className="absolute inset-0 blur-sm pointer-events-none opacity-40">
          <TimingTable drivers={drivers} positions={positions} timing={timing}
            timingStats={timingStats} carData={carData} stints={stints}
            selectedDriver={null} onSelect={() => {}} />
        </div>
        {/* Overlay */}
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div className="max-w-md w-full backdrop-blur-xl bg-metrik-card/95 border-2 border-metrik-turquoise/50 rounded-xl p-8 text-center shadow-2xl">
            <div className="p-5 bg-metrik-turquoise/10 rounded-full border-2 border-metrik-turquoise/30 inline-flex mb-5">
              <Lock className="text-metrik-turquoise" size={36} />
            </div>
            <h2 className="text-2xl font-rajdhani font-black text-white mb-3">🏎️ Live Session In Progress</h2>
            <p className="text-metrik-silver text-sm mb-6">
              Access real-time timing, sectors, car telemetry and race control with METRIK+.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6 text-xs">
              {[['📡','Live Timing'],['⏱️','Sector Times'],['🏎️','Car Telemetry'],['🚦','Race Control']].map(([icon,label])=>(
                <div key={label} className="bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg p-3">
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className="font-rajdhani font-bold text-metrik-silver">{label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowUpgradeModal(true)}
              className="w-full py-3 bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-black font-rajdhani font-black text-lg rounded-lg hover:scale-105 transition-all">
              Unlock Live Timing — from 1.99€/mo
            </button>
          </div>
        </div>
        <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} reason="live_timing" />
      </div>
    );
  }

  // ── PRO view ──────────────────────────────────────────────────────────────
  const selectedCarData = selectedDriver ? carData.find(c => c.driver_number === selectedDriver) : null;
  const selectedDriver_ = selectedDriver ? drivers.find(d => d.driver_number === selectedDriver) : null;

  return (
    <>
      <SEO path="/live-timing" title="F1 Live Timing - METRIK DELTA"
        description="Follow Formula 1 sessions in real-time with live timing, telemetry and race control."
        keywords="f1 live timing, formula 1 live, f1 real time, live f1 data" />

      <div className="min-h-screen bg-metrik-black text-white">
        {/* ── Session header ─────────────────────────────────────────────── */}
        <SessionHeader session={session} connected={connected} weather={weather} />

        {/* ── Mobile tabs (< lg) ─────────────────────────────────────────── */}
        <div className="lg:hidden">
          {/* Tab bar */}
          <div className="flex border-b border-metrik-turquoise/30 bg-metrik-card/80 backdrop-blur-xl overflow-x-auto">
            {(['Timing', 'Map', 'Radio', 'Control', 'Weather'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={`flex-shrink-0 px-4 py-3 text-xs font-rajdhani font-bold transition-colors
                  ${mobileTab === tab
                    ? 'text-metrik-turquoise border-b-2 border-metrik-turquoise'
                    : 'text-metrik-silver hover:text-white'}`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
          {/* Tab content */}
          <div className="container mx-auto px-3 py-4">
            {mobileTab === 'Timing' && (
              <div className="space-y-4">
                <TimingTable
                  drivers={drivers} positions={positions} timing={timing}
                  timingStats={timingStats} carData={carData} stints={stints}
                  selectedDriver={selectedDriver} onSelect={setSelectedDriver}
                />
                {selectedCarData && selectedDriver_ && (
                  <CarTelemetryWidget driver={selectedDriver_} carData={selectedCarData} />
                )}
              </div>
            )}
            {mobileTab === 'Map' && (
              <div className="space-y-4">
                <TrackMapWidget gpsPositions={gpsPositions} trackHistory={trackHistory} drivers={drivers} circuitPoints={circuitPoints} />
                {selectedCarData && selectedDriver_ && (
                  <CarTelemetryWidget driver={selectedDriver_} carData={selectedCarData} />
                )}
              </div>
            )}
            {mobileTab === 'Radio' && (
              <TeamRadioWidget captures={teamRadio.captures} drivers={drivers} />
            )}
            {mobileTab === 'Control' && (
              <RaceControlWidget messages={raceControl} />
            )}
            {mobileTab === 'Weather' && (
              <div className="space-y-4">
                {weather && <WeatherWidget weather={weather} />}
                <TyreStrategyWidget drivers={drivers} positions={positions} stints={stints} />
              </div>
            )}
          </div>
        </div>

        {/* ── Desktop layout (lg+) ───────────────────────────────────────── */}
        <div className="hidden lg:block">
          <div className="container mx-auto px-3 sm:px-6 py-4">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

              {/* LEFT — timing table (2 cols) */}
              <div className="xl:col-span-2 space-y-4">
                <TimingTable
                  drivers={drivers} positions={positions} timing={timing}
                  timingStats={timingStats} carData={carData} stints={stints}
                  selectedDriver={selectedDriver} onSelect={setSelectedDriver}
                />

                {/* Car telemetry for selected driver */}
                {selectedCarData && selectedDriver_ && (
                  <CarTelemetryWidget driver={selectedDriver_} carData={selectedCarData} />
                )}
              </div>

              {/* RIGHT — sidebar (1 col) */}
              <div className="space-y-4">
                <TrackMapWidget gpsPositions={gpsPositions} trackHistory={trackHistory} drivers={drivers} circuitPoints={circuitPoints} />
                {weather && <WeatherWidget weather={weather} />}
                <RaceControlWidget messages={raceControl} />
                <TeamRadioWidget captures={teamRadio.captures} drivers={drivers} />
                <TyreStrategyWidget drivers={drivers} positions={positions} stints={stints} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// SESSION HEADER
// ============================================================================
function SessionHeader({ session, connected, weather }: any) {
  return (
    <div className="border-b border-metrik-turquoise/30 bg-metrik-card/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs font-rajdhani font-bold text-metrik-silver">
                {connected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
            {session && (
              <>
                <div className="w-px h-4 bg-metrik-turquoise/30" />
                <span className="text-base sm:text-xl font-rajdhani font-black text-white">
                  {session.meeting_name || 'F1 Session'}
                </span>
                <span className="text-xs sm:text-sm font-bold text-metrik-turquoise">
                  {session.session_name}
                </span>
                {session.current_lap != null && session.total_laps != null && (
                  <span className="text-xs text-metrik-silver font-mono">
                    LAP {session.current_lap}/{session.total_laps}
                  </span>
                )}
              </>
            )}
          </div>
          {weather && (
            <div className="flex items-center gap-4 text-xs text-metrik-silver">
              <span>🌡️ Air <b className="text-white">{weather.air_temperature}°C</b></span>
              <span>🏁 Track <b className="text-white">{weather.track_temperature}°C</b></span>
              {weather.rainfall ? <span>🌧️ Rain</span> : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TIMING TABLE
// ============================================================================
function TimingTable({ drivers, positions, timing, timingStats, carData, stints, selectedDriver, onSelect }: any) {
  return (
    <div className="bg-metrik-card border border-metrik-turquoise/30 rounded-lg overflow-hidden">
      <div className="border-b border-metrik-turquoise/30 px-4 py-3 flex items-center gap-2">
        <Activity size={16} className="text-metrik-turquoise" />
        <h2 className="text-lg font-rajdhani font-black text-white">LIVE STANDINGS</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-metrik-turquoise/20 text-left text-xs text-metrik-silver font-rajdhani font-bold">
              <th className="px-3 py-2 w-8">POS</th>
              <th className="px-3 py-2">DRIVER</th>
              <th className="hidden sm:table-cell px-2 py-2">GAP</th>
              <th className="hidden md:table-cell px-2 py-2">INT</th>
              <th className="px-2 py-2">LAST</th>
              <th className="px-2 py-2 text-metrik-turquoise">BEST</th>
              <th className="hidden lg:table-cell px-2 py-2 text-center">S1</th>
              <th className="hidden lg:table-cell px-2 py-2 text-center">S2</th>
              <th className="hidden lg:table-cell px-2 py-2 text-center">S3</th>
              <th className="hidden xl:table-cell px-2 py-2 text-center">TYRE</th>
              <th className="hidden xl:table-cell px-2 py-2 text-center">DRS</th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-metrik-silver text-sm">
                  Waiting for session data…
                </td>
              </tr>
            ) : positions.map((pos: any) => {
              const driver = drivers.find((d: any) => d.driver_number === pos.driver_number);
              const t = timing.find((t: any) => t.driver_number === pos.driver_number);
              const cd = carData.find((c: any) => c.driver_number === pos.driver_number);
              const driverStints = stints.filter((s: any) => s.driver_number === pos.driver_number);
              const currentStint = driverStints[driverStints.length - 1];
              const isSelected = selectedDriver === pos.driver_number;
              const color = driver ? teamColor(driver.team_name) : '#00D2BE';
              const drsActive = cd?.drs !== undefined && cd.drs > 10;

              return (
                <tr
                  key={pos.driver_number}
                  onClick={() => onSelect(isSelected ? null : pos.driver_number)}
                  className={`border-b border-metrik-turquoise/10 cursor-pointer transition-colors
                    ${isSelected ? 'bg-metrik-turquoise/10' : 'hover:bg-white/5'}`}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-rajdhani font-black text-white">{pos.position}</span>
                      {driver?.grid_position != null && pos.position !== driver.grid_position && (() => {
                        const delta = driver.grid_position - pos.position;
                        if (delta > 0) {
                          return (
                            <span className="text-xs font-bold text-green-400 leading-none">
                              ▲{delta}
                            </span>
                          );
                        } else {
                          return (
                            <span className="text-xs font-bold text-red-400 leading-none">
                              ▼{Math.abs(delta)}
                            </span>
                          );
                        }
                      })()}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-rajdhani font-bold text-white text-base">
                        {driver?.name_acronym || pos.driver_number}
                      </span>
                      <span className="hidden sm:inline text-xs text-metrik-silver">{driver?.team_name}</span>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-2 py-3 text-xs font-mono text-metrik-silver">
                    {pos.gap_to_leader || '—'}
                  </td>
                  <td className="hidden md:table-cell px-2 py-3 text-xs font-mono text-metrik-silver">
                    {pos.interval || '—'}
                  </td>
                  <td className="px-2 py-3 text-xs font-mono text-white">
                    {t?.last_lap_time || '—'}
                  </td>
                  <td className="px-2 py-3 text-xs font-mono font-bold text-metrik-turquoise">
                    {t?.best_lap_time || '—'}
                  </td>
                  <SectorCell value={t?.sector1} fastest={t?.sector1_fastest} personal={t?.sector1_personal} segments={t?.sector1_segments} />
                  <SectorCell value={t?.sector2} fastest={t?.sector2_fastest} personal={t?.sector2_personal} segments={t?.sector2_segments} />
                  <SectorCell value={t?.sector3} fastest={t?.sector3_fastest} personal={t?.sector3_personal} segments={t?.sector3_segments} />
                  <td className="hidden xl:table-cell px-2 py-3 text-center">
                    <CompoundBadge compound={currentStint?.compound} />
                  </td>
                  <td className="hidden xl:table-cell px-2 py-3 text-center">
                    <DRSBadge active={drsActive} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// CAR TELEMETRY WIDGET
// ============================================================================
function CarTelemetryWidget({ driver, carData }: { driver: any; carData: any }) {
  const color = teamColor(driver?.team_name);
  const gear = carData.gear ?? 0;
  const speed = carData.speed ?? 0;
  const throttle = carData.throttle ?? 0;
  const brake = carData.brake ?? 0;
  const rpm = carData.rpm ?? 0;
  const drsOn = carData.drs !== undefined && carData.drs > 10;

  return (
    <div className="bg-metrik-card border border-metrik-turquoise/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={16} className="text-metrik-turquoise" />
        <h3 className="font-rajdhani font-black text-white">
          {driver.name_acronym} — CAR TELEMETRY
        </h3>
        {drsOn && <span className="ml-auto text-xs font-black bg-green-500 text-black px-2 rounded">DRS OPEN</span>}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {/* Speed */}
        <div className="text-center bg-metrik-black/50 rounded-lg p-3">
          <div className="text-2xl font-rajdhani font-black text-white">{speed}</div>
          <div className="text-[10px] text-metrik-silver font-bold">km/h</div>
        </div>
        {/* Gear */}
        <div className="text-center bg-metrik-black/50 rounded-lg p-3">
          <div className="text-2xl font-rajdhani font-black" style={{ color }}>{gear || 'N'}</div>
          <div className="text-[10px] text-metrik-silver font-bold">GEAR</div>
        </div>
        {/* RPM */}
        <div className="text-center bg-metrik-black/50 rounded-lg p-3">
          <div className="text-2xl font-rajdhani font-black text-white">{(rpm / 1000).toFixed(1)}k</div>
          <div className="text-[10px] text-metrik-silver font-bold">RPM</div>
        </div>
        {/* Throttle */}
        <div className="text-center bg-metrik-black/50 rounded-lg p-3">
          <div className="text-2xl font-rajdhani font-black text-green-400">{throttle}%</div>
          <div className="text-[10px] text-metrik-silver font-bold">THROTTLE</div>
        </div>
        {/* Brake */}
        <div className="text-center bg-metrik-black/50 rounded-lg p-3">
          <div className={`text-2xl font-rajdhani font-black ${brake > 0 ? 'text-red-500' : 'text-gray-600'}`}>
            {brake > 0 ? 'ON' : 'OFF'}
          </div>
          <div className="text-[10px] text-metrik-silver font-bold">BRAKE</div>
        </div>
        {/* Throttle bar */}
        <div className="flex flex-col justify-center bg-metrik-black/50 rounded-lg p-3">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-1">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${throttle}%` }} />
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${brake}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// WEATHER WIDGET
// ============================================================================
function WeatherWidget({ weather }: { weather: any }) {
  return (
    <div className="bg-metrik-card border border-metrik-turquoise/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Cloud size={16} className="text-metrik-turquoise" />
        <h3 className="font-rajdhani font-black text-white">WEATHER</h3>
        {weather.rainfall ? <span className="ml-auto text-xs text-blue-400">🌧️ Rain</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-metrik-silver text-xs mb-0.5">Air Temp</p>
          <p className="text-xl font-rajdhani font-black text-white">{weather.air_temperature}°C</p></div>
        <div><p className="text-metrik-silver text-xs mb-0.5">Track Temp</p>
          <p className="text-xl font-rajdhani font-black text-white">{weather.track_temperature}°C</p></div>
        {weather.humidity != null && (
          <div><p className="text-metrik-silver text-xs mb-0.5">Humidity</p>
            <p className="text-xl font-rajdhani font-black text-white">{weather.humidity}%</p></div>
        )}
        {weather.wind_speed != null && (
          <div><p className="text-metrik-silver text-xs mb-0.5">Wind</p>
            <p className="text-xl font-rajdhani font-black text-white">{weather.wind_speed} km/h</p></div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// RACE CONTROL FEED
// ============================================================================
function RaceControlWidget({ messages }: { messages: any[] }) {
  const flagColors: Record<string, string> = {
    GREEN: 'border-l-green-500', YELLOW: 'border-l-yellow-400',
    RED: 'border-l-red-500', BLUE: 'border-l-blue-400',
    SC: 'border-l-yellow-300', VSC: 'border-l-yellow-300',
  };

  return (
    <div className="bg-metrik-card border border-metrik-turquoise/30 rounded-lg overflow-hidden">
      <div className="border-b border-metrik-turquoise/30 px-4 py-3 flex items-center gap-2">
        <Radio size={16} className="text-metrik-turquoise" />
        <h3 className="font-rajdhani font-black text-white">RACE CONTROL</h3>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="px-4 py-8 text-center text-metrik-silver text-xs">No messages yet</p>
        ) : messages.map((msg, i) => {
          const borderClass = flagColors[msg.flag || ''] || 'border-l-metrik-turquoise/40';
          return (
            <div key={i} className={`border-l-2 ${borderClass} px-3 py-2 border-b border-white/5`}>
              <p className="text-xs text-white leading-snug">{msg.message}</p>
              <p className="text-[10px] text-metrik-silver mt-0.5">
                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                {msg.lap ? ` · Lap ${msg.lap}` : ''}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// TYRE STRATEGY
// ============================================================================
function TyreStrategyWidget({ drivers, positions, stints }: any) {
  if (stints.length === 0) return null;

  return (
    <div className="bg-metrik-card border border-metrik-turquoise/30 rounded-lg overflow-hidden">
      <div className="border-b border-metrik-turquoise/30 px-4 py-3">
        <h3 className="font-rajdhani font-black text-white">TYRE STRATEGY</h3>
      </div>
      <div className="max-h-72 overflow-y-auto p-3 space-y-2">
        {positions.slice(0, 10).map((pos: any) => {
          const driver = drivers.find((d: any) => d.driver_number === pos.driver_number);
          const driverStints = stints
            .filter((s: any) => s.driver_number === pos.driver_number)
            .sort((a: any, b: any) => a.stint_number - b.stint_number);

          if (!driverStints.length) return null;

          return (
            <div key={pos.driver_number} className="flex items-center gap-2">
              <span className="text-xs font-rajdhani font-black text-metrik-silver w-8">
                P{pos.position}
              </span>
              <span className="text-xs font-bold text-white w-10">
                {driver?.name_acronym || pos.driver_number}
              </span>
              <div className="flex items-center gap-1">
                {driverStints.map((stint: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-1">
                    <CompoundBadge compound={stint.compound} />
                    <span className="text-[10px] text-metrik-silver">{stint.tyre_age_at_start}L</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
