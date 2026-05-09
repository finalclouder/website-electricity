import express from 'express';
import { authMiddleware } from './authMiddleware.js';

type LiveStatus = 'pending' | 'live' | 'ended';
type PeerRole = 'host' | 'viewer';

interface SignalCandidate {
  id: number;
  from: PeerRole;
  candidate: RTCIceCandidateInit;
  createdAt: string;
  signalVersion?: number;
}

interface LiveMessage {
  id: number;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

interface P2PLivestream {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  adminId: string | null;
  adminName: string | null;
  status: LiveStatus;
  offer: RTCSessionDescriptionInit | null;
  answer: RTCSessionDescriptionInit | null;
  candidates: SignalCandidate[];
  messages: LiveMessage[];
  createdAt: string;
  approvedAt: string | null;
  endedAt: string | null;
  updatedAt: string;
  hostLastSeenAt?: string | null;
  adminLastSeenAt?: string | null;
  signalVersion?: number;
  reconnectRequestedAt?: string | null;
}

type AuthUser = { userId: string; name?: string; email?: string; role: 'admin' | 'user'; avatar?: string };

const router = express.Router();
const sessions = new Map<string, P2PLivestream>();
let candidateSeq = 0;
let messageSeq = 0;

function getUser(req: express.Request): AuthUser {
  return (req as any).user;
}

function displayName(user: AuthUser, fallback: string) {
  return user.name || user.email || fallback;
}

function publicSession(session: P2PLivestream) {
  return {
    id: session.id,
    title: session.title,
    hostId: session.hostId,
    hostName: session.hostName,
    hostAvatar: session.hostAvatar,
    adminId: session.adminId,
    adminName: session.adminName,
    status: session.status,
    hasViewer: Boolean(session.adminId),
    viewerName: session.adminName,
    createdAt: session.createdAt,
    approvedAt: session.approvedAt,
    endedAt: session.endedAt,
    updatedAt: session.updatedAt,
    signalVersion: session.signalVersion || 0,
    reconnectRequestedAt: session.reconnectRequestedAt || null,
  };
}

function cleanupOldSessions() {
  const now = Date.now();
  const maxAgeMs = 6 * 60 * 60 * 1000;
  for (const [id, session] of sessions.entries()) {
    const updatedAt = new Date(session.updatedAt).getTime();
    if (Number.isFinite(updatedAt) && now - updatedAt > maxAgeMs) {
      sessions.delete(id);
    }
  }
}

function findActiveSessionByHost(hostId: string) {
  return Array.from(sessions.values()).find(session => session.hostId === hostId && session.status !== 'ended');
}

function findActiveAdminSession(adminId: string) {
  return Array.from(sessions.values()).find(session => session.adminId === adminId && session.status === 'live');
}

function canAccessSession(session: P2PLivestream, user: AuthUser) {
  return user.role === 'admin' || session.hostId === user.userId;
}

function canUseLiveRoom(session: P2PLivestream, user: AuthUser) {
  return session.hostId === user.userId || session.adminId === user.userId;
}

function participantRole(session: P2PLivestream, user: AuthUser): PeerRole | null {
  if (session.hostId === user.userId) return 'host';
  if (session.adminId === user.userId) return 'viewer';
  return null;
}

function markParticipantSeen(session: P2PLivestream, user: AuthUser) {
  const now = new Date().toISOString();
  const role = participantRole(session, user);
  if (role === 'host') session.hostLastSeenAt = now;
  if (role === 'viewer') session.adminLastSeenAt = now;
}

function expireIfParticipantTimedOut(session: P2PLivestream) {
  if (session.status !== 'live') return false;
  const now = Date.now();
  const timeoutMs = 30 * 1000;
  const hostSeen = session.hostLastSeenAt ? new Date(session.hostLastSeenAt).getTime() : NaN;
  const adminSeen = session.adminLastSeenAt ? new Date(session.adminLastSeenAt).getTime() : NaN;
  const hostTimedOut = Number.isFinite(hostSeen) && now - hostSeen > timeoutMs;
  const adminTimedOut = Number.isFinite(adminSeen) && now - adminSeen > timeoutMs;
  if (!hostTimedOut && !adminTimedOut) return false;
  const endedAt = new Date().toISOString();
  session.status = 'ended';
  session.endedAt = endedAt;
  session.updatedAt = endedAt;
  return true;
}

function visibleSessions(user: AuthUser) {
  Array.from(sessions.values()).forEach(expireIfParticipantTimedOut);
  return Array.from(sessions.values())
    .filter(session => session.status !== 'ended')
    .filter(session => user.role === 'admin' || session.hostId === user.userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(publicSession);
}

function requireSession(req: express.Request, res: express.Response): P2PLivestream | null {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Phiên live không tồn tại' });
    return null;
  }
  expireIfParticipantTimedOut(session);
  return session;
}

router.use(authMiddleware);

router.post('/', (req, res) => {
  cleanupOldSessions();
  const user = getUser(req);

  if (user.role === 'admin') {
    return res.status(400).json({ error: 'Admin không cần gửi yêu cầu phát live' });
  }

  const title = String(req.body?.title || '').trim();
  if (!title) {
    return res.status(400).json({ error: 'Bạn phải đặt tên phiên live trước khi gửi yêu cầu' });
  }
  if (title.length > 120) {
    return res.status(400).json({ error: 'Tên phiên live không được vượt quá 120 ký tự' });
  }
  if (findActiveSessionByHost(user.userId)) {
    return res.status(409).json({ error: 'Bạn đang có một yêu cầu hoặc phiên live chưa kết thúc' });
  }

  const now = new Date().toISOString();
  const session: P2PLivestream = {
    id: crypto.randomUUID(),
    title,
    hostId: user.userId,
    hostName: displayName(user, 'Người dùng'),
    hostAvatar: user.avatar || '',
    adminId: null,
    adminName: null,
    status: 'pending',
    offer: null,
    answer: null,
    candidates: [],
    messages: [],
    createdAt: now,
    approvedAt: null,
    endedAt: null,
    updatedAt: now,
    hostLastSeenAt: null,
    adminLastSeenAt: null,
    signalVersion: 0,
    reconnectRequestedAt: null,
  };

  sessions.set(session.id, session);
  return res.status(201).json(publicSession(session));
});

router.get('/live', (req, res) => {
  cleanupOldSessions();
  res.json(visibleSessions(getUser(req)));
});

router.get('/:id', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;
  if (!canAccessSession(session, user)) return res.status(403).json({ error: 'Bạn không có quyền tham gia phiên live này' });
  res.json(publicSession(session));
});

