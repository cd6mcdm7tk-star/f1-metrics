interface TelemetryPoint {
  x: number;
  y: number;
  speed: number;
  throttle: number;
  brake: boolean;
  gear: number;
  drs: number;
  time: number;
}

interface ResampledData {
  driver1: TelemetryPoint[];
  driver2: TelemetryPoint[];
  fps: number;
  totalFrames: number;
  duration: number;
}

/**
 * Interpole linéairement entre deux points
 */
function interpolatePoint(
  before: TelemetryPoint,
  after: TelemetryPoint,
  targetTime: number
): TelemetryPoint {
  const timeDiff = after.time - before.time;
  
  // Protection contre division par zéro
  if (timeDiff === 0) {
    return { ...before };
  }
  
  // Ratio d'interpolation (0 = before, 1 = after)
  const t = (targetTime - before.time) / timeDiff;
  
  // Interpolation linéaire pure
  return {
    x: before.x + (after.x - before.x) * t,
    y: before.y + (after.y - before.y) * t,
    speed: before.speed + (after.speed - before.speed) * t,
    throttle: before.throttle + (after.throttle - before.throttle) * t,
    brake: t < 0.5 ? before.brake : after.brake,
    gear: Math.round(before.gear + (after.gear - before.gear) * t),
    drs: t < 0.5 ? before.drs : after.drs,
    time: targetTime
  };
}

/**
 * Trouve les deux points encadrant un timestamp donné
 */
function findBracketingPoints(
  telemetry: TelemetryPoint[],
  targetTime: number
): { before: TelemetryPoint; after: TelemetryPoint } {
  // Si avant le début
  if (targetTime <= telemetry[0].time) {
    return { before: telemetry[0], after: telemetry[0] };
  }
  
  // Si après la fin
  if (targetTime >= telemetry[telemetry.length - 1].time) {
    const last = telemetry[telemetry.length - 1];
    return { before: last, after: last };
  }
  
  // Recherche binaire pour trouver les points encadrants
  let left = 0;
  let right = telemetry.length - 1;
  
  while (left < right - 1) {
    const mid = Math.floor((left + right) / 2);
    if (telemetry[mid].time <= targetTime) {
      left = mid;
    } else {
      right = mid;
    }
  }
  
  return {
    before: telemetry[left],
    after: telemetry[right]
  };
}

/**
 * 🔥 FONCTION PRINCIPALE - Resample à 60 FPS
 */
export function resampleTelemetryTo60FPS(
  driver1Telemetry: TelemetryPoint[],
  driver2Telemetry: TelemetryPoint[],
  lapTime1: number,
  lapTime2: number
): ResampledData {
  const FPS = 60;
  const frameDuration = 1 / FPS; // 0.01667s
  
  // Déterminer la durée maximale
  const maxDuration = Math.max(lapTime1, lapTime2);
  
  // Calculer le nombre de frames nécessaires
  const totalFrames = Math.ceil(maxDuration * FPS);
  
  console.log('🔄 Resampling telemetry to 60 FPS...');
  console.log(`   Duration: ${maxDuration.toFixed(3)}s`);
  console.log(`   Frames: ${totalFrames}`);
  console.log(`   Driver 1: ${driver1Telemetry.length} → ${totalFrames} points`);
  console.log(`   Driver 2: ${driver2Telemetry.length} → ${totalFrames} points`);
  
  // Créer les tableaux resamplésnp
  const resampledDriver1: TelemetryPoint[] = [];
  const resampledDriver2: TelemetryPoint[] = [];
  
  // Générer un point pour chaque frame
  for (let frame = 0; frame < totalFrames; frame++) {
    const targetTime = frame * frameDuration;
    
    // Trouver et interpoler pour driver 1
    const { before: before1, after: after1 } = findBracketingPoints(driver1Telemetry, targetTime);
    const point1 = interpolatePoint(before1, after1, targetTime);
    resampledDriver1.push(point1);
    
    // Trouver et interpoler pour driver 2
    const { before: before2, after: after2 } = findBracketingPoints(driver2Telemetry, targetTime);
    const point2 = interpolatePoint(before2, after2, targetTime);
    resampledDriver2.push(point2);
  }
  
  console.log('✅ Resampling complete!');
  
  return {
    driver1: resampledDriver1,
    driver2: resampledDriver2,
    fps: FPS,
    totalFrames,
    duration: maxDuration
  };
}

/**
 * 🎯 VERSION OPTIMISÉE - Avec cache pour éviter recherches répétées
 */
export function resampleTelemetryTo60FPSOptimized(
  driver1Telemetry: TelemetryPoint[],
  driver2Telemetry: TelemetryPoint[],
  lapTime1: number,
  lapTime2: number
): ResampledData {
  const FPS = 60;
  const frameDuration = 1 / FPS;
  const maxDuration = Math.max(lapTime1, lapTime2);
  const totalFrames = Math.ceil(maxDuration * FPS);
  
  console.log('🔄 Resampling telemetry to 60 FPS (optimized)...');
  
  const resampledDriver1: TelemetryPoint[] = [];
  const resampledDriver2: TelemetryPoint[] = [];
  
  // Indices de cache pour éviter recherches répétées
  let cache1Index = 0;
  let cache2Index = 0;
  
  for (let frame = 0; frame < totalFrames; frame++) {
    const targetTime = frame * frameDuration;
    
    // Driver 1 - Recherche optimisée avec cache
    while (
      cache1Index < driver1Telemetry.length - 1 &&
      driver1Telemetry[cache1Index + 1].time <= targetTime
    ) {
      cache1Index++;
    }
    
    const before1 = driver1Telemetry[cache1Index];
    const after1 = driver1Telemetry[Math.min(cache1Index + 1, driver1Telemetry.length - 1)];
    const point1 = interpolatePoint(before1, after1, targetTime);
    resampledDriver1.push(point1);
    
    // Driver 2 - Recherche optimisée avec cache
    while (
      cache2Index < driver2Telemetry.length - 1 &&
      driver2Telemetry[cache2Index + 1].time <= targetTime
    ) {
      cache2Index++;
    }
    
    const before2 = driver2Telemetry[cache2Index];
    const after2 = driver2Telemetry[Math.min(cache2Index + 1, driver2Telemetry.length - 1)];
    const point2 = interpolatePoint(before2, after2, targetTime);
    resampledDriver2.push(point2);
  }
  
  console.log('✅ Resampling complete (optimized)!');
  
  return {
    driver1: resampledDriver1,
    driver2: resampledDriver2,
    fps: FPS,
    totalFrames,
    duration: maxDuration
  };
}