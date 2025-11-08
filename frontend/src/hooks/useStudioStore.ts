import { create } from 'zustand';
import type { 
  StudioConfig, 
  DataSourceConfig,
  StudioTheme,
  LayoutDimensions,
  WatermarkConfig,
  CanvasSettings,
  ThemePreset,
  LayoutPreset,
  Template
} from '../types/studio';
import { DEFAULT_STUDIO_CONFIG, STUDIO_THEMES, STUDIO_LAYOUTS } from '../types/studio';

interface StudioStore {
  config: StudioConfig;
  activePanel: 'data' | 'style' | 'layout' | 'settings';
  isExporting: boolean;
  exportProgress: number;
  canvasZoom: number;
  savedTemplates: Template[];
  currentTemplate: Template | null;
  history: StudioConfig[];
  historyIndex: number;
  
  setDataSource: (dataSource: Partial<DataSourceConfig>) => void;
  setTheme: (theme: Partial<StudioTheme>) => void;
  setThemePreset: (preset: ThemePreset) => void;
  setLayout: (layout: Partial<LayoutDimensions>) => void;
  setLayoutPreset: (preset: LayoutPreset) => void;
  setWatermark: (watermark: Partial<WatermarkConfig>) => void;
  setCanvasSettings: (settings: Partial<CanvasSettings>) => void;
  setActivePanel: (panel: 'data' | 'style' | 'layout' | 'settings') => void;
  setIsExporting: (isExporting: boolean) => void;
  setExportProgress: (progress: number) => void;
  setCanvasZoom: (zoom: number) => void;
  saveTemplate: (name: string, description: string) => void;
  loadTemplate: (template: Template) => void;
  deleteTemplate: (templateId: string) => void;
  undo: () => void;
  redo: () => void;
  addToHistory: () => void;
  resetConfig: () => void;
}

export const useStudioStore = create<StudioStore>((set, get) => ({
  config: DEFAULT_STUDIO_CONFIG,
  activePanel: 'data',
  isExporting: false,
  exportProgress: 0,
  canvasZoom: 100,
  savedTemplates: [],
  currentTemplate: null,
  history: [DEFAULT_STUDIO_CONFIG],
  historyIndex: 0,
  
  setDataSource: (dataSource) => {
    set((state) => ({
      config: {
        ...state.config,
        dataSource: { ...state.config.dataSource, ...dataSource }
      }
    }));
    get().addToHistory();
  },
  
  setTheme: (theme) => {
    set((state) => ({
      config: {
        ...state.config,
        theme: { ...state.config.theme, ...theme }
      }
    }));
    get().addToHistory();
  },
  
  setThemePreset: (preset) => {
    set((state) => ({
      config: {
        ...state.config,
        themePreset: preset,
        theme: STUDIO_THEMES[preset]
      }
    }));
    get().addToHistory();
  },
  
  setLayout: (layout) => {
    set((state) => ({
      config: {
        ...state.config,
        layout: { ...state.config.layout, ...layout }
      }
    }));
    get().addToHistory();
  },
  
  setLayoutPreset: (preset) => {
    set((state) => ({
      config: {
        ...state.config,
        layoutPreset: preset,
        layout: STUDIO_LAYOUTS[preset]
      }
    }));
    get().addToHistory();
  },
  
  setWatermark: (watermark) => {
    set((state) => ({
      config: {
        ...state.config,
        watermark: { ...state.config.watermark, ...watermark }
      }
    }));
    get().addToHistory();
  },
  
  setCanvasSettings: (settings) => {
    set((state) => ({
      config: {
        ...state.config,
        canvasSettings: { ...state.config.canvasSettings, ...settings }
      }
    }));
    get().addToHistory();
  },
  
  setActivePanel: (panel) => set({ activePanel: panel }),
  setIsExporting: (isExporting) => set({ isExporting }),
  setExportProgress: (progress) => set({ exportProgress: progress }),
  setCanvasZoom: (zoom) => set({ canvasZoom: Math.max(25, Math.min(200, zoom)) }),
  
  saveTemplate: (name, description) => {
    const state = get();
    const newTemplate: Template = {
      id: `template-${Date.now()}`,
      name,
      description,
      preview: '',
      config: state.config,
      category: state.config.dataSource.type.includes('telemetry') ? 'telemetry' : 'race',
      featured: false,
      createdAt: new Date().toISOString()
    };
    
    set((state) => ({
      savedTemplates: [...state.savedTemplates, newTemplate],
      currentTemplate: newTemplate
    }));
    
    localStorage.setItem('studio-templates', JSON.stringify(get().savedTemplates));
  },
  
  loadTemplate: (template) => {
    set({
      config: template.config,
      currentTemplate: template
    });
    get().addToHistory();
  },
  
  deleteTemplate: (templateId) => {
    set((state) => ({
      savedTemplates: state.savedTemplates.filter(t => t.id !== templateId),
      currentTemplate: state.currentTemplate?.id === templateId ? null : state.currentTemplate
    }));
    localStorage.setItem('studio-templates', JSON.stringify(get().savedTemplates));
  },
  
  addToHistory: () => {
    const state = get();
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(state.config);
    
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },
  
  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      set({
        historyIndex: state.historyIndex - 1,
        config: state.history[state.historyIndex - 1]
      });
    }
  },
  
  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      set({
        historyIndex: state.historyIndex + 1,
        config: state.history[state.historyIndex + 1]
      });
    }
  },
  
  resetConfig: () => {
    set({
      config: DEFAULT_STUDIO_CONFIG,
      currentTemplate: null
    });
    get().addToHistory();
  }
}));
