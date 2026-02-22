import { useRateLimit } from '../hooks/useSubscription';
import { X } from 'lucide-react';
import { useState } from 'react';

export default function RateLimitBanner() {
  const { requestCount, dailyLimit, isUnlimited } = useRateLimit();
  const [dismissed, setDismissed] = useState(false);

  // Ne pas afficher si unlimited ou dismissed
  if (isUnlimited || dismissed) return null;

  const remaining = dailyLimit - requestCount;
  const percentage = (requestCount / dailyLimit) * 100;

  // Ne pas afficher si encore beaucoup de requêtes restantes
  if (remaining > 8) return null;

  // Couleur selon remaining
  let bgColor = 'bg-yellow-500/10';
  let borderColor = 'border-yellow-500/30';
  let textColor = 'text-yellow-500';

  if (remaining <= 3) {
    bgColor = 'bg-red-500/10';
    borderColor = 'border-red-500/30';
    textColor = 'text-red-500';
  }

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-4 mb-6 relative`}>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-metrik-silver hover:text-white"
      >
        <X size={16} />
      </button>

      <div className="flex items-center justify-between mb-2">
        <span className="font-rajdhani font-bold">
          {remaining} request{remaining !== 1 ? 's' : ''} remaining today
        </span>
        <span className={`font-rajdhani font-bold ${textColor}`}>
          {requestCount}/{dailyLimit}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-metrik-black/50 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            remaining <= 3 ? 'bg-red-500' : 'bg-yellow-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-sm text-metrik-silver">
        Upgrade to <span className="text-metrik-turquoise font-bold">METRIK+</span> for unlimited requests
      </p>
    </div>
  );
}