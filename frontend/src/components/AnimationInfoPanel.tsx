import type { DriverInfo } from '../types/animation';

interface AnimationInfoPanelProps {
  driver1: string;
  driver2: string;
  driver1Info: DriverInfo;
  driver2Info: DriverInfo;
  currentGap: number;
  driver1Speed: number;
  driver2Speed: number;
  driver1Gear: number;
  driver2Gear: number;
  driver1Throttle: number;
  driver2Throttle: number;
  driver1Brake: boolean;
  driver2Brake: boolean;
  driver1DRS: number;
  driver2DRS: number;
  progress: number;
}

export default function AnimationInfoPanel({
  driver1,
  driver2,
  driver1Info,
  driver2Info,
  currentGap,
  driver1Speed,
  driver2Speed,
  driver1Gear,
  driver2Gear,
  driver1Throttle,
  driver2Throttle,
  driver1Brake,
  driver2Brake,
  driver1DRS,
  driver2DRS,
  progress,
}: AnimationInfoPanelProps) {
  const gapText = currentGap >= 0 
    ? `+${currentGap.toFixed(3)}s` 
    : `${currentGap.toFixed(3)}s`;
  
  const leader = currentGap >= 0 ? driver2 : driver1;

  return (
    <div className="bg-metrik-black/50 backdrop-blur-sm border border-metrik-turquoise/20 rounded-lg p-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-rajdhani font-bold text-metrik-turquoise">
              {driver1}
            </h3>
            <span className="text-sm text-metrik-silver">{driver1Info.team}</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-metrik-silver text-sm">Speed:</span>
              <span className="text-white font-rajdhani font-bold">{driver1Speed.toFixed(0)} km/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-metrik-silver text-sm">Gear:</span>
              <span className="text-white font-rajdhani font-bold">{driver1Gear}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-metrik-silver text-sm">Throttle:</span>
              <span className="text-white font-rajdhani font-bold">{driver1Throttle.toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-metrik-silver text-sm">Brake:</span>
              <span className={`font-rajdhani font-bold ${driver1Brake ? 'text-red-500' : 'text-metrik-silver'}`}>
                {driver1Brake ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-metrik-silver text-sm">DRS:</span>
              <span className={`font-rajdhani font-bold ${driver1DRS > 0 ? 'text-green-500' : 'text-metrik-silver'}`}>
                {driver1DRS > 0 ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-metrik-silver text-sm">Tyre:</span>
              <span className="text-white font-rajdhani font-bold">{driver1Info.compound}</span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-rajdhani font-bold text-metrik-turquoise">
              {driver2}
            </h3>
            <span className="text-sm text-metrik-silver">{driver2Info.team}</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-metrik-silver text-sm">Speed:</span>
              <span className="text-white font-rajdhani font-bold">{driver2Speed.toFixed(0)} km/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-metrik-silver text-sm">Gear:</span>
              <span className="text-white font-rajdhani font-bold">{driver2Gear}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-metrik-silver text-sm">Throttle:</span>
              <span className="text-white font-rajdhani font-bold">{driver2Throttle.toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-metrik-silver text-sm">Brake:</span>
              <span className={`font-rajdhani font-bold ${driver2Brake ? 'text-red-500' : 'text-metrik-silver'}`}>
                {driver2Brake ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-metrik-silver text-sm">DRS:</span>
              <span className={`font-rajdhani font-bold ${driver2DRS > 0 ? 'text-green-500' : 'text-metrik-silver'}`}>
                {driver2DRS > 0 ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-metrik-silver text-sm">Tyre:</span>
              <span className="text-white font-rajdhani font-bold">{driver2Info.compound}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-metrik-turquoise/20">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-metrik-silver text-sm">Gap:</span>
            <span className="ml-2 text-xl font-rajdhani font-bold text-metrik-turquoise">
              {gapText}
            </span>
          </div>
          <div>
            <span className="text-metrik-silver text-sm">Leader:</span>
            <span className="ml-2 text-xl font-rajdhani font-bold text-metrik-gold">
              {leader}
            </span>
          </div>
          <div>
            <span className="text-metrik-silver text-sm">Progress:</span>
            <span className="ml-2 text-xl font-rajdhani font-bold text-white">
              {progress.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}