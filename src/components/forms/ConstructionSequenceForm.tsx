import React from 'react';
import { Zap, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Accordion, Input } from '../UI';

export const ConstructionSequenceForm: React.FC = () => {
  const { data, updateData, activeSection, toggleSection, activeJobIdx, setActiveJobIdx, addBocCachDien, addDieuKhienGau, addThaoBocCachDien, scrollPreviewToSection } = useStore();

  const seq = data.sequences?.[activeJobIdx] || {
    guongKiemTra: '',
    eyeCheckText: undefined as string | undefined,
    bocCachDienBlocks: [],
    dieuKhienGauBlocks: [],
    thaoBocCachDienBlocks: []
  };

  const isHM2 = data.jobItems.length > 1 && activeJobIdx === 2;
  const hasEyeCheck = seq.eyeCheckText !== undefined;

  const updateSequence = (field: string, value: any) => {
    const nextSequence = {
      ...seq,
      [field]: value
    };

    const updates: any = {
      sequences: {
        ...data.sequences,
        [activeJobIdx]: nextSequence
      }
    };

    if (data.jobItems.length === 1) {
      updates[field] = value;
    }

    updateData(updates);
  };

  const removeBocCachDien = (blockId: string) => {
    updateSequence('bocCachDienBlocks', seq.bocCachDienBlocks.filter(b => b.id !== blockId));
  };

  const removeDieuKhienGau = (blockId: string) => {
    updateSequence('dieuKhienGauBlocks', seq.dieuKhienGauBlocks.filter(b => b.id !== blockId));
  };

  const removeThaoBocCachDien = (blockId: string) => {
    updateSequence('thaoBocCachDienBlocks', seq.thaoBocCachDienBlocks.filter(b => b.id !== blockId));
  };

  return (
    <Accordion
      title="IV.2 Trình tự thi công"
      isOpen={activeSection === 'trinh-tu'}
      onToggle={() => toggleSection('trinh-tu')}
      icon={<Zap size={18} />}
      sectionId="trinh-tu"
      onInputFocus={() => scrollPreviewToSection('trinh-tu')}
    >
      <div className="space-y-6">
        {/* Job tab switcher */}
        {data.jobItems.length > 1 && (
          <div className="flex gap-2 p-1 bg-zinc-100 rounded-lg">
            {data.jobItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveJobIdx(idx + 1)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeJobIdx === idx + 1
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                Hạng mục {idx + 1}
              </button>
            ))}
          </div>
        )}

        {/* Nút thêm Kiểm tra bằng mắt */}
        {!hasEyeCheck && (
          <button
            onClick={() => updateSequence('eyeCheckText', '')}
            className="w-full py-2 border-2 border-dashed border-zinc-200 rounded-lg text-xs font-bold text-zinc-400 hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Kiểm tra bằng mắt
          </button>
        )}

        {/* Kiểm tra bằng mắt (khi bật) */}
        {hasEyeCheck && (
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl shadow-sm space-y-3 relative group">
            <button
              onClick={() => updateSequence('eyeCheckText', undefined)}
              className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
            <div className="text-xs font-bold text-blue-600 uppercase">
              TT 1: Kiểm tra bằng mắt
            </div>
            <Input
              label="Nội dung kiểm tra"
              value={seq.eyeCheckText || ''}
              onChange={e => updateSequence('eyeCheckText', e.target.value)}
              placeholder="VD: DCL 474-7.TH/1 đang ở vị trí cắt 3 pha"
            />
          </div>
        )}

        {/* Gương kiểm tra (ẩn khi HM2 vì đã kiểm tra gương ở HM1) */}
        {!isHM2 && (
          <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
            <div className="text-xs font-bold text-blue-400">
              TT {hasEyeCheck ? 2 : 1}: Gương kiểm tra
            </div>
            <Input
              label="Dùng gương kiểm tra"
              value={seq.guongKiemTra}
              onChange={e => updateSequence('guongKiemTra', e.target.value)}
              placeholder="VD: chuỗi sứ, khóa máng"
            />
          </div>
        )}

        {/* HM2: hiển thị Kiểm tra bằng mắt thay cho gương nếu chưa bật qua nút trên */}
        {isHM2 && !hasEyeCheck && (
          <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            <strong>Lưu ý:</strong> Hạng mục 2 không dùng gương (đã kiểm tra bằng gương ở HM1).
            Bấm nút "+ Kiểm tra bằng mắt" ở trên nếu cần thêm bước kiểm tra bằng mắt.
          </div>
        )}

        {/* Bọc cách điện */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-zinc-700">Bọc cách điện</div>
            <button
              onClick={() => addBocCachDien(activeJobIdx)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
            >
              <Plus size={14} /> Thêm
            </button>
          </div>
          {seq.bocCachDienBlocks.map((block, idx) => (
            <div key={block.id} className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 space-y-2 relative group">
              <button
                onClick={() => removeBocCachDien(block.id)}
                className="absolute -top-2 -right-2 p-1 bg-white border border-zinc-200 rounded-full text-zinc-400 hover:text-red-500 shadow-sm sm:opacity-0 sm:group-hover:opacity-100 transition-all"
              >
                <Trash2 size={12} />
              </button>
              <Input
                label="Vị trí bọc"
                value={block.viTri}
                onChange={e => {
                  const updated = seq.bocCachDienBlocks.map(b => b.id === block.id ? { ...b, viTri: e.target.value } : b);
                  updateSequence('bocCachDienBlocks', updated);
                }}
              />
              <textarea
                className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                value={block.trinhTu}
                onChange={e => {
                  const updated = seq.bocCachDienBlocks.map(b => b.id === block.id ? { ...b, trinhTu: e.target.value } : b);
                  updateSequence('bocCachDienBlocks', updated);
                }}
                placeholder="Trình tự bọc cách điện..."
              />
            </div>
          ))}
        </div>

        {/* Điều khiển gàu */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-zinc-700">Điều khiển gàu</div>
            <button
              onClick={() => addDieuKhienGau(activeJobIdx)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
            >
              <Plus size={14} /> Thêm
            </button>
          </div>
          {seq.dieuKhienGauBlocks.map((block, idx) => (
            <div key={block.id} className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 space-y-2 relative group">
              <button
                onClick={() => removeDieuKhienGau(block.id)}
                className="absolute -top-2 -right-2 p-1 bg-white border border-zinc-200 rounded-full text-zinc-400 hover:text-red-500 shadow-sm sm:opacity-0 sm:group-hover:opacity-100 transition-all"
              >
                <Trash2 size={12} />
              </button>
              <Input
                label="Để làm gì"
                value={block.deLamGi}
                onChange={e => {
                  const updated = seq.dieuKhienGauBlocks.map(b => b.id === block.id ? { ...b, deLamGi: e.target.value } : b);
                  updateSequence('dieuKhienGauBlocks', updated);
                }}
              />
              <textarea
                className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                value={block.thucHien}
                onChange={e => {
                  const updated = seq.dieuKhienGauBlocks.map(b => b.id === block.id ? { ...b, thucHien: e.target.value } : b);
                  updateSequence('dieuKhienGauBlocks', updated);
                }}
                placeholder="Thực hiện..."
              />
            </div>
          ))}
        </div>

        {/* Tháo bọc cách điện */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-zinc-700">Tháo bọc cách điện</div>
            <button
              onClick={() => addThaoBocCachDien(activeJobIdx)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
            >
              <Plus size={14} /> Thêm
            </button>
          </div>
          {seq.thaoBocCachDienBlocks.map((block, idx) => (
            <div key={block.id} className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 space-y-2 relative group">
              <button
                onClick={() => removeThaoBocCachDien(block.id)}
                className="absolute -top-2 -right-2 p-1 bg-white border border-zinc-200 rounded-full text-zinc-400 hover:text-red-500 shadow-sm sm:opacity-0 sm:group-hover:opacity-100 transition-all"
              >
                <Trash2 size={12} />
              </button>
              <Input
                label="Vị trí tháo"
                value={block.viTri}
                onChange={e => {
                  const updated = seq.thaoBocCachDienBlocks.map(b => b.id === block.id ? { ...b, viTri: e.target.value } : b);
                  updateSequence('thaoBocCachDienBlocks', updated);
                }}
              />
              <textarea
                className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                value={block.trinhTu}
                onChange={e => {
                  const updated = seq.thaoBocCachDienBlocks.map(b => b.id === block.id ? { ...b, trinhTu: e.target.value } : b);
                  updateSequence('thaoBocCachDienBlocks', updated);
                }}
                placeholder="Trình tự tháo bọc..."
              />
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <strong>Lưu ý:</strong> 4 dòng cuối của trình tự thi công (hạ gàu, di chuyển, thu dọn, kết thúc) là cố định và sẽ tự động thêm vào preview/PDF.
        </div>
      </div>
    </Accordion>
  );
};
