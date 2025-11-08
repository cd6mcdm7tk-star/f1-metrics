import React, { useState } from 'react';
import { Download, FileImage, FileText, Lock } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportButtonProps {
  elementId?: string; // ID de l'élément à capturer pour PNG
  elements?: string[]; // IDs multiples pour PDF avec plusieurs pages
  fileName: string;
  type: 'png' | 'pdf';
  isUnlimited: boolean;
  onUpgradeClick: () => void;
  label?: string;
  className?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  elementId,
  elements,
  fileName,
  type,
  isUnlimited,
  onUpgradeClick,
  label,
  className = '',
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const addWatermarkToCanvas = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
    // Créer un nouveau canvas pour ne pas modifier l'original
    const watermarkedCanvas = document.createElement('canvas');
    watermarkedCanvas.width = sourceCanvas.width;
    watermarkedCanvas.height = sourceCanvas.height;
    
    const ctx = watermarkedCanvas.getContext('2d');
    if (!ctx) return sourceCanvas;

    // Copier l'image originale
    ctx.drawImage(sourceCanvas, 0, 0);

    // Configuration du watermark
    const padding = 30;
    const x = watermarkedCanvas.width - padding;
    const y = watermarkedCanvas.height - padding;

    // Fond semi-transparent pour le watermark
    ctx.fillStyle = 'rgba(10, 14, 26, 0.85)';
    ctx.fillRect(x - 200, y - 50, 180, 45);

    // Bordure turquoise
    ctx.strokeStyle = 'rgba(0, 229, 204, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 200, y - 50, 180, 45);

    // Texte "METRIK DELTA"
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillStyle = '#00E5CC';
    ctx.textAlign = 'left';
    ctx.fillText('METRIK DELTA', x - 190, y - 25);

    // Texte "metrikdelta.com"
    ctx.font = '14px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('metrikdelta.com', x - 190, y - 8);

    console.log('✅ Watermark added to canvas:', watermarkedCanvas.width, 'x', watermarkedCanvas.height);

    return watermarkedCanvas;
  };

  const exportToPNG = async () => {
    if (!elementId) return;

    setIsExporting(true);
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        console.error(`Element with id "${elementId}" not found`);
        return;
      }

      console.log('📸 Capturing element for PNG export...');
      
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#0a0e1a',
        logging: false,
      });

      console.log('✅ Canvas created:', canvas.width, 'x', canvas.height);

      // Ajouter le watermark
      const watermarkedCanvas = addWatermarkToCanvas(canvas);

      // Télécharger PNG
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = watermarkedCanvas.toDataURL('image/png');
      link.click();
      
      console.log('✅ PNG exported successfully');
    } catch (error) {
      console.error('❌ Error exporting PNG:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    if (!elements || elements.length === 0) return;

    setIsExporting(true);
    try {
      console.log('📄 Starting PDF export with', elements.length, 'pages...');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < elements.length; i++) {
        const element = document.getElementById(elements[i]);
        if (!element) {
          console.error(`Element with id "${elements[i]}" not found`);
          continue;
        }

        console.log(`📸 Capturing page ${i + 1}/${elements.length}...`);

        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: '#0a0e1a',
          logging: false,
        });

        // Ajouter le watermark
        const watermarkedCanvas = addWatermarkToCanvas(canvas);

        const imgData = watermarkedCanvas.toDataURL('image/png');
        const imgWidth = pageWidth - 20;
        const imgHeight = (watermarkedCanvas.height * imgWidth) / watermarkedCanvas.width;

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pageHeight - 20));
      }

      pdf.save(`${fileName}.pdf`);
      console.log('✅ PDF exported successfully');
    } catch (error) {
      console.error('❌ Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = () => {
    if (!isUnlimited) {
      onUpgradeClick();
      return;
    }

    if (type === 'png') {
      exportToPNG();
    } else {
      exportToPDF();
    }
  };

  const buttonLabel = label || (type === 'png' ? 'Export PNG' : 'Export PDF');
  const Icon = type === 'png' ? FileImage : FileText;

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`
        relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-sm
        transition-all duration-200
        ${
          isUnlimited
            ? 'bg-gradient-to-r from-[#00E5CC] to-[#00B8A9] text-[#0a0e1a] hover:scale-105'
            : 'bg-gray-800/50 text-gray-400 cursor-not-allowed border border-gray-700'
        }
        ${isExporting ? 'opacity-50 cursor-wait' : ''}
        ${className}
      `}
    >
      {!isUnlimited && <Lock className="w-3 h-3" />}
      {isExporting ? (
        <Download className="w-3 h-3 animate-bounce" />
      ) : (
        <Icon className="w-3 h-3" />
      )}
      <span>{isExporting ? 'Exporting...' : buttonLabel}</span>
      
      {!isUnlimited && (
        <span className="absolute -top-1.5 -right-1.5 bg-[#00E5CC] text-[#0a0e1a] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          METRIK+
        </span>
      )}
    </button>
  );
};

export default ExportButton;