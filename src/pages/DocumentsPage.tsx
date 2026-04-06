import React, { useState } from 'react';
import { FileText, Trash2, Download, Clock, Search, Filter, Plus, Eye, CheckCircle2, Edit3, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useSocialStore, SavedDocument } from '../store/useSocialStore';
import { useStore } from '../store/useStore';

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
                    onClick={() => handleLoad(doc)}
                    className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                    title="Mở / Tải lại"
                  >
                    <Eye size={16} />
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
    </div>
    </div>
  );
};
