import React, { useRef } from 'react';
import { Image, Trash2, FileUp, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Accordion } from '../UI';
import { WorkZoneDiagram } from '../../types';

export const WorkZoneDiagramForm: React.FC = () => {
  const { data, updateData, activeSection, toggleSection, isUploadingPdf, setIsUploadingPdf } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPdf(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await import('pdfjs-dist');

      // Set worker
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      }

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const diagrams: WorkZoneDiagram[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

        diagrams.push({
          id: `${Date.now()}_${i}`,
          fileName: file.name,
          pageNumber: i,
          imageData: canvas.toDataURL('image/jpeg', 0.9)
        });
      }

      updateData({ workZoneDiagrams: [...data.workZoneDiagrams, ...diagrams] });
    } catch (err) {
      console.error('Error uploading PDF:', err);
      alert('Lỗi khi đọc file PDF. Vui lòng thử lại.');
    } finally {
      setIsUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeDiagram = (id: string) => {
    updateData({ workZoneDiagrams: data.workZoneDiagrams.filter(d => d.id !== id) });
  };

  return (
    <Accordion
      title="VI. Sơ đồ vùng làm việc"
      isOpen={activeSection === 'so-do'}
      onToggle={() => toggleSection('so-do')}
      icon={<Image size={18} />}
    >
      <div className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handlePdfUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingPdf}
          className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-lg text-sm text-zinc-500 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isUploadingPdf ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Đang xử lý PDF...
            </>
          ) : (
            <>
              <FileUp size={16} /> Upload PDF sơ đồ
            </>
          )}
        </button>

        {data.workZoneDiagrams.map((diagram, idx) => (
          <div key={diagram.id} className="p-3 bg-white border border-zinc-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-600">
                {diagram.fileName} - Trang {diagram.pageNumber}
              </span>
              <button
                onClick={() => removeDiagram(diagram.id)}
                className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <img
              src={diagram.imageData}
              alt={`Sơ đồ ${idx + 1}`}
              className="w-full h-40 object-contain bg-zinc-50 rounded-lg"
            />
          </div>
        ))}

        {data.workZoneDiagrams.length === 0 && (
          <div className="p-4 bg-zinc-50 rounded-lg text-center text-xs text-zinc-400 italic">
            Chưa có sơ đồ. Upload file PDF để thêm.
          </div>
        )}
      </div>
    </Accordion>
  );
};
