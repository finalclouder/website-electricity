/**
 * Social API Routes - Posts, Comments, Likes
 */
import { Router } from 'express';
import crypto from 'crypto';
import { notificationDb, postDb } from '../../database.js';
import { authMiddleware } from './authMiddleware.js';

const router = Router();

// GET /api/posts - Get all posts (requires auth)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const posts = await postDb.getAll();
    res.json(posts);
  } catch (error: any) {
    console.error('Get posts error:', error.message);
    res.status(500).json({ error: 'Lỗi tải bài viết' });
  }
});

// POST /api/posts - Create post
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const { content, images, attachmentName, category } = req.body;
    const normalizedContent = content?.trim() || '';
    const normalizedImages = Array.isArray(images) ? images : [];

    if (!normalizedContent && normalizedImages.length === 0) {
      return res.status(400).json({ error: 'Nội dung hoặc media không được để trống' });
    }

    if (normalizedContent.length > 10000) {
      return res.status(400).json({ error: 'Nội dung quá dài (tối đa 10000 ký tự)' });
    }

    if (images && (!Array.isArray(images) || images.length > 10)) {
      return res.status(400).json({ error: 'Danh sách ảnh không hợp lệ (tối đa 10 ảnh)' });
    }

    const validCategories = ['general', 'technical', 'safety', 'announcement'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ error: 'Danh mục không hợp lệ' });
    }

    const id = crypto.randomUUID();
    await postDb.create({
      id,
      authorId: userId,
      content: normalizedContent,
      images: normalizedImages,
      attachmentName: attachmentName || '',
      category: category || 'general',
    });

    const posts = await postDb.getAll();
    res.json(posts);
  } catch (error: any) {
    console.error('Create post error:', error.message);
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
