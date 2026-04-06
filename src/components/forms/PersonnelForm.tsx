import React from 'react';
import { Users, Plus, Trash2, ChevronDown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Accordion, Input, Select } from '../UI';
import { Personnel } from '../../types';

export const PersonnelForm: React.FC = () => {
  const { data, updateData, activeSection, toggleSection } = useStore();
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const updatePerson = (id: string, updates: Partial<Personnel>) => {
    updateData({
      personnel: data.personnel.map(p => {
        if (p.id !== id) return p;
        const updated = { ...p, ...updates };
        // Handle CHTT-GSAT timestamp
        if (updates.role !== undefined) {
          if ((updates.role === 'CHTT-GSAT' || updates.role === 'CHTT - GSAT') && p.role !== 'CHTT-GSAT' && p.role !== 'CHTT - GSAT') {
            updated.chttSelectedAt = Date.now();
          } else if (updates.role !== 'CHTT-GSAT' && updates.role !== 'CHTT - GSAT') {
            updated.chttSelectedAt = undefined;
          }
        }
        return updated;
      })
    });
  };

  const removePerson = (id: string) => {
    if (data.personnel.length <= 1) return;
    updateData({ personnel: data.personnel.filter(p => p.id !== id) });
  };

  const addPerson = () => {
    const newPerson: Personnel = {
      id: Date.now().toString(),
      name: '',
      gender: 'Nam',
      birthYear: 1990,
      role: 'NV',
      job: 'Công nhân Hotline',
      grade: '5/7',
      safetyGrade: '5/5'
    };
    updateData({ personnel: [...data.personnel, newPerson] });
  };

  return (
    <Accordion
      title="Phụ lục 1: Nhân sự"
      isOpen={activeSection === 'nhan-su'}
      onToggle={() => toggleSection('nhan-su')}
      icon={<Users size={18} />}
    >
      <div className="space-y-3">
        {data.personnel.map((person, idx) => (
          <div key={person.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            {/* Header */}
            <button
              onClick={() => setExpandedId(expandedId === person.id ? null : person.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-400 w-6">{idx + 1}</span>
                <div className="text-left">
                  <div className="text-sm font-medium">{person.name || 'Chưa có tên'}</div>
                  <div className="text-[10px] text-zinc-500 uppercase">
                    {person.role} • {person.job}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Role quick toggle */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    const isChtt = person.role === 'CHTT-GSAT' || person.role === 'CHTT - GSAT';
                    updatePerson(person.id, { role: isChtt ? 'NV' : 'CHTT-GSAT' });
                  }}
                  className={`text-[10px] px-2 py-1 rounded font-bold transition-all ${
                    person.role === 'CHTT-GSAT' || person.role === 'CHTT - GSAT'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}
                >
                  CHTT-GSAT
                </button>
                <ChevronDown size={16} className={`text-zinc-400 transition-transform ${expandedId === person.id ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Expanded details */}
            {expandedId === person.id && (
              <div className="px-3 pb-3 space-y-3 border-t border-zinc-100 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Họ tên" value={person.name} onChange={e => updatePerson(person.id, { name: e.target.value })} />
                  <Select
                    label="Giới tính"
                    value={person.gender}
                    onChange={e => updatePerson(person.id, { gender: e.target.value })}
                    options={[{ label: 'Nam', value: 'Nam' }, { label: 'Nữ', value: 'Nữ' }]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Năm sinh" type="number" value={person.birthYear} onChange={e => updatePerson(person.id, { birthYear: parseInt(e.target.value) || 1990 })} />
                  <Select
                    label="Vai trò"
                    value={person.role}
                    onChange={e => updatePerson(person.id, { role: e.target.value })}
                    options={[
                      { label: 'Nhân viên', value: 'NV' },
                      { label: 'CHTT-GSAT', value: 'CHTT-GSAT' },
                      { label: 'Đội phó', value: 'Đội phó' },
                      { label: 'Đội trưởng', value: 'Đội trưởng' }
                    ]}
                  />
                </div>
                <Input label="Nghề nghiệp" value={person.job} onChange={e => updatePerson(person.id, { job: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Bậc nghề" value={person.grade} onChange={e => updatePerson(person.id, { grade: e.target.value })} />
                  <Input label="Bậc ATĐ" value={person.safetyGrade} onChange={e => updatePerson(person.id, { safetyGrade: e.target.value })} />
                </div>
                <button
                  onClick={() => removePerson(person.id)}
                  className="w-full py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 size={14} /> Xóa nhân sự
                </button>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={addPerson}
          className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-lg text-sm text-zinc-500 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Thêm nhân sự
        </button>
      </div>
    </Accordion>
  );
};
