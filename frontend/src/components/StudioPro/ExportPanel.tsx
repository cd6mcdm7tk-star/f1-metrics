import { useState, useEffect } from 'react';
import { Sparkles, Download, FileImage, FileText, Maximize2, AlertTriangle, Zap, Crown } from 'lucide-react';
import type { SimpleStudioConfig} from '../../pages/StudioProPage';
import RacePaceChart from './charts/RacePaceChart';
import TelemetryBattleChart from './charts/TelemetryBattleChart';
import QualifyingResultsChart from './charts/QualifyingResultsChart';
import RaceResultsChart from './charts/RaceResultsChart';
import HeadToHeadChart from './charts/HeadToHeadChart';
import { useRateLimit } from '../../hooks/useRateLimit';

interface ExportPanelProps {
  config: SimpleStudioConfig;
}

// 🎨 PRESETS D'EXPORT PROFESSIONNELS
const EXPORT_PRESETS = {
  'broadcast-4k': { 
    width: 3840, 
    height: 2160, 
    scale: 4, 
    label: '4K Broadcast',
    icon: '📺',
    premium: true 
  },
  'broadcast-hd': { 
    width: 1920, 
    height: 1080, 
    scale: 3, 
    label: 'Full HD Broadcast',
    icon: '🎬',
    premium: false 
  },
};

