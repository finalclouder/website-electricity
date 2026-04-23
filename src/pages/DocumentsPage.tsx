import React, { useState } from 'react';
import { FileDown, FileText, Trash2, Download, Clock, Search, Plus, Eye, CheckCircle2, Edit3, Copy, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useSocialStore, SavedDocument } from '../store/useSocialStore';
import { useStore } from '../store/useStore';
import { PATCTCData } from '../types';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import { formatDateTime } from '../utils/date';
import { getAuthHeaders } from '../utils/api';
import { exportPatctcPdf } from '../utils/exportPatctcPdf';

const STATUS_MAP = {
  draft: { label: 'Bản nháp', color: 'zinc', icon: Edit3 },
  completed: { label: 'Hoàn thành', color: 'blue', icon: CheckCircle2 },
  approved: { label: 'Đã duyệt', color: 'green', icon: CheckCircle2 }
} as const;

export const DocumentsPage: React.FC<{ onViewProfile?: (userId: string) => void; onTabChange?: (tab: string) => void }> = ({ onViewProfile, onTabChange }) => {
  const { user } = useAuthStore();
  const { savedDocuments, saveDocument, deleteDocument, updateDocumentStatus, trackDocumentDownload } = useSocialStore();
  const { data } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<SavedDocument | null>(null);
  const [previewData, setPreviewData] = useState<PATCTCData | null>(null);

  const openPreview = (doc: SavedDocument) => {
    try {
      const parsed = JSON.parse(doc.dataSnapshot) as PATCTCData;
      setPreviewData(parsed);
      setPreviewDoc(doc);
    } catch {
      alert('Không thể đọc dữ liệu tài liệu');
    }
  };

  const handleSaveCurrent = () => {
    if (!user) return;
    const title = `PA ${data.soVb} - ĐZ ${data.dz} cột ${data.cot}`;
    const description = data.jobItems.join(', ');

    saveDocument({
      title,
      description,
      authorId: user.id,
      authorName: user.name,
      dataSnapshot: JSON.stringify(data),
      status: 'draft',
      tags: [data.dz, `cột ${data.cot}`, data.donViThiCong]
    });
  };

  const handleLoad = async (doc: SavedDocument) => {
    try {
      if (user && doc.authorId !== user.id) {
        await trackDocumentDownload(doc.id);
      }
      const parsed = JSON.parse(doc.dataSnapshot);
      useStore.getState().setData(parsed);
      onTabChange?.('patctc');
    } catch {
      alert('Không thể tải dữ liệu');
    }
  };

  // Clone another user's document into editor as own draft
  const handleClone = (doc: SavedDocument) => {
    if (!user) return;
    try {
      const parsed = JSON.parse(doc.dataSnapshot);
      useStore.getState().setData(parsed);
      const title = `[Sao chép] ${doc.title}`;
      const description = doc.description;
      saveDocument({
        title,
        description,
        authorId: user.id,
        authorName: user.name,
        dataSnapshot: JSON.stringify(parsed),
        status: 'draft',
        tags: doc.tags,
      });
      onTabChange?.('patctc');
    } catch {
      alert('Không thể sao chép tài liệu');
    }
  };

  const exportPdf = async (doc: SavedDocument) => {
    try {
      if (user && doc.authorId !== user.id) {
        await trackDocumentDownload(doc.id);
      }

      const parsed = JSON.parse(doc.dataSnapshot);
      await exportPatctcPdf(parsed);
    } catch {
      alert('Không thể tải file PDF');
    }
  };

  const exportWord = async (doc: SavedDocument) => {
    try {
      if (user && doc.authorId !== user.id) {
        await trackDocumentDownload(doc.id);
      }

      const parsed = JSON.parse(doc.dataSnapshot);
      const res = await fetch('/api/export/docx', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(parsed),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Server error' }));
        throw new Error(errorData.error || 'Server error');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PATCTC_${parsed.soVb || 'export'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Không thể tải file Word');
    }
  };

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const canPublishDocument = (doc: SavedDocument) => user?.role === 'admin' || doc.authorId === user?.id;

  const handleApproveDocument = async (doc: SavedDocument) => {
    const result = await updateDocumentStatus(doc.id, 'approved');
    if (!result.ok) {
      showNotification(result.error || 'Không thể công khai tài liệu', 'error');
      return;
    }
    showNotification(doc.authorId === user?.id && user?.role !== 'admin' ? 'Đã công khai tài liệu' : 'Đã duyệt tài liệu');
  };

  const filtered = savedDocuments
    .filter(doc => {
      if (filterStatus !== 'all' && doc.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return doc.title.toLowerCase().includes(q) || doc.description.toLowerCase().includes(q) || doc.tags.some(t => t.toLowerCase().includes(q));
      }
      return true;
    });

  return (
    <div className="h-full overflow-y-auto">
    {notification && (
      <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2 text-sm font-medium animate-in slide-in-from-right ${
        notification.type === 'success'
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-red-50 border-red-200 text-red-700'
      }`}>
        {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
        {notification.text}
      </div>
    )}
    <div className="max-w-4xl mx-auto py-4 sm:py-6 px-3 sm:px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Tài liệu đã lưu</h2>
          <p className="text-sm text-zinc-500">{savedDocuments.length} tài liệu</p>
        </div>
        <button
          onClick={handleSaveCurrent}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <Plus size={16} /> Lưu PA hiện tại
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="Tìm kiếm tài liệu..."
          />
        </div>
        <div className="flex gap-1.5 bg-white border border-zinc-200 rounded-xl p-1 overflow-x-auto">
          {['all', 'draft', 'completed', 'approved'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                filterStatus === status ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              {status === 'all' ? 'Tất cả' : STATUS_MAP[status as keyof typeof STATUS_MAP].label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents list */}
      <div className="space-y-3">
        {filtered.map(doc => {
          const statusInfo = STATUS_MAP[doc.status];
          const StatusIcon = statusInfo.icon;

          return (
            <div key={doc.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all p-4">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onViewProfile?.(doc.authorId)}
                  className="shrink-0 transition hover:opacity-80"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <FileText size={20} className="text-blue-600" />
                  </div>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-zinc-900 truncate">{doc.title}</h3>
                    <span className={`px-2 py-0.5 bg-${statusInfo.color}-100 text-${statusInfo.color}-700 text-[10px] font-bold uppercase rounded-full flex items-center gap-1 shrink-0`}>
                      <StatusIcon size={10} />
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-2 truncate">{doc.description}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1"><Clock size={11} /> {formatDateTime(doc.updatedAt)}</span>
                    <span className="flex items-center gap-1"><Download size={11} /> {doc.downloadCount ?? 0} lượt tải</span>
                    <button
                      onClick={() => onViewProfile?.(doc.authorId)}
                      className="hover:text-blue-600 hover:underline transition-colors"
                    >
                      {doc.authorName}
                    </button>
                  </div>
                  {doc.tags.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {doc.tags.filter(Boolean).map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[10px] rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Action buttons — always visible */}
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-zinc-100 overflow-x-auto">
                <button
                  onClick={() => openPreview(doc)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-600 text-xs font-medium whitespace-nowrap transition-colors"
                >
                  <Eye size={14} /> Xem
                </button>
                <button
                  onClick={() => exportPdf(doc)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 rounded-lg text-sky-600 text-xs font-medium whitespace-nowrap transition-colors"
                >
                  <FileDown size={14} /> PDF
                </button>
                <button
                  onClick={() => exportWord(doc)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-600 text-xs font-medium whitespace-nowrap transition-colors"
                >
                  <FileText size={14} /> Word
                </button>
                <button
                  onClick={() => handleLoad(doc)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 hover:bg-green-100 rounded-lg text-green-600 text-xs font-medium whitespace-nowrap transition-colors"
                >
                  <Download size={14} /> Mở
                </button>
                {doc.authorId !== user?.id && (
                  <button
                    onClick={() => handleClone(doc)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-600 text-xs font-medium whitespace-nowrap transition-colors"
                  >
                    <Copy size={14} /> Chép
                  </button>
                )}
                {canPublishDocument(doc) && doc.status !== 'approved' && (
                  <button
                    onClick={() => handleApproveDocument(doc)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 hover:bg-green-100 rounded-lg text-green-600 text-xs font-medium whitespace-nowrap transition-colors"
                  >
                    <CheckCircle2 size={14} /> {doc.authorId === user?.id && user?.role !== 'admin' ? 'Công khai' : 'Duyệt'}
                  </button>
                )}
                {(user?.role === 'admin' || doc.authorId === user?.id) && (
                  <button
                    onClick={() => {
                      if (confirm('Xóa tài liệu này?')) deleteDocument(doc.id);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 text-xs font-medium whitespace-nowrap transition-colors"
                  >
                    <Trash2 size={14} /> Xóa
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto mb-4 text-zinc-200" />
            <h3 className="text-sm font-medium text-zinc-500 mb-1">
              {searchQuery ? 'Không tìm thấy tài liệu' : 'Chưa có tài liệu nào'}
            </h3>
            <p className="text-xs text-zinc-400">
              {searchQuery ? 'Thử tìm với từ khóa khác' : 'Bấm "Lưu PA hiện tại" để lưu phương án đang làm'}
            </p>
          </div>
        )}
      </div>

      <DocumentPreviewModal
        document={previewDoc}
        data={previewData}
        onClose={() => { setPreviewDoc(null); setPreviewData(null); }}
        onOpen={handleLoad}
        openLabel="Tải về & Mở"
        onExportPdf={exportPdf}
        onExportWord={exportWord}
        onClone={previewDoc?.authorId !== user?.id ? handleClone : undefined}
      />
    </div>
    </div>
  );
};
