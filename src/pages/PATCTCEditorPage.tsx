import React, { useEffect, useState } from 'react';
import { FileDown, FileText, Loader2, Save, CheckCircle2, FolderOpen, Eye, Download, Trash2, Clock, ChevronDown, ChevronRight, X, Plus, MapPin, Users, Wrench, Calendar, Zap, FilePlus2, Copy } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSocialStore, SavedDocument } from '../store/useSocialStore';
import { PATCTCData } from '../types';
import { Preview } from '../components/Preview';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
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
import { getAuthHeaders } from '../utils/api';

import { timeAgo } from '../utils/date';

export const PATCTCEditorPage: React.FC = () => {
  const {
    data, updateData,
    zoom, setZoom,
    activeSection,
    isExporting, setIsExporting,
    errors,
    validateData
  } = useStore();
  const { user } = useAuthStore();
  const { saveDocument, savedDocuments, updateDocument, deleteDocument } = useSocialStore();
  const [saveNotif, setSaveNotif] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDocsPanel, setShowDocsPanel] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<SavedDocument | null>(null);
  const [previewData, setPreviewData] = useState<PATCTCData | null>(null);

  // All documents visible to this user (own + all others)
  const myDocs = savedDocuments.filter(d => d.authorId === user?.id);
  const otherDocs = savedDocuments.filter(d => d.authorId !== user?.id);

  const openPreview = (doc: SavedDocument) => {
    try {
      const parsed = JSON.parse(doc.dataSnapshot) as PATCTCData;
      setPreviewData(parsed);
      setPreviewDoc(doc);
    } catch {
      alert('Không thể đọc dữ liệu');
    }
  };

  const handleLoadDoc = (doc: SavedDocument) => {
    try {
      const parsed = JSON.parse(doc.dataSnapshot);
      useStore.getState().setData(parsed);
      setPreviewDoc(null);
      setPreviewData(null);
      setShowDocsPanel(false);
    } catch {
      alert('Không thể tải dữ liệu');
    }
  };

  // Clone another user's document as own draft
  const handleCloneDoc = (doc: SavedDocument) => {
    if (!user) return;
    try {
      const parsed = JSON.parse(doc.dataSnapshot);
      useStore.getState().setData(parsed);
      const title = `[Sao chép] ${doc.title}`;
      saveDocument({
        title,
        description: doc.description,
        authorId: user.id,
        authorName: user.name,
        dataSnapshot: JSON.stringify(parsed),
        status: 'draft',
        tags: doc.tags,
      });
      setPreviewDoc(null);
      setPreviewData(null);
      setShowDocsPanel(false);
      setSaveNotif(true);
      setTimeout(() => setSaveNotif(false), 2000);
    } catch {
      alert('Không thể sao chép tài liệu');
    }
  };

  // === Auto-sync effects ===

  // Keep a ref so the autosave timer can read the latest isSaving value
  // without becoming a dependency of the effect (which would restart the timer).
  const isSavingRef = React.useRef(false);

  // Auto-save debounced (save current data after each change, 3s debounce).
  // Does NOT fire when a manual save is already in progress.
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(async () => {
      if (isSavingRef.current) return; // manual save in progress — skip
      const currentData = useStore.getState().data;
      const title = `PA ${currentData.soVb} - ĐZ ${currentData.dz} cột ${currentData.cot}`;
      const description = currentData.jobItems.join(', ');
      const existingDoc = savedDocuments.find(d => d.authorId === user.id && d.title === title);
      if (existingDoc) {
        isSavingRef.current = true;
        setIsSaving(true);
        try {
          await updateDocument(existingDoc.id, {
            description,
            dataSnapshot: JSON.stringify(currentData),
            tags: [currentData.dz, `cột ${currentData.cot}`, currentData.donViThiCong]
          });
        } finally {
          isSavingRef.current = false;
          setIsSaving(false);
        }
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [data]);

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

  // === Save document ===
  const handleSave = async () => {
    if (!user || isSavingRef.current) return; // already saving — block re-entry
    const title = `PA ${data.soVb} - ĐZ ${data.dz} cột ${data.cot}`;
    const description = data.jobItems.join(', ');

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      // Check if existing doc matches (same user, same soVb)
      const existingDoc = savedDocuments.find(d => d.authorId === user.id && d.title === title);
      if (existingDoc) {
        await updateDocument(existingDoc.id, {
          description,
          dataSnapshot: JSON.stringify(data),
          tags: [data.dz, `cột ${data.cot}`, data.donViThiCong]
        });
      } else {
        await saveDocument({
          title,
          description,
          authorId: user.id,
          authorName: user.name,
          dataSnapshot: JSON.stringify(data),
          status: 'draft',
          tags: [data.dz, `cột ${data.cot}`, data.donViThiCong]
        });
      }
      setSaveNotif(true);
      setTimeout(() => setSaveNotif(false), 2000);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const exportDocx = async () => {
    const isValid = validateData();
    if (!isValid) return;

    setIsExportingDocx(true);
    try {
      const res = await fetch('/api/export/docx', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Server error' }));
        throw new Error(errorData.error || 'Server error');
      }

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
    <div className="flex h-full overflow-hidden flex-col sm:flex-row">
      {/* === Sidebar === */}
      <div className="w-full sm:w-[450px] flex-shrink-0 bg-white border-b sm:border-b-0 sm:border-r border-zinc-200 flex flex-col h-full overflow-hidden">
        {/* Documents Panel Toggle */}
        <button
          onClick={() => setShowDocsPanel(!showDocsPanel)}
          className={`flex items-center justify-between px-4 py-3 border-b transition-all flex-shrink-0 ${
            showDocsPanel ? 'bg-blue-50 border-blue-200' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FolderOpen size={16} className={showDocsPanel ? 'text-blue-600' : 'text-zinc-400'} />
            <span className={`text-sm font-bold ${showDocsPanel ? 'text-blue-700' : 'text-zinc-600'}`}>
              Tài liệu đã lưu
            </span>
            {savedDocuments.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                showDocsPanel ? 'bg-blue-200 text-blue-700' : 'bg-zinc-200 text-zinc-500'
              }`}>
                {savedDocuments.length}
              </span>
            )}
          </div>
          {showDocsPanel ? <ChevronDown size={16} className="text-blue-500" /> : <ChevronRight size={16} className="text-zinc-400" />}
        </button>

        {/* Documents Panel Content */}
        {showDocsPanel && (
          <div className="border-b border-zinc-200 bg-zinc-50 overflow-y-auto flex-shrink-0" style={{ maxHeight: '50vh' }}>
            {/* My documents */}
            {myDocs.length > 0 && (
              <div className="px-3 pt-3 pb-1">
                <h4 className="text-[11px] font-bold text-zinc-400 uppercase mb-2 px-1">Phương án của tôi ({myDocs.length})</h4>
                <div className="space-y-1.5">
                  {myDocs.map(doc => (
                    <div key={doc.id} className="bg-white rounded-xl border border-zinc-200 p-2.5 hover:shadow-sm transition-all group">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FileText size={14} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-zinc-800 truncate">{doc.title}</h5>
                          <p className="text-[10px] text-zinc-400 truncate">{doc.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-zinc-300 flex items-center gap-0.5">
                              <Clock size={9} /> {timeAgo(doc.updatedAt)}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              doc.status === 'approved' ? 'bg-green-100 text-green-600'
                              : doc.status === 'completed' ? 'bg-blue-100 text-blue-600'
                              : 'bg-zinc-100 text-zinc-400'
                            }`}>
                              {doc.status === 'approved' ? 'Duyệt' : doc.status === 'completed' ? 'Xong' : 'Nháp'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => openPreview(doc)}
                            className="p-1.5 rounded-lg text-zinc-300 hover:text-blue-500 hover:bg-blue-50 transition-all"
                            title="Xem trước"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handleLoadDoc(doc)}
                            className="p-1.5 rounded-lg text-zinc-300 hover:text-green-500 hover:bg-green-50 transition-all"
                            title="Mở"
                          >
                            <Download size={13} />
                          </button>
                          <button
                            onClick={() => { if (confirm('Xóa tài liệu này?')) deleteDocument(doc.id); }}
                            className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all sm:opacity-0 sm:group-hover:opacity-100"
                            title="Xóa"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Other users' documents */}
            {otherDocs.length > 0 && (
              <div className="px-3 pt-3 pb-1">
                <h4 className="text-[11px] font-bold text-zinc-400 uppercase mb-2 px-1">Phương án người khác ({otherDocs.length})</h4>
                <div className="space-y-1.5">
                  {otherDocs.map(doc => (
                    <div key={doc.id} className="bg-white rounded-xl border border-zinc-200 p-2.5 hover:shadow-sm transition-all">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FileText size={14} className="text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-zinc-800 truncate">{doc.title}</h5>
                          <p className="text-[10px] text-zinc-400 truncate">{doc.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-amber-500 font-medium">{doc.authorName}</span>
                            <span className="text-[10px] text-zinc-300 flex items-center gap-0.5">
                              <Clock size={9} /> {timeAgo(doc.updatedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => openPreview(doc)}
                            className="p-1.5 rounded-lg text-zinc-300 hover:text-blue-500 hover:bg-blue-50 transition-all"
                            title="Xem trước"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handleLoadDoc(doc)}
                            className="p-1.5 rounded-lg text-zinc-300 hover:text-green-500 hover:bg-green-50 transition-all"
                            title="Tải về & Mở"
                          >
                            <Download size={13} />
                          </button>
                          <button
                            onClick={() => handleCloneDoc(doc)}
                            className="p-1.5 rounded-lg text-zinc-300 hover:text-purple-500 hover:bg-purple-50 transition-all"
                            title="Sao chép về của tôi"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {savedDocuments.length === 0 && (
              <div className="p-6 text-center">
                <FolderOpen size={28} className="mx-auto mb-2 text-zinc-200" />
                <p className="text-xs text-zinc-400">Chưa có tài liệu nào</p>
                <p className="text-[10px] text-zinc-300 mt-1">Bấm "Lưu phương án" để lưu PA hiện tại</p>
              </div>
            )}
            <div className="h-2" />
          </div>
        )}

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

        {/* Footer - Save & Export */}
        <div className="border-t border-zinc-200 p-3 sm:p-4 bg-white">
          {errors.length > 0 && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              {errors.map((err, i) => (
                <div key={i} className="text-xs text-red-600 flex items-center gap-1">
                  <span>⚠</span> {err}
                </div>
              ))}
            </div>
          )}

          {/* Save + New buttons */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex-1 py-2.5 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm ${
                saveNotif
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : isSaving
                    ? 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
              }`}
            >
              {saveNotif ? (
                <>
                  <CheckCircle2 size={16} /> Đã lưu!
                </>
              ) : isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Đang lưu...
                </>
              ) : (
                <>
                  <Save size={16} /> Lưu PA
                </>
              )}
            </button>
            <button
              onClick={() => {
                if (confirm('Tạo phương án mới? Dữ liệu chưa lưu sẽ bị mất.')) {
                  useStore.getState().resetData();
                }
              }}
              className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
            >
              <FilePlus2 size={16} /> Mới
            </button>
          </div>

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

      <DocumentPreviewModal
        document={previewDoc}
        data={previewData}
        onClose={() => { setPreviewDoc(null); setPreviewData(null); }}
        onOpen={handleLoadDoc}
        openLabel="Mở phương án"
        onClone={previewDoc?.authorId !== user?.id ? handleCloneDoc : undefined}
        showPersonnelTable
      />
    </div>
  );
};
