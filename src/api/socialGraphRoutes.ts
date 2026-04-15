import { Router } from 'express';
import {
  followDb,
  friendRequestDb,
  notificationDb,
  userDb,
} from '../../database.js';
import { authMiddleware } from './authMiddleware.js';

const router = Router();

router.get('/relationships/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const targetUser = await userDb.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    const relationship = await followDb.getRelationshipSummary(userId, req.params.userId);
    res.json(relationship);
  } catch (error: any) {
    console.error('Get relationship error:', error.message);
    res.status(500).json({ error: 'Lỗi tải quan hệ người dùng' });
  }
});

router.get('/users/:userId/followers', authMiddleware, async (req, res) => {
  try {
    const targetUser = await userDb.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    const followers = await followDb.getFollowers(req.params.userId);
    res.json(followers);
  } catch (error: any) {
    console.error('Get followers error:', error.message);
    res.status(500).json({ error: 'Lỗi tải danh sách người theo dõi' });
  }
});

router.get('/users/:userId/following', authMiddleware, async (req, res) => {
  try {
    const targetUser = await userDb.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    const following = await followDb.getFollowing(req.params.userId);
    res.json(following);
  } catch (error: any) {
    console.error('Get following error:', error.message);
    res.status(500).json({ error: 'Lỗi tải danh sách đang theo dõi' });
  }
});

router.post('/users/:userId/follow', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const targetUserId = req.params.userId;

    if (targetUserId === userId) {
      return res.status(400).json({ error: 'Không thể tự theo dõi chính mình' });
    }

    const targetUser = await userDb.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    const created = await followDb.follow(userId, targetUserId);
    if (created) {
      await notificationDb.create({
        userId: targetUserId,
        actorId: userId,
        type: 'follow',
        entityType: 'user',
        entityId: userId,
        dataJson: { actorId: userId, targetUserId },
      });
    }

    const relationship = await followDb.getRelationshipSummary(userId, targetUserId);
    res.json({ message: 'Đã theo dõi người dùng', relationship });
  } catch (error: any) {
    console.error('Follow user error:', error.message);
    res.status(500).json({ error: 'Lỗi theo dõi người dùng' });
  }
});

router.delete('/users/:userId/follow', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const targetUserId = req.params.userId;

    if (targetUserId === userId) {
      return res.status(400).json({ error: 'Không thể bỏ theo dõi chính mình' });
    }

    const targetUser = await userDb.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    await followDb.unfollow(userId, targetUserId);
    const relationship = await followDb.getRelationshipSummary(userId, targetUserId);
    res.json({ message: 'Đã bỏ theo dõi người dùng', relationship });
  } catch (error: any) {
    console.error('Unfollow user error:', error.message);
    res.status(500).json({ error: 'Lỗi bỏ theo dõi người dùng' });
  }
});

router.get('/friends', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const friends = await friendRequestDb.listFriends(userId);
    res.json(friends);
  } catch (error: any) {
    console.error('Get friends error:', error.message);
    res.status(500).json({ error: 'Lỗi tải danh sách bạn bè' });
  }
});

router.get('/friend-requests', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const [incoming, outgoing] = await Promise.all([
      friendRequestDb.listIncoming(userId),
      friendRequestDb.listOutgoing(userId),
    ]);

    res.json({ incoming, outgoing });
  } catch (error: any) {
    console.error('Get friend requests error:', error.message);
    res.status(500).json({ error: 'Lỗi tải lời mời kết bạn' });
  }
});

router.post('/friend-requests/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const receiverId = req.params.userId;

    if (receiverId === userId) {
      return res.status(400).json({ error: 'Không thể gửi lời mời kết bạn cho chính mình' });
    }

    const receiver = await userDb.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    const existingFriends = await friendRequestDb.findAcceptedBetween(userId, receiverId);
    if (existingFriends) {
      return res.status(400).json({ error: 'Hai người đã là bạn bè' });
    }

    const existingOutgoing = await friendRequestDb.findPendingBetween(userId, receiverId);
    const existingIncoming = await friendRequestDb.findPendingBetween(receiverId, userId);
    if (existingOutgoing || existingIncoming) {
      return res.status(400).json({ error: 'Đã tồn tại lời mời kết bạn đang chờ xử lý' });
    }

    const requestId = await friendRequestDb.sendRequest(userId, receiverId);
    await notificationDb.create({
      userId: receiverId,
      actorId: userId,
      type: 'friend_request',
      entityType: 'friend_request',
      entityId: requestId,
      dataJson: { requestId, senderId: userId, receiverId },
    });

    const [incoming, outgoing] = await Promise.all([
      friendRequestDb.listIncoming(userId),
      friendRequestDb.listOutgoing(userId),
    ]);

    res.json({ message: 'Đã gửi lời mời kết bạn', incoming, outgoing });
  } catch (error: any) {
    console.error('Send friend request error:', error.message);
    res.status(500).json({ error: 'Lỗi gửi lời mời kết bạn' });
  }
});

