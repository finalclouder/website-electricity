import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

type Env = {
  ASSETS: Fetcher;
  JWT_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  bio?: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

type JwtPayload = {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  exp?: number;
};

const USER_SELECT = 'id, name, email, avatar, bio, role, status, created_at';
const USER_SELECT_WITH_PASSWORD = 'id, name, email, password, avatar, bio, role, status, created_at';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

const normalizeUser = (user: UserRow) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || '',
  bio: user.bio || '',
  role: user.role,
  status: user.status,
  createdAt: user.created_at,
});

const readJson = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
};

const base64UrlEncode = (input: ArrayBuffer | string) => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlDecode = (input: string) => {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
};

async function hmacSha256(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
}

async function signJwt(payload: Omit<JwtPayload, 'exp'>, secret: string) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const body: JwtPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const signingInput = `${encodedHeader}.${encodedBody}`;
  const signature = base64UrlEncode(await hmacSha256(secret, signingInput));
  return `${signingInput}.${signature}`;
}

async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const signingInput = `${parts[0]}.${parts[1]}`;
  const expected = base64UrlEncode(await hmacSha256(secret, signingInput));
  if (!timingSafeEqual(expected, parts[2])) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1]))) as JwtPayload;
    if (!payload.userId || !payload.email || !payload.role) return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function getSupabase(env: Env): SupabaseClient {
  const url = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim() || env.SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function requireAuth(request: Request, env: Env, adminOnly = false) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return { response: json({ error: 'Token không hợp lệ' }, 401) };
  }

  const secret = env.JWT_SECRET || 'fallback_secret_key_123456789_do_not_use_in_prod';
  const payload = await verifyJwt(auth.slice(7), secret);
  if (!payload) {
    return { response: json({ error: 'Token hết hạn hoặc không hợp lệ' }, 401) };
  }

  const supabase = getSupabase(env);
  const { data: user, error } = await supabase
    .from('users')
    .select(USER_SELECT)
    .eq('id', payload.userId)
    .maybeSingle<UserRow>();

  if (error) throw error;
  if (!user) return { response: json({ error: 'Tài khoản không tồn tại' }, 401) };
  if (user.status === 'pending') return { response: json({ error: 'Tài khoản của bạn đang chờ Admin duyệt' }, 403) };
  if (user.status === 'rejected') return { response: json({ error: 'Tài khoản của bạn đã bị từ chối' }, 403) };
  if (adminOnly && user.role !== 'admin') return { response: json({ error: 'Chỉ admin mới có quyền thực hiện' }, 403) };

  return { user, supabase };
}

