import React from 'react';

interface SkeletonCardProps {
  variant?: 'default' | 'wide' | 'tall';
  showIcon?: boolean;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ 
  variant = 'default',
  showIcon = true 
}) => {
  const variantClasses = {
    default: 'h-64',
    wide: 'h-48 col-span-2',
    tall: 'h-96'
  };

  return (
    <div 
      className={`${variantClasses[variant]} bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 relative overflow-hidden`}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
      
      <div className="flex flex-col h-full">
        {showIcon && (
          <div className="w-12 h-12 bg-metrik-turquoise/10 rounded-lg mb-4 animate-pulse"></div>
        )}
        
        <div className="h-6 bg-metrik-silver/10 rounded w-3/4 mb-3 animate-pulse"></div>
        
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-metrik-silver/5 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-metrik-silver/5 rounded w-5/6 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
          <div className="h-4 bg-metrik-silver/5 rounded w-4/6 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        </div>
        
        <div className="mt-auto pt-4">
          <div className="h-10 bg-metrik-turquoise/10 rounded-lg w-32 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;