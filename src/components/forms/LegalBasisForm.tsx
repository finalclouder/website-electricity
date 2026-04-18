import React from 'react';
import { Shield, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Accordion, Input, DateMaskInput } from '../UI';

// Helper: combine separate day/month/year into dd/mm/yyyy string
function combineDateParts(day: string, month: string, year: string): string {
  const d = (day || '').padStart(2, '0');
  const m = (month || '').padStart(2, '0');
  const y = (year || '').padStart(4, '0');
  return `${d}/${m}/${y}`;
}

// Helper: split dd/mm/yyyy into { day, month, year }
function splitDateParts(value: string): { day: string; month: string; year: string } {
  const digits = (value || '').replace(/\D/g, '');
  return {
    day: digits.slice(0, 2),
    month: digits.slice(2, 4),
    year: digits.slice(4, 8),
  };
}

export const LegalBasisForm: React.FC = () => {
  const { data, updateData, activeSection, toggleSection, addCanCuBoSung, removeCanCuBoSung } = useStore();

  return (
    <Accordion
      title="I. Căn cứ"
      isOpen={activeSection === 'can-cu'}
      onToggle={() => toggleSection('can-cu')}
      icon={<Shield size={18} />}
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
          <DateMaskInput
            label="Ngày khảo sát (dd/mm/yyyy)"
            value={combineDateParts(data.canCu10_ngay, data.canCu10_thang, data.canCu10_nam)}
            onChange={val => {
              const parts = splitDateParts(val);
              updateData({
                canCu10_ngay: parts.day,
                canCu10_thang: parts.month,
                canCu10_nam: parts.year,
              });
            }}
          />
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
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400 w-6">{11 + idx}.</span>
              <div className="flex-1">
                <Input
                  value={item}
                  onChange={e => {
                    const newItems = [...data.canCuBoSung];
                    newItems[idx] = e.target.value;
                    updateData({ canCuBoSung: newItems });
                  }}
                  placeholder="Nhập căn cứ bổ sung..."
                />
              </div>
              <button
                onClick={() => removeCanCuBoSung(idx)}
                className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
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