async function handleAuth(request: Request, env: Env, pathname: string): Promise<Response> {
  const supabase = getSupabase(env);
  const method = request.method;

  if (method === 'POST' && pathname === '/api/auth/register') {
    const { name, email, password } = await readJson<{ name?: string; email?: string; password?: string }>(request);
    const normalizedName = name?.trim() || '';
    const normalizedEmail = email?.trim().toLowerCase() || '';

    if (!normalizedName || !normalizedEmail || !password) return json({ error: 'Vui lòng điền đầy đủ thông tin' }, 400);
    if (normalizedName.length > 100) return json({ error: 'Họ tên quá dài (tối đa 100 ký tự)' }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return json({ error: 'Email không đúng định dạng' }, 400);
    if (password.length < 6) return json({ error: 'Mật khẩu tối thiểu 6 ký tự' }, 400);
    if (password.length > 128) return json({ error: 'Mật khẩu quá dài' }, 400);

    const { data: existing, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (findError) throw findError;
    if (existing) return json({ error: 'Email đã được sử dụng' }, 400);

    const id = crypto.randomUUID();
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        id,
        name: normalizedName,
        email: normalizedEmail,
        password: bcrypt.hashSync(password, 10),
        role: 'user',
        status: 'pending',
      })
      .select(USER_SELECT)
      .single<UserRow>();

    if (error) throw error;
    return json({
      token: '',
      message: 'Đăng ký thành công! Vui lòng chờ quản trị viên phê duyệt tài khoản của bạn.',
      user: normalizeUser(user),
    });
  }

  if (method === 'POST' && pathname === '/api/auth/login') {
    const { email, password } = await readJson<{ email?: string; password?: string }>(request);
    const normalizedEmail = email?.trim().toLowerCase() || '';
    if (!normalizedEmail || !password) return json({ error: 'Vui lòng nhập email và mật khẩu' }, 400);

    const { data: user, error } = await supabase
      .from('users')
      .select(USER_SELECT_WITH_PASSWORD)
      .eq('email', normalizedEmail)
      .maybeSingle<UserRow>();

    if (error) throw error;
    if (!user || !user.password || !bcrypt.compareSync(password, user.password)) {
      return json({ error: 'Email hoặc mật khẩu không đúng' }, 401);
    }
    if (user.status === 'pending') return json({ error: 'Tài khoản của bạn đang chờ Admin duyệt' }, 403);
    if (user.status === 'rejected') return json({ error: 'Tài khoản của bạn đã bị từ chối' }, 403);

    const token = await signJwt({ userId: user.id, email: user.email, role: user.role }, env.JWT_SECRET || '');
    return json({ token, user: normalizeUser(user) });
  }

  if (method === 'GET' && pathname === '/api/auth/me') {
    const auth = await requireAuth(request, env);
    if ('response' in auth) return auth.response;
    return json(normalizeUser(auth.user));
  }

  if (method === 'PUT' && pathname === '/api/auth/profile') {
    const auth = await requireAuth(request, env);
    if ('response' in auth) return auth.response;
    const { name, email, bio, avatar } = await readJson<{ name?: string; email?: string; bio?: string; avatar?: string }>(request);
    const payload: Record<string, string> = {};

    if (name !== undefined) {
      if (name.length > 100) return json({ error: 'Họ tên quá dài (tối đa 100 ký tự)' }, 400);
      payload.name = name;
    }
    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) return json({ error: 'Email không được để trống' }, 400);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return json({ error: 'Email không đúng định dạng' }, 400);
      payload.email = normalizedEmail;
    }
    if (bio !== undefined) {
      if (bio.length > 500) return json({ error: 'Tiểu sử quá dài (tối đa 500 ký tự)' }, 400);
      payload.bio = bio;
    }
    if (avatar !== undefined) {
      if (avatar.length > 500000) return json({ error: 'Ảnh đại diện quá lớn (tối đa ~375KB)' }, 400);
      payload.avatar = avatar;
    }

    if (Object.keys(payload).length > 0) {
      const { error } = await auth.supabase.from('users').update(payload).eq('id', auth.user.id);
      if (error) {
        if (error.code === '23505') return json({ error: 'Email này đã được sử dụng bởi tài khoản khác' }, 409);
        throw error;
      }
    }

    const { data: updated, error } = await auth.supabase
      .from('users')
      .select(USER_SELECT)
      .eq('id', auth.user.id)
      .single<UserRow>();
    if (error) throw error;
    const token = await signJwt({ userId: updated.id, email: updated.email, role: updated.role }, env.JWT_SECRET || '');
    return json({ token, user: normalizeUser(updated) });
  }

  if (method === 'PUT' && pathname === '/api/auth/password') {
    const auth = await requireAuth(request, env);
    if ('response' in auth) return auth.response;
    const { oldPassword, newPassword } = await readJson<{ oldPassword?: string; newPassword?: string }>(request);
    if (!oldPassword || !newPassword) return json({ error: 'Vui lòng nhập mật khẩu cũ và mật khẩu mới' }, 400);
    if (newPassword.length < 6) return json({ error: 'Mật khẩu mới tối thiểu 6 ký tự' }, 400);
    if (newPassword.length > 128) return json({ error: 'Mật khẩu quá dài' }, 400);

    const { data: user, error } = await auth.supabase
      .from('users')
      .select(USER_SELECT_WITH_PASSWORD)
      .eq('id', auth.user.id)
      .maybeSingle<UserRow>();
    if (error) throw error;
    if (!user?.password || !bcrypt.compareSync(oldPassword, user.password)) {
      return json({ error: 'Mật khẩu cũ không đúng' }, 400);
    }
    const { error: updateError } = await auth.supabase
      .from('users')
      .update({ password: bcrypt.hashSync(newPassword, 10) })
      .eq('id', auth.user.id);
    if (updateError) throw updateError;
    return json({ message: 'Đổi mật khẩu thành công' });
  }

  if (method === 'GET' && pathname === '/api/auth/users') {
    const auth = await requireAuth(request, env, true);
    if ('response' in auth) return auth.response;
    const { data, error } = await auth.supabase
      .from('users')
      .select(USER_SELECT)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return json((data || []).map(normalizeUser));
  }

  const userMatch = pathname.match(/^\/api\/auth\/users\/([^/]+)(?:\/(status|role|password))?$/);
  if (userMatch) {
    const [, id, action] = userMatch;

    if (method === 'GET' && !action) {
      const auth = await requireAuth(request, env);
      if ('response' in auth) return auth.response;
      const { data: target, error } = await auth.supabase.from('users').select(USER_SELECT).eq('id', id).maybeSingle<UserRow>();
      if (error) throw error;
      if (!target) return json({ error: 'Không tìm thấy người dùng' }, 404);
      if (auth.user.id !== target.id && auth.user.role !== 'admin') {
        return json({
          id: target.id,
          name: target.name,
          avatar: target.avatar || '',
          bio: target.bio || '',
          createdAt: target.created_at,
        });
      }
      return json(normalizeUser(target));
    }

    const auth = await requireAuth(request, env, true);
    if ('response' in auth) return auth.response;
    if (id === auth.user.id && (method === 'DELETE' || action === 'status' || action === 'role')) {
      return json({ error: 'Không thể thay đổi tài khoản chính mình' }, 400);
    }

    if (method === 'DELETE' && !action) {
      const { error } = await auth.supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      return json({ message: 'Đã xóa người dùng' });
    }

    if (method === 'PUT' && action === 'status') {
      const { status } = await readJson<{ status?: string }>(request);
      if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
        return json({ error: 'Trạng thái không hợp lệ' }, 400);
      }
      const { data, error } = await auth.supabase
        .from('users')
        .update({ status })
        .eq('id', id)
        .select(USER_SELECT)
        .maybeSingle<UserRow>();
      if (error) throw error;
      if (!data) return json({ error: 'Không tìm thấy user' }, 404);
      return json(normalizeUser(data));
    }

    if (method === 'PUT' && action === 'role') {
      const { data: target, error } = await auth.supabase.from('users').select(USER_SELECT).eq('id', id).maybeSingle<UserRow>();
      if (error) throw error;
      if (!target) return json({ error: 'Người dùng không tồn tại' }, 404);
      const { error: updateError } = await auth.supabase
        .from('users')
        .update({ role: target.role === 'admin' ? 'user' : 'admin' })
        .eq('id', id);
      if (updateError) throw updateError;
      return json({ message: 'Đã thay đổi quyền' });
    }

    if (method === 'PUT' && action === 'password') {
      const { newPassword } = await readJson<{ newPassword?: string }>(request);
      if (!newPassword || newPassword.length < 6) return json({ error: 'Mật khẩu mới tối thiểu 6 ký tự' }, 400);
      if (newPassword.length > 128) return json({ error: 'Mật khẩu quá dài' }, 400);
      const { error } = await auth.supabase
        .from('users')
        .update({ password: bcrypt.hashSync(newPassword, 10) })
        .eq('id', id);
      if (error) throw error;
      return json({ message: 'Đã đặt lại mật khẩu' });
    }
  }

  return json({ error: 'API endpoint chưa được hỗ trợ trên Cloudflare Worker' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (url.pathname === '/api/health') {
      return json({ status: 'ok', runtime: 'cloudflare-worker' });
    }

    if (url.pathname.startsWith('/api/auth/')) {
      try {
        return await handleAuth(request, env, url.pathname);
      } catch (error: any) {
        console.error('Worker auth error:', error?.message || error);
        return json({ error: 'Lỗi server backend' }, 500);
      }
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'API endpoint chưa được migrate sang Cloudflare Worker' }, 501);
    }

    return env.ASSETS.fetch(request);
  },
};
