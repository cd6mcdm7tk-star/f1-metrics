import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface SessionSelectorProps {
  selectedSession: string;
  onSelectSession: (session: string) => void;
}

const sessions = [
  { code: 'Q', name: 'Qualifying' },
  { code: 'R', name: 'Race' },
];

export default function SessionSelector({ selectedSession, onSelectSession }: SessionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedSessionData = sessions.find(s => s.code === selectedSession);

  return (
    <div className="relative">
      <label className="block text-sm font-rajdhani text-metrik-silver mb-2 tracking-wide">
        SESSION
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-metrik-black/50 border border-metrik-turquoise/30 rounded-lg text-left flex items-center justify-between hover:border-metrik-turquoise transition-colors"
      >
        <div>
          <div className="text-white font-rajdhani font-bold">
            {selectedSessionData?.name || 'Select Session'}
          </div>
          <div className="text-xs text-metrik-silver font-inter">
            {selectedSessionData?.code}
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`text-metrik-turquoise transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-2 bg-metrik-black/95 border border-metrik-turquoise/30 rounded-lg shadow-2xl">
            {sessions.map((session) => (
              <button
                key={session.code}
                onClick={() => {
                  onSelectSession(session.code);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 flex items-center justify-between hover:bg-metrik-turquoise/10 transition-colors border-b border-metrik-turquoise/10 last:border-b-0 ${
                  session.code === selectedSession ? 'bg-metrik-turquoise/20' : ''
                }`}
              >
                <div className="text-left">
                  <div className="text-white font-rajdhani font-bold">
                    {session.name}
                  </div>
                  <div className="text-xs text-metrik-silver font-inter">
                    {session.code}
                  </div>
                </div>
                {session.code === selectedSession && (
                  <div className="w-2 h-2 bg-metrik-turquoise rounded-full" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}