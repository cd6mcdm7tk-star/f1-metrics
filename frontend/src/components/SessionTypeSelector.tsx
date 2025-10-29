interface SessionTypeSelectorProps {
  sessionType: string;
  onSessionTypeChange: (sessionType: string) => void;
}

const SESSION_TYPES = [
  { value: 'Q', label: 'Qualifying' },
  { value: 'R', label: 'Race' },
];

export default function SessionTypeSelector({
  sessionType,
  onSessionTypeChange,
}: SessionTypeSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-rajdhani text-metrik-silver mb-2 tracking-wide">
        SESSION TYPE
      </label>
      <div className="flex gap-2">
        {SESSION_TYPES.map((session) => (
          <button
            key={session.value}
            onClick={() => onSessionTypeChange(session.value)}
            className={`flex-1 px-4 py-3 rounded-lg font-rajdhani font-bold transition-all ${
              sessionType === session.value
                ? 'bg-metrik-turquoise text-metrik-black'
                : 'bg-metrik-black/50 border border-metrik-turquoise/30 text-metrik-silver hover:border-metrik-turquoise'
            }`}
          >
            {session.label}
          </button>
        ))}
      </div>
    </div>
  );
}