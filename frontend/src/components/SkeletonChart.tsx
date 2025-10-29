import React from 'react';

interface SkeletonChartProps {
  type?: 'line' | 'bar' | 'area';
  height?: string;
  title?: boolean;
}

const SkeletonChart: React.FC<SkeletonChartProps> = ({ 
  type = 'line',
  height = 'h-80',
  title = true 
}) => {
  return (
    <div className={`${height} bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 relative overflow-hidden`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
      
      {title && (
        <div className="h-6 bg-metrik-silver/10 rounded w-48 mb-6 animate-pulse"></div>
      )}
      
      <div className="flex items-end justify-between h-full gap-2 pb-8 pt-4">
        {type === 'bar' && (
          <>
            {[60, 80, 45, 90, 70, 85, 55, 75, 95, 65].map((height, i) => (
              <div 
                key={i}
                className="flex-1 bg-metrik-turquoise/20 rounded-t animate-pulse"
                style={{ 
                  height: `${height}%`,
                  animationDelay: `${i * 0.1}s`
                }}
              ></div>
            ))}
          </>
        )}
        
        {type === 'line' && (
          <div className="w-full h-full relative">
            <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
              <polyline
                points="0,150 40,120 80,140 120,80 160,100 200,60 240,90 280,70 320,110 360,50 400,80"
                fill="none"
                stroke="rgba(0, 229, 204, 0.3)"
                strokeWidth="3"
                className="animate-pulse"
              />
              <polyline
                points="0,150 40,120 80,140 120,80 160,100 200,60 240,90 280,70 320,110 360,50 400,80"
                fill="url(#gradient)"
                opacity="0.2"
                className="animate-pulse"
                style={{ animationDelay: '0.2s' }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(0, 229, 204, 0.4)" />
                  <stop offset="100%" stopColor="rgba(0, 229, 204, 0)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}
        
        {type === 'area' && (
          <div className="w-full h-full relative">
            <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
              <path
                d="M0,150 Q100,100 200,120 T400,80 L400,200 L0,200 Z"
                fill="url(#areaGradient)"
                className="animate-pulse"
              />
              <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(0, 229, 204, 0.3)" />
                  <stop offset="100%" stopColor="rgba(0, 229, 204, 0.05)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}
      </div>
      
      <div className="absolute bottom-6 left-6 right-6 flex justify-between">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i}
            className="h-3 bg-metrik-silver/5 rounded w-12 animate-pulse"
            style={{ animationDelay: `${i * 0.05}s` }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default SkeletonChart;