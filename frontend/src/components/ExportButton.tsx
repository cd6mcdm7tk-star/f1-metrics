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

  const addWatermark = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Watermark "METRIK DELTA" en bas à droite
    ctx.font = '16px Inter, sans-serif';
    ctx.fillStyle = 'rgba(0, 229, 204, 0.5)'; // Turquoise semi-transparent
    ctx.textAlign = 'right';
    ctx.fillText('METRIK DELTA', canvas.width - 20, canvas.height - 20);

    return canvas;
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

      const canvas = await html2canvas(element, {
        scale: 2, // Haute qualité
        backgroundColor: '#0a0e1a', // Fond dark
        logging: false,
      });

      const watermarkedCanvas = addWatermark(canvas);

      // Télécharger PNG
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = watermarkedCanvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting PNG:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    if (!elements || elements.length === 0) return;

    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < elements.length; i++) {
        const element = document.getElementById(elements[i]);
        if (!element) {
          console.error(`Element with id "${elements[i]}" not found`);
          continue;
        }

        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: '#0a0e1a',
          logging: false,
        });

        const watermarkedCanvas = addWatermark(canvas);

        const imgData = watermarkedCanvas.toDataURL('image/png');
        const imgWidth = pageWidth - 20; // Marges
        const imgHeight = (watermarkedCanvas.height * imgWidth) / watermarkedCanvas.width;

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pageHeight - 20));
      }

      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
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