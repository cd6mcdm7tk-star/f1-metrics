import { Clock, Zap, Gauge, MapPin, Target, Wind, Thermometer } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { TelemetryData } from '../types/telemetry';
import { useState, useMemo, useRef, useEffect } from 'react';

interface TelemetryViewProps {
  telemetryData: TelemetryData;
  driver1: string;
  driver2: string;
  sessionType: string;
  lapNumber: number | null;
  getDriverColor: (driverCode: string) => string;
  areTeammates: (driver1: string, driver2: string) => boolean;
  loading?: boolean; // 🔥 NOUVELLE PROP pour skeleton loaders
}

// 🔥 COMPOSANT SKELETON LOADER
const SkeletonChart = () => (
  <div className="relative w-full h-full">
    {/* Shimmer effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-metrik-silver/5 to-transparent animate-shimmer" 
         style={{ 
           backgroundSize: '200% 100%',
           animation: 'shimmer 2s infinite'
         }} 
    />
    
    {/* Structure skeleton */}
    <div className="flex flex-col justify-between h-full p-4 opacity-30">
      {/* Horizontal lines (grid) */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="w-full h-px bg-metrik-silver/20" />
      ))}
    </div>
  </div>
);

export default function TelemetryView({
  telemetryData,
  driver1,
  driver2,
  sessionType,
  lapNumber,
  getDriverColor,
  areTeammates,
  loading = false
}: TelemetryViewProps) {
  const driver1Color = getDriverColor(driver1);
  const driver2Color = areTeammates(driver1, driver2) ? '#FFFFFF' : getDriverColor(driver2);

  const hoverMarkerRef = useRef<SVGGElement>(null);
  const chartsContainerRef = useRef<HTMLDivElement>(null);
  const transformedPointsRef = useRef<any[]>([]);

  const formatLapTime = (seconds: number | null): string => {
    if (!seconds) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  const formatTooltipValue = (value: any): string => {
    if (value === null || value === undefined) return '--';
    const num = parseFloat(value);
    if (isNaN(num)) return '--';
    return Math.round(num).toString();
  };

  const telemetryChartData = telemetryData.telemetry.map((point: any) => ({
    distance: point.distance,
    speed1: point.speed1,
    speed2: point.speed2,
    throttle1: point.throttle1,
    throttle2: point.throttle2,
    brake1: point.brake1 ? 100 : 0,
    brake2: point.brake2 ? 100 : 0,
    gear1: point.gear1,
    gear2: point.gear2,
    rpm1: point.rpm1 || 0,
    rpm2: point.rpm2 || 0,
    delta: point.delta
  }));

  const maxSpeed1 = Math.max(...telemetryData.telemetry.map((p: any) => p.speed1));
  const maxSpeed2 = Math.max(...telemetryData.telemetry.map((p: any) => p.speed2));
  const avgSpeed1 = telemetryData.telemetry.reduce((sum: number, p: any) => sum + p.speed1, 0) / telemetryData.telemetry.length;
  const avgSpeed2 = telemetryData.telemetry.reduce((sum: number, p: any) => sum + p.speed2, 0) / telemetryData.telemetry.length;
  const delta = (telemetryData.lapTime2 || 0) - (telemetryData.lapTime1 || 0);

  const maxDistance = Math.max(...telemetryData.telemetry.map((p: any) => p.distance));
  
  let sector1Distance = maxDistance * 0.33;
  let sector2Distance = maxDistance * 0.66;
  
  if (telemetryData.sectors1 && telemetryData.lapTime1) {
    const totalTime = telemetryData.lapTime1;
    const s1Time = telemetryData.sectors1.sector1 || 0;
    const s2Time = telemetryData.sectors1.sector2 || 0;
    
    const s1Ratio = s1Time / totalTime;
    const s2Ratio = (s1Time + s2Time) / totalTime;
    
    sector1Distance = maxDistance * s1Ratio;
    sector2Distance = maxDistance * s2Ratio;
  }
  
  const sector1Percent = (sector1Distance / maxDistance) * 100;
  const sector2Percent = (sector2Distance / maxDistance) * 100;
  const sector3Percent = 100 - sector2Percent;

  const SectorLabels = () => (
    <div className="hidden sm:flex absolute top-1 right-0 left-12 h-full text-[9px] font-rajdhani font-bold pointer-events-none z-10" style={{ paddingRight: '20px' }}>
      <div className="flex items-start justify-center pt-0.5 text-metrik-silver/60" style={{ width: `${sector1Percent}%` }}>
        <span>S1</span>
      </div>
      <div className="h-full w-px bg-metrik-silver/20" />
      <div className="flex items-start justify-center pt-0.5 text-metrik-silver/60" style={{ width: `${sector2Percent - sector1Percent}%` }}>
        <span>S2</span>
      </div>
      <div className="h-full w-px bg-metrik-silver/20" />
      <div className="flex items-start justify-center pt-0.5 text-metrik-silver/60" style={{ width: `${sector3Percent}%` }}>
        <span>S3</span>
      </div>
    </div>
  );

  const rawGpsPoints = telemetryData.telemetry
    .filter((p: any) => 
      p.x != null && p.y != null && 
      !isNaN(p.x) && !isNaN(p.y) &&
      Math.abs(p.x) > 0.001 && Math.abs(p.y) > 0.001
    )
    .map((p: any) => ({ x: p.x, y: p.y, distance: p.distance || 0 }));

  const hasGpsData = rawGpsPoints.length >= 10;

  const trackDominanceData = useMemo(() => {
    if (!hasGpsData) return null;

    const segmentSize = 20;
    const maxDist = rawGpsPoints[rawGpsPoints.length - 1]?.distance || 0;
    const segments = [];
    const numSegments = Math.ceil(maxDist / segmentSize);

    for (let i = 0; i < numSegments; i++) {
      const startDist = i * segmentSize;
      const endDist = Math.min((i + 1) * segmentSize, maxDist);

      const segmentPoints = telemetryData.telemetry.filter(
        (p: any) => p.distance >= startDist && p.distance < endDist
      );

      if (segmentPoints.length > 0) {
        const avgSpeed1 = segmentPoints.reduce((sum: number, p: any) => sum + p.speed1, 0) / segmentPoints.length;
        const avgSpeed2 = segmentPoints.reduce((sum: number, p: any) => sum + p.speed2, 0) / segmentPoints.length;
        const advantage = avgSpeed1 - avgSpeed2;

        segments.push({
          segment: i + 1,
          startDistance: startDist,
          endDistance: endDist,
          dominant: advantage >= 0 ? 'driver1' : 'driver2',
          advantage: Math.abs(advantage)
        });
      }
    }

    const driver1Dominant = segments.filter(s => s.dominant === 'driver1').length;
    const driver2Dominant = segments.filter(s => s.dominant === 'driver2').length;

    return {
      segments,
      stats: {
        driver1Dominant,
        driver2Dominant,
        totalSegments: segments.length
      }
    };
  }, [hasGpsData, rawGpsPoints, telemetryData.telemetry]);

  const trackMapBase = useMemo(() => {
    if (!hasGpsData) return null;

    const xValues = rawGpsPoints.map(p => p.x);
    const yValues = rawGpsPoints.map(p => p.y);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;

    if (rangeX === 0 || rangeY === 0) return null;

    const aspectRatio = rangeX / rangeY;
    const shouldRotate = aspectRatio < 1;

    const transformPoint = (p: any) => {
      let x = p.x - minX;
      let y = p.y - minY;
      if (shouldRotate) {
        const temp = x;
        x = rangeY - y;
        y = temp;
      }
      x = (shouldRotate ? rangeY : rangeX) - x;
      return { x, y, distance: p.distance };
    };

    const transformedPoints = rawGpsPoints.map(transformPoint);
    transformedPointsRef.current = transformedPoints;
    
    const effectiveRangeX = shouldRotate ? rangeY : rangeX;
    const effectiveRangeY = shouldRotate ? rangeX : rangeY;

    const paddingPercent = 0.04;
    const paddedRangeX = effectiveRangeX * (1 + 2 * paddingPercent);
    const paddedRangeY = effectiveRangeY * (1 + 2 * paddingPercent);

    const cardAspectRatio = 1000 / 350;
    const circuitAspectRatio = paddedRangeX / paddedRangeY;

    let viewBoxWidth, viewBoxHeight;
    if (circuitAspectRatio > cardAspectRatio) {
      viewBoxWidth = paddedRangeX;
      viewBoxHeight = paddedRangeX / cardAspectRatio;
    } else {
      viewBoxHeight = paddedRangeY;
      viewBoxWidth = paddedRangeY * cardAspectRatio;
    }

    const centerX = effectiveRangeX / 2;
    const centerY = effectiveRangeY / 2;
    const viewBoxX = centerX - (viewBoxWidth / 2);
    const viewBoxY = centerY - (viewBoxHeight / 2);
    const viewBox = `${viewBoxX.toFixed(0)} ${viewBoxY.toFixed(0)} ${viewBoxWidth.toFixed(0)} ${viewBoxHeight.toFixed(0)}`;

    const circuitSize = Math.max(effectiveRangeX, effectiveRangeY);
    const baseStrokeWidth = circuitSize * 0.015;

    let fullPath = `M ${transformedPoints[0].x},${transformedPoints[0].y}`;
    for (let i = 1; i < transformedPoints.length; i++) {
      fullPath += ` L ${transformedPoints[i].x},${transformedPoints[i].y}`;
    }

    const coloredPaths: Array<{path: string, color: string}> = [];
    if (trackDominanceData) {
      for (const segment of trackDominanceData.segments) {
        const segStart = segment.startDistance || 0;
        const segEnd = segment.endDistance || Infinity;
        const segmentPoints = transformedPoints.filter(p => p.distance >= segStart && p.distance < segEnd);
        if (segmentPoints.length < 2) continue;

        let segPath = `M ${segmentPoints[0].x},${segmentPoints[0].y}`;
        for (let i = 1; i < segmentPoints.length; i++) {
          segPath += ` L ${segmentPoints[i].x},${segmentPoints[i].y}`;
        }
        const color = segment.dominant === 'driver1' ? driver1Color : driver2Color;
        coloredPaths.push({ path: segPath, color });
      }
    }

    return {
      viewBox,
      fullPath,
      coloredPaths,
      transformedPoints,
      baseStrokeWidth
    };
  }, [hasGpsData, rawGpsPoints, trackDominanceData, driver1Color, driver2Color]);

  useEffect(() => {
    if (!chartsContainerRef.current || !hoverMarkerRef.current || !trackMapBase) return;

    const container = chartsContainerRef.current;
    const marker = hoverMarkerRef.current;
    const points = transformedPointsRef.current;

    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      animationFrameId = requestAnimationFrame(() => {
        const chartSurface = container.querySelector('.recharts-surface');
        if (!chartSurface || points.length === 0) return;

        const rect = chartSurface.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const chartWidth = rect.width;
        
        const ratio = Math.max(0, Math.min(1, mouseX / chartWidth));
        const distance = ratio * maxDistance;
        
        const hoverPoint = points.reduce((closest: any, point: any) => {
          if (!closest) return point;
          const distToHover = Math.abs(point.distance - distance);
          const distToClosest = Math.abs(closest.distance - distance);
          return distToHover < distToClosest ? point : closest;
        }, null);

        if (hoverPoint) {
          marker.style.transform = `translate(${hoverPoint.x}px, ${hoverPoint.y}px)`;
          marker.style.opacity = '1';
        }
      });
    };

    const handleMouseLeave = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      marker.style.opacity = '0';
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [trackMapBase, maxDistance]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats + Track Map Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        
        {/* Stats Cards */}
        <div className="lg:col-span-1 space-y-3 sm:space-y-4">
          
          {/* Driver 1 Card */}
          <div className={`backdrop-blur-xl bg-metrik-card/95 border-2 rounded-xl p-3 sm:p-4 transition-opacity duration-300 ${loading ? 'opacity-40' : 'opacity-100'}`} 
               style={{ borderColor: driver1Color + '40' }}>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-1 h-10 sm:h-12 rounded" style={{ backgroundColor: driver1Color }} />
                <div>
                  <div className="text-xl sm:text-2xl font-rajdhani font-black" style={{ color: driver1Color }}>
                    {driver1}
                  </div>
                  <div className="text-[10px] sm:text-xs text-metrik-silver font-rajdhani font-bold">
                    {lapNumber ? `Lap ${lapNumber}` : 'Fastest Lap'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] sm:text-xs text-metrik-silver uppercase font-rajdhani font-bold mb-0.5 sm:mb-1">Lap Time</div>
                <div className="text-base sm:text-xl font-rajdhani font-black text-white">
                  {formatLapTime(telemetryData.lapTime1 || 0)}
                </div>
              </div>
            </div>
            
            {telemetryData.sectors1 && (
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <div className="bg-metrik-black/40 rounded-lg p-1.5 sm:p-2 border border-metrik-silver/10">
                  <div className="text-[10px] sm:text-xs text-metrik-silver mb-0.5">S1</div>
                  <div className="text-xs sm:text-sm font-rajdhani font-bold text-white">
                    {telemetryData.sectors1.sector1?.toFixed(3)}s
                  </div>
                </div>
                <div className="bg-metrik-black/40 rounded-lg p-1.5 sm:p-2 border border-metrik-silver/10">
                  <div className="text-[10px] sm:text-xs text-metrik-silver mb-0.5">S2</div>
                  <div className="text-xs sm:text-sm font-rajdhani font-bold text-white">
                    {telemetryData.sectors1.sector2?.toFixed(3)}s
                  </div>
                </div>
                <div className="bg-metrik-black/40 rounded-lg p-1.5 sm:p-2 border border-metrik-silver/10">
                  <div className="text-[10px] sm:text-xs text-metrik-silver mb-0.5">S3</div>
                  <div className="text-xs sm:text-sm font-rajdhani font-bold text-white">
                    {telemetryData.sectors1.sector3?.toFixed(3)}s
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Gauge className="text-metrik-turquoise flex-shrink-0" size={12} />
                <div className="min-w-0">
                  <div className="text-metrik-silver truncate">Max Speed</div>
                  <div className="font-rajdhani font-bold text-white">{maxSpeed1.toFixed(0)} km/h</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Zap className="text-metrik-turquoise flex-shrink-0" size={12} />
                <div className="min-w-0">
                  <div className="text-metrik-silver truncate">Avg Speed</div>
                  <div className="font-rajdhani font-bold text-white">{avgSpeed1.toFixed(0)} km/h</div>
                </div>
              </div>
            </div>
          </div>

          {/* Driver 2 Card */}
          <div className={`backdrop-blur-xl bg-metrik-card/95 border-2 rounded-xl p-3 sm:p-4 transition-opacity duration-300 ${loading ? 'opacity-40' : 'opacity-100'}`} 
               style={{ borderColor: driver2Color + '40' }}>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-1 h-10 sm:h-12 rounded" style={{ backgroundColor: driver2Color }} />
                <div>
                  <div className="text-xl sm:text-2xl font-rajdhani font-black" style={{ color: driver2Color }}>
                    {driver2}
                  </div>
                  <div className="text-[10px] sm:text-xs text-metrik-silver font-rajdhani font-bold">
                    {lapNumber ? `Lap ${lapNumber}` : 'Fastest Lap'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] sm:text-xs text-metrik-silver uppercase font-rajdhani font-bold mb-0.5 sm:mb-1">Lap Time</div>
                <div className="text-base sm:text-xl font-rajdhani font-black text-white">
                  {formatLapTime(telemetryData.lapTime2 || 0)}
                </div>
              </div>
            </div>
            
            {telemetryData.sectors2 && (
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <div className="bg-metrik-black/40 rounded-lg p-1.5 sm:p-2 border border-metrik-silver/10">
                  <div className="text-[10px] sm:text-xs text-metrik-silver mb-0.5">S1</div>
                  <div className="text-xs sm:text-sm font-rajdhani font-bold text-white">
                    {telemetryData.sectors2.sector1?.toFixed(3)}s
                  </div>
                </div>
                <div className="bg-metrik-black/40 rounded-lg p-1.5 sm:p-2 border border-metrik-silver/10">
                  <div className="text-[10px] sm:text-xs text-metrik-silver mb-0.5">S2</div>
                  <div className="text-xs sm:text-sm font-rajdhani font-bold text-white">
                    {telemetryData.sectors2.sector2?.toFixed(3)}s
                  </div>
                </div>
                <div className="bg-metrik-black/40 rounded-lg p-1.5 sm:p-2 border border-metrik-silver/10">
                  <div className="text-[10px] sm:text-xs text-metrik-silver mb-0.5">S3</div>
                  <div className="text-xs sm:text-sm font-rajdhani font-bold text-white">
                    {telemetryData.sectors2.sector3?.toFixed(3)}s
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Gauge className="text-metrik-turquoise flex-shrink-0" size={12} />
                <div className="min-w-0">
                  <div className="text-metrik-silver truncate">Max Speed</div>
                  <div className="font-rajdhani font-bold text-white">{maxSpeed2.toFixed(0)} km/h</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Zap className="text-metrik-turquoise flex-shrink-0" size={12} />
                <div className="min-w-0">
                  <div className="text-metrik-silver truncate">Avg Speed</div>
                  <div className="font-rajdhani font-bold text-white">{avgSpeed2.toFixed(0)} km/h</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Track Map */}
        <div className="lg:col-span-2">
          <div className={`backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-3 sm:p-4 h-full flex flex-col transition-opacity duration-300 ${loading ? 'opacity-40' : 'opacity-100'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <MapPin className="text-metrik-turquoise flex-shrink-0" size={14} />
                <h3 className="text-[10px] sm:text-xs font-rajdhani font-bold text-white uppercase">Track Map</h3>
                
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 bg-metrik-black/40 rounded-lg border border-metrik-silver/10">
                  <span className="text-[9px] sm:text-xs text-metrik-silver/70 font-rajdhani font-bold">GAP</span>
                  <span className={`text-xs sm:text-sm font-rajdhani font-black ${
                    delta > 0 ? 'text-red-500' : delta < 0 ? 'text-green-500' : 'text-metrik-silver'
                  }`}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(3)}s
                  </span>
                  <span className="hidden sm:inline text-xs text-metrik-silver/60">
                    {Math.abs(delta) < 0.001 ? '' : `${delta > 0 ? driver1 : driver2} faster`}
                  </span>
                </div>
              </div>
              
              {trackDominanceData && (
                <div className="flex gap-2 sm:gap-3 text-[10px] sm:text-xs font-rajdhani font-bold">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0" style={{ backgroundColor: driver1Color }} />
                    <span style={{ color: driver1Color }}>
                      {driver1} {((trackDominanceData.stats.driver1Dominant / trackDominanceData.stats.totalSegments) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0" style={{ backgroundColor: driver2Color }} />
                    <span style={{ color: driver2Color }}>
                      {driver2} {((trackDominanceData.stats.driver2Dominant / trackDominanceData.stats.totalSegments) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
        
            {hasGpsData && trackMapBase ? (
              <div className="relative w-full flex-1 rounded-lg overflow-visible bg-[#0a0a0a] flex items-center justify-center min-h-[250px] sm:min-h-[300px]">
                {/* 🔥 SKELETON OVERLAY pendant loading */}
                {loading && (
                  <div className="absolute inset-0 z-10 bg-metrik-black/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-metrik-turquoise text-sm font-rajdhani">Loading track...</div>
                  </div>
                )}
                
                <svg 
                  className="w-full h-full"
                  viewBox={trackMapBase.viewBox}
                  preserveAspectRatio="xMidYMid meet"
                  style={{ shapeRendering: 'geometricPrecision' }}
                >
                  <defs>
                    <filter id="glow-intense">
                      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    <filter id="shadow-deep">
                      <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.6"/>
                    </filter>
                  </defs>

                  <g>
                    <path
                      d={trackMapBase.fullPath}
                      fill="none"
                      stroke="#000000"
                      strokeWidth={trackMapBase.baseStrokeWidth * 2.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.5"
                      filter="url(#shadow-deep)"
                    />
                    <path
                      d={trackMapBase.fullPath}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth={trackMapBase.baseStrokeWidth * 2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.95"
                    />
                    {trackMapBase.coloredPaths.map((seg: any, idx: number) => (
                      <path
                        key={idx}
                        d={seg.path}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={trackMapBase.baseStrokeWidth * 1.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.95"
                        filter="url(#glow-intense)"
                        style={{ filter: `drop-shadow(0 0 ${trackMapBase.baseStrokeWidth * 0.8}px ${seg.color})` }}
                      />
                    ))}

                    <g>
                      <circle
                        cx={trackMapBase.transformedPoints[0].x}
                        cy={trackMapBase.transformedPoints[0].y}
                        r={trackMapBase.baseStrokeWidth * 4}
                        fill="none"
                        stroke="#00E5CC"
                        strokeWidth={trackMapBase.baseStrokeWidth * 0.1}
                        opacity="0.2"
                      >
                        <animate
                          attributeName="r"
                          from={trackMapBase.baseStrokeWidth * 3}
                          to={trackMapBase.baseStrokeWidth * 5}
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          from="0.4"
                          to="0"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle
                        cx={trackMapBase.transformedPoints[0].x}
                        cy={trackMapBase.transformedPoints[0].y}
                        r={trackMapBase.baseStrokeWidth * 2}
                        fill="#00E5CC"
                        opacity="0.95"
                      />
                      <circle
                        cx={trackMapBase.transformedPoints[0].x}
                        cy={trackMapBase.transformedPoints[0].y}
                        r={trackMapBase.baseStrokeWidth * 0.8}
                        fill="#FFFFFF"
                        opacity="1"
                      />
                    </g>

                    <g 
                      ref={hoverMarkerRef}
                      style={{ 
                        opacity: 0,
                        transition: 'opacity 0.1s ease-out',
                        willChange: 'transform'
                      }}
                    >
                      <circle
                        cx={0}
                        cy={0}
                        r={trackMapBase.baseStrokeWidth * 3.5}
                        fill="none"
                        stroke="#00E5CC"
                        strokeWidth={trackMapBase.baseStrokeWidth * 0.15}
                        opacity="0.3"
                      />
                      <circle
                        cx={0}
                        cy={0}
                        r={trackMapBase.baseStrokeWidth * 2.2}
                        fill="#00E5CC"
                        opacity="0.6"
                      />
                      <circle
                        cx={0}
                        cy={0}
                        r={trackMapBase.baseStrokeWidth * 1}
                        fill="#FFFFFF"
                        opacity="1"
                      />
                    </g>
                  </g>
                </svg>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center min-h-[250px]">
                <div className="text-center">
                  <Target className="w-6 h-6 sm:w-8 sm:h-8 text-metrik-silver/40 mx-auto mb-2" />
                  <p className="text-metrik-silver/60 font-rajdhani text-xs sm:text-sm">GPS data not available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🔥 CHARTS avec Skeleton overlay si loading */}
      <div ref={chartsContainerRef} className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl overflow-hidden relative">
        
        {/* 🔥 OPTIMISTIC UI - Ancien graphique reste visible en transparence */}
        <div className={`transition-opacity duration-300 ${loading ? 'opacity-30' : 'opacity-100'}`}>
          
          {/* Speed */}
          <div className="border-b border-metrik-turquoise/20 relative">
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1">
              <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-blue-500 rounded" />
              <h3 className="text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-turquoise uppercase">Speed</h3>
            </div>
            <SectorLabels />
            {loading && <SkeletonChart />}
            <ResponsiveContainer width="100%" height={150} className="sm:!h-[200px]">
              <LineChart data={telemetryChartData} syncId="telemetry" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333333" vertical={false} horizontal={true} />
                <XAxis dataKey="distance" stroke="#666" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} hide />
                <YAxis 
                  stroke="#666" 
                  tick={{ fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                  domain={[40, (dataMax: number) => Math.ceil(dataMax / 10) * 10]}
                  tickFormatter={(value) => Math.round(value).toString()}
                  label={{ value: 'km/h', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#666' } }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #00E5CC', borderRadius: '8px', fontSize: '10px' }}
                  labelFormatter={(label) => `${Math.round(parseFloat(label))}m`}
                  formatter={(value: any, name: string) => [formatTooltipValue(value) + ' km/h', name]}
                />
                
                <Line type="monotone" dataKey="speed1" stroke={driver1Color} strokeWidth={1.5} dot={false} name={driver1} />
                <Line type="monotone" dataKey="speed2" stroke={driver2Color} strokeWidth={1.5} dot={false} name={driver2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Delta */}
          <div className="border-b border-metrik-turquoise/20 relative">
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1">
              <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-yellow-500 rounded" />
              <h3 className="text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-turquoise uppercase">Delta</h3>
            </div>
            <SectorLabels />
            {loading && <SkeletonChart />}
            <ResponsiveContainer width="100%" height={80} className="sm:!h-[100px]">
              <AreaChart data={telemetryChartData} syncId="telemetry" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="deltaPositive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333333" vertical={false} horizontal={true} />
                <XAxis dataKey="distance" stroke="#666" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} hide />
                <YAxis 
                  stroke="#666" 
                  tick={{ fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                  tickFormatter={(value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}s`}
                  label={{ value: 's', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#666' } }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #00E5CC', borderRadius: '8px', fontSize: '10px' }}
                  labelFormatter={(label) => `${Math.round(parseFloat(label))}m`}
                  formatter={(value: any) => {
                    const val = parseFloat(value);
                    return [
                      `${(val >= 0 ? '+' : '')}${val.toFixed(3)}s`,
                      val > 0 ? `${driver1} ahead` : val < 0 ? `${driver2} ahead` : 'Equal'
                    ];
                  }}
                />
                
                <ReferenceLine y={0} stroke="#00E5CC" strokeWidth={1.5} strokeDasharray="3 3" />
                <Area type="monotone" dataKey="delta" stroke="#00E5CC" strokeWidth={1.5} fill="url(#deltaPositive)" fillOpacity={1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Throttle */}
          <div className="border-b border-metrik-turquoise/20 relative">
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1">
              <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-green-500 rounded" />
              <h3 className="text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-turquoise uppercase">Throttle</h3>
            </div>
            <SectorLabels />
            {loading && <SkeletonChart />}
            <ResponsiveContainer width="100%" height={150} className="sm:!h-[200px]">
              <LineChart data={telemetryChartData} syncId="telemetry" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333333" vertical={false} horizontal={true} />
                <XAxis dataKey="distance" stroke="#666" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} hide />
                <YAxis 
                  stroke="#666" 
                  tick={{ fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                  domain={[0, 100]}
                  tickFormatter={(value) => Math.round(value).toString()}
                  label={{ value: '%', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#666' } }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #00E5CC', borderRadius: '8px', fontSize: '10px' }}
                  labelFormatter={(label) => `${Math.round(parseFloat(label))}m`}
                  formatter={(value: any, name: string) => [formatTooltipValue(value) + '%', name]}
                />
                
                <Line type="stepAfter" dataKey="throttle1" stroke={driver1Color} strokeWidth={1.5} dot={false} name={driver1} />
                <Line type="stepAfter" dataKey="throttle2" stroke={driver2Color} strokeWidth={1.5} dot={false} name={driver2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Brake */}
          <div className="border-b border-metrik-turquoise/20 relative">
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1">
              <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-red-500 rounded" />
              <h3 className="text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-turquoise uppercase">Braking</h3>
            </div>
            <SectorLabels />
            {loading && <SkeletonChart />}
            <ResponsiveContainer width="100%" height={80} className="sm:!h-[100px]">
              <LineChart data={telemetryChartData} syncId="telemetry" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333333" vertical={false} horizontal={true} />
                <XAxis dataKey="distance" stroke="#666" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} hide />
                <YAxis 
                  stroke="#666" 
                  tick={{ fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                  domain={[0, 100]}
                  tickFormatter={(value) => Math.round(value).toString()}
                  label={{ value: '%', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#666' } }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #00E5CC', borderRadius: '8px', fontSize: '10px' }}
                  labelFormatter={(label) => `${Math.round(parseFloat(label))}m`}
                  formatter={(value: any, name: string) => [value > 0 ? 'ON' : 'OFF', name]}
                />
                
                <Line type="stepAfter" dataKey="brake1" stroke={driver1Color} strokeWidth={1.5} dot={false} name={driver1} />
                <Line type="stepAfter" dataKey="brake2" stroke={driver2Color} strokeWidth={1.5} dot={false} name={driver2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* RPM */}
          <div className="border-b border-metrik-turquoise/20 relative">
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1">
              <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-orange-500 rounded" />
              <h3 className="text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-turquoise uppercase">RPM</h3>
            </div>
            <SectorLabels />
            {loading && <SkeletonChart />}
            <ResponsiveContainer width="100%" height={150} className="sm:!h-[200px]">
              <LineChart data={telemetryChartData} syncId="telemetry" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333333" vertical={false} horizontal={true} />
                <XAxis dataKey="distance" stroke="#666" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} hide />
                <YAxis 
                  stroke="#666" 
                  tick={{ fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                  domain={[8000, 12000]}
                  tickFormatter={(value) => Math.round(value).toString()}
                  label={{ value: 'RPM', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#666' } }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #00E5CC', borderRadius: '8px', fontSize: '10px' }}
                  labelFormatter={(label) => `${Math.round(parseFloat(label))}m`}
                  formatter={(value: any, name: string) => [Math.round(parseFloat(value)).toString() + ' RPM', name]}
                />
                
                <Line type="monotone" dataKey="rpm1" stroke={driver1Color} strokeWidth={1.5} dot={false} name={driver1} />
                <Line type="monotone" dataKey="rpm2" stroke={driver2Color} strokeWidth={1.5} dot={false} name={driver2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gear */}
          <div className="relative">
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1">
              <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-purple-500 rounded" />
              <h3 className="text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-turquoise uppercase">Gear</h3>
            </div>
            <SectorLabels />
            {loading && <SkeletonChart />}
            <ResponsiveContainer width="100%" height={150} className="sm:!h-[200px]">
              <LineChart data={telemetryChartData} syncId="telemetry" margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333333" vertical={false} horizontal={true} />
                <XAxis 
                  dataKey="distance" 
                  stroke="#666" 
                  tick={{ fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => Math.round(value).toString()}
                  label={{ value: 'Distance (m)', position: 'insideBottom', offset: -10, style: { fontSize: 10, fill: '#666' } }}
                />
                <YAxis 
                  stroke="#666" 
                  tick={{ fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                  domain={[1, 8]}
                  ticks={[1, 2, 3, 4, 5, 6, 7, 8]}
                  label={{ value: 'Gear', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#666' } }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #00E5CC', borderRadius: '8px', fontSize: '10px' }}
                  labelFormatter={(label) => `${Math.round(parseFloat(label))}m`}
                  formatter={(value: any, name: string) => [Math.round(parseFloat(value)).toString(), name]}
                />
                
                <Line type="stepAfter" dataKey="gear1" stroke={driver1Color} strokeWidth={1.5} dot={false} name={driver1} />
                <Line type="stepAfter" dataKey="gear2" stroke={driver2Color} strokeWidth={1.5} dot={false} name={driver2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}