/**
 * METRIK DELTA - Team Radio Widget
 * Displays recent team radio captures with playback controls.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Radio } from 'lucide-react';
import type { TeamRadioCapture, ProcessedDriver } from '../../services/livetiming/types';

interface Props {
  captures: TeamRadioCapture[];
  drivers: ProcessedDriver[];
}

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

function formatTime(utc: string): string {
  try {
    return new Date(utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return utc;
  }
}

export default function TeamRadioWidget({ captures, drivers }: Props) {
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef   = useRef<HTMLAudioElement | null>(null);
  const prevCount  = useRef<number>(0);

  // Auto-play new radio messages as they arrive live
  useEffect(() => {
    if (captures.length > prevCount.current && prevCount.current > 0) {
      const newest = captures[captures.length - 1];
      if (newest?.recording_url) {
        // Stop any currently playing audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        const audio = new Audio(newest.recording_url);
        audioRef.current = audio;
        setPlayingUrl(newest.recording_url);
        audio.play().catch(() => {});
        audio.onended = () => {
          setPlayingUrl(null);
          audioRef.current = null;
        };
      }
    }
    prevCount.current = captures.length;
  }, [captures.length]);

  // Most recent first — all messages
  const recent = [...captures].reverse();

  function handlePlay(url: string) {
    if (playingUrl === url) {
      // Pause currently playing
      audioRef.current?.pause();
      setPlayingUrl(null);
      return;
    }
    // Stop previous
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingUrl(url);
    audio.play().catch(() => {});
    audio.onended = () => {
      setPlayingUrl(null);
      audioRef.current = null;
    };
  }

  return (
    <div className="bg-metrik-card border border-metrik-turquoise/30 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-metrik-turquoise/30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio size={16} className="text-metrik-turquoise" />
          <h3 className="font-rajdhani font-black text-white">TEAM RADIO</h3>
        </div>
        {recent.length > 0 && (
          <span className="text-xs text-metrik-silver font-mono">{recent.length} msg</span>
        )}
      </div>

      {/* Messages */}
      {recent.length === 0 ? (
        <div className="flex items-center justify-center h-16 text-xs text-metrik-silver/50">
          No radio messages yet…
        </div>
      ) : (
      <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
        {recent.map((capture, idx) => {
          const driver = drivers.find(d => d.driver_number === capture.driver_number);
          const color = teamColor(driver?.team_name);
          const isPlaying = playingUrl === capture.recording_url;

          return (
            <div key={idx} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors">
              {/* Team color bar */}
              <div
                className="w-1 h-10 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />

              {/* Driver info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-rajdhani font-bold text-white text-sm">
                    {driver?.name_acronym ?? `#${capture.driver_number}`}
                  </span>
                  {driver?.broadcast_name && (
                    <span className="text-xs text-metrik-silver truncate hidden sm:inline">
                      {driver.broadcast_name}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-metrik-silver font-mono mt-0.5">
                  {formatTime(capture.utc)}
                </div>
              </div>

              {/* Waveform animation when playing */}
              {isPlaying && (
                <div className="flex items-end gap-0.5 h-5 flex-shrink-0">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="w-1 bg-metrik-turquoise rounded-full"
                      style={{
                        animation: `waveBar${i} 0.6s ease-in-out infinite alternate`,
                        height: `${[40, 70, 55, 85][i - 1]}%`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Play / Pause button */}
              <button
                onClick={() => handlePlay(capture.recording_url)}
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all
                  ${isPlaying
                    ? 'bg-metrik-turquoise text-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  // Pause icon
                  <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                    <rect x="0" y="0" width="3" height="12" rx="1" />
                    <rect x="7" y="0" width="3" height="12" rx="1" />
                  </svg>
                ) : (
                  // Play icon
                  <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                    <path d="M0 0 L10 6 L0 12 Z" />
                  </svg>
                )}
              </button>
            </div>
          );
        })}
      </div>
      )}

      {/* CSS for waveform animation */}
      <style>{`
        @keyframes waveBar1 { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }
        @keyframes waveBar2 { from { transform: scaleY(0.7); } to { transform: scaleY(0.3); } }
        @keyframes waveBar3 { from { transform: scaleY(0.5); } to { transform: scaleY(0.9); } }
        @keyframes waveBar4 { from { transform: scaleY(0.9); } to { transform: scaleY(0.4); } }
      `}</style>
    </div>
  );
}