export default function ExportPanelV2({ config }: ExportPanelProps) {
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<keyof typeof EXPORT_PRESETS>('broadcast-hd');
  
  const { isUnlimited: isPremium } = useRateLimit();

  // 🎯 GÉNÉRATION AUTOMATIQUE
  useEffect(() => {
    if (config.contentType && config.year && config.round) {
      if (config.contentType === 'race-pace' && (!config.drivers || config.drivers.length === 0)) {
        return;
      }
      if (config.contentType === 'head-to-head' && (!config.drivers || config.drivers.length !== 2)) {
        return;
      }
      generateChart();
    }
  }, [config.contentType, config.year, config.round, config.drivers]);

  const generateChart = async () => {
    setLoading(true);
    setError(null);
    setChartData(null);
    
    try {
      console.log('🎬 Generating chart for:', config);
      
      let data;
      const API_URL = import.meta.env.VITE_API_URL || 'https://metrikdelta-backend-eu-production.up.railway.app/api';
      if (config.contentType === 'race-pace') {
        if (!config.drivers || config.drivers.length === 0) {
          throw new Error('Please select at least one driver');
        }

        const driver1 = config.drivers[0];
        const driver2Param = config.drivers.length > 1 ? `&driver2=${config.drivers[1]}` : '';
        
        const response = await fetch(
          `${API_URL}/api/studio/race-pace?year=${config.year}&round=${config.round}&driver=${driver1}${driver2Param}`
        );
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        
        data = await response.json();
        
      } else if (config.contentType === 'track-telemetry') {
        if (!config.drivers || config.drivers.length === 0) {
          throw new Error('Please select at least 1 driver for Telemetry Analysis');
        }

        const driver1 = config.drivers[0];
        const driver2 = config.drivers.length > 1 ? config.drivers[1] : config.drivers[0];
        
        const response = await fetch(
          `${API_URL}/api/telemetry/${config.year}/${config.round}/${config.sessionType}/${driver1}/${driver2}`
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error: ${response.status} - Failed to fetch telemetry data`);
        }

        data = await response.json();
        
        if (!data || !data.telemetry || data.telemetry.length === 0) {
          throw new Error('No telemetry data available');
        }
        
      } else if (config.contentType === 'head-to-head') {
        if (!config.drivers || config.drivers.length !== 2) {
          throw new Error('Please select exactly 2 drivers for Head-to-Head comparison');
        }

        const driver1 = config.drivers[0];
        const driver2 = config.drivers[1];
        
        const response = await fetch(
          `${API_URL}/api/studio/head-to-head?year=${config.year}&driver1=${driver1}&driver2=${driver2}`
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error: ${response.status} - Failed to fetch head-to-head data`);
        }

        data = await response.json();
        
      } else if (config.contentType === 'quali-table') {
        const response = await fetch(
          `${API_URL}/api/studio/qualifying?year=${config.year}&round=${config.round}`
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error: ${response.status} - Failed to fetch qualifying data`);
        }

        data = await response.json();

      } else if (config.contentType === 'race-table') {
        const response = await fetch(
          `${API_URL}/api/studio/race-results?year=${config.year}&round=${config.round}`
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error: ${response.status} - Failed to fetch race results`);
        }

        data = await response.json();
        
      } else {
        throw new Error('Unknown content type');
      }
      
      setChartData(data);
    } catch (err: any) {
      console.error('❌ Error generating chart:', err);
      setError(err.message || 'Failed to generate chart');
    } finally {
      setLoading(false);
    }
  };

  // 🎨 WATERMARK INTELLIGENT
  const addWatermark = (canvas: HTMLCanvasElement, subtle: boolean = false): HTMLCanvasElement => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const watermarkText = 'METRIK DELTA';
    const fontSize = subtle ? Math.floor(canvas.height * 0.02) : Math.floor(canvas.height * 0.03);
    
    ctx.font = `bold ${fontSize}px 'Rajdhani', sans-serif`;
    ctx.textAlign = subtle ? 'right' : 'center';
    ctx.textBaseline = 'bottom';
    
    if (subtle) {
      // METRIK+ : watermark discret en bas à droite
      ctx.fillStyle = 'rgba(0, 255, 234, 0.3)';
      ctx.fillText(watermarkText, canvas.width - 20, canvas.height - 20);
    } else {
      // FREE : watermark visible au centre
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#00FFEA';
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 12);
      ctx.fillText(watermarkText, 0, 0);
      ctx.restore();
    }
    
    return canvas;
  };

  // 📸 EXPORT PNG HAUTE QUALITÉ
  const handleExportPNG = async () => {
    try {
      setExporting(true);
      console.log('📸 Exporting to PNG...');
      
      const chartElement = document.getElementById('chart-container');
      if (!chartElement) {
        alert('Chart not found. Please generate a chart first.');
        return;
      }

      const html2canvas = (await import('html2canvas')).default;
      const preset = EXPORT_PRESETS[exportFormat];
      
      // Capture TRÈS haute qualité avec scale élevé
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#0A0F1E',
        scale: preset.scale,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: chartElement.scrollWidth,
        height: chartElement.scrollHeight,
      });

      // Créer canvas final avec dimensions exactes + padding
      const finalCanvas = document.createElement('canvas');
      const padding = Math.floor(preset.width * 0.05); // 5% padding
      finalCanvas.width = preset.width;
      finalCanvas.height = preset.height;

      const ctx = finalCanvas.getContext('2d');
      if (!ctx) return;

      // Fond noir
      ctx.fillStyle = '#0A0F1E';
      ctx.fillRect(0, 0, preset.width, preset.height);

      // Calculer dimensions pour FIT (pas CROP)
      const availableWidth = preset.width - (padding * 2);
      const availableHeight = preset.height - (padding * 2);
      const imgRatio = canvas.width / canvas.height;
      const targetRatio = availableWidth / availableHeight;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (imgRatio > targetRatio) {
        // Image plus large -> fit par la largeur
        drawWidth = availableWidth;
        drawHeight = availableWidth / imgRatio;
        offsetX = padding;
        offsetY = padding + (availableHeight - drawHeight) / 2;
      } else {
        // Image plus haute -> fit par la hauteur
        drawHeight = availableHeight;
        drawWidth = availableHeight * imgRatio;
        offsetX = padding + (availableWidth - drawWidth) / 2;
        offsetY = padding;
      }

      // Dessiner l'image SANS la rogner
      ctx.drawImage(canvas, offsetX, offsetY, drawWidth, drawHeight);

      // Ajouter watermark
      const watermarkedCanvas = addWatermark(finalCanvas, isPremium);

      // Download
      watermarkedCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `metrik-delta-${config.contentType}-${config.year}-R${config.round}-${exportFormat}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          console.log('✅ PNG exported successfully');
        }
      }, 'image/png', 1.0); // Qualité maximale
      
    } catch (error) {
      console.error('❌ Error exporting PNG:', error);
      alert('Failed to export PNG. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // 📄 EXPORT PDF PROFESSIONNEL
  const handleExportPDF = async () => {
    try {
      setExporting(true);
      console.log('📄 Exporting to PDF...');
      
      const chartElement = document.getElementById('chart-container');
      if (!chartElement) {
        alert('Chart not found. Please generate a chart first.');
        return;
      }

      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).jsPDF;
      
      // Capture haute résolution
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#0A0F1E',
        scale: 3, // Haute qualité pour PDF
        logging: false,
        useCORS: true,
      });

      // Ajouter watermark
      const watermarkedCanvas = addWatermark(canvas, isPremium);
      const imgData = watermarkedCanvas.toDataURL('image/png', 1.0);
      
      // PDF en paysage A4 ou format personnalisé
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      // Métadonnées
      pdf.setProperties({
        title: `METRIK DELTA - ${config.contentType} - ${config.year} Round ${config.round}`,
        subject: 'F1 Data Analysis',
        author: 'METRIK DELTA',
        keywords: 'f1, formula1, telemetry, analysis',
        creator: 'METRIK DELTA Studio Pro'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const x = 10;
      const y = Math.max(10, (pdfHeight - imgHeight) / 2);

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST');
      
      pdf.save(`metrik-delta-${config.contentType}-${config.year}-R${config.round}.pdf`);
      
      console.log('✅ PDF exported successfully');
      
    } catch (error) {
      console.error('❌ Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-[600px] backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl shadow-lg shadow-metrik-turquoise/20">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-metrik-turquoise/30 rounded-full" />
              <div className="absolute inset-0 border-4 border-metrik-turquoise border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-2xl font-rajdhani font-black text-transparent bg-clip-text bg-gradient-to-r from-metrik-turquoise to-cyan-300 uppercase tracking-wider mb-2">
              Generating...
            </p>
            <p className="text-sm font-inter text-metrik-silver">
              Fetching data from FastF1
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="backdrop-blur-xl bg-red-500/10 border-2 border-red-500/50 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-rajdhani font-black text-red-400 uppercase">
                Generation Failed
              </h3>
              <p className="text-sm font-inter text-red-300">
                {error}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setError(null);
              generateChart();
            }}
            className="mt-4 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 font-rajdhani font-bold hover:bg-red-500/30 transition-all"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Chart Display */}
      {!loading && !error && chartData && (
        <>
          <div id="chart-container" className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl overflow-hidden shadow-lg shadow-metrik-turquoise/20">
            {config.contentType === 'race-pace' && (
              <RacePaceChart data={chartData} />
            )}
            {config.contentType === 'track-telemetry' && (
              <TelemetryBattleChart data={chartData}  />
            )}
            {config.contentType === 'quali-table' && (
              <QualifyingResultsChart data={chartData}  />
            )}
            {config.contentType === 'race-table' && (
              <RaceResultsChart data={chartData} />
            )}
            {config.contentType === 'head-to-head' && (
              <HeadToHeadChart data={chartData}  />
            )}
          </div>

          {/* Export Controls */}
          <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-rajdhani font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Download size={20} className="text-metrik-turquoise" />
              Export Options
            </h3>

            {/* Format Selector */}
            <div className="mb-6 pb-6 border-b border-metrik-turquoise/20">
              <label className="block text-sm font-rajdhani font-bold text-metrik-silver uppercase tracking-wider mb-3 flex items-center gap-2">
                <Maximize2 size={16} className="text-metrik-turquoise" />
                Export Format
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(EXPORT_PRESETS).map(([key, preset]) => {
                  const isLocked = preset.premium && !isPremium;
                  return (
                    <button
                      key={key}
                      onClick={() => !isLocked && setExportFormat(key as any)}
                      disabled={isLocked}
                      className={`relative px-4 py-3 rounded-lg text-sm font-rajdhani font-bold uppercase transition-all ${
                        exportFormat === key
                          ? 'bg-metrik-turquoise text-metrik-black border-2 border-metrik-turquoise'
                          : isLocked
                          ? 'bg-metrik-surface/30 text-metrik-silver/50 border-2 border-metrik-turquoise/10 cursor-not-allowed'
                          : 'bg-metrik-surface/50 text-metrik-silver border-2 border-metrik-turquoise/30 hover:border-metrik-turquoise/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-lg">{preset.icon}</span>
                        <span className="text-xs">{preset.label}</span>
                      </div>
                      {isLocked && (
                        <div className="absolute top-1 right-1">
                          <Crown size={14} className="text-amber-500" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Format Info */}
              <div className="mt-3 text-center">
                <div className="text-xs text-metrik-silver font-inter">
                  {EXPORT_PRESETS[exportFormat].width > 0 
                    ? `${EXPORT_PRESETS[exportFormat].width} x ${EXPORT_PRESETS[exportFormat].height}px` 
                    : 'Original size'
                  }
                  {EXPORT_PRESETS[exportFormat].premium && !isPremium && (
                    <span className="ml-2 text-amber-500">• METRIK+ Required</span>
                  )}
                </div>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleExportPNG}
                disabled={exporting || (EXPORT_PRESETS[exportFormat].premium && !isPremium)}
                className="flex flex-col items-center gap-3 p-4 bg-metrik-surface/50 border-2 border-metrik-turquoise/30 rounded-xl hover:border-metrik-turquoise/50 hover:bg-metrik-turquoise/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-metrik-turquoise/30 disabled:hover:bg-metrik-surface/50"
              >
                <FileImage size={32} className="text-metrik-turquoise group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <div className="text-sm font-rajdhani font-black text-white uppercase">
                    {exporting ? 'Exporting...' : 'PNG Image'}
                  </div>
                  <div className="text-xs font-inter text-metrik-silver mt-1">
                    {EXPORT_PRESETS[exportFormat].premium && !isPremium 
                      ? 'METRIK+ Required' 
                      : 'High quality static image'
                    }
                  </div>
                </div>
              </button>

              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="flex flex-col items-center gap-3 p-4 bg-metrik-surface/50 border-2 border-metrik-turquoise/30 rounded-xl hover:border-metrik-turquoise/50 hover:bg-metrik-turquoise/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-metrik-turquoise/30 disabled:hover:bg-metrik-surface/50"
              >
                <FileText size={32} className="text-metrik-turquoise group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <div className="text-sm font-rajdhani font-black text-white uppercase">
                    {exporting ? 'Exporting...' : 'PDF Document'}
                  </div>
                  <div className="text-xs font-inter text-metrik-silver mt-1">
                    Professional report format
                  </div>
                </div>
              </button>
            </div>

            {/* Export Info */}
            <div className="mt-6 pt-6 border-t border-metrik-turquoise/20">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {isPremium ? (
                    <>
                      <Zap className="w-4 h-4 text-metrik-turquoise" />
                      <span className="font-inter text-metrik-turquoise">
                        Premium Quality • Subtle Watermark
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-metrik-turquoise/50" />
                      <span className="font-inter text-metrik-silver">
                        Standard Quality • Visible Watermark
                      </span>
                    </>
                  )}
                </div>
                <div className="font-rajdhani font-bold text-metrik-turquoise text-xs uppercase">
                  METRIK DELTA
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && !error && !chartData && (
        <div className="flex items-center justify-center h-[600px] backdrop-blur-xl bg-metrik-card/95 border-2 border-metrik-turquoise/20 border-dashed rounded-2xl">
          <div className="text-center max-w-md px-8">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-metrik-turquoise/10 border-2 border-metrik-turquoise/30 flex items-center justify-center">
              <Sparkles size={48} className="text-metrik-turquoise" />
            </div>
            <h3 className="text-2xl font-rajdhani font-black text-white uppercase tracking-wider mb-3">
              Ready to Generate
            </h3>
            <p className="text-base font-inter text-metrik-silver leading-relaxed">
              Configure your settings and your visualization will generate automatically
            </p>
          </div>
        </div>
      )}
    </div>
  );
}