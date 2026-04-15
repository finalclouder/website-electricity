/**
 * Document API Routes - CRUD for saved PATCTC documents
 */
import { Router } from 'express';
import crypto from 'crypto';
import { docDb, documentDownloadDb, notificationDb } from '../../database.js';
import { authMiddleware } from './authMiddleware.js';

const router = Router();

// GET /api/documents - Get all documents (requires auth)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const docs = await docDb.getAll();
    res.json(docs);
  } catch (error: any) {
    console.error('Get documents error:', error.message);
    res.status(500).json({ error: 'Lỗi tải tài liệu' });
  }
});

// GET /api/documents/my - Get current user's documents
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const docs = await docDb.getByAuthor(userId);
    res.json(docs);
  } catch (error: any) {
    console.error('Get my documents error:', error.message);
    res.status(500).json({ error: 'Lỗi tải tài liệu' });
  }
});

// GET /api/documents/user/:userId - Get all documents for a specific user
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const docs = await docDb.getByAuthor(req.params.userId);
    res.json(docs);
  } catch (error: any) {
    console.error('Get user documents error:', error.message);
    res.status(500).json({ error: 'Lỗi tải tài liệu người dùng' });
  }
});

// POST /api/documents - Save new document
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const { title, description, dataSnapshot, status, tags } = req.body;

    if (!title?.trim() || !dataSnapshot) {
      return res.status(400).json({ error: 'Thiếu tiêu đề hoặc dữ liệu' });
    }

    if (title.length > 200) {
      return res.status(400).json({ error: 'Tiêu đề quá dài (tối đa 200 ký tự)' });
    }

    const validStatuses = ['draft', 'completed', 'approved'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }

    if (tags && (!Array.isArray(tags) || tags.length > 20)) {
      return res.status(400).json({ error: 'Tags không hợp lệ' });
    }

    const id = crypto.randomUUID();
    await docDb.create({ id, title: title.trim(), description: (description || '').trim(), authorId: userId, dataSnapshot, status, tags });

    res.json({ id, message: 'Đã lưu tài liệu' });
  } catch (error: any) {
    console.error('Save document error:', error.message);
    res.status(500).json({ error: 'Lỗi lưu tài liệu' });
  }
});

// PUT /api/documents/:id - Update document (owner or admin only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { userId, role } = (req as any).user;
    const { title, description, dataSnapshot, status, tags } = req.body;

    const doc = await docDb.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Tài liệu không tồn tại' });
    }
    if (doc.authorId !== userId && role !== 'admin') {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa tài liệu này' });
    }

    if (title && title.length > 200) {
      return res.status(400).json({ error: 'Tiêu đề quá dài (tối đa 200 ký tự)' });
    }

    const validStatuses = ['draft', 'completed', 'approved'];
    if (status !== undefined && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }

    await docDb.update(req.params.id, { title, description, dataSnapshot, status, tags });
    res.json({ message: 'Đã cập nhật tài liệu' });
  } catch (error: any) {
    console.error('Update document error:', error.message);
    res.status(500).json({ error: 'Lỗi cập nhật' });
  }
});

// DELETE /api/documents/:id - Delete document (owner or admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { userId, role } = (req as any).user;
    const doc = await docDb.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: 'Tài liệu không tồn tại' });
    }
    if (doc.authorId !== userId && role !== 'admin') {
      return res.status(403).json({ error: 'Bạn không có quyền xóa tài liệu này' });
    }

    await docDb.delete(req.params.id);
    res.json({ message: 'Đã xóa tài liệu' });
  } catch (error: any) {
    console.error('Delete document error:', error.message);
    res.status(500).json({ error: 'Lỗi xóa tài liệu' });
  }
});

router.post('/:id/download', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const doc = await docDb.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: 'Tài liệu không tồn tại' });
    }

    if (doc.authorId !== userId) {
      await documentDownloadDb.trackDownload({
        documentId: doc.id,
        downloaderId: userId,
        ownerId: doc.authorId,
      });

      await notificationDb.create({
        userId: doc.authorId,
        actorId: userId,
        type: 'document_download',
        entityType: 'document',
        entityId: doc.id,
        dataJson: { documentId: doc.id, downloaderId: userId, ownerId: doc.authorId },
      });
    }

    res.json({ message: 'Đã ghi nhận lượt tải tài liệu' });
  } catch (error: any) {
    console.error('Track document download error:', error.message);
    res.status(500).json({ error: 'Lỗi ghi nhận lượt tải tài liệu' });
  }
});

router.get('/:id/downloads', authMiddleware, async (req, res) => {
  try {
    const { userId, role } = (req as any).user;
    const doc = await docDb.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: 'Tài liệu không tồn tại' });
    }
    if (doc.authorId !== userId && role !== 'admin') {
      return res.status(403).json({ error: 'Bạn không có quyền xem lượt tải tài liệu này' });
    }

    const downloads = await documentDownloadDb.listByDocument(req.params.id);
    res.json(downloads);
  } catch (error: any) {
    console.error('Get document downloads error:', error.message);
    res.status(500).json({ error: 'Lỗi tải lịch sử tải tài liệu' });
  }
});

export default router;
