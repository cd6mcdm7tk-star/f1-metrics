import { Activity, Film, Target, TrendingUp, Trophy, Map, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImmersiveNavProps {
  show: boolean;
  currentSection: number;
  onNavigate: (index: number) => void;
}

const sections = [
  { name: 'Home', icon: Activity },
  { name: 'Telemetry', icon: Activity },
  { name: 'Pit Wall', icon: Target },
  { name: 'Statistics', icon: TrendingUp },
  { name: 'Championship', icon: Trophy },
  { name: 'Tracks', icon: Map },
  { name: 'Anatomy', icon: Cpu },
];

export default function ImmersiveNav({ show, currentSection, onNavigate }: ImmersiveNavProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.nav
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-metrik-black/80 border-b border-metrik-turquoise/20"
        >
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-metrik-turquoise to-cyan-500 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-metrik-black" />
                </div>
                <div className="font-rajdhani font-black text-xl bg-gradient-to-r from-white to-metrik-turquoise bg-clip-text text-transparent">
                  METRIK DELTA
                </div>
              </div>

              {/* Navigation items */}
              <div className="hidden md:flex items-center gap-1">
                {sections.slice(1).map((section, index) => {
                  const Icon = section.icon;
                  const sectionIndex = index + 1;
                  const isActive = currentSection === sectionIndex;

                  return (
                    <button
                      key={section.name}
                      onClick={() => onNavigate(sectionIndex)}
                      className={`group relative px-4 py-2 rounded-lg transition-all duration-300 ${
                        isActive
                          ? 'bg-metrik-turquoise/20 text-metrik-turquoise'
                          : 'text-gray-400 hover:text-white hover:bg-metrik-turquoise/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-rajdhani font-bold uppercase tracking-wide">
                          {section.name}
                        </span>
                      </div>

                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="activeSection"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-metrik-turquoise to-cyan-500"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Mobile menu indicator */}
              <div className="md:hidden flex items-center gap-2 text-xs text-gray-400">
                <span className="font-rajdhani font-bold">
                  {sections[currentSection]?.name}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-metrik-turquoise animate-pulse" />
              </div>
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}