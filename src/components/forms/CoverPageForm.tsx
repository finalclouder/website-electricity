import React from 'react';
import { FileText, Plus, Trash2, Copy } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Accordion, Input, DateMaskInput } from '../UI';

export const CoverPageForm: React.FC = () => {
  const { data, updateData, activeSection, toggleSection, addJobItem, removeJobItem, copyJobItem } = useStore();

  return (
    <Accordion
      title="Trang bìa"
      isOpen={activeSection === 'trang-bia'}
      onToggle={() => toggleSection('trang-bia')}
      icon={<FileText size={18} />}
    >
      <div className="space-y-6">
        {/* Số văn bản + Địa danh */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Số văn bản"
              value={data.soVb}
              onChange={e => updateData({ soVb: e.target.value })}
            />
            <Input
              label="Địa danh"
              value={data.diaDanh}
              onChange={e => updateData({ diaDanh: e.target.value })}
            />
          </div>
        </div>

        {/* Hạng mục công việc */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-zinc-700">Hạng mục công việc</div>
            {data.jobItems.length < 2 && (
              <button
                onClick={addJobItem}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
              >
                <Plus size={14} /> Thêm hạng mục
              </button>
            )}
          </div>
          {data.jobItems.map((item, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-400 w-6">
                  {data.jobItems.length > 1 ? `${idx + 1}.` : ''}
                </span>
                <div className="flex-1">
                  <textarea
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    rows={2}
                    value={item}
                    onChange={e => {
                      const newItems = [...data.jobItems];
                      newItems[idx] = e.target.value;
                      updateData({ jobItems: newItems });
                    }}
                    placeholder="Nhập hạng mục công việc..."
                  />
                </div>
                <div className="flex flex-col gap-1">
                  {data.jobItems.length < 2 && (
                    <button
                      onClick={() => copyJobItem(idx)}
                      className="p-1.5 text-zinc-400 hover:text-blue-500 transition-colors"
                      title="Sao chép"
                    >
                      <Copy size={14} />
                    </button>
                  )}
                  {data.jobItems.length > 1 && (
                    <button
                      onClick={() => removeJobItem(idx)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cột + ĐZ */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Số cột"
              value={data.cot}
              onChange={e => updateData({ cot: e.target.value })}
            />
            <Input
              label="ĐZ (đường dây)"
              value={data.dz}
              onChange={e => updateData({ dz: e.target.value })}
            />
          </div>
        </div>

        {/* Ngày lập */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <DateMaskInput
            label="Ngày lập (dd/mm/yyyy)"
            value={data.ngayLap}
            onChange={val => updateData({ ngayLap: val })}
          />
        </div>

        {/* Người lập / kiểm tra / đội trưởng */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <Input
            label="Người lập"
            value={data.nguoiLap}
            onChange={e => updateData({ nguoiLap: e.target.value })}
          />
          <Input
            label="Người kiểm tra"
            value={data.nguoiKiemTra}
            onChange={e => updateData({ nguoiKiemTra: e.target.value })}
          />
          <Input
            label="Đội trưởng"
            value={data.doiTruong}
            onChange={e => updateData({ doiTruong: e.target.value })}
          />
        </div>
      </div>
    </Accordion>
  );
};
