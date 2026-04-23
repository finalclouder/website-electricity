import React, { useState, useRef, useEffect } from 'react';
import { Maximize, ZoomIn, ZoomOut, Search, Copy, CheckSquare, Square, ClipboardCopy } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { JOB_ITEM_TEMPLATES } from '../../constants';

interface PreviewToolbarProps {
  zoom: number;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  debugMode: boolean;
  setDebugMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

export const PreviewToolbar: React.FC<PreviewToolbarProps> = ({ zoom, setZoom, debugMode, setDebugMode }) => {
  const { data, updateJobItem, addJobItem } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredTemplates = searchQuery.trim()
    ? JOB_ITEM_TEMPLATES.filter(t => normalize(t).includes(normalize(searchQuery)))
    : JOB_ITEM_TEMPLATES;

  const toggleSelect = (globalIdx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(globalIdx)) next.delete(globalIdx);
      else next.add(globalIdx);
      return next;
    });
  };

  const handleCopySelected = () => {
    const texts = Array.from(selected)
      .sort((a, b) => a - b)
      .map(idx => JOB_ITEM_TEMPLATES[idx]);
    navigator.clipboard.writeText(texts.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleApplySelected = () => {
    const texts = Array.from(selected)
      .sort((a, b) => a - b)
      .map(idx => JOB_ITEM_TEMPLATES[idx]);
    const combined = texts.join(', ');
    const emptyIdx = data.jobItems.findIndex(j => !j.trim());
    if (emptyIdx >= 0) {
      updateJobItem(emptyIdx, combined);
    } else if (data.jobItems.length < 2) {
      addJobItem();
      updateJobItem(data.jobItems.length, combined);
    }
    setSelected(new Set());
    setShowResults(false);
    setSearchQuery('');
  };

  const handleSelectAll = () => {
    if (selected.size === filteredTemplates.length) {
      setSelected(new Set());
    } else {
      const allIdxs = filteredTemplates.map(t => JOB_ITEM_TEMPLATES.indexOf(t));
      setSelected(new Set(allIdxs));
    }
  };

  return (
    <div className="bg-white border-b border-zinc-200 px-6 py-2 flex items-center justify-between shadow-sm z-10">
      <div className="flex items-center gap-4">
        <div className="flex items-center bg-zinc-100 rounded-lg p-1">
          <button
            onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.05))}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-zinc-600"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-bold text-zinc-500 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((prev) => Math.min(1.5, prev + 0.05))}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-zinc-600"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
        </div>
        <div className="h-4 w-px bg-zinc-200" />
        <button
          onClick={() => setZoom(0.85)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Reset (85%)
        </button>
        <button
          onClick={() => setZoom(0.65)}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-800"
        >
          <Maximize size={14} /> Fit to page
        </button>
        <div className="h-4 w-px bg-zinc-200" />
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className={`w-8 h-4 rounded-full relative transition-colors ${debugMode ? 'bg-blue-500' : 'bg-zinc-300'}`}>
            <div
              className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${debugMode ? 'translate-x-4' : 'translate-x-0'}`}
            />
          </div>
          <input
            type="checkbox"
            className="hidden"
            checked={debugMode}
            onChange={() => setDebugMode((prev) => !prev)}
          />
          <span className="text-xs font-bold text-zinc-500 group-hover:text-zinc-700">DEBUG MODE</span>
        </label>
      </div>
      <div ref={searchRef} className="relative">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            className="w-56 pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            placeholder="Tìm hạng mục... (thay FCO, thay sứ...)"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowResults(true); setSelected(new Set()); }}
            onFocus={() => setShowResults(true)}
          />
        </div>
        {showResults && (
          <div className="absolute z-20 mt-1 right-0 w-96 bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden">
            {/* Toolbar cho hàng loạt */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-50 border-b border-zinc-200">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[10px] font-bold text-zinc-500 hover:text-blue-600 transition-colors"
              >
                {selected.size === filteredTemplates.length && filteredTemplates.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
              {selected.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400">{selected.size} đã chọn</span>
                  <button
                    type="button"
                    onClick={handleCopySelected}
                    className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded transition-colors"
                    title="Sao chép đã chọn"
                  >
                    <ClipboardCopy size={10} /> {copied ? 'Đã chép!' : 'Sao chép'}
                  </button>
                  <button
                    type="button"
                    onClick={handleApplySelected}
                    className="flex items-center gap-1 text-[10px] font-bold text-green-600 hover:text-green-700 bg-green-50 px-2 py-0.5 rounded transition-colors"
                    title="Áp dụng vào hạng mục"
                  >
                    <Copy size={10} /> Áp dụng
                  </button>
                </div>
              )}
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filteredTemplates.length === 0 ? (
                <div className="px-3 py-2 text-xs text-zinc-400 italic">Không tìm thấy</div>
              ) : (
                filteredTemplates.map((tpl) => {
                  const globalIdx = JOB_ITEM_TEMPLATES.indexOf(tpl);
                  const isSelected = selected.has(globalIdx);
                  return (
                    <div
                      key={globalIdx}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs border-b border-zinc-50 last:border-0 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-zinc-50'}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSelect(globalIdx)}
                        className="flex-shrink-0 text-zinc-400 hover:text-blue-500"
                      >
                        {isSelected ? <CheckSquare size={14} className="text-blue-500" /> : <Square size={14} />}
                      </button>
                      <button
                        type="button"
                        className="flex-1 text-left truncate"
                        onClick={() => {
                          navigator.clipboard.writeText(tpl);
                          const emptyIdx = data.jobItems.findIndex(j => !j.trim());
                          if (emptyIdx >= 0) {
                            updateJobItem(emptyIdx, tpl);
                          } else if (data.jobItems.length < 2) {
                            addJobItem();
                            updateJobItem(data.jobItems.length, tpl);
                          }
                          setShowResults(false);
                          setSearchQuery('');
                          setSelected(new Set());
                        }}
                        title={tpl}
                      >
                        {tpl}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