router.post('/:id/approve', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;
  if (user.role !== 'admin') return res.status(403).json({ error: 'Chỉ admin mới được duyệt yêu cầu live' });
  if (session.status !== 'pending') return res.status(409).json({ error: 'Yêu cầu live này không còn chờ duyệt' });
  if (findActiveAdminSession(user.userId)) return res.status(409).json({ error: 'Admin đang có một phiên live khác chưa kết thúc' });

  const now = new Date().toISOString();
  session.adminId = user.userId;
  session.adminName = displayName(user, 'Admin');
  session.status = 'live';
  session.approvedAt = now;
  session.hostLastSeenAt = now;
  session.adminLastSeenAt = now;
  session.updatedAt = now;
  res.json(publicSession(session));
});

router.post('/:id/heartbeat', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;
  if (!canUseLiveRoom(session, user)) return res.status(403).json({ error: 'Bạn không có quyền tham gia phiên live này' });
  if (session.status === 'live') {
    markParticipantSeen(session, user);
    expireIfParticipantTimedOut(session);
    session.updatedAt = new Date().toISOString();
  }
  res.json(publicSession(session));
});

router.post('/:id/reconnect', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;
  if (!canUseLiveRoom(session, user)) return res.status(403).json({ error: 'Báº¡n khÃ´ng cÃ³ quyá»n tham gia phiÃªn live nÃ y' });
  if (session.status !== 'live') return res.status(409).json({ error: 'PhiÃªn live Ä‘Ã£ káº¿t thÃºc' });

  markParticipantSeen(session, user);
  session.answer = null;
  session.reconnectRequestedAt = new Date().toISOString();
  session.updatedAt = session.reconnectRequestedAt;
  res.json(publicSession(session));
});

router.post('/:id/offer', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;
  if (session.hostId !== user.userId) return res.status(403).json({ error: 'Chỉ người phát live mới được gửi offer' });
  if (session.status !== 'live') return res.status(409).json({ error: 'Phiên live chưa được duyệt hoặc đã kết thúc' });

  session.offer = req.body?.offer ?? null;
  session.answer = null;
  session.signalVersion = (session.signalVersion || 0) + 1;
  session.reconnectRequestedAt = null;
  session.candidates = session.candidates.filter(candidate => candidate.from === 'host');
  session.updatedAt = new Date().toISOString();
  res.json({ ok: true, signalVersion: session.signalVersion });
});

