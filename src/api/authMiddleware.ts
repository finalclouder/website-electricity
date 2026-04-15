/**
 * JWT Authentication Middleware
 */
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { userDb } from '../../database.js';

import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_123456789_do_not_use_in_prod';
const JWT_EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// Express middleware: sets req.user if valid token and verifies current account state
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token không hợp lệ' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Token hết hạn hoặc không hợp lệ' });
  }

  try {
    const user = await userDb.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    }
    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Tài khoản của bạn đang chờ Admin duyệt' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({ error: 'Tài khoản của bạn đã bị từ chối' });
    }

    (req as any).user = { ...payload, role: user.role, email: user.email };
    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error.message);
    return res.status(500).json({ error: 'Lỗi xác thực tài khoản' });
  }
}

// Optional auth: doesn't block if no token, but sets req.user if present
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (payload) {
      (req as any).user = payload;
    }
  }
  next();
}

// Admin-only middleware (use after authMiddleware)
export function adminOnly(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as JwtPayload;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới có quyền thực hiện' });
  }
  next();
}
