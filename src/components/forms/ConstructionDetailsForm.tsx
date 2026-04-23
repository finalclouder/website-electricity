import React from 'react';
import { Truck, Plus, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Accordion, Input, Select } from '../UI';

export const ConstructionDetailsForm: React.FC = () => {
  const {
    data,
    updateData,
    activeSection,
    toggleSection,
    updateCot,
    updateDz,
    scrollPreviewToSection
  } = useStore();

  return (
    <Accordion
      title="II. Đặc điểm công trình"
      isOpen={activeSection === 'dac-diem'}
      onToggle={() => toggleSection('dac-diem')}
      icon={<Truck size={18} />}
      sectionId="dac-diem"
      onInputFocus={() => scrollPreviewToSection('dac-diem')}
    >
      <div className="space-y-6">
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="text-sm font-bold text-zinc-700">Thông tin đường dây</div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="ĐZ (đường dây)"
              value={data.dz}
              onChange={e => updateDz(e.target.value)}
            />
            <Input
              label="Số cột"
              value={data.cot}
              onChange={e => updateCot(e.target.value)}
            />
          </div>
          <Select
            label="Loại mạch"
            value={data.mach}
            onChange={e => updateData({ mach: e.target.value as 'Mạch đơn' | 'Mạch kép' })}
            options={[
              { label: 'Mạch đơn', value: 'Mạch đơn' },
              { label: 'Mạch kép', value: 'Mạch kép' }
            ]}
          />
          {data.mach === 'Mạch kép' && (
            <Input
              label="Đi chung cột với"
              value={data.diChungCot}
              onChange={e => updateData({ diChungCot: e.target.value })}
            />
          )}
          <Input
            label="Máy cắt (MC)"
            value={data.mc}
            onChange={e => updateData({ mc: e.target.value })}
          />
        </div>

        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="text-sm font-bold text-zinc-700">Thông số kỹ thuật</div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Loại cột" value={data.loaiCot} onChange={e => updateData({ loaiCot: e.target.value })} />
            <Input label="Chiều cao cột" value={data.chieuCaoCot} onChange={e => updateData({ chieuCaoCot: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Loại xà" value={data.loaiXa} onChange={e => updateData({ loaiXa: e.target.value })} />
            <Input label="Loại sứ" value={data.loaiSu} onChange={e => updateData({ loaiSu: e.target.value })} />
          </div>
          <Input label="Loại dây" value={data.loaiDay} onChange={e => updateData({ loaiDay: e.target.value })} />
        </div>

        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="text-sm font-bold text-zinc-700">Hiện trạng & Vị trí</div>
          {data.phuongThucNgayLamViec.map((pt, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Phương thức yêu cầu ngày làm việc #{idx + 1}
                </label>
                <button
                  type="button"
                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  onClick={() => {
                    const updated = data.phuongThucNgayLamViec.filter((_, i) => i !== idx);
                    updateData({ phuongThucNgayLamViec: updated });
                  }}
                >
                  <X size={14} />
                </button>
              </div>
              <textarea
                className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                rows={2}
                value={pt}
                onChange={e => {
                  const updated = [...data.phuongThucNgayLamViec];
                  updated[idx] = e.target.value;
                  updateData({ phuongThucNgayLamViec: updated });
                }}
                placeholder="khi thực hiện công việc ... tại cột ... ĐZ ...: Được cấp điện từ lộ ..."
              />
            </div>
          ))}
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            onClick={() => updateData({ phuongThucNgayLamViec: [...data.phuongThucNgayLamViec, ''] })}
          >
            <Plus size={14} />
            Thêm phương thức ngày làm việc
          </button>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Hiện trạng</label>
            <textarea
              className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              rows={2}
              value={data.hienTrang}
              onChange={e => updateData({ hienTrang: e.target.value })}
              placeholder="Hiện trạng..."
            />
          </div>
          <Input label="Địa bàn" value={data.diaBan} onChange={e => updateData({ diaBan: e.target.value })} />
          <Input label="ĐZ nguồn" value={data.dzNguon} onChange={e => updateData({ dzNguon: e.target.value })} />
          <Input label="Phạm vi cấp điện" value={data.phamViCapDien} onChange={e => updateData({ phamViCapDien: e.target.value })} />
        </div>

        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="text-sm font-bold text-zinc-700">Đặc điểm giao thông</div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Đường rộng (m)" value={data.duongRong} onChange={e => updateData({ duongRong: e.target.value })} />
            <Input label="Cột cách đường (m)" value={data.cotCachDuong} onChange={e => updateData({ cotCachDuong: e.target.value })} />
          </div>
        </div>
      </div>
    </Accordion>
  );
};