router.get('/:id/offer', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;
  if (!canUseLiveRoom(session, user)) return res.status(403).json({ error: 'Bạn không có quyền tham gia phiên live này' });
  if (session.status !== 'live') return res.status(409).json({ error: 'Phiên live chưa được duyệt hoặc đã kết thúc' });
  res.json({ offer: session.offer, signalVersion: session.signalVersion || 0, reconnectRequestedAt: session.reconnectRequestedAt || null });
});

router.post('/:id/answer', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;
  if (session.adminId !== user.userId) return res.status(403).json({ error: 'Chỉ admin được gửi answer cho phiên live này' });
  if (session.status !== 'live') return res.status(409).json({ error: 'Phiên live đã kết thúc' });

  session.answer = req.body?.answer ?? null;
  session.updatedAt = new Date().toISOString();
  res.json({ ok: true, signalVersion: session.signalVersion || 0 });
});

router.get('/:id/answer', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;
  if (session.hostId !== user.userId) return res.status(403).json({ error: 'Chỉ người phát live mới được lấy answer' });
  res.json({ answer: session.answer, signalVersion: session.signalVersion || 0 });
});

router.post('/:id/candidates', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;
  if (!canUseLiveRoom(session, user)) return res.status(403).json({ error: 'Bạn không có quyền tham gia phiên live này' });

  const role = req.body?.role as PeerRole;
  const candidate = req.body?.candidate as RTCIceCandidateInit | null;
  if (role !== 'host' && role !== 'viewer') return res.status(400).json({ error: 'Vai trò candidate không hợp lệ' });
  if (!candidate) return res.status(400).json({ error: 'ICE candidate không hợp lệ' });
  if (role === 'host' && session.hostId !== user.userId) return res.status(403).json({ error: 'Không có quyền gửi host candidate' });
  if (role === 'viewer' && session.adminId !== user.userId) return res.status(403).json({ error: 'Không có quyền gửi admin candidate' });

  session.candidates.push({
    id: ++candidateSeq,
    from: role,
    candidate,
    createdAt: new Date().toISOString(),
    signalVersion: session.signalVersion || 0,
  });
  session.updatedAt = new Date().toISOString();
  res.json({ ok: true });
});

router.get('/:id/candidates', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;
  if (!canUseLiveRoom(session, user)) return res.status(403).json({ error: 'Bạn không có quyền tham gia phiên live này' });

  const role = req.query.role === 'host' ? 'host' : 'viewer';
  const after = Number(req.query.after || 0);
  const from = role === 'host' ? 'viewer' : 'host';
  const candidates = session.candidates
    .filter(candidate => candidate.from === from && candidate.id > after)
    .filter(candidate => (candidate.signalVersion ?? 0) === (session.signalVersion || 0))
    .map(candidate => ({
      id: candidate.id,
      candidate: candidate.candidate,
      createdAt: candidate.createdAt,
    }));
  res.json({ candidates });
});

router.get('/:id/messages', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;
  if (!canUseLiveRoom(session, user)) return res.status(403).json({ error: 'Bạn không có quyền chat trong phiên live này' });
  const after = Number(req.query.after || 0);
  res.json({ messages: session.messages.filter(message => message.id > after) });
});

router.post('/:id/messages', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;
  if (!canUseLiveRoom(session, user)) return res.status(403).json({ error: 'Bạn không có quyền chat trong phiên live này' });
  if (session.status !== 'live') return res.status(409).json({ error: 'Phiên live đã kết thúc' });

  const text = String(req.body?.text || '').trim().slice(0, 500);
  if (!text) return res.status(400).json({ error: 'Tin nhắn không được để trống' });

  const message = {
    id: ++messageSeq,
    authorId: user.userId,
    authorName: displayName(user, 'Người dùng'),
    text,
    createdAt: new Date().toISOString(),
  };
  session.messages.push(message);
  session.updatedAt = new Date().toISOString();
  res.json({ ok: true, message });
});

router.post('/:id/end', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;
  if (!canUseLiveRoom(session, user)) return res.status(403).json({ error: 'Chỉ người phát hoặc admin được kết thúc live' });

  const now = new Date().toISOString();
  session.status = 'ended';
  session.endedAt = now;
  session.updatedAt = now;
  res.json(publicSession(session));
});

export default router;
