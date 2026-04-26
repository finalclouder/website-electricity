import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Env } from './types';

const DEFAULT_BUCKET = 'patctc-media';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

const MAX_IMAGE_SIZE = 75 * 1024 * 1024;
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
const MAX_LANDING_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_LANDING_VIDEO_SIZE = 80 * 1024 * 1024;

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
};

export type PresignedUploadResult = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
};

export type UploadedLandingMedia = {
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
};

let cachedClientKey = '';
let cachedClient: S3Client | null = null;

function getR2Config(env: Env): R2Config {
  const accountId = env.R2_ACCOUNT_ID || '';
  const accessKeyId = env.R2_ACCESS_KEY_ID || '';
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY || '';
  const bucketName = env.R2_BUCKET_NAME || DEFAULT_BUCKET;
  const publicUrl = (env.R2_PUBLIC_URL || '').replace(/\/+$/, '');

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    throw new Error('Thieu cau hinh R2 tren Cloudflare Worker');
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl };
}

function getR2Client(config: R2Config): S3Client {
  const clientKey = `${config.accountId}:${config.accessKeyId}`;
  if (cachedClient && cachedClientKey === clientKey) return cachedClient;

  cachedClientKey = clientKey;
  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return cachedClient;
}

function validateFile(contentType: string, fileSize: number, options?: { imageMax?: number; videoMax?: number; videoMp4Only?: boolean }): string {
  const ext = ALLOWED_TYPES[contentType];
  if (!ext) throw new Error(`Loai file khong duoc ho tro: ${contentType || 'unknown'}`);
  if (options?.videoMp4Only && contentType !== 'video/mp4') throw new Error('Chi ho tro video MP4');

  const isVideo = contentType.startsWith('video/');
  const maxSize = isVideo ? options?.videoMax ?? MAX_VIDEO_SIZE : options?.imageMax ?? MAX_IMAGE_SIZE;
  if (!Number.isFinite(fileSize) || fileSize <= 0) throw new Error('Kich thuoc file khong hop le');
  if (fileSize > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    throw new Error(`File qua lon. Toi da ${maxMB}MB cho ${isVideo ? 'video' : 'anh'}.`);
  }

  return ext;
}

function publicUrlFor(config: R2Config, key: string): string {
  return `${config.publicUrl}/${key}`;
}

export async function generatePresignedUpload(
  env: Env,
  contentType: string,
  fileSize: number,
  folder = 'posts',
): Promise<PresignedUploadResult> {
  const config = getR2Config(env);
  const ext = validateFile(contentType, fileSize);
  const key = `${folder}/${crypto.randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
    ContentLength: fileSize,
  });

  const uploadUrl = await getSignedUrl(getR2Client(config), command, { expiresIn: 1800 });
  return { uploadUrl, publicUrl: publicUrlFor(config, key), key };
}

export async function uploadLandingFile(env: Env, file: File, kind: 'image' | 'video'): Promise<UploadedLandingMedia> {
  const config = getR2Config(env);
  const contentType = file.type || 'application/octet-stream';
  const ext = validateFile(contentType, file.size, {
    imageMax: MAX_LANDING_IMAGE_SIZE,
    videoMax: MAX_LANDING_VIDEO_SIZE,
    videoMp4Only: kind === 'video',
  });

  if (kind === 'image' && !contentType.startsWith('image/')) throw new Error('File khong phai la hinh anh');
  if (kind === 'video' && !contentType.startsWith('video/')) throw new Error('File khong phai la video');

  const key = `landing/${kind === 'image' ? 'images' : 'videos'}/${crypto.randomUUID()}.${ext}`;
  await getR2Client(config).send(new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: file,
    ContentType: contentType,
    ContentLength: file.size,
  }));

  return {
    url: publicUrlFor(config, key),
    originalName: file.name,
    size: file.size,
    mimeType: contentType,
  };
}

export async function deleteR2MediaUrls(env: Env, urls: string[]): Promise<void> {
  const config = getR2Config(env);
  const prefix = `${config.publicUrl}/`;
  const keys = urls
    .filter((url): url is string => typeof url === 'string' && url.startsWith(prefix))
    .map((url) => url.slice(prefix.length));

  await Promise.allSettled(keys.map((key) => getR2Client(config).send(new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  }))));
}
