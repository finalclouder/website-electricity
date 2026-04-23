import React from 'react';
import { Wrench, Plus, Trash2, ChevronDown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Accordion, Input, Checkbox } from '../UI';

export const ToolsForm: React.FC = () => {
  const { data, updateData, activeSection, toggleSection, scrollPreviewToSection } = useStore();
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const updateTool = (id: string, updates: any) => {
    updateData({
      tools: data.tools.map(t => t.id === id ? { ...t, ...updates } : t)
    });
  };

  const removeTool = (id: string) => {
    updateData({ tools: data.tools.filter(t => t.id !== id) });
  };

  const addTool = () => {
    const newTool = {
      id: Date.now().toString(),
      name: '',
      spec: '',
      origin: 'Việt Nam',
      unit: 'Cái',
      quantity: 1,
      purpose: '',
      selected: true
    };
    updateData({ tools: [...data.tools, newTool] });
  };

  return (
    <Accordion
      title="Phụ lục 2: Dụng cụ"
      isOpen={activeSection === 'dung-cu'}
      onToggle={() => toggleSection('dung-cu')}
      icon={<Wrench size={18} />}
      sectionId="dung-cu"
      onInputFocus={() => scrollPreviewToSection('dung-cu')}
    >
      <div className="space-y-3">
        {data.tools.map((tool, idx) => (
          <div key={tool.id} className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${tool.selected ? 'border-zinc-200' : 'border-zinc-100 opacity-60'}`}>
            <button
              onClick={() => setExpandedId(expandedId === tool.id ? null : tool.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  label=""
                  checked={tool.selected}
                  onChange={val => { updateTool(tool.id, { selected: val }); }}
                />
                <div className="text-left">
                  <div className="text-sm font-medium">{tool.name || 'Chưa có tên'}</div>
                  <div className="text-[10px] text-zinc-500">{tool.spec} • SL: {tool.quantity}</div>
                </div>
              </div>
              <ChevronDown size={16} className={`text-zinc-400 transition-transform ${expandedId === tool.id ? 'rotate-180' : ''}`} />
            </button>

            {expandedId === tool.id && (
              <div className="px-3 pb-3 space-y-3 border-t border-zinc-100 pt-3">
                <Input label="Tên dụng cụ" value={tool.name} onChange={e => updateTool(tool.id, { name: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Mã hiệu/Quy cách" value={tool.spec} onChange={e => updateTool(tool.id, { spec: e.target.value })} />
                  <Input label="Nước sản xuất" value={tool.origin} onChange={e => updateTool(tool.id, { origin: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Đơn vị" value={tool.unit} onChange={e => updateTool(tool.id, { unit: e.target.value })} />
                  <Input
                    label="Số lượng"
                    type="number"
                    min={0}
                    step={0.5}
                    value={tool.quantity ?? ''}
                    onChange={e => {
                      const raw = e.target.value;
                      updateTool(tool.id, { quantity: raw === '' ? ('' as any) : parseFloat(raw) });
                    }}
                    onBlur={() => {
                      if ((tool.quantity as any) === '' || tool.quantity === undefined || isNaN(Number(tool.quantity))) {
                        updateTool(tool.id, { quantity: 0 });
                      }
                    }}
                  />
                </div>
                <Input label="Mục đích sử dụng" value={tool.purpose} onChange={e => updateTool(tool.id, { purpose: e.target.value })} />
                <button
                  onClick={() => removeTool(tool.id)}
                  className="w-full py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 size={14} /> Xóa dụng cụ
                </button>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={addTool}
          className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-lg text-sm text-zinc-500 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Thêm dụng cụ
        </button>
      </div>
    </Accordion>
  );
};
