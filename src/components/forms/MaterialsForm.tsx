import React from 'react';
import { Truck, Plus, Trash2, ChevronDown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Accordion, Input } from '../UI';

export const MaterialsForm: React.FC = () => {
  const { data, updateData, activeSection, toggleSection } = useStore();
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const updateMaterial = (id: string, updates: any) => {
    updateData({
      vatTuCap: data.vatTuCap.map(v => v.id === id ? { ...v, ...updates } : v)
    });
  };

  const removeMaterial = (id: string) => {
    updateData({ vatTuCap: data.vatTuCap.filter(v => v.id !== id) });
  };

  const addMaterial = () => {
    const newItem = {
      id: Date.now().toString(),
      name: '',
      quantity: '1',
      unit: 'Cái',
      origin: 'Việt Nam',
      purpose: ''
    };
    updateData({ vatTuCap: [...data.vatTuCap, newItem] });
  };

  return (
    <Accordion
      title="Phụ lục 3: Vật tư thi công"
      isOpen={activeSection === 'vat-tu'}
      onToggle={() => toggleSection('vat-tu')}
      icon={<Truck size={18} />}
    >
      <div className="space-y-4">
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
          <Input
            label="Bên cấp vật tư"
            value={data.benCapVatTu}
            onChange={e => updateData({ benCapVatTu: e.target.value })}
          />
        </div>

        {data.vatTuCap.map((item, idx) => (
          <div key={item.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-400 w-6">{idx + 1}</span>
                <div className="text-left">
                  <div className="text-sm font-medium">{item.name || 'Chưa có tên'}</div>
                  <div className="text-[10px] text-zinc-500">SL: {item.quantity} {item.unit}</div>
                </div>
              </div>
              <ChevronDown size={16} className={`text-zinc-400 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`} />
            </button>

            {expandedId === item.id && (
              <div className="px-3 pb-3 space-y-3 border-t border-zinc-100 pt-3">
                <Input label="Tên vật tư" value={item.name} onChange={e => updateMaterial(item.id!, { name: e.target.value })} />
                <div className="grid grid-cols-3 gap-3">
                  <Input label="Nước SX" value={item.origin} onChange={e => updateMaterial(item.id!, { origin: e.target.value })} />
                  <Input label="Đơn vị" value={item.unit} onChange={e => updateMaterial(item.id!, { unit: e.target.value })} />
                  <Input label="Số lượng" value={item.quantity} onChange={e => updateMaterial(item.id!, { quantity: e.target.value })} />
                </div>
                <Input label="Mục đích" value={item.purpose} onChange={e => updateMaterial(item.id!, { purpose: e.target.value })} />
                <button
                  onClick={() => removeMaterial(item.id!)}
                  className="w-full py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 size={14} /> Xóa vật tư
                </button>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={addMaterial}
          className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-lg text-sm text-zinc-500 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Thêm vật tư
        </button>
      </div>
    </Accordion>
  );
};
