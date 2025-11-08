import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Zap, TrendingUp, Trophy, FileText, Download, Gauge } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRateLimit } from '../hooks/useRateLimit';
import ContentTypeSelector from '../components/StudioPro/ContentTypeSelector';
import SimpleConfigPanel from '../components/StudioPro/SimpleConfigPanel';
import ExportPanelV2 from '../components/StudioPro/ExportPanel';
import UpgradeModal from '../components/UpgradeModal';
import SEO from '../components/SEO';

export type ContentType = 
  | 'track-telemetry'
  | 'race-pace'
  | 'head-to-head'
  | 'quali-table'
  | 'race-table';

// ✅ RENOMMÉ pour éviter conflit avec studio.ts
export interface SimpleStudioConfig {
  contentType: ContentType | null;
  year: number;
  round: number;
  drivers: string[];
  sessionType: 'Q'; 
}

export default function StudioProPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isUnlimited: hasAccess } = useRateLimit();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [config, setConfig] = useState<SimpleStudioConfig>({
    contentType: null,
    year: 2025,
    round: 1,
    drivers: [],
    sessionType: 'Q',
  });

  // If no access, show locked state
  if (!user || !hasAccess) {
    return (
      <>
        <SEO 
          path="/studio-pro"
          title="Studio Pro - Create F1 Content | METRIK DELTA"
          description="Professional F1 content generator. Create animated visualizations, race analysis tables, and social media content."
          keywords="f1 studio, f1 content creator, racing graphics, f1 social media"
        />

        <div className="min-h-screen bg-gradient-to-br from-metrik-black via-metrik-black to-metrik-turquoise/5 text-white relative overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-metrik-turquoise/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          {/* Content */}
          <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
            <div className="max-w-5xl w-full">
              
              {/* Header Icon + Badge */}
              <div className="flex flex-col items-center mb-8 md:mb-12">
                <div className="relative mb-6">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl backdrop-blur-xl bg-metrik-card/50 border border-metrik-turquoise/30 flex items-center justify-center shadow-2xl shadow-metrik-turquoise/20">
                    <Sparkles size={40} className="text-metrik-turquoise" />
                  </div>
                  <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-xs font-rajdhani font-black uppercase">
                    Premium
                  </div>
                </div>

                <h1 className="text-4xl md:text-7xl font-rajdhani font-black text-center mb-4 tracking-tight">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-metrik-turquoise via-cyan-400 to-blue-400">
                    STUDIO PRO
                  </span>
                </h1>
                
                <p className="text-lg md:text-2xl text-metrik-silver font-inter text-center max-w-2xl leading-relaxed">
                  Create broadcast-quality F1 content in seconds. <br className="hidden md:block" />
                  <span className="text-metrik-turquoise">Professional tools for serious fans.</span>
                </p>
              </div>

              {/* Features Grid - Modern Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10 md:mb-12">
                {[
                  { 
                    icon: Gauge,
                    title: 'Telemetry Sync', 
                    desc: 'Track visualization with synchronized telemetry data',
                    gradient: 'from-red-500/10 to-orange-500/10',
                    border: 'border-red-500/30',
                    iconColor: 'text-red-400'
                  },
                  { 
                    icon: TrendingUp,
                    title: 'Race Analysis', 
                    desc: 'Multi-driver pace comparison with stint visualization',
                    gradient: 'from-blue-500/10 to-cyan-500/10',
                    border: 'border-blue-500/30',
                    iconColor: 'text-blue-400'
                  },
                  { 
                    icon: Trophy,
                    title: 'Head-to-Head', 
                    desc: 'Complete season statistics between any two drivers',
                    gradient: 'from-amber-500/10 to-yellow-500/10',
                    border: 'border-amber-500/30',
                    iconColor: 'text-amber-400'
                  },
                  { 
                    icon: FileText,
                    title: 'Pro Tables', 
                    desc: 'Qualifying and race results in broadcast format',
                    gradient: 'from-green-500/10 to-emerald-500/10',
                    border: 'border-green-500/30',
                    iconColor: 'text-green-400'
                  },
                  { 
                    icon: Download,
                    title: '4K Export', 
                    desc: 'Export in broadcast quality (4K/Full HD)',
                    gradient: 'from-purple-500/10 to-pink-500/10',
                    border: 'border-purple-500/30',
                    iconColor: 'text-purple-400'
                  },
                  { 
                    icon: Zap,
                    title: 'Instant Gen', 
                    desc: 'Generate professional content in under 10 seconds',
                    gradient: 'from-metrik-turquoise/10 to-cyan-500/10',
                    border: 'border-metrik-turquoise/30',
                    iconColor: 'text-metrik-turquoise'
                  },
                ].map((feature, idx) => {
                  const IconComponent = feature.icon;
                  return (
                    <div
                      key={feature.title}
                      className={`group relative backdrop-blur-xl bg-gradient-to-br ${feature.gradient} border ${feature.border} rounded-2xl p-5 md:p-6 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-metrik-turquoise/20`}
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center mb-4 ${feature.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent size={28} strokeWidth={2} />
                      </div>
                      <h3 className="text-base md:text-lg font-rajdhani font-black text-white mb-2 uppercase tracking-wide">
                        {feature.title}
                      </h3>
                      <p className="text-xs md:text-sm font-inter text-metrik-silver leading-relaxed">
                        {feature.desc}
                      </p>
                      
                      {/* Hover Glow */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-metrik-turquoise/0 to-cyan-500/0 group-hover:from-metrik-turquoise/5 group-hover:to-cyan-500/5 transition-all duration-500 pointer-events-none" />
                    </div>
                  );
                })}
              </div>

              {/* Pricing Highlight */}
              <div className="backdrop-blur-xl bg-metrik-card/50 border-2 border-metrik-turquoise/30 rounded-2xl p-6 md:p-8 mb-8 text-center shadow-2xl shadow-metrik-turquoise/10">
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-4">
                  <div>
                    <div className="text-xs md:text-sm font-rajdhani font-bold text-metrik-silver uppercase tracking-wider mb-1">
                      Studio Pro Access
                    </div>
                    <div className="flex items-baseline gap-2 justify-center">
                      <span className="text-4xl md:text-6xl font-rajdhani font-black text-metrik-turquoise">
                        €4.99
                      </span>
                      <span className="text-lg md:text-xl font-inter text-metrik-silver">/month</span>
                    </div>
                  </div>
                  
                  <div className="hidden md:block w-px h-16 bg-metrik-turquoise/20" />
                  
                  <div className="text-center md:text-left">
                    <div className="text-xs md:text-sm font-rajdhani font-bold text-metrik-turquoise uppercase tracking-wider mb-1">
                      Includes METRIK+
                    </div>
                    <div className="text-xs md:text-sm font-inter text-metrik-silver">
                      Unlimited telemetry access + All premium features
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 text-xs md:text-sm font-rajdhani font-bold text-metrik-silver">
                  <span className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Cancel anytime
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Instant access
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    No watermarks
                  </span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="group relative px-8 md:px-12 py-4 md:py-5 rounded-xl font-rajdhani font-black text-base md:text-xl uppercase tracking-wider transition-all duration-300 hover:scale-105 shadow-2xl w-full md:w-auto"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-metrik-turquoise via-cyan-400 to-blue-400 rounded-xl opacity-100 group-hover:opacity-90 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-r from-metrik-turquoise via-cyan-400 to-blue-400 rounded-xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity" />
                  <span className="relative flex items-center justify-center gap-3 text-metrik-black">
                    <Sparkles size={24} className="group-hover:rotate-12 transition-transform duration-300" />
                    <span>Unlock Studio Pro</span>
                  </span>
                </button>

                <button
                  onClick={() => navigate('/')}
                  className="px-6 md:px-8 py-4 md:py-5 rounded-xl border-2 border-metrik-turquoise/30 backdrop-blur-xl bg-metrik-card/30 text-metrik-silver hover:text-white hover:border-metrik-turquoise/50 font-rajdhani font-bold text-base md:text-lg uppercase tracking-wider transition-all duration-300 hover:scale-105 w-full md:w-auto"
                >
                  <span className="flex items-center justify-center gap-2">
                    <ArrowLeft size={20} />
                    <span>Back to Home</span>
                  </span>
                </button>
              </div>

            </div>
          </div>

          <UpgradeModal
            isOpen={showUpgradeModal}
            onClose={() => {
              setShowUpgradeModal(false);
              navigate('/');
            }}
            onUpgrade={() => {
              setShowUpgradeModal(false);
              window.location.href = '/';
            }}
          />
        </div>
      </>
    );
  }

  // Full Studio Interface (for METRIK+ users)
  return (
    <>
      <SEO 
        path="/studio-pro"
        title="Studio Pro - Create F1 Content | METRIK DELTA"
        description="Professional F1 content generator for social media and analysis."
        keywords="f1 studio, content creator, racing graphics"
      />

      <div className="min-h-screen bg-metrik-black text-white flex flex-col">
        {/* Top Header */}
        <div className="h-16 bg-metrik-black border-b border-metrik-turquoise/30 flex items-center justify-between px-6 shadow-lg shadow-metrik-turquoise/10">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-metrik-silver hover:text-metrik-turquoise transition-all duration-300 font-rajdhani hover:translate-x-[-4px]"
          >
            <ArrowLeft size={20} />
            <span className="text-base md:text-lg font-bold uppercase tracking-wider">Back</span>
          </button>

          <div className="flex items-center gap-3">
            <Sparkles className="text-metrik-turquoise" size={24} />
            <h1 className="text-2xl md:text-3xl font-rajdhani font-black text-transparent bg-clip-text bg-gradient-to-r from-metrik-turquoise to-cyan-300 tracking-wider uppercase">
              Studio Pro
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <div className="text-sm font-rajdhani font-bold text-white">
                {user?.email}
              </div>
              <div className="text-xs font-inter text-metrik-turquoise uppercase">
                METRIK+
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-metrik-turquoise to-cyan-500 flex items-center justify-center font-rajdhani font-black text-metrik-black">
              {user?.email?.[0].toUpperCase()}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Step 1: Content Type Selection */}
            {!config.contentType && (
              <ContentTypeSelector 
                onSelect={(type) => setConfig({ ...config, contentType: type })}
              />
            )}

            {/* Step 2: Configuration + Preview - LAYOUT HORIZONTAL GP TEMPO STYLE */}
            {config.contentType && (
  <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-200px)]">
    {/* Left Sidebar: Config - RESPONSIVE */}
    <div className="w-full lg:w-80 flex-shrink-0 overflow-y-auto">
      <SimpleConfigPanel
        config={config}
        onChange={setConfig}
        onBack={() => setConfig({ ...config, contentType: null })}
      />
    </div>

    {/* Right: Preview + Export - RESPONSIVE */}
    <div className="flex-1 min-w-0 overflow-y-auto">
      <ExportPanelV2 config={config} />
    </div>
  </div>

            )}
          </div>
        </div>
      </div>
    </>
  );
}