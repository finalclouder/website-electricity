import React, { useEffect, useState } from 'react';
import { CheckCircle2, Eye, FileText, Trash2, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useSocialStore, type SavedDocument } from '../store/useSocialStore';
import { useStore } from '../store/useStore';
import type { PATCTCData } from '../types';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import { Preview } from '../components/Preview';
import { formatDateTime, timeAgo } from '../utils/date';

export const ReviewDocumentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    reviewDocuments,
    reviewDocumentsByStatus,
    fetchReviewDocuments,
    fetchApprovedDocuments,
    updateDocumentStatus,
    deleteDocument,
  } = useSocialStore();

  const [reviewTab, setReviewTab] = useState<'pending' | 'approved'>('pending');
  const [summaryDoc, setSummaryDoc] = useState<SavedDocument | null>(null);
  const [summaryData, setSummaryData] = useState<PATCTCData | null>(null);
  const [detailDoc, setDetailDoc] = useState<SavedDocument | null>(null);
  const [detailData, setDetailData] = useState<PATCTCData | null>(null);
  const [detailZoom, setDetailZoom] = useState(0.8);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const currentStatus = reviewTab === 'approved' ? 'approved' : 'completed';
  const displayedReviewDocuments = reviewDocumentsByStatus[currentStatus]?.length
    ? reviewDocumentsByStatus[currentStatus]
    : reviewDocuments.filter(doc => doc.status === currentStatus);

  const showNotif = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    Promise.all([
      fetchReviewDocuments('completed'),
      fetchReviewDocuments('approved'),
    ]).catch(() => {
      showNotif('Không thể tải tài liệu xét duyệt', 'error');
    });
  }, [fetchReviewDocuments]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-4 text-red-300" />
          <h2 className="text-lg font-bold text-zinc-700">Không có quyền truy cập</h2>
          <p className="text-sm text-zinc-400 mt-1">Chỉ Đội trưởng/Admin mới được xét duyệt tài liệu</p>
        </div>
      </div>
    );
  }

  const parseReviewSnapshot = (doc: SavedDocument): PATCTCData | null => {
    try {
      const fallback = useStore.getState().data;
      const parsed = JSON.parse(doc.dataSnapshot) as Partial<PATCTCData>;
      return {
        ...fallback,
        ...parsed,
        jobItems: Array.isArray(parsed.jobItems) ? parsed.jobItems : fallback.jobItems,
        personnel: Array.isArray(parsed.personnel) ? parsed.personnel : fallback.personnel,
        tools: Array.isArray(parsed.tools) ? parsed.tools : fallback.tools,
        images: Array.isArray(parsed.images) ? parsed.images : fallback.images,
        canCuBoSung: Array.isArray(parsed.canCuBoSung) ? parsed.canCuBoSung : fallback.canCuBoSung,
        phuongThucNgayLamViec: Array.isArray(parsed.phuongThucNgayLamViec) ? parsed.phuongThucNgayLamViec : fallback.phuongThucNgayLamViec,
        risks: Array.isArray(parsed.risks) ? parsed.risks : fallback.risks,
        riskTableJob1: Array.isArray(parsed.riskTableJob1) ? parsed.riskTableJob1 : fallback.riskTableJob1,
        riskTableJob2: Array.isArray(parsed.riskTableJob2) ? parsed.riskTableJob2 : fallback.riskTableJob2,
        hotlineSafetyMeasures: Array.isArray(parsed.hotlineSafetyMeasures) ? parsed.hotlineSafetyMeasures : fallback.hotlineSafetyMeasures,
        vatTuCap: Array.isArray(parsed.vatTuCap) ? parsed.vatTuCap : fallback.vatTuCap,
        ks_thanhPhanHotline: Array.isArray(parsed.ks_thanhPhanHotline) ? parsed.ks_thanhPhanHotline : fallback.ks_thanhPhanHotline,
        ks_thanhPhanDieuDo: Array.isArray(parsed.ks_thanhPhanDieuDo) ? parsed.ks_thanhPhanDieuDo : fallback.ks_thanhPhanDieuDo,
        dvqlvhCutRequests: Array.isArray(parsed.dvqlvhCutRequests) ? parsed.dvqlvhCutRequests : fallback.dvqlvhCutRequests,
        workZoneDiagrams: Array.isArray(parsed.workZoneDiagrams) ? parsed.workZoneDiagrams : fallback.workZoneDiagrams,
      } as PATCTCData;
    } catch {
      showNotif('Không thể đọc dữ liệu phương án', 'error');
      return null;
    }
  };

  const openSummary = (doc: SavedDocument) => {
    const data = parseReviewSnapshot(doc);
    if (!data) return;
    setSummaryDoc(doc);
    setSummaryData(data);
  };

  const openDetail = (doc: SavedDocument) => {
    const data = parseReviewSnapshot(doc);
    if (!data) return;
    setDetailDoc(doc);
    setDetailData(data);
  };

  const approveDocument = async (doc: SavedDocument) => {
    const result = await updateDocumentStatus(doc.id, 'approved');
    if (!result.ok) {
      showNotif(result.error || 'Không thể duyệt tài liệu', 'error');
      return;
    }
    setReviewTab('approved');
    await Promise.all([
      fetchReviewDocuments('approved').catch(() => undefined),
      fetchApprovedDocuments(),
    ]);
    showNotif('Đã duyệt phương án');
  };

  const removeDocument = async (doc: SavedDocument) => {
    if (!confirm(`Xóa tài liệu "${doc.title}"?`)) return;
    try {
      await deleteDocument(doc.id);
      setSummaryDoc(current => current?.id === doc.id ? null : current);
      setSummaryData(current => summaryDoc?.id === doc.id ? null : current);
      setDetailDoc(current => current?.id === doc.id ? null : current);
      setDetailData(current => detailDoc?.id === doc.id ? null : current);
      await Promise.all([
        fetchReviewDocuments(reviewTab === 'approved' ? 'approved' : 'completed').catch(() => undefined),
        fetchApprovedDocuments(),
      ]);
      showNotif('Đã xóa tài liệu');
    } catch (error: any) {
      showNotif(error?.message || 'Không thể xóa tài liệu', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      {notification && (
        <div className={`fixed top-16 right-4 z-[120] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${notification.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {notification.text}
        </div>
      )}

      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Tài liệu cần xét duyệt</h1>
          <p className="text-sm text-zinc-400 mt-1">Duyệt phương án do user gửi cho Đội trưởng.</p>
        </div>
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
          <button
            onClick={() => setReviewTab('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${reviewTab === 'pending' ? 'bg-white text-blue-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            Chờ duyệt
          </button>
          <button
            onClick={() => setReviewTab('approved')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${reviewTab === 'approved' ? 'bg-white text-blue-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            Đã duyệt
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-zinc-100">
          {displayedReviewDocuments.length === 0 ? (
            <div className="p-16 text-center">
              <FileText size={44} className="mx-auto mb-3 text-zinc-200" />
              <p className="text-sm text-zinc-400">
                {reviewTab === 'pending' ? 'Chưa có phương án chờ duyệt' : 'Chưa có phương án đã duyệt'}
              </p>
            </div>
          ) : displayedReviewDocuments.map(doc => (
            <div key={doc.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:bg-zinc-50/60">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-900 truncate">{doc.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${doc.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {doc.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1 truncate">{doc.description}</p>
                <p className="text-[11px] text-zinc-400 mt-1">Người gửi: {doc.authorName} · {timeAgo(doc.updatedAt)}</p>
                {doc.status === 'approved' && (
                  <p className="text-[11px] text-green-700 mt-1 font-medium">
                    Đội trưởng duyệt: {doc.approvedByName || 'Không rõ'} · {formatDateTime(doc.approvedAt || doc.updatedAt)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openSummary(doc)} className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg flex items-center gap-1.5">
                  <Eye size={14} /> Xem
                </button>
                <button onClick={() => openDetail(doc)} className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg flex items-center gap-1.5">
                  <FileText size={14} /> Xem chi tiết
                </button>
                {doc.status !== 'approved' ? (
                  <button onClick={() => approveDocument(doc)} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Duyệt
                  </button>
                ) : (
                  <button onClick={() => removeDocument(doc)} className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg flex items-center gap-1.5">
                    <Trash2 size={14} /> Xóa
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <DocumentPreviewModal
        document={summaryDoc}
        data={summaryData}
        onClose={() => { setSummaryDoc(null); setSummaryData(null); }}
        detailMode="detailed"
        showPersonnelTable
        showToolsSection
        showTags
      />

      {detailDoc && detailData && (
        <div className="fixed inset-0 z-[100] bg-black/65 flex items-center justify-center p-3 sm:p-5" onClick={() => { setDetailDoc(null); setDetailData(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] overflow-hidden flex flex-col" onClick={(event) => event.stopPropagation()}>
            <div className="px-5 py-3 border-b border-zinc-100 bg-gradient-to-r from-blue-50 to-cyan-50 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-zinc-900 truncate">{detailDoc.title}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Người gửi: {detailDoc.authorName} · {timeAgo(detailDoc.updatedAt)}</p>
                {detailDoc.status === 'approved' && (
                  <p className="text-xs text-green-700 mt-0.5 font-medium">
                    Đội trưởng duyệt: {detailDoc.approvedByName || 'Không rõ'} · {formatDateTime(detailDoc.approvedAt || detailDoc.updatedAt)}
                  </p>
                )}
              </div>
              <button onClick={() => { setDetailDoc(null); setDetailData(null); }} className="p-2 hover:bg-white/70 rounded-xl text-zinc-400 hover:text-zinc-700">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden bg-zinc-200">
              <Preview data={detailData} activeSection="" zoom={detailZoom} setZoom={setDetailZoom} />
            </div>
            <div className="px-5 py-3 border-t border-zinc-100 bg-white flex items-center justify-between gap-3">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${detailDoc.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {detailDoc.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => { setDetailDoc(null); setDetailData(null); }} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-bold rounded-xl">
                  Đóng
                </button>
                {detailDoc.status !== 'approved' ? (
                  <button onClick={() => approveDocument(detailDoc)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl flex items-center gap-2">
                    <CheckCircle2 size={16} /> Duyệt
                  </button>
                ) : (
                  <button onClick={() => removeDocument(detailDoc)} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold rounded-xl flex items-center gap-2">
                    <Trash2 size={16} /> Xóa
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
