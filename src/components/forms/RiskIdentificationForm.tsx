import React from 'react';
import { Shield, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Accordion, Input, Checkbox, DateMaskInput } from '../UI';
import { RiskItem } from '../../types';

export const RiskIdentificationForm: React.FC = () => {
  const { data, updateData, activeSection, toggleSection, hotlineTab, setHotlineTab } = useStore();

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
      location: `cột ${data.cot} ĐZ ${data.dz}`,
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
                  placeholder="Nhận diện mối nguy..."
                />
                <textarea
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  value={detail.measure}
                  onChange={e => updateRiskDetail(jobNum, risk.id, detail.id, 'measure', e.target.value)}
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
                if (data.tg_gio === '' || data.tg_gio === undefined || isNaN(Number(data.tg_gio))) {
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
                if (data.tg_soNgay === '' || data.tg_soNgay === undefined || isNaN(Number(data.tg_soNgay))) {
                  updateData({ tg_soNgay: 1 });
                }
              }}
            />
          </div>
          <DateMaskInput
            label="Ngày thi công (dd/mm/yyyy)"
            value={(() => {
              const d = String(data.tg_soNgay || '').padStart(2, '0');
              const m = String(data.tg_thang || '').padStart(2, '0');
              const y = String(data.tg_nam || '').padStart(4, '0');
              return `${d}/${m}/${y}`;
            })()}
            onChange={val => {
              const digits = (val || '').replace(/\D/g, '');
              const day = parseInt(digits.slice(0, 2)) || 1;
              const month = parseInt(digits.slice(2, 4)) || 1;
              const year = parseInt(digits.slice(4, 8)) || new Date().getFullYear();
              updateData({ tg_soNgay: day, tg_thang: month, tg_nam: year });
            }}
          />
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
            <div className="flex gap-2 mb-4">
              {data.jobItems.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setHotlineTab(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    hotlineTab === idx
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  HM {idx + 1}
                </button>
              ))}
            </div>
          )}

          {/* Biện pháp bổ sung */}
          {data.hotlineSafetyMeasures
            .filter((_, idx) => data.jobItems.length <= 1 || idx === hotlineTab)
            .map((measure, idx) => (
              <div key={measure.id} className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 space-y-2">
                <textarea
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  value={measure.safetyMeasure}
                  onChange={e => {
                    const newMeasures = data.hotlineSafetyMeasures.map(m =>
                      m.id === measure.id ? { ...m, safetyMeasure: e.target.value } : m
                    );
                    updateData({ hotlineSafetyMeasures: newMeasures });
                  }}
                  placeholder="Biện pháp an toàn bổ sung..."
                />
              </div>
            ))}
        </div>
      </div>
    </Accordion>
  );
};
