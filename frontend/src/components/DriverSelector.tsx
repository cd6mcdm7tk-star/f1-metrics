import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, User } from 'lucide-react';

interface Driver {
  abbreviation: string;
  name?: string;
}

interface DriverSelectorProps {
  drivers: Driver[];
  selectedDriver: string;
  onSelectDriver: (driver: string) => void;
  label?: string;
}

export default function DriverSelector({
  drivers,
  selectedDriver,
  onSelectDriver,
  label = "Driver"
}: DriverSelectorProps) {
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

  const selected = drivers.find(d => d.abbreviation === selectedDriver);

  return (
    <>
      <div className="relative">
        <label className="block text-sm font-rajdhani text-metrik-silver mb-2 tracking-wide">
          {label.toUpperCase()}
        </label>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 bg-metrik-black/50 border border-metrik-turquoise/30 rounded-lg text-left flex items-center justify-between hover:border-metrik-turquoise transition-colors"
        >
          {selected ? (
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-metrik-turquoise" />
              <div>
                <div className="text-white font-rajdhani font-bold">
                  {selected.abbreviation}
                </div>
                {selected.name && (
                  <div className="text-xs text-metrik-silver font-inter">
                    {selected.name}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <span className="text-metrik-silver font-rajdhani">Select a driver</span>
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
            {drivers.map((driver) => (
              <button
                key={driver.abbreviation}
                onClick={() => {
                  onSelectDriver(driver.abbreviation);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-metrik-turquoise/10 transition-colors border-b border-metrik-turquoise/10 last:border-b-0 ${
                  driver.abbreviation === selectedDriver ? 'bg-metrik-turquoise/20' : ''
                }`}
              >
                <User className="w-4 h-4 text-metrik-turquoise" />
                <div className="flex-1 text-left">
                  <div className="text-white font-rajdhani font-bold">
                    {driver.abbreviation}
                  </div>
                  {driver.name && (
                    <div className="text-xs text-metrik-silver font-inter">
                      {driver.name}
                    </div>
                  )}
                </div>
                {driver.abbreviation === selectedDriver && (
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