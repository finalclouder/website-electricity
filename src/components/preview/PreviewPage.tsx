import React from 'react';
import { clsx } from 'clsx';

interface PreviewPageProps {
  id: string;
  isActive: boolean;
  zoom: number;
  debugMode: boolean;
  pageNum: number;
  children: React.ReactNode;
}

export const PreviewPage: React.FC<PreviewPageProps> = ({ id, isActive, zoom, debugMode, pageNum, children }) => (
  <div
    id={`preview-${id}`}
    className={clsx(
      "bg-white shadow-2xl mx-auto mb-8 min-h-[29.7cm] w-[21cm] text-[13pt] font-times leading-[1.3] text-black relative origin-top transition-transform duration-200",
      "a4-page",
      isActive ? "ring-4 ring-blue-400" : ""
    )}
    style={{
      transform: `scale(${zoom})`,
      paddingTop: '2cm',
      paddingBottom: '2cm',
      paddingLeft: '2.5cm',
      paddingRight: '2.5cm'
    }}
  >
    {debugMode && (
      <div className="absolute inset-0 pointer-events-none z-50">
        <div className="absolute top-0 bottom-0 left-[2.5cm] w-px bg-red-200" />
        <div className="absolute top-0 bottom-0 right-[2.5cm] w-px bg-red-200" />
        <div className="absolute top-[2cm] left-0 right-0 h-px bg-red-200" />
        <div className="absolute bottom-[2cm] left-0 right-0 h-px bg-red-200" />

        {Array.from({ length: 41 }).map((_, index) => (
          <div
            key={index}
            className="absolute left-0 right-0 border-b border-red-100 flex items-center justify-end pr-2 text-[8pt] text-red-300 font-times"
            style={{ top: `calc(2cm + ${index * 1.3}em)`, height: '1.3em' }}
          >
            {index + 1}
          </div>
        ))}
      </div>
    )}

    {children}

    <div className="absolute bottom-8 left-0 right-0 text-center text-[13pt] font-times text-black print:hidden">
      {pageNum}
    </div>
  </div>
);
