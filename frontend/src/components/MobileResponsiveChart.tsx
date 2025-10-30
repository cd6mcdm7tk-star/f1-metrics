import { ResponsiveContainer } from 'recharts';
import { ReactNode } from 'react';

interface MobileResponsiveChartProps {
  children: ReactNode;
  height?: number;
  mobileHeight?: number;
  className?: string;
}

export const MobileResponsiveChart: React.FC<MobileResponsiveChartProps> = ({
  children,
  height = 400,
  mobileHeight,
  className = '',
}) => {
  // Calcul hauteur responsive
  const finalMobileHeight = mobileHeight || Math.max(250, height * 0.65);
  
  return (
    <div className={className}>
      {/* Desktop */}
      <div className="hidden md:block">
        <ResponsiveContainer width="100%" height={height}>
          {children}
        </ResponsiveContainer>
      </div>
      
      {/* Mobile */}
      <div className="block md:hidden">
        <ResponsiveContainer width="100%" height={finalMobileHeight}>
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
};