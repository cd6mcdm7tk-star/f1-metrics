import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selectedSessionData = sessions.find(s => s.code === selectedSession);

  // Calculer position du dropdown
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Fermer si clic dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        // Vérifier si le clic est dans le dropdown
        const dropdown = document.getElementById('session-dropdown');
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const dropdownContent = isOpen ? (
    <div
      id="session-dropdown"
      style={{
        position: 'absolute',
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        zIndex: 99999,
      }}
      className="bg-metrik-black/98 border border-metrik-turquoise/30 rounded-lg shadow-2xl backdrop-blur-sm overflow-hidden"
    >
      {sessions.map((session) => (
        <button
          key={session.code}
          type="button"
          onClick={() => {
            onSelectSession(session.code);
            setIsOpen(false);
          }}
          className={`w-full px-4 py-3 min-h-[48px] flex items-center justify-between 
                     hover:bg-metrik-turquoise/10 active:bg-metrik-turquoise/20 
                     transition-colors border-b border-metrik-turquoise/10 
                     last:border-b-0 touch-manipulation ${
                       session.code === selectedSession ? 'bg-metrik-turquoise/20' : ''
                     }`}
        >
          <div className="text-left flex-1 min-w-0">
            <div className="text-white font-rajdhani font-bold truncate">
              {session.name}
            </div>
            <div className="text-xs text-metrik-silver font-inter">
              {session.code}
            </div>
          </div>
          
          {session.code === selectedSession && (
            <div className="w-2 h-2 bg-metrik-turquoise rounded-full flex-shrink-0 ml-2" />
          )}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <>
      <div className="relative">
        <label className="block text-sm font-rajdhani text-metrik-silver mb-2 tracking-wide">
          SESSION
        </label>
        
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 min-h-[48px] bg-metrik-black/50 border border-metrik-turquoise/30 
                     rounded-lg text-left flex items-center justify-between 
                     hover:border-metrik-turquoise transition-colors touch-manipulation"
        >
          <div className="flex-1 min-w-0">
            <div className="text-white font-rajdhani font-bold truncate">
              {selectedSessionData?.name || 'Select Session'}
            </div>
            <div className="text-xs text-metrik-silver font-inter">
              {selectedSessionData?.code}
            </div>
          </div>
          
          <ChevronDown
            size={20}
            className={`text-metrik-turquoise transition-transform flex-shrink-0 ml-2 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Portal pour le dropdown */}
      {isOpen && createPortal(dropdownContent, document.body)}
    </>
  );
}