import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env, UserRow } from '../types';
import { requireAuth } from '../auth';
import { json, readJson } from '../http';

type LiveStatus = 'pending' | 'live' | 'ended';
type PeerRole = 'host' | 'viewer';

type SignalCandidate = {
  id: number;
  from: PeerRole;
  candidate: RTCIceCandidateInit;
  createdAt: string;
  signalVersion?: number;
};

type LiveMessage = {
  id: number;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
};

type P2PLivestream = {
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
};

type LiveNotificationRow = {
  id: string;
  entity_id: string;
  data_json: P2PLivestream;
  created_at: string;
};

type LiveSignalRow = {
  id: string;
  entity_id: string;
  data_json: SignalCandidate;
  created_at: string;
};

function getIceServers(env: Env): RTCIceServer[] {
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const turnUrls = (env.LIVESTREAM_TURN_URLS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (turnUrls.length > 0 && env.LIVESTREAM_TURN_USERNAME && env.LIVESTREAM_TURN_CREDENTIAL) {
    iceServers.push({
      urls: turnUrls,
      username: env.LIVESTREAM_TURN_USERNAME,
      credential: env.LIVESTREAM_TURN_CREDENTIAL,
    });
  } else {
    iceServers.push({
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    });
  }

  return iceServers;
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

function displayName(user: UserRow, fallback: string) {
  return user.name || user.email || fallback;
}

function routeId(pathname: string) {
  const match = pathname.match(/^\/api\/livestreams\/([^/]+)(?:\/[^/]+)?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : '';
}

function canAccessSession(session: P2PLivestream, user: UserRow) {
  return user.role === 'admin' || session.hostId === user.id;
}

function canUseLiveRoom(session: P2PLivestream, user: UserRow) {
  return session.hostId === user.id || session.adminId === user.id;
}

function participantRole(session: P2PLivestream, user: UserRow): PeerRole | null {
  if (session.hostId === user.id) return 'host';
  if (session.adminId === user.id) return 'viewer';
  return null;
}

function nextSequenceId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

function markParticipantSeen(session: P2PLivestream, user: UserRow) {
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

async function listStoredSessions(supabase: SupabaseClient): Promise<P2PLivestream[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, entity_id, data_json, created_at')
    .eq('type', 'livestream_session')
    .eq('entity_type', 'livestream')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return ((data || []) as LiveNotificationRow[]).map((row) => row.data_json).filter(Boolean);
}

async function getStoredSession(supabase: SupabaseClient, id: string): Promise<P2PLivestream | null> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, entity_id, data_json, created_at')
    .eq('type', 'livestream_session')
    .eq('entity_type', 'livestream')
    .eq('entity_id', id)
    .maybeSingle<LiveNotificationRow>();

  if (error) throw error;
  return data?.data_json || null;
}

async function saveStoredSession(supabase: SupabaseClient, session: P2PLivestream) {
  session.updatedAt = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    .update({ data_json: session, is_read: true })
    .eq('type', 'livestream_session')
    .eq('entity_type', 'livestream')
    .eq('entity_id', session.id);
  if (error) throw error;
}

async function patchStoredSession(supabase: SupabaseClient, sessionId: string, patch: Partial<P2PLivestream>) {
  const latest = await getStoredSession(supabase, sessionId);
  if (!latest) return null;
  const next = { ...latest, ...patch, updatedAt: new Date().toISOString() };
  const { error } = await supabase
    .from('notifications')
    .update({ data_json: next, is_read: true })
    .eq('type', 'livestream_session')
    .eq('entity_type', 'livestream')
    .eq('entity_id', sessionId);
  if (error) throw error;
  return next;
}

async function createStoredSession(supabase: SupabaseClient, session: P2PLivestream) {
  const { error } = await supabase.from('notifications').insert({
    id: crypto.randomUUID(),
    user_id: session.hostId,
    actor_id: session.hostId,
    type: 'livestream_session',
    entity_type: 'livestream',
    entity_id: session.id,
    data_json: session,
    is_read: true,
    created_at: session.createdAt,
  });
  if (error) throw error;
}

async function cleanupOldSessions(supabase: SupabaseClient) {
  const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('type', 'livestream_session')
    .eq('entity_type', 'livestream')
    .lt('created_at', cutoff);
  if (error) throw error;

  const { error: signalError } = await supabase
    .from('notifications')
    .delete()
    .eq('type', 'livestream_session')
    .eq('entity_type', 'livestream_candidate')
    .lt('created_at', cutoff);
  if (signalError) throw signalError;
}

async function createStoredCandidate(supabase: SupabaseClient, session: P2PLivestream, candidate: SignalCandidate) {
  const { error } = await supabase.from('notifications').insert({
    id: crypto.randomUUID(),
    user_id: candidate.from === 'host' ? session.hostId : session.adminId,
    actor_id: candidate.from === 'host' ? session.hostId : session.adminId,
    type: 'livestream_session',
    entity_type: 'livestream_candidate',
    entity_id: session.id,
    data_json: candidate,
    is_read: true,
    created_at: candidate.createdAt,
  });
  if (error) throw error;
}

async function deleteStoredCandidates(supabase: SupabaseClient, sessionId: string) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('type', 'livestream_session')
    .eq('entity_type', 'livestream_candidate')
    .eq('entity_id', sessionId);
  if (error) throw error;
}

async function listStoredCandidates(supabase: SupabaseClient, sessionId: string, from: PeerRole, after: number): Promise<SignalCandidate[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, entity_id, data_json, created_at')
    .eq('type', 'livestream_session')
    .eq('entity_type', 'livestream_candidate')
    .eq('entity_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) throw error;
  return ((data || []) as LiveSignalRow[])
    .map((row) => row.data_json)
    .filter((candidate) => candidate?.from === from && candidate.id > after);
}

function listVisibleSessions(sessions: P2PLivestream[], user: UserRow) {
  return sessions
    .filter((session) => session.status !== 'ended')
    .filter((session) => user.role === 'admin' || session.hostId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(publicSession);
}

async function getFreshSession(supabase: SupabaseClient, id: string) {
  const session = await getStoredSession(supabase, id);
  if (session && expireIfParticipantTimedOut(session)) {
    await patchStoredSession(supabase, session.id, { status: session.status, endedAt: session.endedAt });
  }
  return session;
}

export async function handleLivestream(request: Request, env: Env, pathname: string, url: URL): Promise<Response> {
  const auth = await requireAuth(request, env);
  if ('response' in auth) return auth.response;
  const { user, supabase } = auth;

  await cleanupOldSessions(supabase);

  if (request.method === 'GET' && pathname === '/api/livestreams/ice-servers') {
    return json({ iceServers: getIceServers(env), targetQuality: { width: 1280, height: 720, label: '720p' } });
  }

  if (request.method === 'POST' && pathname === '/api/livestreams') {
    if (user.role === 'admin') {
      return json({ error: 'Admin không cần gửi yêu cầu phát live' }, 400);
    }

    const body = await readJson<{ title?: unknown }>(request);
    const title = String(body.title || '').trim();

    if (!title) return json({ error: 'Bạn phải đặt tên phiên live trước khi gửi yêu cầu' }, 400);
    if (title.length > 120) return json({ error: 'Tên phiên live không được vượt quá 120 ký tự' }, 400);

    const sessions = await listStoredSessions(supabase);
    if (sessions.some((session) => session.hostId === user.id && session.status !== 'ended')) {
      return json({ error: 'Bạn đang có một yêu cầu hoặc phiên live chưa kết thúc' }, 409);
    }

    const now = new Date().toISOString();
    const session: P2PLivestream = {
      id: crypto.randomUUID(),
      title,
      hostId: user.id,
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

    await createStoredSession(supabase, session);
    return json(publicSession(session), 201);
  }

  if (request.method === 'GET' && pathname === '/api/livestreams/live') {
    const sessions = await listStoredSessions(supabase);
    const expired = sessions.filter(expireIfParticipantTimedOut);
    await Promise.all(expired.map((item) => saveStoredSession(supabase, item)));
    return json(listVisibleSessions(sessions, user));
  }

  const id = routeId(pathname);
  const session = id ? await getFreshSession(supabase, id) : null;
  if (!session) return json({ error: 'Phiên live không tồn tại' }, 404);
  if (!canAccessSession(session, user)) return json({ error: 'Bạn không có quyền tham gia phiên live này' }, 403);

  if (request.method === 'GET' && pathname === `/api/livestreams/${id}`) {
    return json(publicSession(session));
  }

  if (request.method === 'POST' && pathname === `/api/livestreams/${id}/approve`) {
    if (user.role !== 'admin') return json({ error: 'Chỉ admin mới được duyệt yêu cầu live' }, 403);
    if (session.status !== 'pending') return json({ error: 'Yêu cầu live này không còn chờ duyệt' }, 409);

    const sessions = await listStoredSessions(supabase);
    if (sessions.some((item) => item.adminId === user.id && item.status === 'live')) {
      return json({ error: 'Admin đang có một phiên live khác chưa kết thúc' }, 409);
    }

    const now = new Date().toISOString();
    session.adminId = user.id;
    session.adminName = displayName(user, 'Admin');
    session.status = 'live';
    session.approvedAt = now;
    session.hostLastSeenAt = now;
    session.adminLastSeenAt = now;
    await saveStoredSession(supabase, session);
    return json(publicSession(session));
  }

  if (request.method === 'POST' && pathname === `/api/livestreams/${id}/heartbeat`) {
    if (!canUseLiveRoom(session, user)) return json({ error: 'Bạn không có quyền tham gia phiên live này' }, 403);
    if (session.status === 'live') {
      markParticipantSeen(session, user);
      expireIfParticipantTimedOut(session);
      const patch: Partial<P2PLivestream> = {
        status: session.status,
        endedAt: session.endedAt,
        hostLastSeenAt: session.hostLastSeenAt,
        adminLastSeenAt: session.adminLastSeenAt,
      };
      const latest = await patchStoredSession(supabase, session.id, patch);
      return json(publicSession(latest || session));
    }
    return json(publicSession(session));
  }

  if (request.method === 'POST' && pathname === `/api/livestreams/${id}/reconnect`) {
    if (!canUseLiveRoom(session, user)) return json({ error: 'Báº¡n khÃ´ng cÃ³ quyá»n tham gia phiÃªn live nÃ y' }, 403);
    if (session.status !== 'live') return json({ error: 'PhiÃªn live Ä‘Ã£ káº¿t thÃºc' }, 409);

    const now = new Date().toISOString();
    markParticipantSeen(session, user);
    const latest = await patchStoredSession(supabase, session.id, {
      answer: null,
      reconnectRequestedAt: now,
      hostLastSeenAt: session.hostLastSeenAt,
      adminLastSeenAt: session.adminLastSeenAt,
    });
    return json(publicSession(latest || { ...session, answer: null, reconnectRequestedAt: now }));
  }

  if (request.method === 'POST' && pathname === `/api/livestreams/${id}/offer`) {
    if (session.hostId !== user.id) return json({ error: 'Chỉ người phát live mới được gửi offer' }, 403);
    if (session.status !== 'live') return json({ error: 'Phiên live chưa được duyệt hoặc đã kết thúc' }, 409);

    const body = await readJson<{ offer?: RTCSessionDescriptionInit | null }>(request);
    session.offer = body.offer ?? null;
    session.answer = null;
    session.signalVersion = (session.signalVersion || 0) + 1;
    session.reconnectRequestedAt = null;
    session.candidates = session.candidates.filter((candidate) => candidate.from === 'host');
    await saveStoredSession(supabase, session);
    await deleteStoredCandidates(supabase, session.id);
    return json({ ok: true, signalVersion: session.signalVersion });
  }

  if (request.method === 'GET' && pathname === `/api/livestreams/${id}/offer`) {
    if (!canUseLiveRoom(session, user)) return json({ error: 'Bạn không có quyền tham gia phiên live này' }, 403);
    if (session.status !== 'live') return json({ error: 'Phiên live chưa được duyệt hoặc đã kết thúc' }, 409);
    return json({ offer: session.offer, signalVersion: session.signalVersion || 0, reconnectRequestedAt: session.reconnectRequestedAt || null });
  }

  if (request.method === 'POST' && pathname === `/api/livestreams/${id}/answer`) {
    if (session.adminId !== user.id) return json({ error: 'Chỉ admin được gửi answer cho phiên live này' }, 403);
    if (session.status !== 'live') return json({ error: 'Phiên live đã kết thúc' }, 409);

    const body = await readJson<{ answer?: RTCSessionDescriptionInit | null }>(request);
    session.answer = body.answer ?? null;
    await saveStoredSession(supabase, session);
    return json({ ok: true, signalVersion: session.signalVersion || 0 });
  }

  if (request.method === 'GET' && pathname === `/api/livestreams/${id}/answer`) {
    if (session.hostId !== user.id) return json({ error: 'Chỉ người phát live mới được lấy answer' }, 403);
    return json({ answer: session.answer, signalVersion: session.signalVersion || 0 });
  }

  if (request.method === 'POST' && pathname === `/api/livestreams/${id}/candidates`) {
    if (!canUseLiveRoom(session, user)) return json({ error: 'Bạn không có quyền tham gia phiên live này' }, 403);

    const body = await readJson<{ role?: PeerRole; candidate?: RTCIceCandidateInit | null }>(request);
    const role = body.role;
    const candidate = body.candidate;

    if (role !== 'host' && role !== 'viewer') return json({ error: 'Vai trò candidate không hợp lệ' }, 400);
    if (!candidate) return json({ error: 'ICE candidate không hợp lệ' }, 400);
    if (role === 'host' && session.hostId !== user.id) return json({ error: 'Không có quyền gửi host candidate' }, 403);
    if (role === 'viewer' && session.adminId !== user.id) return json({ error: 'Không có quyền gửi admin candidate' }, 403);

    const signalCandidate = { id: nextSequenceId(), from: role, candidate, createdAt: new Date().toISOString(), signalVersion: session.signalVersion || 0 };
    await createStoredCandidate(supabase, session, signalCandidate);
    return json({ ok: true });
  }

  if (request.method === 'GET' && pathname === `/api/livestreams/${id}/candidates`) {
    if (!canUseLiveRoom(session, user)) return json({ error: 'Bạn không có quyền tham gia phiên live này' }, 403);

    const role = url.searchParams.get('role') === 'host' ? 'host' : 'viewer';
    const after = Number(url.searchParams.get('after') || 0);
    const from = role === 'host' ? 'viewer' : 'host';
    const storedCandidates = await listStoredCandidates(supabase, session.id, from, after);
    const legacyCandidates = session.candidates.filter((candidate) => candidate.from === from && candidate.id > after);
    const candidatesById = new Map<number, SignalCandidate>();
    [...legacyCandidates, ...storedCandidates]
      .filter((candidate) => (candidate.signalVersion ?? 0) === (session.signalVersion || 0))
      .forEach((candidate) => candidatesById.set(candidate.id, candidate));

    return json({
      candidates: Array.from(candidatesById.values())
        .sort((a, b) => a.id - b.id)
        .map((candidate) => ({ id: candidate.id, candidate: candidate.candidate, createdAt: candidate.createdAt })),
    });
  }

  if (pathname === `/api/livestreams/${id}/messages`) {
    if (!canUseLiveRoom(session, user)) return json({ error: 'Bạn không có quyền chat trong phiên live này' }, 403);

    if (request.method === 'GET') {
      const after = Number(url.searchParams.get('after') || 0);
      return json({ messages: session.messages.filter((message) => message.id > after) });
    }

    if (request.method === 'POST') {
      if (session.status !== 'live') return json({ error: 'Phiên live đã kết thúc' }, 409);
      const body = await readJson<{ text?: unknown }>(request);
      const text = String(body.text || '').trim().slice(0, 500);
      if (!text) return json({ error: 'Tin nhắn không được để trống' }, 400);

      const message = { id: nextSequenceId(), authorId: user.id, authorName: displayName(user, 'Người dùng'), text, createdAt: new Date().toISOString() };
      session.messages.push(message);
      await saveStoredSession(supabase, session);
      return json({ ok: true, message });
    }
  }

  if (request.method === 'POST' && pathname === `/api/livestreams/${id}/end`) {
    if (!canUseLiveRoom(session, user)) return json({ error: 'Chỉ người phát hoặc admin được kết thúc live' }, 403);

    const now = new Date().toISOString();
    session.status = 'ended';
    session.endedAt = now;
    await saveStoredSession(supabase, session);
    return json(publicSession(session));
  }

  return json({ error: 'API endpoint chưa được hỗ trợ trên Cloudflare Worker' }, 404);
}
