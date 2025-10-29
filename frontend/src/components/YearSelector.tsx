import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Calendar } from 'lucide-react';

interface YearSelectorProps {
  selectedYear: number;
  onSelectYear: (year: number) => void;
  minYear?: number;
  maxYear?: number;
}

export default function YearSelector({ 
  selectedYear, 
  onSelectYear,
  minYear = 2018,
  maxYear = 2025
}: YearSelectorProps) {
  // Generate years array dynamically from maxYear down to minYear
  const years = Array.from(
    { length: maxYear - minYear + 1 }, 
    (_, i) => maxYear - i
  );

  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

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

  return (
    <>
      <div className="relative">
        <label className="block text-sm font-rajdhani text-metrik-silver mb-2 tracking-wide">
          YEAR
        </label>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 bg-metrik-black/50 border border-metrik-turquoise/30 rounded-lg text-left flex items-center justify-between hover:border-metrik-turquoise transition-colors"
        >
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-metrik-turquoise" />
            <span className="text-white font-rajdhani font-bold text-lg">
              {selectedYear}
            </span>
          </div>
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
            {years.map((year) => (
              <button
                key={year}
                onClick={() => {
                  onSelectYear(year);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 flex items-center justify-between hover:bg-metrik-turquoise/10 transition-colors border-b border-metrik-turquoise/10 last:border-b-0 ${
                  year === selectedYear ? 'bg-metrik-turquoise/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-metrik-turquoise" />
                  <span className="text-white font-rajdhani font-bold text-lg">
                    {year}
                  </span>
                </div>
                {year === selectedYear && (
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