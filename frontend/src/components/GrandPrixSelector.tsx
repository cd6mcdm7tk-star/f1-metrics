import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { SkeletonDropdown } from './SkeletonLoader';
import { getGrandsPrix } from '../services/backend.service';

interface GrandPrix {
  round: number;
  name: string;
  location: string;
  country: string;
  flag: string;
}

interface GrandPrixSelectorProps {
  year: number;
  selectedRound: number;
  onSelect: (round: number) => void;
}

const getCountryFlag = (country: string): string => {
  const flags: Record<string, string> = {
    'Bahrain': '🇧🇭',
    'Saudi Arabia': '🇸🇦',
    'Australia': '🇦🇺',
    'Japan': '🇯🇵',
    'China': '🇨🇳',
    'USA': '🇺🇸',
    'Italy': '🇮🇹',
    'Monaco': '🇲🇨',
    'Canada': '🇨🇦',
    'Spain': '🇪🇸',
    'Austria': '🇦🇹',
    'UK': '🇬🇧',
    'Great Britain': '🇬🇧',
    'Hungary': '🇭🇺',
    'Belgium': '🇧🇪',
    'Netherlands': '🇳🇱',
    'Azerbaijan': '🇦🇿',
    'Singapore': '🇸🇬',
    'Mexico': '🇲🇽',
    'Brazil': '🇧🇷',
    'UAE': '🇦🇪',
    'Qatar': '🇶🇦',
    'United States': '🇺🇸',
  };
  return flags[country] || '🏁';
};

export default function GrandPrixSelector({ year, selectedRound, onSelect }: GrandPrixSelectorProps) {
  const [grandsPrix, setGrandsPrix] = useState<GrandPrix[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    loadGrandsPrixData();
  }, [year]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

  const loadGrandsPrixData = async () => {
    try {
      setLoading(true);
      const data = await getGrandsPrix(year);
      
      const formattedData = data.grands_prix.map((gp: any) => ({
        round: gp.round,
        name: gp.name,
        location: gp.location,
        country: gp.country,
        flag: getCountryFlag(gp.country)
      }));
      
      setGrandsPrix(formattedData);
      setLoading(false);
    } catch (err) {
      console.error('Erreur chargement GP:', err);
      setLoading(false);
    }
  };

  const selectedGP = grandsPrix.find(gp => gp.round === selectedRound);

  if (loading) {
    return <SkeletonDropdown />;
  }

  return (
    <>
      <div className="relative">
        <label className="block text-sm font-rajdhani text-metrik-silver mb-2 tracking-wide">
          GRAND PRIX
        </label>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 bg-metrik-black/50 border border-metrik-turquoise/30 rounded-lg text-left flex items-center justify-between hover:border-metrik-turquoise transition-colors"
        >
          {selectedGP ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedGP.flag}</span>
              <div>
                <div className="text-white font-rajdhani font-bold">
                  {selectedGP.name}
                </div>
                <div className="text-xs text-metrik-silver font-inter">
                  Round {selectedGP.round} • {selectedGP.location}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-metrik-silver font-rajdhani">Sélectionnez un Grand Prix</span>
          )}
          <ChevronDown
            size={20}
            className={`text-metrik-turquoise transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={() => setIsOpen(false)}
          />
          
          <div
            className="fixed bg-metrik-black/95 border border-metrik-turquoise/30 rounded-lg shadow-2xl max-h-96 overflow-y-auto backdrop-blur-sm"
            style={{
              zIndex: 9999,
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`
            }}
          >
            {grandsPrix.map((gp) => (
              <button
                key={gp.round}
                onClick={() => {
                  onSelect(gp.round);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-metrik-turquoise/10 transition-colors border-b border-metrik-turquoise/10 last:border-b-0 ${
                  gp.round === selectedRound ? 'bg-metrik-turquoise/20' : ''
                }`}
              >
                <span className="text-2xl">{gp.flag}</span>
                <div className="flex-1 text-left">
                  <div className="text-white font-rajdhani font-bold">
                    {gp.name}
                  </div>
                  <div className="text-xs text-metrik-silver font-inter">
                    Round {gp.round} • {gp.location}, {gp.country}
                  </div>
                </div>
                {gp.round === selectedRound && (
                  <div className="w-2 h-2 bg-metrik-turquoise rounded-full" />
                )}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
}