import { hasSprintWeekend } from '../data/sprintWeekends';

interface SessionTypeSelectorProps {
  sessionType: string;
  onSessionTypeChange: (sessionType: string) => void;
  year: number;           // 🔥 NOUVEAU
  selectedRound: number;  // 🔥 NOUVEAU
}

// Sessions de base
const BASE_SESSION_TYPES = [
  { value: 'Q', label: 'Qualifying' },
  { value: 'R', label: 'Race' },
];

// Sessions Sprint
const SPRINT_SESSION_TYPES = [
  { value: 'SQ', label: 'Sprint Shootout', icon: '🏁' },
  { value: 'S', label: 'Sprint', icon: '⚡' },
];

export default function SessionTypeSelector({
  sessionType,
  onSessionTypeChange,
  year,
  selectedRound,
}: SessionTypeSelectorProps) {
  
  // 🔥 Déterminer si c'est un Sprint Weekend
  const isSprintWeekend = hasSprintWeekend(year, selectedRound);
  
  const availableSessionTypes = isSprintWeekend 
    ? [...BASE_SESSION_TYPES, ...SPRINT_SESSION_TYPES]
    : BASE_SESSION_TYPES;

  return (
    <div>
      <label className="block text-sm font-rajdhani text-metrik-silver mb-2 tracking-wide">
        SESSION TYPE
        {isSprintWeekend && (
          <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full">
            ⚡ Sprint Weekend
          </span>
        )}
      </label>
      <div className="flex gap-2 flex-wrap">
        {availableSessionTypes.map((session) => (
          <button
  key={session.value}
  onClick={() => onSessionTypeChange(session.value)}
  className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg font-rajdhani font-bold transition-all ${
    sessionType === session.value
      ? 'bg-metrik-turquoise text-metrik-black'
      : 'bg-metrik-black/50 border border-metrik-turquoise/30 text-metrik-silver hover:border-metrik-turquoise'
  }`}
>
  {/* 🔥 FIX : Vérifier si icon existe */}
  {'icon' in session ? `${session.icon} ` : ''}{session.label}
</button>
        ))}
      </div>
    </div>
  );
}