import React from 'react';
import { Shield, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Accordion, Input, DateMaskInput } from '../UI';

export const LegalBasisForm: React.FC = () => {
  const { data, updateData, activeSection, toggleSection, addCanCuBoSung, removeCanCuBoSung, scrollPreviewToSection } = useStore();

  return (
    <Accordion
      title="I. Căn cứ"
      isOpen={activeSection === 'can-cu'}
      onToggle={() => toggleSection('can-cu')}
      icon={<Shield size={18} />}
      sectionId="can-cu"
      onInputFocus={() => scrollPreviewToSection('can-cu')}
    >
      <div className="space-y-6">
        {/* Đội QLKV */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <Input
            label="Đội quản lý khu vực"
            value={data.doiQuanLyKhuVuc}
            onChange={e => updateData({ doiQuanLyKhuVuc: e.target.value })}
          />
        </div>

        {/* Mục 9 */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="text-sm font-bold text-zinc-700">Mục 9: Giấy phép công tác</div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Số văn bản"
              value={data.canCu9_soVanBan}
              onChange={e => updateData({ canCu9_soVanBan: e.target.value })}
            />
            <DateMaskInput
              label="Ngày văn bản"
              value={data.canCu9_ngayVanBan}
              onChange={val => updateData({ canCu9_ngayVanBan: val })}
            />
          </div>
        </div>

        {/* Mục 10 */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="text-sm font-bold text-zinc-700">Mục 10: Biên bản khảo sát hiện trường</div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Ngày"
              type="number"
              min={1}
              max={31}
              value={data.canCu10_ngay}
              onChange={e => updateData({ canCu10_ngay: e.target.value })}
            />
            <Input
              label="Tháng"
              type="number"
              min={1}
              max={12}
              value={data.canCu10_thang}
              onChange={e => updateData({ canCu10_thang: e.target.value })}
            />
            <Input
              label="Năm"
              type="number"
              min={2020}
              max={2099}
              value={data.canCu10_nam}
              onChange={e => updateData({ canCu10_nam: e.target.value })}
            />
          </div>
        </div>

        {/* Căn cứ bổ sung */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-zinc-700">Căn cứ bổ sung</div>
            <button
              onClick={addCanCuBoSung}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
            >
              <Plus size={14} /> Thêm
            </button>
          </div>
          {data.canCuBoSung.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-xs font-bold text-zinc-400 w-6 pt-2">{11 + idx}.</span>
              <div className="flex-1">
                <textarea
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none min-h-[60px]"
                  value={item}
                  onChange={e => {
                    const newItems = [...data.canCuBoSung];
                    newItems[idx] = e.target.value;
                    updateData({ canCuBoSung: newItems });
                  }}
                  placeholder="Nhập nội dung căn cứ bổ sung..."
                />
              </div>
              <button
                onClick={() => removeCanCuBoSung(idx)}
                className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors mt-2"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Accordion>
  );
};
