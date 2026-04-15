import React from 'react';
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';

interface PreviewToolbarProps {
  zoom: number;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  debugMode: boolean;
  setDebugMode: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PreviewToolbar: React.FC<PreviewToolbarProps> = ({ zoom, setZoom, debugMode, setDebugMode }) => (
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
    <div className="text-[10pt] text-zinc-400 font-medium italic">
      Chế độ xem trước (WYSIWYG)
    </div>
  </div>
);
