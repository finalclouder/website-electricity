import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { landingDb } from '../../database.js';
import { authMiddleware, adminOnly } from './authMiddleware.js';

const router = express.Router();

const MAX_VIDEO_UPLOAD_SIZE = 80 * 1024 * 1024;
export const uploadsRoot = path.resolve(process.env.PATCTC_UPLOAD_ROOT?.trim() || path.join(process.cwd(), 'uploads'));
export const landingVideoUploadsDir = path.join(uploadsRoot, 'landing', 'videos');

if (!fs.existsSync(landingVideoUploadsDir)) {
  fs.mkdirSync(landingVideoUploadsDir, { recursive: true });
}

const landingVideoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, landingVideoUploadsDir),
    filename: (_req, _file, cb) => cb(null, `landing-video-${Date.now()}-${randomUUID()}.mp4`),
  }),
  limits: {
    fileSize: MAX_VIDEO_UPLOAD_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'video/mp4') {
      cb(new Error('Chỉ hỗ trợ video MP4'));
      return;
    }
    cb(null, true);
  },
});

router.get('/', async (req, res) => {
  try {
    const config = await landingDb.getConfig();
    if (!config) return res.json({ config: null });
    res.json({ config });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { config } = req.body;
    await landingDb.saveConfig(config);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/media', authMiddleware, adminOnly, (req, res) => {
  landingVideoUpload.single('file')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Video vượt quá 80MB' });
      }
      return res.status(400).json({ error: error.message });
    }

    if (error) {
      return res.status(400).json({ error: error.message || 'Không thể tải video lên máy chủ' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Vui lòng chọn file video MP4' });
    }

    res.json({
      url: `/uploads/landing/videos/${req.file.filename}`,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  });
});

export default router;
