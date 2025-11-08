import { Activity, TrendingUp, Trophy, Film, FileText, Table, Users, Monitor, LucideIcon } from 'lucide-react';

// Définir ContentType localement
export type ContentType = 
  | 'track-telemetry'
  | 'race-pace'
  | 'head-to-head'
  | 'quali-table'
  | 'race-table';

interface ContentTypeSelectorProps {
  onSelect: (type: ContentType) => void;
}

interface ContentTypeCard {
  type: ContentType;
  icon: LucideIcon;  // ✅ Type correct pour les icônes Lucide
  title: string;
  description: string;
  exportFormats: string[];
  animated: boolean;
  color: string;
}

const CONTENT_TYPES: ContentTypeCard[] = [
  {
    type: 'track-telemetry',
    icon: Activity,
    title: 'Track + Telemetry',
    description: 'Interactive circuit with synchronized telemetry data',
    exportFormats: ['GIF', 'MP4'],
    animated: true,
    color: 'from-purple-500 to-pink-500',
  },
  {
    type: 'race-pace',
    icon: TrendingUp,
    title: 'Race Pace',
    description: 'Lap time evolution with tire strategy and pit stops',
    exportFormats: ['PNG', 'GIF'],
    animated: true,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    type: 'head-to-head',
    icon: Users,
    title: 'Head-to-Head',
    description: 'Full season battle comparison between two drivers with stats',
    exportFormats: ['PNG', 'PDF'],
    animated: false,
    color: 'from-cyan-500 to-teal-500',
  },
  {
    type: 'quali-table',
    icon: FileText,
    title: 'Qualifying Results',
    description: 'Professional table with starting grid times and deltas',
    exportFormats: ['PNG'],
    animated: false,
    color: 'from-red-500 to-rose-500',
  },
  {
    type: 'race-table',
    icon: Table,
    title: 'Race Results',
    description: 'Complete results table with finishing order and stats',
    exportFormats: ['PNG'],
    animated: false,
    color: 'from-indigo-500 to-purple-500',
  },
];

export default function ContentTypeSelector({ onSelect }: ContentTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-rajdhani font-black uppercase tracking-wider text-white mb-2">
          Choose Your Content Type
        </h2>
        <p className="text-metrik-silver font-inter">
          Select the type of F1 content you want to create
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CONTENT_TYPES.map((content) => {
          const Icon = content.icon;
          return (
            <button
              key={content.type}
              onClick={() => onSelect(content.type)}
              className="group relative p-6 bg-metrik-card border-2 border-metrik-turquoise/20 rounded-2xl hover:border-metrik-turquoise hover:scale-105 transition-all duration-300 text-left overflow-hidden"
            >
              {/* Gradient Background on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${content.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

              {/* Content */}
              <div className="relative z-10">
                {/* Icon + Animated Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${content.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {content.animated && (
                    <span className="px-2 py-1 bg-metrik-turquoise text-metrik-black text-xs font-black rounded-full uppercase tracking-wider">
                      Animated
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-xl font-rajdhani font-black uppercase tracking-wider text-white mb-2">
                  {content.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-metrik-silver font-inter mb-4 leading-relaxed">
                  {content.description}
                </p>

                {/* Export Formats */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-rajdhani font-bold text-metrik-silver/70 uppercase">
                    Export:
                  </span>
                  {content.exportFormats.map((format) => (
                    <span
                      key={format}
                      className="px-2 py-1 bg-metrik-surface text-metrik-turquoise text-xs font-bold rounded uppercase"
                    >
                      {format}
                    </span>
                  ))}
                </div>
              </div>

              {/* Hover Effect */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-metrik-turquoise to-cyan-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
            </button>
          );
        })}
      </div>

      {/* Info Box - Message pour l'expérience sur ordinateur */}
      <div className="p-6 bg-metrik-turquoise/10 border border-metrik-turquoise/30 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-metrik-turquoise/20 border border-metrik-turquoise/50 flex items-center justify-center">
            <Monitor className="text-metrik-turquoise" size={20} />
          </div>
          <div>
            <h4 className="font-rajdhani font-black text-white mb-1 uppercase tracking-wider">
              Best Experience
            </h4>
            <p className="text-sm text-metrik-silver font-inter leading-relaxed">
              For the best visualization and editing experience, we recommend using Studio Pro on a desktop or laptop computer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}