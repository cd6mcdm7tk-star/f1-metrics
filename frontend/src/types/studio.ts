// Studio Pro Types

export type DataSourceType = 
  | 'telemetry-battle'
  | 'race-pace'
  | 'qualifying-results'
  | 'championship-evolution'
  | 'tire-strategy'
  | 'sector-analysis'
  | 'lap-distribution';

export type ThemePreset = 
  | 'dark-metrik'
  | 'light-professional'
  | 'team-colors'
  | 'minimal-monochrome'
  | 'neon-racing';

export type LayoutPreset = 
  | 'instagram-post'
  | 'instagram-story'
  | 'twitter-post'
  | 'twitter-header'
  | 'youtube-thumbnail'
  | 'linkedin-post'
  | 'presentation'
  | 'widescreen-4k'
  | 'custom';

export type WatermarkPosition = 
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left'
  | 'center-bottom';

export type ExportFormat = 'png' | 'pdf' | 'svg' | 'json';

export interface StudioTheme {
  background: string;
  primary: string;
  secondary: string;
  text: string;
  accent?: string;
}

export interface LayoutDimensions {
  width: number;
  height: number;
  ratio: string;
  name: string;
}

export interface WatermarkConfig {
  position: WatermarkPosition;
  size: 'small' | 'medium' | 'large';
  opacity: number;
  style: 'logo-only' | 'logo-text' | 'text-only';
}

export interface DataSourceConfig {
  type: DataSourceType;
  year?: number;
  round?: number;
  session?: string;
  drivers?: string[];
  team?: string;
  lap?: number;
}

export interface CanvasSettings {
  title: string;
  subtitle: string;
  showDate: boolean;
  showCircuit: boolean;
  showDrivers: boolean;
  showMetadata: boolean;
  fontSize: {
    title: number;
    subtitle: number;
    labels: number;
  };
}

export interface StudioConfig {
  dataSource: DataSourceConfig;
  theme: StudioTheme;
  themePreset: ThemePreset;
  layout: LayoutDimensions;
  layoutPreset: LayoutPreset;
  watermark: WatermarkConfig;
  canvasSettings: CanvasSettings;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
  config: StudioConfig;
  category: 'telemetry' | 'race' | 'championship' | 'strategy';
  featured: boolean;
  createdAt: string;
}

export interface ExportOptions {
  format: ExportFormat;
  quality: 'standard' | 'high' | 'print';
  compression: 'low' | 'medium' | 'high';
  includeMetadata: boolean;
}

export const STUDIO_THEMES: Record<ThemePreset, StudioTheme> = {
  'dark-metrik': {
    background: '#0A0F1E',
    primary: '#00E5CC',
    secondary: '#1E293B',
    text: '#FFFFFF',
    accent: '#00FFF0'
  },
  'light-professional': {
    background: '#FFFFFF',
    primary: '#00B8A3',
    secondary: '#F1F5F9',
    text: '#0F172A',
    accent: '#0EA5E9'
  },
  'team-colors': {
    background: '#0A0F1E',
    primary: '#FF1801',
    secondary: '#1E293B',
    text: '#FFFFFF',
    accent: '#FFD700'
  },
  'minimal-monochrome': {
    background: '#000000',
    primary: '#FFFFFF',
    secondary: '#333333',
    text: '#FFFFFF',
    accent: '#666666'
  },
  'neon-racing': {
    background: '#0A0F1E',
    primary: '#FF00FF',
    secondary: '#00FFFF',
    text: '#FFFFFF',
    accent: '#FFFF00'
  }
};

export const STUDIO_LAYOUTS: Record<LayoutPreset, LayoutDimensions> = {
  'instagram-post': { width: 1080, height: 1080, ratio: '1:1', name: 'Instagram Post' },
  'instagram-story': { width: 1080, height: 1920, ratio: '9:16', name: 'Instagram Story' },
  'twitter-post': { width: 1200, height: 675, ratio: '16:9', name: 'Twitter Post' },
  'twitter-header': { width: 1500, height: 500, ratio: '3:1', name: 'Twitter Header' },
  'youtube-thumbnail': { width: 1280, height: 720, ratio: '16:9', name: 'YouTube Thumbnail' },
  'linkedin-post': { width: 1200, height: 1200, ratio: '1:1', name: 'LinkedIn Post' },
  'presentation': { width: 1920, height: 1080, ratio: '16:9', name: 'Presentation Slide' },
  'widescreen-4k': { width: 3840, height: 2160, ratio: '16:9', name: 'Widescreen 4K' },
  'custom': { width: 1920, height: 1080, ratio: 'custom', name: 'Custom Size' }
};

export const DEFAULT_STUDIO_CONFIG: StudioConfig = {
  dataSource: {
    type: 'telemetry-battle',
    year: 2025,
    round: 1,
    session: 'R',
    drivers: [],
    lap: 1
  },
  theme: STUDIO_THEMES['dark-metrik'],
  themePreset: 'dark-metrik',
  layout: STUDIO_LAYOUTS['instagram-post'],
  layoutPreset: 'instagram-post',
  watermark: {
    position: 'bottom-right',
    size: 'medium',
    opacity: 0.7,
    style: 'logo-text'
  },
  canvasSettings: {
    title: 'F1 Analysis',
    subtitle: 'METRIK DELTA Studio',
    showDate: true,
    showCircuit: true,
    showDrivers: true,
    showMetadata: true,
    fontSize: {
      title: 48,
      subtitle: 24,
      labels: 14
    }
  }
};
