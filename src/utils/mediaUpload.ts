/**
 * Media upload utilities for Admin Landing Page editor.
 * Handles server-backed image & video uploads for the landing page.
 * Images are uploaded to /api/landing/image (stored on server disk),
 * NOT embedded as base64 in the config JSON.
 */

import { api } from './api';

// ============ IMAGE UPLOAD TO SERVER ============

export interface UploadedLandingImage {
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
}

/**
 * Upload an image file to the server for landing page use.
 * Returns a server URL like /uploads/landing/images/filename.jpg
 * that persists across reloads (unlike base64 dataURLs in JSON).
 */
export async function uploadLandingImage(file: File): Promise<UploadedLandingImage> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File không phải là hình ảnh');
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Ảnh quá lớn (tối đa 10MB)');
  }

  const formData = new FormData();
  formData.append('file', file);

  return api.post<UploadedLandingImage>('/landing/image', formData);
}

/**
 * Upload hero image (same endpoint, just a convenience wrapper).
 * Returns the server URL string.
 */
export async function compressHeroImage(file: File): Promise<string> {
  const result = await uploadLandingImage(file);
  return result.url;
}

/**
 * Upload gallery image.
 */
export async function compressGalleryImage(file: File): Promise<string> {
  const result = await uploadLandingImage(file);
  return result.url;
}

/**
 * Upload video thumbnail.
 */
export async function compressThumbnail(file: File): Promise<string> {
  const result = await uploadLandingImage(file);
  return result.url;
}

/**
 * Upload banner image.
 */
export async function compressBannerImage(file: File): Promise<string> {
  const result = await uploadLandingImage(file);
  return result.url;
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
