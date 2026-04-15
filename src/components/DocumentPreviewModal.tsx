import React from 'react';
import { Calendar, Copy, Download, FileText, MapPin, Users, Wrench, X, Zap } from 'lucide-react';
import { SavedDocument } from '../store/useSocialStore';
import { PATCTCData } from '../types';
import { timeAgo } from '../utils/date';

type DetailMode = 'basic' | 'detailed';

interface DocumentPreviewModalProps {
  document: SavedDocument | null;
  data: PATCTCData | null;
  onClose: () => void;
  onOpen: (document: SavedDocument) => void;
  openLabel: string;
  onClone?: (document: SavedDocument) => void;
  onExportPdf?: (document: SavedDocument) => void;
  onExportWord?: (document: SavedDocument) => void;
  cloneLabel?: string;
  detailMode?: DetailMode;
  showPersonnelTable?: boolean;
  showToolsSection?: boolean;
  showTags?: boolean;
}

const STATUS_STYLES = {
  approved: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  draft: 'bg-zinc-200 text-zinc-500'
} as const;

const STATUS_LABELS = {
  approved: 'Đã duyệt',
  completed: 'Hoàn thành',
  draft: 'Bản nháp'
} as const;

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  titleClassName: string;
  cardClassName: string;
  rows: Array<{ label: string; value: React.ReactNode; valueClassName?: string }>;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon, title, titleClassName, cardClassName, rows }) => (
  <div className={`${cardClassName} rounded-xl p-3.5`}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className={`text-xs font-bold uppercase ${titleClassName}`}>{title}</span>
    </div>
    <div className="space-y-1.5 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-3">
          <span className="text-zinc-500">{row.label}</span>
          <span className={`font-semibold text-zinc-800 text-right ${row.valueClassName ?? ''}`}>{row.value}</span>
        </div>
      ))}
    </div>
  </div>
);

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  data,
  onClose,
  onOpen,
  openLabel,
  onClone,
  onExportPdf,
  onExportWord,
  cloneLabel = 'Sao chép',
  detailMode = 'basic',
  showPersonnelTable = false,
  showToolsSection = false,
  showTags = false,
}) => {
  if (!document || !data) return null;

  const selectedTools = data.tools?.filter((tool) => tool.selected) ?? [];
  const showDetailedLayout = detailMode === 'detailed';

  const overviewRows = showDetailedLayout
    ? [
        { label: 'Số văn bản:', value: data.soVb },
        { label: 'Ngày lập:', value: data.ngayLap },
        { label: 'Địa danh:', value: data.diaDanh },
        { label: 'Đơn vị TC:', value: data.donViThiCong, valueClassName: 'ml-2' },
      ]
    : [
        { label: 'Số VB:', value: data.soVb },
        { label: 'Ngày lập:', value: data.ngayLap },
        { label: 'Đơn vị TC:', value: data.donViThiCong, valueClassName: 'ml-2' },
      ];

  const locationRows = showDetailedLayout
    ? [
        { label: 'Đường dây:', value: data.dz },
        { label: 'Cột:', value: data.cot },
        { label: 'Loại cột:', value: data.loaiCot },
        { label: 'Địa bàn:', value: data.diaBan, valueClassName: 'ml-2 text-xs' },
      ]
    : [
        { label: 'ĐZ:', value: data.dz },
        { label: 'Cột:', value: data.cot },
        { label: 'Địa bàn:', value: data.diaBan, valueClassName: 'ml-2 text-xs' },
      ];

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">{document.title}</h2>
              <p className="text-xs text-zinc-400">
                {document.authorName} · {timeAgo(document.updatedAt)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <InfoCard
              icon={<Zap size={14} className="text-blue-500" />}
              title="Thông tin PA"
              titleClassName="text-blue-700"
              cardClassName="bg-blue-50"
              rows={overviewRows}
            />
            <InfoCard
              icon={<MapPin size={14} className="text-amber-500" />}
              title={showDetailedLayout ? 'Đặc điểm CT' : 'Vị trí'}
              titleClassName="text-amber-700"
              cardClassName="bg-amber-50"
              rows={locationRows}
            />
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Wrench size={14} className="text-green-500" />
              <span className="text-xs font-bold text-green-700 uppercase">
                {showDetailedLayout ? 'Hạng mục công việc' : 'Hạng mục'}
              </span>
            </div>
            <div className="space-y-1.5">
              {data.jobItems.map((job, index) => (
                <div key={`${job}-${index}`} className="bg-green-50 rounded-lg px-3 py-2 text-sm text-zinc-700 flex items-start gap-2">
                  <span className="w-5 h-5 bg-green-200 rounded-full flex items-center justify-center text-[10px] font-bold text-green-700 flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span>{job}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <InfoCard
              icon={<Calendar size={14} className="text-purple-500" />}
              title="Thời gian"
              titleClassName="text-purple-700"
              cardClassName="bg-purple-50"
              rows={
                showDetailedLayout
                  ? [
                      { label: 'Bắt đầu:', value: `${data.tg_gio}h ngày ${data.tg_soNgay}/${data.tg_thang}/${data.tg_nam}` },
                      { label: 'Mạch:', value: data.mach },
                    ]
                  : [{ label: '', value: `${data.tg_gio}h ngày ${data.tg_soNgay}/${data.tg_thang}/${data.tg_nam}`, valueClassName: 'text-left w-full' }]
              }
            />
            <InfoCard
              icon={<Users size={14} className="text-rose-500" />}
              title="Nhân sự"
              titleClassName="text-rose-700"
              cardClassName="bg-rose-50"
              rows={
                showDetailedLayout
                  ? [
                      { label: 'Người lập:', value: data.nguoiLap },
                      { label: 'Đội trưởng:', value: data.doiTruong },
                      { label: 'Số nhân công:', value: `${data.personnel?.length || 0} người` },
                    ]
                  : [
                      { label: '', value: `${data.personnel?.length || 0} người · ${data.nguoiLap}`, valueClassName: 'text-left w-full' },
                    ]
              }
            />
          </div>

          {showPersonnelTable && data.personnel && data.personnel.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-indigo-500" />
                <span className="text-xs font-bold text-indigo-700 uppercase">
                  {showDetailedLayout ? `Danh sách nhân sự (${data.personnel.length})` : `Nhân sự (${data.personnel.length})`}
                </span>
              </div>
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-zinc-500 font-bold">Họ tên</th>
                      <th className="px-3 py-2 text-left text-zinc-500 font-bold">Chức danh</th>
                      <th className="px-3 py-2 text-left text-zinc-500 font-bold hidden sm:table-cell">Công việc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {data.personnel.slice(0, 10).map((person) => (
                      <tr key={person.id} className="hover:bg-zinc-50">
                        <td className="px-3 py-2 font-medium text-zinc-800">{person.name}</td>
                        <td className="px-3 py-2 text-zinc-500">{person.role}</td>
                        <td className="px-3 py-2 text-zinc-500 hidden sm:table-cell">{person.job}</td>
                      </tr>
                    ))}
                    {data.personnel.length > 10 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-center text-zinc-400 italic">
                          +{data.personnel.length - 10} người khác...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showToolsSection && selectedTools.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wrench size={14} className="text-zinc-500" />
                <span className="text-xs font-bold text-zinc-600 uppercase">Dụng cụ ({selectedTools.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedTools.slice(0, 15).map((tool) => (
                  <span key={tool.id} className="px-2.5 py-1 bg-zinc-100 text-zinc-600 text-[11px] rounded-lg">
                    {tool.name}
                  </span>
                ))}
                {selectedTools.length > 15 && (
                  <span className="px-2.5 py-1 bg-zinc-100 text-zinc-400 text-[11px] rounded-lg italic">
                    +{selectedTools.length - 15} khác
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-zinc-100 flex items-center justify-between gap-3 bg-zinc-50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${STATUS_STYLES[document.status]}`}>
              {STATUS_LABELS[document.status]}
            </span>
            {showTags && document.tags?.filter(Boolean).map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-zinc-100 text-zinc-400 text-[10px] rounded-full">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-600 text-sm font-medium rounded-xl transition-all"
            >
              Đóng
            </button>
            {onExportPdf && (
              <button
                onClick={() => onExportPdf(document)}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-sky-500/20"
              >
                <Download size={14} /> PDF
              </button>
            )}
            {onExportWord && (
              <button
                onClick={() => onExportWord(document)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <FileText size={14} /> Word
              </button>
            )}
            {onClone && (
              <button
                onClick={() => {
                  onClone(document);
                  onClose();
                }}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20"
              >
                <Copy size={14} /> {cloneLabel}
              </button>
            )}
            <button
              onClick={() => {
                onOpen(document);
                onClose();
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <Download size={14} /> {openLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
