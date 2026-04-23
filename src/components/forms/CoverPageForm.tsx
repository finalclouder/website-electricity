import React, { useState, useRef, useEffect } from 'react';
import { FileText, Plus, Trash2, Copy, Search } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Accordion, Input, DateMaskInput } from '../UI';
import { JOB_ITEM_TEMPLATES } from '../../constants';

export const CoverPageForm: React.FC = () => {
  const {
    data,
    updateData,
    activeSection,
    toggleSection,
    addJobItem,
    removeJobItem,
    copyJobItem,
    updateJobItem,
    updateCot,
    updateDz,
    scrollPreviewToSection
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

  const filteredTemplates = searchQuery.trim()
    ? JOB_ITEM_TEMPLATES.filter(t => normalize(t).includes(normalize(searchQuery)))
    : JOB_ITEM_TEMPLATES;

  return (
    <Accordion
      title="Trang bìa"
      isOpen={activeSection === 'trang-bia'}
      onToggle={() => toggleSection('trang-bia')}
      icon={<FileText size={18} />}
      sectionId="trang-bia"
      onInputFocus={() => scrollPreviewToSection('trang-bia')}
    >
      <div className="space-y-6">
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

          <div ref={searchRef} className="relative">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                placeholder="Tìm hạng mục... (thay FCO, thay sứ, đấu lèo...)"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowResults(true); }}
                onFocus={() => setShowResults(true)}
              />
            </div>
            {showResults && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredTemplates.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-zinc-400 italic">Không tìm thấy</div>
                ) : (
                  filteredTemplates.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-zinc-50 last:border-0"
                      onClick={() => {
                        navigator.clipboard.writeText(tpl);
                        const emptyIdx = data.jobItems.findIndex(j => !j.trim());
                        if (emptyIdx >= 0) {
                          updateJobItem(emptyIdx, tpl);
                        } else if (data.jobItems.length < 2) {
                          addJobItem();
                          updateJobItem(data.jobItems.length, tpl);
                        }
                        setShowResults(false);
                        setSearchQuery('');
                      }}
                    >
                      {tpl}
                    </button>
                  ))
                )}
              </div>
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
                    onChange={e => updateJobItem(idx, e.target.value)}
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

        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Số cột"
              value={data.cot}
              onChange={e => updateCot(e.target.value)}
            />
            <Input
              label="ĐZ (đường dây)"
              value={data.dz}
              onChange={e => updateDz(e.target.value)}
            />
          </div>
        </div>

        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <DateMaskInput
            label="Ngày lập (dd/mm/yyyy)"
            value={data.ngayLap}
            onChange={val => updateData({ ngayLap: val })}
          />
        </div>

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
