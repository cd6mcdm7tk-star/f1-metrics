import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  onClose: (id: string) => void;
  duration?: number;
}

export default function Toast({ id, type, message, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const icons = {
    error: <AlertCircle size={20} strokeWidth={2} />,
    success: <CheckCircle size={20} strokeWidth={2} />,
    warning: <AlertTriangle size={20} strokeWidth={2} />,
    info: <Info size={20} strokeWidth={2} />,
  };

  const styles = {
    error: 'bg-metrik-error/10 border-metrik-error text-metrik-error',
    success: 'bg-metrik-success/10 border-metrik-success text-metrik-success',
    warning: 'bg-metrik-warning/10 border-metrik-warning text-metrik-warning',
    info: 'bg-metrik-turquoise/10 border-metrik-turquoise text-metrik-turquoise',
  };

  return (
    <div
      className={`
        ${styles[type]}
        border-2 rounded-lg p-4 pr-12 shadow-2xl
        animate-slide-in-right
        relative
        min-w-[320px] max-w-md
        backdrop-blur-sm
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {icons[type]}
        </div>
        <div className="flex-1">
          <p className="font-rajdhani font-bold text-sm tracking-wide mb-1 uppercase">
            {type === 'error' && 'ERREUR SYSTÈME'}
            {type === 'success' && 'OPÉRATION RÉUSSIE'}
            {type === 'warning' && 'ATTENTION'}
            {type === 'info' && 'INFORMATION'}
          </p>
          <p className="text-metrik-text font-inter text-sm">
            {message}
          </p>
        </div>
        <button
          onClick={() => onClose(id)}
          className="absolute top-3 right-3 text-metrik-text-secondary hover:text-metrik-text transition-colors"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}