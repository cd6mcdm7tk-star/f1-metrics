import { useEffect, useState } from 'react';
import { Trophy, Zap, Gauge } from 'lucide-react';

interface EasterEggProps {
  onClose: () => void;
}

export default function EasterEgg({ onClose }: EasterEggProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onClose, 500);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none transition-opacity duration-500 ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="absolute inset-0 bg-metrik-black/80 backdrop-blur-md pointer-events-auto" onClick={onClose} />
      
      <div className={`relative z-10 bg-gradient-to-br from-metrik-turquoise via-cyan-400 to-metrik-turquoise p-8 rounded-2xl shadow-2xl transform transition-all duration-500 ${
        show ? 'scale-100 rotate-0' : 'scale-0 rotate-180'
      }`}>
        <div className="text-center space-y-6">
          <div className="flex justify-center gap-4 mb-4">
            <Trophy className="text-metrik-black animate-bounce" size={48} style={{ animationDelay: '0ms' }} />
            <Zap className="text-metrik-black animate-bounce" size={48} style={{ animationDelay: '200ms' }} />
            <Gauge className="text-metrik-black animate-bounce" size={48} style={{ animationDelay: '400ms' }} />
          </div>
          
          <h1 className="text-5xl font-rajdhani font-black text-metrik-black">
            SUPER F1 MODE
          </h1>
          
          <p className="text-xl font-rajdhani font-bold text-metrik-black/80">
            🏎️ ACTIVATED! 🏎️
          </p>
          
          <div className="bg-metrik-black/20 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-sm font-inter text-metrik-black">
              You found the secret! 🎉
            </p>
            <p className="text-xs font-inter text-metrik-black/70 mt-2">
              Konami Code Master Unlocked
            </p>
          </div>
          
          <div className="flex gap-2 justify-center flex-wrap">
            {['VER', 'HAM', 'LEC', 'NOR', 'SAI'].map((driver, i) => (
              <div
                key={driver}
                className="px-4 py-2 bg-metrik-black/30 rounded-lg font-rajdhani font-bold text-metrik-black animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {driver}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Confetti effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-metrik-turquoise rounded-full animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1 + Math.random()}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}