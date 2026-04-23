import React from 'react';
import { FileText, Plus, Trash2, Users, Clock, Zap } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Input, Checkbox, Accordion } from './UI';

export const SiteSurveySection: React.FC = () => {
  const {
    data,
    updateData,
    activeSection,
    toggleSection,
    setSurveyDrafter,
    scrollPreviewToSection
  } = useStore();

  const hotlineParticipants = data.ks_thanhPhanHotline.filter(person => person.id !== 'ks-lap-pa-placeholder');

  const addDieuDo = () => {
    const newParticipant = { id: Math.random().toString(), name: '', role: '', unit: '' };
    updateData({ ks_thanhPhanDieuDo: [...(data.ks_thanhPhanDieuDo || []), newParticipant] });
  };

  const updateDieuDo = (id: string, updates: { name?: string; role?: string; unit?: string }) => {
    updateData({
      ks_thanhPhanDieuDo: data.ks_thanhPhanDieuDo.map(person =>
        person.id === id ? { ...person, ...updates } : person
      )
    });
  };

  const removeDieuDo = (id: string) => {
    updateData({ ks_thanhPhanDieuDo: data.ks_thanhPhanDieuDo.filter(person => person.id !== id) });
  };

  return (
    <Accordion
      title="V. Biên bản khảo sát hiện trường"
      isOpen={activeSection === 'khao-sat'}
      onToggle={() => toggleSection('khao-sat')}
      icon={<FileText size={18} />}
      sectionId="khao-sat"
      onInputFocus={() => scrollPreviewToSection('khao-sat')}
    >
      <div className="space-y-8">
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
              value={data.ks_gio ?? ''}
              onChange={e => {
                const raw = e.target.value;
                updateData({ ks_gio: raw === '' ? ('' as any) : parseInt(raw, 10) });
              }}
              onBlur={() => {
                if (!Number.isFinite(Number(data.ks_gio))) {
                  updateData({ ks_gio: 0 });
                }
              }}
            />
            <Input
              label="Phút (0-59)"
              type="number"
              min={0}
              max={59}
              value={data.ks_phut ?? ''}
              onChange={e => {
                const raw = e.target.value;
                updateData({ ks_phut: raw === '' ? ('' as any) : parseInt(raw, 10) });
              }}
              onBlur={() => {
                if (!Number.isFinite(Number(data.ks_phut))) {
                  updateData({ ks_phut: 0 });
                }
              }}
            />
          </div>
          <div className="p-3 bg-zinc-50 rounded-lg text-xs text-zinc-500 italic">
            Ngày khảo sát được lấy từ Mục I.10.
          </div>
        </div>

        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-blue-900 font-bold border-b border-zinc-100 pb-2">
            <Users size={18} className="text-blue-500" />
            Thành phần tham gia khảo sát
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-700">1.1 Đại diện đơn vị làm công việc (Hotline)</span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-blue-600">
                Tự động từ Phụ lục 1
              </span>
            </div>

            {hotlineParticipants.length === 0 ? (
              <div className="p-3 bg-zinc-50 rounded-lg text-xs text-zinc-500 italic">
                Chưa có nhân sự CHTT-GSAT. Chọn vai trò này ở Phụ lục 1 để thêm vào biên bản khảo sát.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto p-2 border border-zinc-100 rounded-lg bg-zinc-50/30">
                {hotlineParticipants.map(person => {
                  const isDrafter = data.ks_lapPAId === person.id;

                  return (
                    <div
                      key={person.id}
                      className="flex items-center justify-between p-2 hover:bg-white rounded transition-colors border border-transparent hover:border-zinc-200"
                    >
                      <div>
                        <div className="text-sm font-medium">{person.name || '..................................................'}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">{person.role}</div>
                      </div>
                      <button
                        onClick={() => setSurveyDrafter(person.id)}
                        className={`text-[10px] px-2 py-1 rounded font-bold transition-all ${
                          isDrafter
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                        }`}
                      >
                        Lập PA
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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

          <div className="space-y-3 pt-4 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-zinc-700">1.3 Đại diện các đơn vị liên quan</div>
              <Checkbox label="Có đơn vị liên quan" checked={data.ks_coDieuDo} onChange={val => updateData({ ks_coDieuDo: val })} />
            </div>

            {data.ks_coDieuDo && (
              <div className="space-y-4">
                {data.ks_thanhPhanDieuDo.map(person => (
                  <div key={person.id} className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 relative group">
                    <button
                      onClick={() => removeDieuDo(person.id)}
                      className="absolute -top-2 -right-2 p-1.5 bg-white border border-zinc-200 rounded-full text-zinc-400 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="grid grid-cols-1 gap-3">
                      <Input label="Họ tên" value={person.name} onChange={e => updateDieuDo(person.id, { name: e.target.value })} />
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="Chức vụ" value={person.role} onChange={e => updateDieuDo(person.id, { role: e.target.value })} />
                        <Input label="Đơn vị" value={person.unit} onChange={e => updateDieuDo(person.id, { unit: e.target.value })} />
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

        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-blue-900 font-bold border-b border-zinc-100 pb-2">
            <Zap size={18} className="text-blue-500" />
            Nội dung khảo sát khác
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">MC (hiển thị ở mục 12.3)</label>
            <input
              className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={data.mc}
              onChange={e => updateData({ mc: e.target.value })}
              placeholder="VD: 483 E7.34"
            />
            <div className="p-2 bg-zinc-50 rounded text-[10px] text-zinc-400 italic">
              Hiển thị tại 12.3: "...ĐKBV MC <span className="font-bold text-zinc-600">{data.mc}</span>"
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Checkbox label="Thêm ghi chú phương thức thay đổi (Mục 8)" checked={data.ks_ghiChuPhuongThuc} onChange={val => updateData({ ks_ghiChuPhuongThuc: val })} />
            <Checkbox label="Có công việc cần cắt điện?" checked={data.ks_canCatDien} onChange={val => updateData({ ks_canCatDien: val })} />
            <Checkbox label="Có máy phát điện khách hàng phát lên lưới?" checked={data.ks_mayPhatKH} onChange={val => updateData({ ks_mayPhatKH: val })} />
            <Input label="Những nội dung khác" value={data.ks_noiDungKhac} onChange={e => updateData({ ks_noiDungKhac: e.target.value })} placeholder="Ví dụ: Không." />
          </div>

          <div className="space-y-3 pt-4 border-t border-zinc-100">
            <div className="text-sm font-bold text-zinc-700">12.1.1: Thực hiện (Tự động lấy từ Mục 8)</div>
            <div className="space-y-2">
              {data.hotlineSafetyMeasures
                .flatMap(measure => measure.extraMeasures || [])
                .filter(measure => measure && measure.trim())
                .map((autoReq, idx) => (
                  <div key={`auto-${idx}`} className="flex gap-3 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      Auto
                    </div>
                    <div className="text-xs text-blue-800 italic">{autoReq}</div>
                  </div>
                ))}

              {data.dvqlvhCutRequests.map((req, idx) => (
                <div key={idx} className="flex gap-2 items-start group">
                  <div className="flex-1">
                    <textarea
                      className="w-full p-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[60px]"
                      placeholder={`Yêu cầu bổ sung #${idx + 1}`}
                      value={req}
                      onChange={e => {
                        const newList = [...data.dvqlvhCutRequests];
                        newList[idx] = e.target.value;
                        updateData({ dvqlvhCutRequests: newList });
                      }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      const newList = data.dvqlvhCutRequests.filter((_, i) => i !== idx);
                      updateData({ dvqlvhCutRequests: newList });
                    }}
                    className="p-2 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => updateData({ dvqlvhCutRequests: [...data.dvqlvhCutRequests, ''] })}
                className="w-full py-2 border-2 border-dashed border-zinc-300 rounded-lg text-xs text-zinc-500 hover:border-zinc-400 hover:text-zinc-600 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Thêm yêu cầu ĐVQLVH cắt điện (bổ sung)
              </button>
            </div>
          </div>
        </div>
      </div>
    </Accordion>
  );
};
