import { Play, Pause, RotateCcw } from 'lucide-react';

interface AnimationControlsProps {
  isPlaying: boolean;
  speed: number;
  onPlayPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

const SPEED_OPTIONS = [1, 2, 4, 8, 16];

export default function AnimationControls({
  isPlaying,
  speed,
  onPlayPause,
  onReset,
  onSpeedChange,
}: AnimationControlsProps) {
  return (
    <div className="flex items-center gap-4 bg-metrik-black/50 backdrop-blur-sm border border-metrik-turquoise/20 rounded-lg p-4">
      <button
        onClick={onPlayPause}
        className="flex items-center gap-2 px-4 py-2 bg-metrik-turquoise text-metrik-black rounded-lg hover:bg-metrik-turquoise/80 transition-all font-rajdhani font-bold"
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        {isPlaying ? 'PAUSE' : 'PLAY'}
      </button>

      <button
        onClick={onReset}
        className="flex items-center gap-2 px-4 py-2 bg-metrik-silver/20 text-metrik-silver rounded-lg hover:bg-metrik-silver/30 transition-all font-rajdhani font-bold"
      >
        <RotateCcw size={20} />
        RESET
      </button>

      <div className="flex items-center gap-2 ml-4">
        <span className="text-metrik-silver text-sm font-rajdhani">SPEED:</span>
        <div className="flex gap-1">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-3 py-1 rounded font-rajdhani font-bold transition-all ${
                speed === s
                  ? 'bg-metrik-turquoise text-metrik-black'
                  : 'bg-metrik-silver/20 text-metrik-silver hover:bg-metrik-silver/30'
              }`}
            >
              x{s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}