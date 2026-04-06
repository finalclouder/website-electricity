import React from 'react';
import { Truck } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Accordion, Input, Select } from '../UI';

export const ConstructionDetailsForm: React.FC = () => {
  const { data, updateData, activeSection, toggleSection } = useStore();

  return (
    <Accordion
      title="II. Đặc điểm công trình"
      isOpen={activeSection === 'dac-diem'}
      onToggle={() => toggleSection('dac-diem')}
      icon={<Truck size={18} />}
    >
      <div className="space-y-6">
        {/* Đường dây + Cột */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="text-sm font-bold text-zinc-700">Thông tin đường dây</div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="ĐZ (đường dây)"
              value={data.dz}
              onChange={e => updateData({ dz: e.target.value })}
            />
            <Input
              label="Số cột"
              value={data.cot}
              onChange={e => updateData({ cot: e.target.value })}
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

        {/* Thông số kỹ thuật */}
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

        {/* Hiện trạng + Địa bàn */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="text-sm font-bold text-zinc-700">Hiện trạng & Vị trí</div>
          <Input label="Hiện trạng" value={data.hienTrang} onChange={e => updateData({ hienTrang: e.target.value })} />
          <Input label="Địa bàn" value={data.diaBan} onChange={e => updateData({ diaBan: e.target.value })} />
          <Input label="ĐZ nguồn" value={data.dzNguon} onChange={e => updateData({ dzNguon: e.target.value })} />
          <Input label="Phạm vi cấp điện" value={data.phamViCapDien} onChange={e => updateData({ phamViCapDien: e.target.value })} />
        </div>

        {/* Giao thông */}
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
