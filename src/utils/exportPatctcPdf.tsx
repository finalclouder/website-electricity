import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Preview } from '../components/Preview';
import type { PATCTCData } from '../types';

async function waitForNextFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function waitForImages(container: ParentNode): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();

      return new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      });
    })
  );
}

function normalizePreviewPage(clone: HTMLElement): void {
  clone.style.transform = 'none';
  clone.style.boxShadow = 'none';
  clone.style.margin = '0';
  clone.style.borderRadius = '0';
  clone.style.border = 'none';

  clone.querySelectorAll('.print\\:hidden').forEach((element) => {
    (element as HTMLElement).style.display = 'none';
  });
}

export async function exportPatctcPdf(data: PATCTCData, filename?: string): Promise<void> {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-20000px';
  host.style.top = '0';
  host.style.width = '1280px';
  host.style.overflow = 'visible';
  host.style.zIndex = '-1';
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    flushSync(() => {
      root.render(
        <div style={{ width: '1280px' }}>
          <Preview data={data} activeSection="" zoom={1} setZoom={() => {}} />
        </div>
      );
    });

    if ('fonts' in document) {
      await document.fonts.ready;
    }

    await waitForNextFrame();
    await waitForNextFrame();
    await waitForImages(host);
    await waitForNextFrame();

    const pages = host.querySelectorAll('.a4-page');
    if (pages.length === 0) {
      throw new Error('Preview pages not found');
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const offscreen = document.createElement('div');
    offscreen.style.position = 'fixed';
    offscreen.style.left = '-9999px';
    offscreen.style.top = '0';
    offscreen.style.width = '21cm';
    offscreen.style.zIndex = '-1';
    document.body.appendChild(offscreen);

    try {
      for (let index = 0; index < pages.length; index += 1) {
        const clone = pages[index].cloneNode(true) as HTMLElement;
        normalizePreviewPage(clone);
        offscreen.appendChild(clone);

        const canvas = await html2canvas(clone, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (doc: Document) => {
            const allElements = doc.querySelectorAll('*');
            allElements.forEach((element) => {
              const style = window.getComputedStyle(element);
              const color = style.color;
              const backgroundColor = style.backgroundColor;

              if (color && color.includes('oklch')) {
                (element as HTMLElement).style.color = '#000000';
              }
              if (backgroundColor && backgroundColor.includes('oklch')) {
                (element as HTMLElement).style.backgroundColor = '#ffffff';
              }
            });
          }
        });

        const imageData = canvas.toDataURL('image/jpeg', 0.95);
        if (index > 0) {
          pdf.addPage();
        }
        pdf.addImage(imageData, 'JPEG', 0, 0, 210, 297);

        offscreen.removeChild(clone);
      }
    } finally {
      document.body.removeChild(offscreen);
    }

    pdf.save(filename ?? `PATCTC_${data.soVb || 'export'}.pdf`);
  } finally {
    root.unmount();
    document.body.removeChild(host);
  }
}
