import React from 'react';
import { FileText } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Personnel } from '../types';
import { Input, Checkbox, Accordion } from './UI';
import { Plus, Trash2, Users, Clock, Zap } from 'lucide-react';

export const SiteSurveySection: React.FC = () => {
  const { data, updateData, activeSection, toggleSection } = useStore();

  const handleHotlineParticipantToggle = (person: Personnel) => {
    const current = data.ks_thanhPhanHotline || [];
    const exists = current.find(p => p.id === person.id);

    if (exists) {
      updateData({ ks_thanhPhanHotline: current.filter(p => p.id !== person.id) });
    } else {
      updateData({
        ks_thanhPhanHotline: [...current, { id: person.id, name: person.name, role: person.role }]
      });
    }
  };

  const setDrafter = (personId: string) => {
    const current = data.ks_thanhPhanHotline.map(p => {
      let role = p.role.replace(' - Lập PA', '');
      if (p.id === personId) {
        role = `${role} - Lập PA`;
      }
      return { ...p, role };
    });
    updateData({ ks_thanhPhanHotline: current });
  };

  const addDieuDo = () => {
    const newParticipant = { id: Math.random().toString(), name: "", role: "", unit: "" };
    updateData({ ks_thanhPhanDieuDo: [...(data.ks_thanhPhanDieuDo || []), newParticipant] });
  };

  const updateDieuDo = (id: string, updates: any) => {
    const current = data.ks_thanhPhanDieuDo.map(p => p.id === id ? { ...p, ...updates } : p);
    updateData({ ks_thanhPhanDieuDo: current });
  };

  const removeDieuDo = (id: string) => {
    updateData({ ks_thanhPhanDieuDo: data.ks_thanhPhanDieuDo.filter(p => p.id !== id) });
  };

  return (
    <Accordion
      title="V. Biên bản khảo sát hiện trường"
      isOpen={activeSection === 'khao-sat'}
      onToggle={() => toggleSection('khao-sat')}
      icon={<FileText size={18} />}
    >
      <div className="space-y-8">
        {/* 1. Thời gian khảo sát */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-blue-900 font-bold border-b border-zinc-100 pb-2">
            <Clock size={18} className="text-blue-500" />
            Thời gian khảo sát
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Giờ (0-23)"
              type="number"
              min={0}
              max={23}
              value={data.ks_gio}
              onChange={e => updateData({ ks_gio: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="Phút (0-59)"
              type="number"
              min={0}
              max={59}
              value={data.ks_phut}
              onChange={e => updateData({ ks_phut: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="p-3 bg-zinc-50 rounded-lg text-xs text-zinc-500 italic">
            Ngày khảo sát được lấy từ Mục I.10 (Biên bản khảo sát hiện trường).
          </div>
        </div>

        {/* 2. Thành phần tham gia */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-blue-900 font-bold border-b border-zinc-100 pb-2">
            <Users size={18} className="text-blue-500" />
            Thành phần tham gia khảo sát
          </div>

          {/* 2.1 Đơn vị làm công việc */}
          <div className="space-y-3">
            <div className="text-sm font-bold text-zinc-700 flex items-center justify-between">
              <span>1.1 Đại diện đơn vị làm công việc (Hotline)</span>
              <button
                onClick={() => {
                  const drafter = data.nguoiLap;
                  const personnel = data.personnel.filter(p =>
                    p.name === drafter ||
                    p.role === "Đội trưởng" ||
                    p.role === "Đội phó" ||
                    p.role === "CHTT-GSAT" ||
                    p.role === "CHTT - GSAT"
                  );
                  const participants = personnel.map(p => ({
                    id: p.id,
                    name: p.name,
                    role: p.name === drafter ? `${p.role} - Lập PA` : p.role
                  }));
                  updateData({ ks_thanhPhanHotline: participants });
                }}
                className="text-[10px] uppercase tracking-wider font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded transition-colors"
              >
                Cập nhật từ Phụ lục 1
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto p-2 border border-zinc-100 rounded-lg bg-zinc-50/30">
              {data.personnel.map(person => (
                <div key={person.id} className="flex items-center justify-between p-2 hover:bg-white rounded transition-colors border border-transparent hover:border-zinc-200">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      label=""
                      checked={!!data.ks_thanhPhanHotline.find(p => p.id === person.id)}
                      onChange={() => handleHotlineParticipantToggle(person)}
                    />
                    <div>
                      <div className="text-sm font-medium">{person.name}</div>
                      <div className="text-[10px] text-zinc-500 uppercase">{person.role}</div>
                    </div>
                  </div>
                  {data.ks_thanhPhanHotline.find(p => p.id === person.id) && (
                    <button
                      onClick={() => setDrafter(person.id)}
                      className={`text-[10px] px-2 py-1 rounded font-bold transition-all ${
                        data.ks_thanhPhanHotline.find(p => p.id === person.id)?.role.includes('- Lập PA')
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                      }`}
                    >
                      Lập PA
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 2.2 Đơn vị QLVH */}
          <div className="space-y-3 pt-4 border-t border-zinc-100">
            <div className="text-sm font-bold text-zinc-700">1.2 Đại diện đơn vị quản lý vận hành</div>
            <div className="p-3 bg-zinc-50 rounded-lg text-xs text-zinc-600 mb-2">
              Đơn vị: <span className="font-bold">{data.doiQuanLyKhuVuc}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Họ tên đại diện" value={data.ks_qlvh_name} onChange={e => updateData({ ks_qlvh_name: e.target.value })} />
              <Input label="Chức vụ" value={data.ks_qlvh_role} onChange={e => updateData({ ks_qlvh_role: e.target.value })} />
            </div>
          </div>

          {/* 2.3 Đơn vị liên quan */}
          <div className="space-y-3 pt-4 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-zinc-700">1.3 Đại diện các đơn vị liên quan</div>
              <Checkbox label="Có đơn vị liên quan" checked={data.ks_coDieuDo} onChange={val => updateData({ ks_coDieuDo: val })} />
            </div>

            {data.ks_coDieuDo && (
              <div className="space-y-4">
                {data.ks_thanhPhanDieuDo.map((p) => (
                  <div key={p.id} className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 relative group">
                    <button
                      onClick={() => removeDieuDo(p.id)}
                      className="absolute -top-2 -right-2 p-1.5 bg-white border border-zinc-200 rounded-full text-zinc-400 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="grid grid-cols-1 gap-3">
                      <Input label="Họ tên" value={p.name} onChange={e => updateDieuDo(p.id, { name: e.target.value })} />
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="Chức vụ" value={p.role} onChange={e => updateDieuDo(p.id, { role: e.target.value })} />
                        <Input label="Đơn vị" value={p.unit} onChange={e => updateDieuDo(p.id, { unit: e.target.value })} />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addDieuDo}
                  className="w-full py-2 border-2 border-dashed border-zinc-300 rounded-lg text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-600 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Thêm người tham gia
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Các nội dung khác */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-blue-900 font-bold border-b border-zinc-100 pb-2">
            <Zap size={18} className="text-blue-500" />
            Nội dung khảo sát khác
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Checkbox label="Có công việc cần cắt điện?" checked={data.ks_canCatDien} onChange={val => updateData({ ks_canCatDien: val })} />
            <Checkbox label="Có máy phát điện khách hàng phát lên lưới?" checked={data.ks_mayPhatKH} onChange={val => updateData({ ks_mayPhatKH: val })} />
            <Input label="Những nội dung khác" value={data.ks_noiDungKhac} onChange={e => updateData({ ks_noiDungKhac: e.target.value })} placeholder="Ví dụ: Không." />
          </div>
        </div>
      </div>
    </Accordion>
  );
};
