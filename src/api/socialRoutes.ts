/**
 * Social API Routes - Posts, Comments, Likes
 */
import { Router } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import { notificationDb, postDb, userDb, uploadFileToStorage } from '../../database.js';
import { authMiddleware } from './authMiddleware.js';
import { scanContentForThreats } from './urlSafety.js';
import { generatePresignedUpload, deleteR2Object, deleteR2MediaUrls } from '../utils/r2.js';

const router = Router();

// ─── Magic bytes validation ─────────────────────────────────────────────────
// Multer only checks the Content-Type header (attacker-controlled).
// This validates actual file content by checking magic bytes (file signature).
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png':  [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif':  [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]], // GIF87a, GIF89a
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP container)
  'video/mp4':  [], // mp4 magic varies (ftyp at offset 4) — validated separately
  'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]], // EBML header
};

function validateMagicBytes(buffer: Buffer, declaredMime: string): boolean {
  if (buffer.length < 4) return false;

  // Special case: MP4 — "ftyp" at offset 4
  if (declaredMime === 'video/mp4') {
    return buffer.length >= 8 && buffer.slice(4, 8).toString('ascii') === 'ftyp';
  }

  const signatures = MAGIC_BYTES[declaredMime];
  if (!signatures || signatures.length === 0) return true; // No signature to check

  return signatures.some(sig =>
    sig.every((byte, i) => buffer[i] === byte)
  );
}

