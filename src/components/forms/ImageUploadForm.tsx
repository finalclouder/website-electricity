import React, { useRef } from 'react';
import { FolderOpen, Trash2, Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Accordion } from '../UI';
import { ConstructionImage } from '../../types';

export const ImageUploadForm: React.FC = () => {
  const { data, updateData, activeSection, toggleSection, scrollPreviewToSection } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const readers = Array.from(files).map(file =>
      new Promise<ConstructionImage>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          resolve({
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            url: ev.target?.result as string,
            name: file.name,
            scalePercent: 100
          });
        };
        reader.readAsDataURL(file);
      })
    );

    Promise.all(readers).then(newImages => {
      const current = useStore.getState().data.images;
      updateData({ images: [...current, ...newImages] });
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    updateData({ images: data.images.filter(img => img.id !== id) });
  };

  const updateImageScale = (id: string, scale: number) => {
    updateData({
      images: data.images.map(img =>
        img.id === id ? { ...img, scalePercent: Math.max(50, Math.min(150, scale)) } : img
      )
    });
  };

  return (
    <Accordion
      title="III. Hình ảnh vị trí thi công"
      isOpen={activeSection === 'hinh-anh'}
      onToggle={() => toggleSection('hinh-anh')}
      icon={<FolderOpen size={18} />}
      sectionId="hinh-anh"
      onInputFocus={() => scrollPreviewToSection('hinh-anh')}
    >
      <div className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-lg text-sm text-zinc-500 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Thêm hình ảnh (PNG/JPG)
        </button>

        {data.images.map((img, idx) => (
          <div key={img.id} className="p-3 bg-white border border-zinc-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-600 truncate flex-1">{img.name}</span>
              <button
                onClick={() => removeImage(img.id)}
                className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <img src={img.url} alt={img.name} className="w-full h-32 object-contain bg-zinc-50 rounded-lg mb-2" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Tỷ lệ:</span>
              <input
                type="range"
                min={50}
                max={150}
                value={img.scalePercent}
                onChange={e => updateImageScale(img.id, parseInt(e.target.value))}
                className="flex-1 h-1.5 accent-blue-500"
              />
              <span className="text-xs font-mono text-zinc-600 w-10">{img.scalePercent}%</span>
            </div>
          </div>
        ))}
      </div>
    </Accordion>
  );
};
