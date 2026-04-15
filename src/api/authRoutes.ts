/**
 * Auth API Routes - Register, Login, Profile
 */
import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { userDb } from '../../database.js';
import { generateToken, authMiddleware, adminOnly } from './authMiddleware.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Họ tên quá dài (tối đa 100 ký tự)' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Email không đúng định dạng' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });
    }

    if (password.length > 128) {
      return res.status(400).json({ error: 'Mật khẩu quá dài' });
    }

    const existing = await userDb.findByEmail(email.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const id = crypto.randomUUID();
    const user = await userDb.create(id, name.trim(), email.trim().toLowerCase(), hashedPassword);

    const token = '';

    res.json({
      token,
      message: 'Đăng ký thành công! Vui lòng chờ quản trị viên phê duyệt tài khoản của bạn.',
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, bio: user.bio, role: user.role, status: user.status, createdAt: user.created_at },
    });
  } catch (error: any) {
    console.error('Register error:', error.message);
    res.status(500).json({ error: 'Lỗi đăng ký' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });
    }

    const user = await userDb.findByEmailWithPassword(email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Tài khoản của bạn đang chờ Admin duyệt' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({ error: 'Tài khoản của bạn đã bị từ chối' });
    }
    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, bio: user.bio, role: user.role, status: user.status, createdAt: user.created_at },
    });
  } catch (error: any) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Lỗi đăng nhập' });
  }
});

// GET /api/auth/me - Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const user = await userDb.findById(userId);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

    res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar, bio: user.bio, role: user.role, status: user.status, createdAt: user.created_at });
  } catch (error: any) {
    console.error('Get me error:', error.message);
    res.status(500).json({ error: 'Lỗi tải hồ sơ' });
  }
});

// PUT /api/auth/profile - Update profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const { name, email, bio, avatar } = req.body;

    if (name !== undefined && name.length > 100) {
      return res.status(400).json({ error: 'Họ tên quá dài (tối đa 100 ký tự)' });
    }
    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!normalizedEmail) {
        return res.status(400).json({ error: 'Email không được để trống' });
      }
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ error: 'Email không đúng định dạng' });
      }
    }
    if (bio !== undefined && bio.length > 500) {
      return res.status(400).json({ error: 'Tiểu sử quá dài (tối đa 500 ký tự)' });
    }
    if (avatar !== undefined && avatar.length > 500000) {
      return res.status(400).json({ error: 'Ảnh đại diện quá lớn (tối đa ~375KB)' });
    }

    try {
      await userDb.updateProfile(userId, {
        name,
        email: email !== undefined ? email.trim().toLowerCase() : undefined,
        bio,
        avatar,
      });
    } catch (error: any) {
      const message = error?.message || '';
      if (error?.code === '23505' || message.includes('duplicate key') || message.includes('users_email_key')) {
        return res.status(409).json({ error: 'Email này đã được sử dụng bởi tài khoản khác' });
      }
      throw error;
    }

    const updated = await userDb.findById(userId);

    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    res.json({ id: updated.id, name: updated.name, email: updated.email, avatar: updated.avatar, bio: updated.bio, role: updated.role, status: updated.status, createdAt: updated.created_at });
  } catch (error: any) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ error: 'Lỗi cập nhật hồ sơ' });
  }
});

// PUT /api/auth/password - Change password
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập mật khẩu cũ và mật khẩu mới' });
    }

    const user = await userDb.findByIdWithPassword(userId);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

    if (!bcrypt.compareSync(oldPassword, user.password)) {
      return res.status(400).json({ error: 'Mật khẩu cũ không đúng' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới tối thiểu 6 ký tự' });
    }

    if (newPassword.length > 128) {
      return res.status(400).json({ error: 'Mật khẩu quá dài' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await userDb.changePassword(userId, hashedPassword);

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error: any) {
    console.error('Change password error:', error.message);
    res.status(500).json({ error: 'Lỗi đổi mật khẩu' });
  }
});

// ============ Admin Routes ============

// GET /api/auth/users - Admin get all users
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await userDb.getAll();
    res.json(users.map(u => ({ id: u.id, name: u.name, email: u.email, avatar: u.avatar, bio: u.bio, role: u.role, status: u.status, createdAt: u.created_at })));
  } catch (error: any) {
    console.error('Get users error:', error.message);
    res.status(500).json({ error: 'Lỗi tải danh sách người dùng' });
  }
});

// GET /api/auth/users/:id - Get a single user profile for profile viewing
router.get('/users/:id', authMiddleware, async (req, res) => {
  try {
    const requester = (req as any).user;
    const target = await userDb.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    const canViewPrivateFields = requester.userId === target.id || requester.role === 'admin';
    if (!canViewPrivateFields) {
      return res.json({
        id: target.id,
        name: target.name,
        avatar: target.avatar,
        bio: target.bio,
        createdAt: target.created_at,
      });
    }

    res.json({
      id: target.id,
      name: target.name,
      email: target.email,
      avatar: target.avatar,
      bio: target.bio,
      role: target.role,
      status: target.status,
      createdAt: target.created_at,
    });
  } catch (error: any) {
    console.error('Get user by id error:', error.message);
    res.status(500).json({ error: 'Lỗi tải hồ sơ người dùng' });
  }
});

// DELETE /api/auth/users/:id - Admin delete user
router.delete('/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    if (req.params.id === userId) {
      return res.status(400).json({ error: 'Không thể xóa chính mình' });
    }

    const target = await userDb.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }

    await userDb.delete(req.params.id);
    res.json({ message: 'Đã xóa người dùng' });
  } catch (error: any) {
    console.error('Delete user error:', error.message);
    res.status(500).json({ error: 'Lỗi xóa người dùng' });
  }
});

router.put('/users/:id/status', authMiddleware, adminOnly, async (req, res) => {
  const { userId } = (req as any).user;
  if (req.params.id === userId) {
    return res.status(400).json({ error: 'Không thể đổi trạng thái chính mình' });
  }

  const { status } = req.body;
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
  }

  try {
    const updatedUser = await userDb.setStatus(req.params.id, status);
    if (!updatedUser) return res.status(404).json({ error: 'Không tìm thấy user' });
    res.json(updatedUser);
  } catch (error: any) {
    console.error('Update status error:', error.message);
    res.status(500).json({ error: 'Lỗi cập nhật trạng thái' });
  }
});

router.put('/users/:id/role', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    if (req.params.id === userId) {
      return res.status(400).json({ error: 'Không thể thay đổi role chính mình' });
    }

    const target = await userDb.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }

    await userDb.toggleRole(req.params.id);
    res.json({ message: 'Đã thay đổi quyền' });
  } catch (error: any) {
    console.error('Toggle role error:', error.message);
    res.status(500).json({ error: 'Lỗi thay đổi quyền' });
  }
});

// PUT /api/auth/users/:id/password - Admin reset password
router.put('/users/:id/password', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới tối thiểu 6 ký tự' });
    }
    if (newPassword.length > 128) {
      return res.status(400).json({ error: 'Mật khẩu quá dài' });
    }

    const target = await userDb.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await userDb.resetPassword(req.params.id, hashedPassword);
    res.json({ message: 'Đã đặt lại mật khẩu' });
  } catch (error: any) {
    console.error('Reset password error:', error.message);
    res.status(500).json({ error: 'Lỗi đặt lại mật khẩu' });
  }
});

export default router;
