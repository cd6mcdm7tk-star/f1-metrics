import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  text = 'Loading...',
  fullScreen = false 
}) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-16 h-16',
    large: 'w-24 h-24'
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div 
          className={`${sizeClasses[size]} border-4 border-metrik-surface rounded-full`}
        ></div>
        <div 
          className={`${sizeClasses[size]} border-4 border-metrik-turquoise border-t-transparent rounded-full absolute top-0 left-0 animate-spin`}
          style={{ animationDuration: '0.8s' }}
        ></div>
        <div 
          className={`${sizeClasses[size]} border-2 border-metrik-turquoise/30 border-b-transparent rounded-full absolute top-0 left-0 animate-spin`}
          style={{ animationDuration: '1.2s', animationDirection: 'reverse' }}
        ></div>
      </div>
      {text && (
        <p className={`${textSizeClasses[size]} text-metrik-silver/60 font-light tracking-wider animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-metrik-black/95 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;