import React from 'react';
import { Shield, Plus, Trash2 } from 'lucide-react';
import { useStore, ensureLocation } from '../../store/useStore';
import { Accordion, Input, Checkbox } from '../UI';
import { RiskItem } from '../../types';
import { ensureBulletFormat } from '../../utils/patctcFormat';

export const RiskIdentificationForm: React.FC = () => {
  const { data, updateData, activeSection, toggleSection, hotlineTab, setHotlineTab, scrollPreviewToSection } = useStore();

  const updateRiskTable = (jobNum: 1 | 2, riskId: string, field: string, value: any) => {
    const key = jobNum === 1 ? 'riskTableJob1' : 'riskTableJob2';
    const table = data[key].map(r => {
      if (r.id === riskId) {
        if (field === 'location' || field === 'note') {
          return { ...r, [field]: value };
        }
      }
      return r;
    });
    updateData({ [key]: table });
  };

  const updateRiskDetail = (jobNum: 1 | 2, riskId: string, detailId: string, field: string, value: string) => {
    const key = jobNum === 1 ? 'riskTableJob1' : 'riskTableJob2';
    const table = data[key].map(r => {
      if (r.id === riskId) {
        return {
          ...r,
          details: r.details.map(d => d.id === detailId ? { ...d, [field]: value } : d)
        };
      }
      return r;
    });
    updateData({ [key]: table });
  };

  const addRiskRow = (jobNum: 1 | 2) => {
    const key = jobNum === 1 ? 'riskTableJob1' : 'riskTableJob2';
    const newRisk: RiskItem = {
      id: Date.now().toString(),
      location: `${ensureLocation(data.jobItems[jobNum - 1] || '', data.cot, data.dz)}.`,
      details: [{ id: Date.now().toString() + '_d', hazard: '', measure: '' }],
      note: ''
    };
    updateData({ [key]: [...data[key], newRisk] });
  };

  const removeRiskRow = (jobNum: 1 | 2, riskId: string) => {
    const key = jobNum === 1 ? 'riskTableJob1' : 'riskTableJob2';
    if (data[key].length <= 1) return;
    updateData({ [key]: data[key].filter(r => r.id !== riskId) });
  };

  const addRiskDetail = (jobNum: 1 | 2, riskId: string) => {
    const key = jobNum === 1 ? 'riskTableJob1' : 'riskTableJob2';
    const table = data[key].map(r => {
      if (r.id === riskId) {
        return {
          ...r,
          details: [...r.details, { id: Date.now().toString(), hazard: '', measure: '' }]
        };
      }
      return r;
    });
    updateData({ [key]: table });
  };

  const renderRiskTable = (jobNum: 1 | 2) => {
    const key = jobNum === 1 ? 'riskTableJob1' : 'riskTableJob2';
    const risks = data[key];

    return (
      <div className="space-y-3">
        {risks.map((risk, rIdx) => (
          <div key={risk.id} className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500">Vị trí {rIdx + 1}</span>
              {risks.length > 1 && (
                <button onClick={() => removeRiskRow(jobNum, risk.id)} className="p-1 text-zinc-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <Input
              label="Vị trí"
              value={risk.location}
              onChange={e => updateRiskTable(jobNum, risk.id, 'location', e.target.value)}
            />
            {risk.details.map((detail, dIdx) => (
              <div key={detail.id} className="pl-4 border-l-2 border-blue-200 space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase">Mối nguy {dIdx + 1}</span>
                <textarea
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  value={detail.hazard}
                  onChange={e => updateRiskDetail(jobNum, risk.id, detail.id, 'hazard', e.target.value)}
                  onBlur={e => {
                    const formatted = ensureBulletFormat(e.target.value);
                    if (formatted !== e.target.value) {
                      updateRiskDetail(jobNum, risk.id, detail.id, 'hazard', formatted);
                    }
                  }}
                  placeholder="Nhận diện mối nguy..."
                />
                <textarea
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  value={detail.measure}
                  onChange={e => updateRiskDetail(jobNum, risk.id, detail.id, 'measure', e.target.value)}
                  onBlur={e => {
                    const formatted = ensureBulletFormat(e.target.value);
                    if (formatted !== e.target.value) {
                      updateRiskDetail(jobNum, risk.id, detail.id, 'measure', formatted);
                    }
                  }}
                  placeholder="Biện pháp phòng tránh..."
                />
              </div>
            ))}
            <button
              onClick={() => addRiskDetail(jobNum, risk.id)}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus size={12} /> Thêm mối nguy
            </button>
            <Input
              label="Ghi chú"
              value={risk.note || ''}
              onChange={e => updateRiskTable(jobNum, risk.id, 'note', e.target.value)}
            />
          </div>
        ))}
        <button
          onClick={() => addRiskRow(jobNum)}
          className="w-full py-2 border-2 border-dashed border-zinc-300 rounded-lg text-sm text-zinc-500 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={14} /> Thêm vị trí
        </button>
      </div>
    );
  };

  return (
    <Accordion
      title="IV.1 Nhận diện rủi ro"
      isOpen={activeSection === 'rui-ro'}
      onToggle={() => toggleSection('rui-ro')}
      icon={<Shield size={18} />}
      sectionId="rui-ro"
      onInputFocus={() => scrollPreviewToSection('rui-ro')}
    >
      <div className="space-y-6">
        {/* Thời gian dự kiến */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="text-sm font-bold text-zinc-700">Thời gian dự kiến</div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Giờ"
              type="number"
              min={0}
              max={23}
              value={data.tg_gio ?? ''}
              onChange={e => {
                const raw = e.target.value;
                updateData({ tg_gio: raw === '' ? ('' as any) : parseInt(raw) });
              }}
              onBlur={() => {
                if (!Number.isFinite(Number(data.tg_gio))) {
                  updateData({ tg_gio: 0 });
                }
              }}
            />
            <Input
              label="Số ngày"
              type="number"
              min={1}
              value={data.tg_soNgay ?? ''}
              onChange={e => {
                const raw = e.target.value;
                updateData({ tg_soNgay: raw === '' ? ('' as any) : parseInt(raw) });
              }}
              onBlur={() => {
                if (!Number.isFinite(Number(data.tg_soNgay))) {
                  updateData({ tg_soNgay: 1 });
                }
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tháng"
              type="number"
              min={1}
              max={12}
              value={data.tg_thang ?? ''}
              onChange={e => {
                const raw = e.target.value;
                updateData({ tg_thang: raw === '' ? ('' as any) : parseInt(raw) });
              }}
              onBlur={() => {
                if (!Number.isFinite(Number(data.tg_thang))) {
                  updateData({ tg_thang: 1 });
                }
              }}
            />
            <Input
              label="Năm"
              type="number"
              min={2020}
              max={2099}
              value={data.tg_nam ?? ''}
              onChange={e => {
                const raw = e.target.value;
                updateData({ tg_nam: raw === '' ? ('' as any) : parseInt(raw) });
              }}
              onBlur={() => {
                if (!Number.isFinite(Number(data.tg_nam))) {
                  updateData({ tg_nam: new Date().getFullYear() });
                }
              }}
            />
          </div>
        </div>

        {/* Bảng rủi ro */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="text-sm font-bold text-zinc-700">
            {data.jobItems.length > 1 ? 'Bảng rủi ro - Hạng mục 1' : 'Bảng nhận diện rủi ro'}
          </div>
          {renderRiskTable(1)}
        </div>

        {data.jobItems.length > 1 && (
          <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
            <div className="text-sm font-bold text-zinc-700">Bảng rủi ro - Hạng mục 2</div>
            {renderRiskTable(2)}
          </div>
        )}

        {/* Biện pháp an toàn hotline */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
          <div className="text-sm font-bold text-zinc-700">Biện pháp an toàn hotline</div>
          <Checkbox
            label={`Khóa chức năng TĐL (F79) của ĐKBV MC ${data.mc}`}
            checked={data.khoaF79}
            onChange={val => updateData({ khoaF79: val })}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Checkbox
                label="Cắt DCL"
                checked={data.catDcl}
                onChange={val => updateData({ catDcl: val })}
              />
              {data.catDcl && (
                <Input
                  label="Mã DCL"
                  value={data.maDcl}
                  onChange={e => updateData({ maDcl: e.target.value })}
                />
              )}
            </div>
            <div className="space-y-2">
              <Checkbox
                label="Cắt FCO"
                checked={data.catFco}
                onChange={val => updateData({ catFco: val })}
              />
              {data.catFco && (
                <Input
                  label="Mã FCO"
                  value={data.maFco}
                  onChange={e => updateData({ maFco: e.target.value })}
                />
              )}
            </div>
          </div>

          {/* Tab cho các hạng mục */}
          {data.jobItems.length > 1 && (
            <div className="flex p-1 bg-zinc-100 rounded-lg mb-2">
              {data.jobItems.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setHotlineTab(idx)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    hotlineTab === idx
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  Hạng mục {idx + 1}
                </button>
              ))}
            </div>
          )}

          {/* Biện pháp per hạng mục */}
          {data.hotlineSafetyMeasures.map((measure, mIdx) => {
            if (data.jobItems.length > 1 && mIdx !== hotlineTab) return null;

            return (
              <div key={measure.id} className="space-y-4">
                {/* MC input per-measure */}
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="text-xs font-bold text-blue-800 uppercase whitespace-nowrap">
                    Khóa chức năng TĐL (F79) của ĐKBV MC:
                  </div>
                  <div className="flex-1">
                    <input
                      className="w-full text-sm bg-white border border-blue-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-900"
                      value={measure.mc || data.mc}
                      onChange={e => {
                        const newMc = e.target.value;
                        const newMeasures = [...data.hotlineSafetyMeasures];
                        newMeasures[mIdx] = {
                          ...newMeasures[mIdx],
                          mc: newMc,
                          safetyMeasure: newMeasures[mIdx].safetyMeasure.includes(`MC ${measure.mc || data.mc}`)
                            ? newMeasures[mIdx].safetyMeasure.replace(`MC ${measure.mc || data.mc}`, `MC ${newMc}`)
                            : newMeasures[mIdx].safetyMeasure
                        };
                        updateData({ hotlineSafetyMeasures: newMeasures });
                      }}
                      placeholder="Nhập mã hiệu máy cắt..."
                    />
                  </div>
                </div>

                {/* Safety measure text (Mục 8) */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase px-1">
                    Biện pháp an toàn (Mục 8)
                  </div>
                  <textarea
                    className="w-full text-sm bg-white border border-zinc-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none min-h-[50px]"
                    value={measure.safetyMeasure}
                    onChange={e => {
                      const newMeasures = data.hotlineSafetyMeasures.map(m =>
                        m.id === measure.id ? { ...m, safetyMeasure: e.target.value } : m
                      );
                      updateData({ hotlineSafetyMeasures: newMeasures });
                    }}
                    placeholder="Khóa chức năng TĐL (F79) của ĐKBV MC..."
                  />
                </div>

                {/* extraMeasures CRUD */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase px-1">
                    Yêu cầu cắt thiết bị {data.jobItems.length > 1 ? `– Hạng mục ${mIdx + 1}` : ''}
                  </div>
                  {measure.extraMeasures?.map((extra, eIdx) => (
                    <div key={eIdx} className="flex gap-2 items-start group">
                      <div className="flex-1">
                        <textarea
                          className="w-full text-sm bg-white border border-zinc-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none min-h-[40px]"
                          value={extra}
                          onChange={e => {
                            const newMeasures = data.hotlineSafetyMeasures.map((m, i) =>
                              i === mIdx ? { ...m, extraMeasures: (m.extraMeasures || []).map((v, j) => j === eIdx ? e.target.value : v) } : m
                            );
                            updateData({ hotlineSafetyMeasures: newMeasures });
                          }}
                          onBlur={e => {
                            const formatted = ensureBulletFormat(e.target.value);
                            if (formatted !== e.target.value) {
                              const newMeasures = data.hotlineSafetyMeasures.map((m, i) =>
                                i === mIdx ? { ...m, extraMeasures: (m.extraMeasures || []).map((v, j) => j === eIdx ? formatted : v) } : m
                              );
                              updateData({ hotlineSafetyMeasures: newMeasures });
                            }
                          }}
                          placeholder="Nhập yêu cầu cắt thiết bị..."
                        />
                      </div>
                      <button
                        onClick={() => {
                          const newMeasures = data.hotlineSafetyMeasures.map((m, i) =>
                            i === mIdx ? { ...m, extraMeasures: (m.extraMeasures || []).filter((_, j) => j !== eIdx) } : m
                          );
                          updateData({ hotlineSafetyMeasures: newMeasures });
                        }}
                        className="p-2 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      const newMeasures = data.hotlineSafetyMeasures.map((m, i) =>
                        i === mIdx ? { ...m, extraMeasures: [...(m.extraMeasures || []), ''] } : m
                      );
                      updateData({ hotlineSafetyMeasures: newMeasures });
                    }}
                    className="w-full py-2 border-2 border-dashed border-zinc-200 rounded-lg text-xs font-bold text-zinc-400 hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={14} /> Thêm yêu cầu Cắt thiết bị
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Accordion>
  );
};