router.post('/friend-requests/:requestId/accept', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const accepted = await friendRequestDb.acceptRequest(req.params.requestId, userId);
    if (!accepted) {
      return res.status(404).json({ error: 'Lời mời kết bạn không tồn tại' });
    }

    await notificationDb.create({
      userId: accepted.senderId,
      actorId: userId,
      type: 'friend_accept',
      entityType: 'friend_request',
      entityId: accepted.id,
      dataJson: { requestId: accepted.id, senderId: accepted.senderId, receiverId: accepted.receiverId },
    });

    const [incoming, outgoing, friends] = await Promise.all([
      friendRequestDb.listIncoming(userId),
      friendRequestDb.listOutgoing(userId),
      friendRequestDb.listFriends(userId),
    ]);

    res.json({ message: 'Đã chấp nhận lời mời kết bạn', incoming, outgoing, friends });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Bạn không có quyền chấp nhận lời mời này' });
    }
    if (error.message === 'INVALID_STATUS') {
      return res.status(400).json({ error: 'Lời mời kết bạn không còn ở trạng thái chờ' });
    }
    console.error('Accept friend request error:', error.message);
    res.status(500).json({ error: 'Lỗi chấp nhận lời mời kết bạn' });
  }
});

router.post('/friend-requests/:requestId/reject', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const rejected = await friendRequestDb.rejectRequest(req.params.requestId, userId);
    if (!rejected) {
      return res.status(404).json({ error: 'Lời mời kết bạn không tồn tại' });
    }

    const [incoming, outgoing] = await Promise.all([
      friendRequestDb.listIncoming(userId),
      friendRequestDb.listOutgoing(userId),
    ]);

    res.json({ message: 'Đã từ chối lời mời kết bạn', incoming, outgoing });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Bạn không có quyền từ chối lời mời này' });
    }
    if (error.message === 'INVALID_STATUS') {
      return res.status(400).json({ error: 'Lời mời kết bạn không còn ở trạng thái chờ' });
    }
    console.error('Reject friend request error:', error.message);
    res.status(500).json({ error: 'Lỗi từ chối lời mời kết bạn' });
  }
});

router.delete('/friend-requests/:requestId', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const cancelled = await friendRequestDb.cancelRequest(req.params.requestId, userId);
    if (!cancelled) {
      return res.status(404).json({ error: 'Lời mời kết bạn không tồn tại' });
    }

    const [incoming, outgoing] = await Promise.all([
      friendRequestDb.listIncoming(userId),
      friendRequestDb.listOutgoing(userId),
    ]);

    res.json({ message: 'Đã hủy lời mời kết bạn', incoming, outgoing });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Bạn không có quyền hủy lời mời này' });
    }
    if (error.message === 'INVALID_STATUS') {
      return res.status(400).json({ error: 'Lời mời kết bạn không còn ở trạng thái chờ' });
    }
    console.error('Cancel friend request error:', error.message);
    res.status(500).json({ error: 'Lỗi hủy lời mời kết bạn' });
  }
});

router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const notifications = await notificationDb.listForUser(userId);
    res.json(notifications);
  } catch (error: any) {
    console.error('Get notifications error:', error.message);
    res.status(500).json({ error: 'Lỗi tải thông báo' });
  }
});

router.get('/notifications/unread-count', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const count = await notificationDb.getUnreadCount(userId);
    res.json({ count });
  } catch (error: any) {
    console.error('Get unread notification count error:', error.message);
    res.status(500).json({ error: 'Lỗi tải số lượng thông báo chưa đọc' });
  }
});

router.post('/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    await notificationDb.markAsRead(req.params.id, userId);
    const count = await notificationDb.getUnreadCount(userId);
    res.json({ message: 'Đã đánh dấu đã đọc', count });
  } catch (error: any) {
    console.error('Mark notification read error:', error.message);
    res.status(500).json({ error: 'Lỗi cập nhật trạng thái thông báo' });
  }
});

router.post('/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    await notificationDb.markAllAsRead(userId);
    res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc', count: 0 });
  } catch (error: any) {
    console.error('Mark all notifications read error:', error.message);
    res.status(500).json({ error: 'Lỗi cập nhật trạng thái thông báo' });
  }
});

export default router;
