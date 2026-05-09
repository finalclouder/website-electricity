import express from 'express';
import { authMiddleware } from './authMiddleware.js';

type LiveStatus = 'live' | 'ended';
type PeerRole = 'host' | 'viewer';

interface SignalCandidate {
  id: number;
  from: PeerRole;
  candidate: RTCIceCandidateInit;
  createdAt: string;
}

interface P2PLivestream {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  status: LiveStatus;
  viewerId: string | null;
  viewerName: string | null;
  offer: RTCSessionDescriptionInit | null;
  answer: RTCSessionDescriptionInit | null;
  candidates: SignalCandidate[];
  createdAt: string;
  endedAt: string | null;
  updatedAt: string;
}

const router = express.Router();
const sessions = new Map<string, P2PLivestream>();
let candidateSeq = 0;

function getUser(req: express.Request) {
  return (req as any).user as { userId: string; name?: string; email?: string; role: 'admin' | 'user' };
}

function publicSession(session: P2PLivestream) {
  return {
    id: session.id,
    title: session.title,
    hostId: session.hostId,
    hostName: session.hostName,
    hostAvatar: session.hostAvatar,
    status: session.status,
    hasViewer: Boolean(session.viewerId),
    viewerName: session.viewerName,
    createdAt: session.createdAt,
    endedAt: session.endedAt,
    updatedAt: session.updatedAt,
  };
}

function findActiveSessionByHost(hostId: string) {
  return Array.from(sessions.values()).find(session => session.hostId === hostId && session.status === 'live');
}

function requireSession(req: express.Request, res: express.Response): P2PLivestream | null {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Phiên live không tồn tại' });
    return null;
  }
  return session;
}

function isOwnerOrAdmin(session: P2PLivestream, user: ReturnType<typeof getUser>) {
  return session.hostId === user.userId || user.role === 'admin';
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

router.use(authMiddleware);

router.post('/', (req, res) => {
  cleanupOldSessions();

  const user = getUser(req);
  const title = String(req.body?.title || '').trim();
  if (!title) {
    return res.status(400).json({ error: 'Bạn phải đặt tên phiên live trước khi bắt đầu' });
  }
  if (title.length > 120) {
    return res.status(400).json({ error: 'Tên phiên live không được vượt quá 120 ký tự' });
  }

  const activeSession = findActiveSessionByHost(user.userId);
  if (activeSession) {
    return res.status(409).json({ error: 'Bạn đang có một phiên live chưa kết thúc' });
  }

  const now = new Date().toISOString();
  const session: P2PLivestream = {
    id: crypto.randomUUID(),
    title,
    hostId: user.userId,
    hostName: user.name || user.email || 'Người dùng',
    hostAvatar: '',
    status: 'live',
    viewerId: null,
    viewerName: null,
    offer: null,
    answer: null,
    candidates: [],
    createdAt: now,
    endedAt: null,
    updatedAt: now,
  };

  sessions.set(session.id, session);
  return res.status(201).json(publicSession(session));
});

router.get('/live', (_req, res) => {
  cleanupOldSessions();
  const liveSessions = Array.from(sessions.values())
    .filter(session => session.status === 'live')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(publicSession);
  res.json(liveSessions);
});

router.get('/:id', (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  res.json(publicSession(session));
});

router.post('/:id/offer', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;
  if (session.hostId !== user.userId) {
    return res.status(403).json({ error: 'Chỉ người phát live mới được gửi offer' });
  }
  if (session.status !== 'live') {
    return res.status(409).json({ error: 'Phiên live đã kết thúc' });
  }

  session.offer = req.body?.offer ?? null;
  session.answer = null;
  session.candidates = session.candidates.filter(candidate => candidate.from === 'host');
  session.updatedAt = new Date().toISOString();
  res.json({ ok: true });
});

router.get('/:id/offer', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;
  if (session.status !== 'live') {
    return res.status(409).json({ error: 'Phiên live đã kết thúc' });
  }
  if (session.viewerId && session.viewerId !== user.userId && session.hostId !== user.userId) {
    return res.status(409).json({ error: 'Phiên live này đã có một người xem' });
  }
  res.json({ offer: session.offer });
});

router.post('/:id/answer', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;
  if (session.hostId === user.userId) {
    return res.status(400).json({ error: 'Người phát không cần gửi answer' });
  }
  if (session.status !== 'live') {
    return res.status(409).json({ error: 'Phiên live đã kết thúc' });
  }
  if (session.viewerId && session.viewerId !== user.userId) {
    return res.status(409).json({ error: 'Phiên live này đã có một người xem' });
  }

  session.viewerId = user.userId;
  session.viewerName = user.name || user.email || 'Người xem';
  session.answer = req.body?.answer ?? null;
  session.updatedAt = new Date().toISOString();
  res.json({ ok: true });
});

router.get('/:id/answer', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;
  if (session.hostId !== user.userId) {
    return res.status(403).json({ error: 'Chỉ người phát live mới được lấy answer' });
  }
  res.json({ answer: session.answer });
});

router.post('/:id/candidates', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;

  const role = req.body?.role as PeerRole;
  const candidate = req.body?.candidate as RTCIceCandidateInit | null;
  if (role !== 'host' && role !== 'viewer') {
    return res.status(400).json({ error: 'Vai trò candidate không hợp lệ' });
  }
  if (!candidate) {
    return res.status(400).json({ error: 'ICE candidate không hợp lệ' });
  }
  if (role === 'host' && session.hostId !== user.userId) {
    return res.status(403).json({ error: 'Không có quyền gửi host candidate' });
  }
  if (role === 'viewer' && session.viewerId && session.viewerId !== user.userId) {
    return res.status(403).json({ error: 'Không có quyền gửi viewer candidate' });
  }

  session.candidates.push({
    id: ++candidateSeq,
    from: role,
    candidate,
    createdAt: new Date().toISOString(),
  });
  session.updatedAt = new Date().toISOString();
  res.json({ ok: true });
});

router.get('/:id/candidates', (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const role = req.query.role === 'host' ? 'host' : 'viewer';
  const after = Number(req.query.after || 0);
  const from = role === 'host' ? 'viewer' : 'host';
  const candidates = session.candidates
    .filter(candidate => candidate.from === from && candidate.id > after)
    .map(candidate => ({
      id: candidate.id,
      candidate: candidate.candidate,
      createdAt: candidate.createdAt,
    }));
  res.json({ candidates });
});

router.post('/:id/end', (req, res) => {
  const user = getUser(req);
  const session = requireSession(req, res);
  if (!session) return;
  if (!isOwnerOrAdmin(session, user)) {
    return res.status(403).json({ error: 'Chỉ người phát hoặc admin được kết thúc live' });
  }

  const now = new Date().toISOString();
  session.status = 'ended';
  session.endedAt = now;
  session.updatedAt = now;
  res.json(publicSession(session));
});

export default router;
