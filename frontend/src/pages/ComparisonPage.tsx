import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function ComparisonPage() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-metrik-black via-gray-900 to-metrik-black">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-metrik-silver hover:text-metrik-turquoise transition-colors mb-8 font-rajdhani"
        >
          <ArrowLeft size={20} />
          BACK TO HOME
        </button>
        
        <div className="text-center">
          <h1 className="text-6xl font-rajdhani font-black mb-3 bg-gradient-to-r from-metrik-turquoise via-white to-metrik-silver bg-clip-text text-transparent">
            COMPARISON
          </h1>
          <p className="text-metrik-silver text-lg">Coming Soon...</p>
        </div>
      </div>
    </div>
  );
}
