import React, { useState } from 'react';
import { FileText, Trash2, Download, Clock, Search, Filter, Plus, Eye, CheckCircle2, Edit3, AlertCircle, X, MapPin, Users, Wrench, Calendar, Zap } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useSocialStore, SavedDocument } from '../store/useSocialStore';
import { useStore } from '../store/useStore';
import { PATCTCData } from '../types';

const STATUS_MAP = {
  draft: { label: 'Bản nháp', color: 'zinc', icon: Edit3 },
  completed: { label: 'Hoàn thành', color: 'blue', icon: CheckCircle2 },
  approved: { label: 'Đã duyệt', color: 'green', icon: CheckCircle2 }
} as const;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export const DocumentsPage: React.FC<{ onViewProfile?: (userId: string) => void }> = ({ onViewProfile }) => {
  const { user } = useAuthStore();
  const { savedDocuments, saveDocument, deleteDocument, updateDocument } = useSocialStore();
  const { data } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

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

  const handleLoad = (doc: SavedDocument) => {
    try {
      const parsed = JSON.parse(doc.dataSnapshot);
      useStore.getState().setData(parsed);
    } catch {
      alert('Không thể tải dữ liệu');
    }
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
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="Tìm kiếm tài liệu..."
          />
        </div>
        <div className="flex gap-1.5 bg-white border border-zinc-200 rounded-xl p-1">
          {['all', 'draft', 'completed', 'approved'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
            <div key={doc.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all p-4 group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText size={24} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-zinc-900 truncate">{doc.title}</h3>
                    <span className={`px-2 py-0.5 bg-${statusInfo.color}-100 text-${statusInfo.color}-700 text-[10px] font-bold uppercase rounded-full flex items-center gap-1`}>
                      <StatusIcon size={10} />
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-2 truncate">{doc.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1"><Clock size={11} /> {formatDate(doc.updatedAt)}</span>
                    <span>•</span>
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
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => openPreview(doc)}
                    className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                    title="Xem trước"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => handleLoad(doc)}
                    className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                    title="Tải về / Mở"
                  >
                    <Download size={16} />
                  </button>
                  {user?.role === 'admin' && doc.status !== 'approved' && (
                    <button
                      onClick={() => updateDocument(doc.id, { status: 'approved' })}
                      className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                      title="Duyệt"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Xóa tài liệu này?')) deleteDocument(doc.id);
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
                    title="Xóa"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
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

      {/* ========= Document Preview Modal ========= */}
      {previewDoc && previewData && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-3 sm:p-6" onClick={() => { setPreviewDoc(null); setPreviewData(null); }}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-gradient-to-r from-blue-50 to-cyan-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900">{previewDoc.title}</h2>
                  <p className="text-xs text-zinc-400">{previewDoc.authorName} · {new Date(previewDoc.updatedAt).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
              <button onClick={() => { setPreviewDoc(null); setPreviewData(null); }} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
                <X size={18} className="text-zinc-400" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <div className="bg-blue-50 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} className="text-blue-500" />
                    <span className="text-xs font-bold text-blue-700 uppercase">Thông tin PA</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-zinc-500">Số VB:</span><span className="font-semibold text-zinc-800">{previewData.soVb}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Ngày lập:</span><span className="font-semibold text-zinc-800">{previewData.ngayLap}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Đơn vị TC:</span><span className="font-semibold text-zinc-800 text-right ml-2">{previewData.donViThiCong}</span></div>
                  </div>
                </div>
                <div className="bg-amber-50 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={14} className="text-amber-500" />
                    <span className="text-xs font-bold text-amber-700 uppercase">Vị trí</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-zinc-500">ĐZ:</span><span className="font-semibold text-zinc-800">{previewData.dz}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Cột:</span><span className="font-semibold text-zinc-800">{previewData.cot}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Địa bàn:</span><span className="font-semibold text-zinc-800 text-right ml-2 text-xs">{previewData.diaBan}</span></div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench size={14} className="text-green-500" />
                  <span className="text-xs font-bold text-green-700 uppercase">Hạng mục</span>
                </div>
                {previewData.jobItems.map((job, i) => (
                  <div key={i} className="bg-green-50 rounded-lg px-3 py-2 text-sm text-zinc-700 flex items-start gap-2 mb-1.5">
                    <span className="w-5 h-5 bg-green-200 rounded-full flex items-center justify-center text-[10px] font-bold text-green-700 flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span>{job}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 mb-1"><Calendar size={14} className="text-purple-500" /><span className="text-xs font-bold text-purple-700">Thời gian</span></div>
                  <p className="text-sm text-zinc-700">{previewData.tg_gio}h ngày {previewData.tg_soNgay}/{previewData.tg_thang}/{previewData.tg_nam}</p>
                </div>
                <div className="bg-rose-50 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 mb-1"><Users size={14} className="text-rose-500" /><span className="text-xs font-bold text-rose-700">Nhân sự</span></div>
                  <p className="text-sm text-zinc-700">{previewData.personnel?.length || 0} người · {previewData.nguoiLap}</p>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-5 py-4 border-t border-zinc-100 flex items-center justify-between gap-3 bg-zinc-50">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                previewDoc.status === 'approved' ? 'bg-green-100 text-green-700'
                : previewDoc.status === 'completed' ? 'bg-blue-100 text-blue-700'
                : 'bg-zinc-200 text-zinc-500'
              }`}>
                {previewDoc.status === 'approved' ? 'Đã duyệt' : previewDoc.status === 'completed' ? 'Hoàn thành' : 'Bản nháp'}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => { setPreviewDoc(null); setPreviewData(null); }} className="px-4 py-2.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-600 text-sm font-medium rounded-xl transition-all">
                  Đóng
                </button>
                <button
                  onClick={() => { handleLoad(previewDoc); setPreviewDoc(null); setPreviewData(null); }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <Download size={14} /> Mở phương án
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};