// Multer: memory storage — files arrive as Buffer in req.files
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    files: 10,                   // max 10 files per post
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Loại file không được hỗ trợ: ${file.mimetype}`));
    }
  },
});

// POST /api/posts/presign - Get presigned R2 upload URLs for media files
// Client sends array of { contentType, fileSize, fileName } and gets back presigned PUT URLs
router.post('/presign', authMiddleware, async (req, res) => {
  try {
    const { files } = req.body as {
      files: { contentType: string; fileSize: number; fileName: string }[];
    };

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Danh sách files không hợp lệ' });
    }

    if (files.length > 10) {
      return res.status(400).json({ error: 'Tối đa 10 files mỗi bài đăng' });
    }

    const results = await Promise.all(
      files.map(f => generatePresignedUpload(f.contentType, f.fileSize))
    );

    res.json({ uploads: results });
  } catch (error: any) {
    console.error('Presign error:', error.message);
    res.status(400).json({ error: error.message || 'Lỗi tạo presigned URL' });
  }
});

// GET /api/posts - Get paginated posts (requires auth)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await postDb.getPaginated(page, limit);
    res.json(result);
  } catch (error: any) {
    console.error('Get posts error:', error.message);
    res.status(500).json({ error: 'Lỗi tải bài viết' });
  }
});

// POST /api/posts - Create post
// Supports two media flows:
//   1) JSON body with mediaUrls[] — client already uploaded to R2 via presigned URLs
//   2) multipart/form-data with media files — legacy flow via multer + Supabase Storage
router.post('/', authMiddleware, (req, res, next) => {
  // If Content-Type is JSON, skip multer (R2 flow)
  if (req.is('json')) return next();
  // Otherwise, parse multipart (legacy flow)
  mediaUpload.array('media', 10)(req, res, next);
}, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const { content, attachmentName, category, mediaUrls } = req.body;
    const normalizedContent = content?.trim() || '';
    const files = (req.files as Express.Multer.File[]) || [];

    // Determine media URLs: from R2 presigned flow or legacy multer flow
    let imageUrls: string[] = [];

    if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      // R2 flow — client uploaded directly, just validate URLs
      imageUrls = mediaUrls.filter((u: string) => typeof u === 'string' && u.startsWith('http')).slice(0, 10);
    }

    if (!normalizedContent && files.length === 0 && imageUrls.length === 0) {
      return res.status(400).json({ error: 'Nội dung hoặc media không được để trống' });
    }

    if (normalizedContent.length > 10000) {
      return res.status(400).json({ error: 'Nội dung quá dài (tối đa 10000 ký tự)' });
    }

    const validCategories = ['general', 'technical', 'safety', 'announcement'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ error: 'Danh mục không hợp lệ' });
    }

    // ── Magic bytes validation (legacy multer flow only) ──────────────────
    for (const file of files) {
      if (!validateMagicBytes(file.buffer, file.mimetype)) {
        return res.status(400).json({
          error: `File "${file.originalname}" không phải là ${file.mimetype} hợp lệ. Nội dung file không khớp với loại khai báo.`,
        });
      }
    }

    // ── URL Safety Scan ─────────────────────────────────────────────────
    if (normalizedContent) {
      const scanResult = await scanContentForThreats(normalizedContent);
      if (scanResult.isMalicious) {
        return res.status(400).json({
          error: 'Bài viết chứa liên kết không an toàn hoặc độc hại. Vui lòng kiểm tra lại.',
        });
      }
    }

    // Legacy multer flow: upload to Supabase Storage
    for (const file of files) {
      const url = await uploadFileToStorage(
        file.buffer,
        file.mimetype,
        file.originalname,
        'posts'
      );
      imageUrls.push(url);
    }

    const id = crypto.randomUUID();
    await postDb.create({
      id,
      authorId: userId,
      content: normalizedContent,
      images: imageUrls,        // ← permanent Storage URLs, not base64
      attachmentName: attachmentName || '',
      category: category || 'general',
    });

    // ── Notify all users when admin posts ────────────────────────────────
    const { role } = (req as any).user;
    if (role === 'admin') {
      try {
        const allUsers = await userDb.getAll();
        const otherUsers = allUsers.filter((u: any) => u.id !== userId);
        await Promise.allSettled(
          otherUsers.map((u: any) =>
            notificationDb.create({
              userId: u.id,
              actorId: userId,
              type: 'admin_post',
              entityType: 'post',
              entityId: id,
              dataJson: { postId: id, actorId: userId },
            })
          )
        );
      } catch (err: any) {
        console.warn('Admin broadcast notification warning:', err.message);
      }
    }

    const result = await postDb.getPaginated(1, 20);
    res.json(result);
  } catch (error: any) {
    console.error('Create post error:', error.message);
    // Multer errors (file too large, wrong type) arrive as error.status
    if (error.message?.includes('Loại file') || error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: error.message || 'File quá lớn (tối đa 10MB mỗi file)' });
    }
    res.status(500).json({ error: 'Lỗi tạo bài viết' });
  }
});

// DELETE /api/posts/:id - Delete post (owner or admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { userId, role } = (req as any).user;
    const post = await postDb.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Bài viết không tồn tại' });
    }

    if (post.authorId !== userId && role !== 'admin') {
      return res.status(403).json({ error: 'Bạn không có quyền xóa bài viết này' });
    }

    // Delete media files from R2 (if any) before removing the DB record
    const mediaUrls = Array.isArray(post.images) ? post.images : [];
    if (mediaUrls.length > 0) {
      try {
        await deleteR2MediaUrls(mediaUrls);
      } catch (err: any) {
        console.warn('R2 cleanup warning (non-fatal):', err.message);
      }
    }

    await postDb.delete(req.params.id);
    res.json({ message: 'Đã xóa bài viết' });
  } catch (error: any) {
    console.error('Delete post error:', error.message);
    res.status(500).json({ error: 'Lỗi xóa bài viết' });
  }
});

// POST /api/posts/:id/like - Toggle like
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const post = await postDb.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Bài viết không tồn tại' });

    const createdLike = await postDb.toggleLike(req.params.id, userId);

    if (createdLike && post.authorId !== userId) {
      await notificationDb.create({
        userId: post.authorId,
        actorId: userId,
        type: 'post_like',
        entityType: 'post',
        entityId: post.id,
        dataJson: { postId: post.id, ownerId: post.authorId, actorId: userId },
      });
    }

    res.json({ message: 'OK' });
  } catch (error: any) {
    console.error('Like error:', error.message);
    res.status(500).json({ error: 'Lỗi' });
  }
});

// POST /api/posts/:id/share - Share post
router.post('/:id/share', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const post = await postDb.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Bài viết không tồn tại' });

    const createdShare = await postDb.share(req.params.id, userId);

    if (createdShare && post.authorId !== userId) {
      await notificationDb.create({
        userId: post.authorId,
        actorId: userId,
        type: 'post_share',
        entityType: 'post',
        entityId: post.id,
        dataJson: { postId: post.id, ownerId: post.authorId, actorId: userId },
      });
    }

    res.json({ message: 'OK' });
  } catch (error: any) {
    console.error('Share error:', error.message);
    res.status(500).json({ error: 'Lỗi' });
  }
});

// ============ Comments ============

// POST /api/posts/:id/comments - Add comment
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { content, parentId } = req.body;
    const { userId } = (req as any).user;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Nội dung bình luận không được trống' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: 'Bình luận quá dài (tối đa 2000 ký tự)' });
    }

    const post = await postDb.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Bài viết không tồn tại' });

    let notificationTargetUserId = post.authorId;
    let notificationEntityType: 'post' | 'comment' = 'post';
    let notificationEntityId = post.id;

    if (parentId) {
      const parentComment = await postDb.findCommentById(parentId);
      if (!parentComment || parentComment.post_id !== req.params.id) {
        return res.status(400).json({ error: 'Bình luận cha không hợp lệ' });
      }
      notificationTargetUserId = parentComment.author_id;
      notificationEntityType = 'comment';
      notificationEntityId = parentComment.id;
    }

    const id = crypto.randomUUID();
    await postDb.addComment({ id, postId: req.params.id, authorId: userId, content: content.trim(), parentId });

    if (notificationTargetUserId !== userId) {
      await notificationDb.create({
        userId: notificationTargetUserId,
        actorId: userId,
        type: 'post_comment',
        entityType: notificationEntityType,
        entityId: notificationEntityId,
        dataJson: {
          postId: post.id,
          commentId: parentId || id,
          ownerId: notificationTargetUserId,
          actorId: userId,
          parentId: parentId || null,
        },
      });
    }

    res.json({ message: 'OK' });
  } catch (error: any) {
    console.error('Add comment error:', error.message);
    res.status(500).json({ error: 'Lỗi thêm bình luận' });
  }
});

// PUT /api/posts/:postId/comments/:commentId - Edit comment (owner only)
router.put('/:postId/comments/:commentId', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Nội dung không được trống' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: 'Bình luận quá dài (tối đa 2000 ký tự)' });
    }

    const comment = await postDb.findCommentById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Bình luận không tồn tại' });
    }
    if (comment.author_id !== userId) {
      return res.status(403).json({ error: 'Bạn không có quyền sửa bình luận này' });
    }

    await postDb.editComment(req.params.commentId, content.trim());
    res.json({ message: 'OK' });
  } catch (error: any) {
    console.error('Edit comment error:', error.message);
    res.status(500).json({ error: 'Lỗi sửa bình luận' });
  }
});

// DELETE /api/posts/:postId/comments/:commentId - Delete comment (owner or admin)
router.delete('/:postId/comments/:commentId', authMiddleware, async (req, res) => {
  try {
    const { userId, role } = (req as any).user;
    const comment = await postDb.findCommentById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Bình luận không tồn tại' });
    }
    if (comment.author_id !== userId && role !== 'admin') {
      return res.status(403).json({ error: 'Bạn không có quyền xóa bình luận này' });
    }

    await postDb.deleteComment(req.params.commentId);
    res.json({ message: 'OK' });
  } catch (error: any) {
    console.error('Delete comment error:', error.message);
    res.status(500).json({ error: 'Lỗi xóa bình luận' });
  }
});

// POST /api/posts/:postId/comments/:commentId/like - Toggle comment like
router.post('/:postId/comments/:commentId/like', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const comment = await postDb.findCommentById(req.params.commentId);
    if (!comment || comment.post_id !== req.params.postId) {
      return res.status(404).json({ error: 'Bình luận không tồn tại' });
    }

    const post = await postDb.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Bài viết không tồn tại' });
    }

    const createdLike = await postDb.toggleCommentLike(req.params.commentId, userId);

    if (createdLike && comment.author_id !== userId) {
      await notificationDb.create({
        userId: comment.author_id,
        actorId: userId,
        type: 'comment_like',
        entityType: 'comment',
        entityId: req.params.commentId,
        dataJson: { postId: req.params.postId, commentId: req.params.commentId, ownerId: comment.author_id, actorId: userId },
      });
    }

    res.json({ message: 'OK' });
  } catch (error: any) {
    console.error('Comment like error:', error.message);
    res.status(500).json({ error: 'Lỗi' });
  }
});

export default router;
