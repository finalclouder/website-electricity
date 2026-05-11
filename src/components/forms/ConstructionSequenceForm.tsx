import React from 'react';
import { Zap, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Accordion, Input } from '../UI';
import type { SequenceActionBlock, SequenceActionType } from '../../types';

export const ConstructionSequenceForm: React.FC = () => {
  const { data, updateData, activeSection, toggleSection, activeJobIdx, setActiveJobIdx, scrollPreviewToSection } = useStore();

  const seq = data.sequences?.[activeJobIdx] || {
    guongKiemTra: '',
    eyeCheckText: undefined as string | undefined,
    bocCachDienBlocks: [],
    dieuKhienGauBlocks: [],
    thaoBocCachDienBlocks: []
  };

  const isHM2 = data.jobItems.length > 1 && activeJobIdx === 2;
  const hasEyeCheck = seq.eyeCheckText !== undefined;
  const [actionBlocksDraft, setActionBlocksDraft] = React.useState<SequenceActionBlock[]>(() => {
    if (Array.isArray(seq.actionBlocks)) return seq.actionBlocks;
    return [
      ...seq.bocCachDienBlocks.map(block => ({ ...block, type: 'bocCachDien' as const })),
      ...seq.dieuKhienGauBlocks.map(block => ({ ...block, type: 'dieuKhienGau' as const })),
      ...seq.thaoBocCachDienBlocks.map(block => ({ ...block, type: 'thaoBocCachDien' as const }))
    ];
  });

  React.useEffect(() => {
    setActionBlocksDraft(
      Array.isArray(seq.actionBlocks)
        ? seq.actionBlocks
        : [
            ...seq.bocCachDienBlocks.map(block => ({ ...block, type: 'bocCachDien' as const })),
            ...seq.dieuKhienGauBlocks.map(block => ({ ...block, type: 'dieuKhienGau' as const })),
            ...seq.thaoBocCachDienBlocks.map(block => ({ ...block, type: 'thaoBocCachDien' as const }))
          ]
    );
  }, [activeJobIdx, seq.actionBlocks, seq.bocCachDienBlocks, seq.dieuKhienGauBlocks, seq.thaoBocCachDienBlocks]);

  const updateSequence = (field: string, value: any) => {
    const nextSequence = { ...seq };
    if (value === undefined) {
      delete (nextSequence as Record<string, unknown>)[field];
    } else {
      (nextSequence as Record<string, unknown>)[field] = value;
    }

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

  const syncActionBlocks = (actionBlocks: SequenceActionBlock[]) => {
    setActionBlocksDraft(actionBlocks);
    updateSequence('actionBlocks', actionBlocks);
  };

  const createActionBlock = (type: SequenceActionType): SequenceActionBlock => ({
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    viTri: '',
    trinhTu: '',
    deLamGi: '',
    thucHien: ''
  });

  const addActionBlock = (type: SequenceActionType, afterId?: string) => {
    const newBlock = createActionBlock(type);
    if (!afterId) {
      syncActionBlocks([...actionBlocksDraft, newBlock]);
      return newBlock.id;
    }

    const index = actionBlocksDraft.findIndex(block => block.id === afterId);
    if (index < 0) {
      syncActionBlocks([...actionBlocksDraft, newBlock]);
      return newBlock.id;
    }

    syncActionBlocks([
      ...actionBlocksDraft.slice(0, index + 1),
      newBlock,
      ...actionBlocksDraft.slice(index + 1)
    ]);
    return newBlock.id;
  };

  const updateActionBlock = (id: string, updates: Partial<SequenceActionBlock>) => {
    syncActionBlocks(actionBlocksDraft.map(block => block.id === id ? { ...block, ...updates } : block));
  };

  const removeActionBlock = (id: string) => {
    syncActionBlocks(actionBlocksDraft.filter(block => block.id !== id));
  };

  const removeEyeCheck = () => {
    updateSequence('eyeCheckText', undefined);
  };

  const removeGuongKiemTra = () => {
    updateSequence('guongKiemTra', undefined);
  };

  const ActionButtons: React.FC<{ afterId?: string }> = ({ afterId }) => (
    <div className="grid grid-cols-3 gap-2">
      <button
        type="button"
        onClick={() => {
          const newId = addActionBlock('bocCachDien', afterId);
          if (newId) window.setTimeout(() => document.getElementById(`action-block-${newId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 0);
        }}
        className="py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
      >
        <Plus size={13} /> Bọc
      </button>
      <button
        type="button"
        onClick={() => {
          const newId = addActionBlock('dieuKhienGau', afterId);
          if (newId) window.setTimeout(() => document.getElementById(`action-block-${newId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 0);
        }}
        className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
      >
        <Plus size={13} /> ĐK gàu
      </button>
      <button
        type="button"
        onClick={() => {
          const newId = addActionBlock('thaoBocCachDien', afterId);
          if (newId) window.setTimeout(() => document.getElementById(`action-block-${newId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 0);
        }}
        className="py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
      >
        <Plus size={13} /> Tháo bọc
      </button>
    </div>
  );

  const renderActionBlock = (block: SequenceActionBlock, idx: number) => {
    const title = block.type === 'bocCachDien'
      ? 'Bọc cách điện'
      : block.type === 'dieuKhienGau'
        ? 'Điều khiển gàu'
        : 'Tháo bọc cách điện';

    return (
      <div id={`action-block-${block.id}`} key={block.id} className="space-y-2">
        <div className="p-3 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-3 relative group">
          <button
            type="button"
            onClick={() => removeActionBlock(block.id)}
            className="absolute -top-2 -right-2 p-1 bg-white border border-zinc-200 rounded-full text-zinc-400 hover:text-red-500 shadow-sm sm:opacity-0 sm:group-hover:opacity-100 transition-all"
          >
            <Trash2 size={12} />
          </button>
          <div className="text-xs font-bold text-zinc-500 uppercase">
            Bước linh hoạt {idx + 1}: {title}
          </div>

          {block.type === 'dieuKhienGau' ? (
            <>
              <Input
                label="Để làm gì"
                value={block.deLamGi || ''}
                onChange={e => updateActionBlock(block.id, { deLamGi: e.target.value })}
              />
              <textarea
                className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                value={block.thucHien || ''}
                onChange={e => updateActionBlock(block.id, { thucHien: e.target.value })}
                placeholder="Thực hiện..."
              />
            </>
          ) : (
            <>
              <Input
                label={block.type === 'bocCachDien' ? 'Vị trí bọc' : 'Vị trí tháo'}
                value={block.viTri || ''}
                onChange={e => updateActionBlock(block.id, { viTri: e.target.value })}
              />
              <textarea
                className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                value={block.trinhTu || ''}
                onChange={e => updateActionBlock(block.id, { trinhTu: e.target.value })}
                placeholder={block.type === 'bocCachDien' ? 'Trình tự bọc cách điện...' : 'Trình tự tháo bọc...'}
              />
            </>
          )}
        </div>
        <ActionButtons afterId={block.id} />
      </div>
    );
  };

  const actionBlocks = actionBlocksDraft;
  const hasGuongKiemTra = seq.guongKiemTra !== undefined;

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
                type="button"
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
            type="button"
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
              type="button"
              onClick={removeEyeCheck}
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
        {!isHM2 && !hasGuongKiemTra && (
          <button
            type="button"
            onClick={() => updateSequence('guongKiemTra', 'chuỗi sứ, khóa máng')}
            className="w-full py-2 border-2 border-dashed border-zinc-200 rounded-lg text-xs font-bold text-zinc-400 hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Gương kiểm tra
          </button>
        )}

        {!isHM2 && hasGuongKiemTra && (
          <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4 relative group">
            <button
              type="button"
              onClick={removeGuongKiemTra}
              className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
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

        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div>
            <div className="text-sm font-bold text-zinc-700">Các bước linh hoạt</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Sau mỗi bước có thể chèn Bọc, ĐK gàu hoặc Tháo bọc.</div>
          </div>
          {actionBlocks.length === 0 && <ActionButtons />}
          {actionBlocks.map((block, idx) => renderActionBlock(block, idx))}
        </div>

        {/* Note */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <strong>Lưu ý:</strong> 4 dòng cuối của trình tự thi công (hạ gàu, di chuyển, thu dọn, kết thúc) là cố định và sẽ tự động thêm vào preview/PDF.
        </div>
      </div>
    </Accordion>
  );
};
