/**
 * Cloudflare R2 helpers — generates presigned PUT URLs so the client
 * can upload media files directly to R2 (bypassing our server's RAM).
 *
 * The bucket should have:
 *  - CORS allowing PUT from our domain
 *  - Lifecycle rule: auto-delete objects under posts/ after 30 days
 *  - Public access enabled (or a custom domain / r2.dev subdomain)
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'patctc-media';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

let s3Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!s3Client) {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error('Missing R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)');
    }
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

/** Allowed MIME types for upload */
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

/** Max file sizes */
const MAX_IMAGE_SIZE = 75 * 1024 * 1024;   // 75 MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;   // 500 MB

export interface PresignedUploadResult {
  /** The presigned PUT URL — client uploads directly here */
  uploadUrl: string;
  /** The public URL to embed in the post after upload completes */
  publicUrl: string;
  /** The R2 object key (for potential deletion) */
  key: string;
}

/**
 * Generate a presigned PUT URL for a single file.
 * @param contentType - MIME type (e.g. "image/jpeg", "video/mp4")
 * @param fileSize    - File size in bytes (for limit validation)
 * @param folder      - Storage folder prefix (default "posts")
 */
export async function generatePresignedUpload(
  contentType: string,
  fileSize: number,
  folder: string = 'posts'
): Promise<PresignedUploadResult> {
  // Validate MIME type
  const ext = ALLOWED_TYPES[contentType];
  if (!ext) {
    throw new Error(`Loại file không được hỗ trợ: ${contentType}`);
  }

  // Validate file size
  const isVideo = contentType.startsWith('video/');
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (fileSize > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    throw new Error(`File quá lớn. Tối đa ${maxMB}MB cho ${isVideo ? 'video' : 'ảnh'}.`);
  }

  const client = getR2Client();
  const key = `${folder}/${crypto.randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ContentLength: fileSize,
  });

  // Presigned URL valid for 30 minutes
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 1800 });

  // Build public URL
  const publicUrl = R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL}/${key}`
    : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

  return { uploadUrl, publicUrl, key };
}

/**
 * Delete an object from R2 (e.g. when a post is deleted before 30-day expiry).
 */
export async function deleteR2Object(key: string): Promise<void> {
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  }));
}

/**
 * Extract the R2 object key from a public URL.
 * e.g. "https://pub-xxx.r2.dev/posts/abc.jpg" → "posts/abc.jpg"
 * Returns null if the URL is not an R2 URL.
 */
export function extractR2Key(publicUrl: string): string | null {
  if (!R2_PUBLIC_URL || !publicUrl.startsWith(R2_PUBLIC_URL)) return null;
  return publicUrl.slice(R2_PUBLIC_URL.length + 1); // +1 for the trailing "/"
}

/**
 * Delete all R2 objects associated with a list of media URLs.
 * Non-R2 URLs (e.g. old Supabase URLs) are silently skipped.
 */
export async function deleteR2MediaUrls(urls: string[]): Promise<void> {
  const keys = urls.map(extractR2Key).filter((k): k is string => k !== null);
  if (keys.length === 0) return;
  await Promise.allSettled(keys.map(key => deleteR2Object(key)));
}

export { MAX_IMAGE_SIZE, MAX_VIDEO_SIZE, ALLOWED_TYPES };
