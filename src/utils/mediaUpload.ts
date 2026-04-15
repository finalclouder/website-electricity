/**
 * Media upload utilities for Admin Landing Page editor.
 * Handles client-side image compression plus server-backed landing video uploads.
 */

import { api } from './api';

// ============ IMAGE COMPRESSION ============

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1, default 0.8
  format?: 'image/jpeg' | 'image/webp' | 'image/png';
}

/**
 * Compress and resize an image file.
 * Returns a base64 dataURL string.
 */
export function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<string> {
  const {
    maxWidth = 1200,
    maxHeight = 800,
    quality = 0.8,
    format = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('File không phải là hình ảnh'));
      return;
    }

    // Validate file size (max 10MB raw input)
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('File quá lớn (tối đa 10MB)'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Không thể tải hình ảnh'));
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Draw to canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Không thể tạo canvas'));
          return;
        }

        // White background for JPEG (transparent png → white bg)
        if (format === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to dataURL
        const dataUrl = canvas.toDataURL(format, quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compress image specifically for hero slides (large, wide).
 */
export function compressHeroImage(file: File): Promise<string> {
  return compressImage(file, {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.75,
    format: 'image/jpeg',
  });
}

/**
 * Compress image for gallery (medium).
 */
export function compressGalleryImage(file: File): Promise<string> {
  return compressImage(file, {
    maxWidth: 1200,
    maxHeight: 900,
    quality: 0.8,
    format: 'image/jpeg',
  });
}

/**
 * Compress image for video thumbnail (smaller).
 */
export function compressThumbnail(file: File): Promise<string> {
  return compressImage(file, {
    maxWidth: 800,
    maxHeight: 600,
    quality: 0.8,
    format: 'image/jpeg',
  });
}

/**
 * Compress image for banner background.
 */
export function compressBannerImage(file: File): Promise<string> {
  return compressImage(file, {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.75,
    format: 'image/jpeg',
  });
}

// ============ VIDEO HANDLING ============

export const MAX_LANDING_VIDEO_SIZE_MB = 80;
const MAX_LANDING_VIDEO_SIZE_BYTES = MAX_LANDING_VIDEO_SIZE_MB * 1024 * 1024;

export interface UploadedLandingVideo {
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export function validateLandingVideoFile(file: File): void {
  if (file.type !== 'video/mp4') {
    throw new Error('Chỉ hỗ trợ video MP4');
  }

  if (file.size > MAX_LANDING_VIDEO_SIZE_BYTES) {
    throw new Error(`Video vượt quá ${MAX_LANDING_VIDEO_SIZE_MB}MB`);
  }
}

export async function uploadLandingVideo(file: File): Promise<UploadedLandingVideo> {
  validateLandingVideoFile(file);

  const formData = new FormData();
  formData.append('file', file);

  return api.post<UploadedLandingVideo>('/landing/media', formData);
}

// ============ FILE INPUT HELPER ============

/**
 * Programmatically open file picker and return selected file.
 */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0] || null;
      resolve(file);
    };
    // If user cancels
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

/**
 * Format file size to human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
