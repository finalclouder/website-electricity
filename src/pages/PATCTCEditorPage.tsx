import React, { useEffect } from 'react';
import { FileDown, FileText, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Preview } from '../components/Preview';
import {
  CoverPageForm,
  LegalBasisForm,
  ConstructionDetailsForm,
  ImageUploadForm,
  RiskIdentificationForm,
  ConstructionSequenceForm,
  PersonnelForm,
  ToolsForm,
  MaterialsForm,
  WorkZoneDiagramForm
} from '../components/forms';
import { SiteSurveySection } from '../components/SiteSurveySection';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const PATCTCEditorPage: React.FC = () => {
  const {
    data, updateData,
    zoom, setZoom,
    activeSection,
    isExporting, setIsExporting,
    errors,
    validateData
  } = useStore();

  // === Auto-sync effects ===

  // Auto-seed risk tables when empty
  useEffect(() => {
    if (data.riskTableJob1.length === 0 && data.jobItems.length > 0) {
      updateData({
        riskTableJob1: [{
          id: 'rj1_auto',
          location: `cột ${data.cot} ĐZ ${data.dz}`,
          details: [{ id: 'd1', hazard: '', measure: '' }],
          note: ''
        }]
      });
    }
    if (data.jobItems.length === 2 && data.riskTableJob2.length === 0) {
      updateData({
        riskTableJob2: [{
          id: 'rj2_auto',
          location: `cột ${data.cot} ĐZ ${data.dz}`,
          details: [{ id: 'd1', hazard: '', measure: '' }],
          note: ''
        }]
      });
    }
  }, [data.jobItems.length, data.riskTableJob1.length, data.riskTableJob2.length, data.cot, data.dz]);

  // Auto-sync ks_thanhPhanHotline with personnel CHTT-GSAT
  useEffect(() => {
    const chttMembers = data.personnel
      .filter(p => p.role === 'CHTT-GSAT' || p.role === 'CHTT - GSAT')
      .sort((a, b) => (a.chttSelectedAt || 0) - (b.chttSelectedAt || 0));

    if (chttMembers.length === 0) {
      const currentPlaceholder = data.ks_thanhPhanHotline;
      if (currentPlaceholder.length !== 1 || currentPlaceholder[0].id !== 'placeholder') {
        updateData({
          ks_thanhPhanHotline: [{ id: 'placeholder', name: '', role: 'CHTT – GSAT – Lập PA' }]
        });
      }
      return;
    }

    const newList = chttMembers.map((p, idx) => ({
      id: p.id,
      name: p.name,
      role: idx === 0 ? 'CHTT – GSAT – Lập PA' : 'CHTT – GSAT'
    }));

    // Only update if actually changed
    const currentNames = data.ks_thanhPhanHotline.map(p => `${p.name}|${p.role}`).join(',');
    const newNames = newList.map(p => `${p.name}|${p.role}`).join(',');
    if (currentNames !== newNames) {
      updateData({ ks_thanhPhanHotline: newList });
    }
  }, [data.personnel]);

  // === Export PDF ===
  const exportPdf = async () => {
    const isValid = validateData();
    if (!isValid) return;

    setIsExporting(true);
    try {
      await document.fonts.ready;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pages = document.querySelectorAll('.a4-page');

      const offscreen = document.createElement('div');
      offscreen.style.position = 'fixed';
      offscreen.style.left = '-9999px';
      offscreen.style.top = '0';
      offscreen.style.width = '21cm';
      offscreen.style.zIndex = '-1';
      document.body.appendChild(offscreen);

      for (let i = 0; i < pages.length; i++) {
        const clone = pages[i].cloneNode(true) as HTMLElement;
        clone.style.transform = 'none';
        clone.style.boxShadow = 'none';
        clone.style.margin = '0';
        clone.style.borderRadius = '0';
        clone.style.border = 'none';

        // Hide debug overlays
        clone.querySelectorAll('.print\\:hidden').forEach(el => {
          (el as HTMLElement).style.display = 'none';
        });

        offscreen.appendChild(clone);

        const canvas = await html2canvas(clone, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (doc: Document) => {
            // Fix oklch colors for html2canvas
            const allElements = doc.querySelectorAll('*');
            allElements.forEach(el => {
              const style = window.getComputedStyle(el);
              const color = style.color;
              const bg = style.backgroundColor;
              if (color && color.includes('oklch')) {
                (el as HTMLElement).style.color = '#000000';
              }
              if (bg && bg.includes('oklch')) {
                (el as HTMLElement).style.backgroundColor = '#ffffff';
              }
            });
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdfWidth = 210;
        const pdfHeight = 297;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

        offscreen.removeChild(clone);
      }

      document.body.removeChild(offscreen);
      pdf.save(`PATCTC_${data.soVb}.pdf`);
    } catch (err) {
      console.error('Export error:', err);
      alert('Lỗi khi xuất PDF. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  // === Export DOCX via server ===
  const [isExportingDocx, setIsExportingDocx] = React.useState(false);

  const exportDocx = async () => {
    const isValid = validateData();
    if (!isValid) return;

    setIsExportingDocx(true);
    try {
      const res = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error('Server error');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PATCTC_${data.soVb}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('DOCX export error:', err);
      alert('Lỗi khi xuất DOCX. Vui lòng thử lại.');
    } finally {
      setIsExportingDocx(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* === Sidebar === */}
      <div className="w-[450px] flex-shrink-0 bg-white border-r border-zinc-200 flex flex-col h-full">
        {/* Scrollable form sections */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <CoverPageForm />
          <LegalBasisForm />
          <ConstructionDetailsForm />
          <ImageUploadForm />
          <RiskIdentificationForm />
          <ConstructionSequenceForm />
          <PersonnelForm />
          <ToolsForm />
          <MaterialsForm />
          <SiteSurveySection />
          <WorkZoneDiagramForm />
        </div>

        {/* Footer - Export */}
        <div className="border-t border-zinc-200 p-4 bg-white">
          {errors.length > 0 && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              {errors.map((err, i) => (
                <div key={i} className="text-xs text-red-600 flex items-center gap-1">
                  <span>⚠</span> {err}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={exportPdf}
              disabled={isExporting || isExportingDocx}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {isExporting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Đang xuất...
                </>
              ) : (
                <>
                  <FileDown size={18} />
                  XUẤT PDF
                </>
              )}
            </button>
            <button
              onClick={exportDocx}
              disabled={isExporting || isExportingDocx}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {isExportingDocx ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Đang xuất...
                </>
              ) : (
                <>
                  <FileText size={18} />
                  XUẤT WORD
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* === Preview Panel === */}
      <div className="flex-1 overflow-hidden">
        <Preview
          data={data}
          activeSection={activeSection}
          zoom={zoom}
          setZoom={(z: any) => setZoom(z)}
        />
      </div>
    </div>
  );
};
