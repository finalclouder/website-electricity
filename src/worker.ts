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

type PostRow = {
  id: string;
  author_id: string;
  content: string;
  images?: unknown;
  attachment_name?: string;
  category?: string;
  shares?: number;
  created_at: string;
};

type DocumentRow = {
  id: string;
  title: string;
  description?: string;
  author_id: string;
  data_snapshot: string;
  status: 'draft' | 'completed' | 'approved';
  tags?: unknown;
  created_at: string;
  updated_at: string;
};

type JwtPayload = {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  exp?: number;
};

const USER_SELECT = 'id, name, email, avatar, bio, role, status, created_at';
const USER_SELECT_WITH_PASSWORD = 'id, name, email, password, avatar, bio, role, status, created_at';
const POST_SELECT = 'id, author_id, content, images, attachment_name, category, shares, created_at';
const DOCUMENT_SELECT = 'id, title, description, author_id, data_snapshot, status, tags, created_at, updated_at';

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

const toArray = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

async function fetchUsersMap(supabase: SupabaseClient, userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return new Map<string, UserRow>();

  const { data, error } = await supabase
    .from('users')
    .select(USER_SELECT)
    .in('id', ids);
  if (error) throw error;

  return new Map((data || []).map((user: any) => [user.id, user as UserRow]));
}

async function formatPosts(supabase: SupabaseClient, posts: PostRow[]) {
  if (posts.length === 0) return [];

  const postIds = posts.map((post) => post.id);
  const authors = await fetchUsersMap(supabase, posts.map((post) => post.author_id));

  const [{ data: likes }, { data: shares }, { data: comments }] = await Promise.all([
    supabase.from('likes').select('user_id, target_id').eq('target_type', 'post').in('target_id', postIds),
    supabase.from('shares').select('user_id, post_id').in('post_id', postIds),
    supabase.from('comments').select('id, post_id, author_id, content, parent_id, edited_at, created_at').in('post_id', postIds).order('created_at', { ascending: true }),
  ]);

  const commentAuthors = await fetchUsersMap(supabase, (comments || []).map((comment: any) => comment.author_id));
  const likesByPost = new Map<string, string[]>();
  for (const like of likes || []) {
    const list = likesByPost.get((like as any).target_id) || [];
    list.push((like as any).user_id);
    likesByPost.set((like as any).target_id, list);
  }

  const sharesByPost = new Map<string, string[]>();
  for (const share of shares || []) {
    const list = sharesByPost.get((share as any).post_id) || [];
    list.push((share as any).user_id);
    sharesByPost.set((share as any).post_id, list);
  }

  const commentsByPost = new Map<string, any[]>();
  for (const comment of comments || []) {
    const row: any = comment;
    const author = commentAuthors.get(row.author_id);
    const formatted = {
      id: row.id,
      postId: row.post_id,
      authorId: row.author_id,
      authorName: author?.name || '',
      authorAvatar: author?.avatar || '',
      content: row.content,
      parentId: row.parent_id || undefined,
      editedAt: row.edited_at || undefined,
      createdAt: row.created_at,
      likes: [],
      replies: [],
    };
    const list = commentsByPost.get(row.post_id) || [];
    list.push(formatted);
    commentsByPost.set(row.post_id, list);
  }

  return posts.map((post) => {
    const author = authors.get(post.author_id);
    return {
      id: post.id,
      authorId: post.author_id,
      authorName: author?.name || '',
      authorAvatar: author?.avatar || '',
      authorRole: author?.role || 'user',
      content: post.content,
      images: toArray(post.images),
      attachmentName: post.attachment_name || '',
      category: post.category || 'general',
      shares: post.shares || 0,
      createdAt: post.created_at,
      likes: likesByPost.get(post.id) || [],
      sharedBy: sharesByPost.get(post.id) || [],
      comments: commentsByPost.get(post.id) || [],
    };
  });
}

async function formatDocuments(supabase: SupabaseClient, docs: DocumentRow[]) {
  if (docs.length === 0) return [];
  const authors = await fetchUsersMap(supabase, docs.map((doc) => doc.author_id));

  return docs.map((doc) => ({
    id: doc.id,
    title: doc.title,
    description: doc.description || '',
    authorId: doc.author_id,
    authorName: authors.get(doc.author_id)?.name || '',
    dataSnapshot: doc.data_snapshot,
    status: doc.status,
    tags: toArray(doc.tags),
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    downloadCount: 0,
  }));
}

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

async function handleLanding(request: Request, env: Env, pathname: string): Promise<Response> {
  const supabase = getSupabase(env);

  if (request.method === 'GET' && pathname === '/api/landing') {
    const { data, error } = await supabase
      .from('landing_config')
      .select('config_json')
      .eq('id', 1)
      .maybeSingle<{ config_json: unknown }>();

    if (error) {
      if (error.code === '42P01') return json({ config: null });
      throw error;
    }
    return json({ config: data?.config_json ?? null });
  }

  if (request.method === 'POST' && pathname === '/api/landing') {
    const auth = await requireAuth(request, env, true);
    if ('response' in auth) return auth.response;
    const { config } = await readJson<{ config?: unknown }>(request);
    const { error } = await auth.supabase.from('landing_config').upsert({
      id: 1,
      config_json: config ?? {},
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return json({ ok: true });
  }

  if (request.method === 'POST' && (pathname === '/api/landing/image' || pathname === '/api/landing/media')) {
    return json({
      error: 'Upload landing media chưa được migrate sang R2 trên Cloudflare Worker. Hãy dùng URL ảnh/video trực tiếp.',
    }, 501);
  }

  return json({ error: 'API endpoint chưa được hỗ trợ trên Cloudflare Worker' }, 404);
}

async function handlePosts(request: Request, env: Env, pathname: string, url: URL): Promise<Response> {
  const auth = await requireAuth(request, env);
  if ('response' in auth) return auth.response;
  const { supabase, user } = auth;

  if (request.method === 'POST' && pathname === '/api/posts/presign') {
    return json({ error: 'Upload media chưa được migrate sang R2 presign trên Worker. Hãy đăng bài text trước.' }, 501);
  }

  if (request.method === 'GET' && pathname === '/api/posts') {
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await supabase
      .from('posts')
      .select(POST_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    const posts = await formatPosts(supabase, (data || []) as PostRow[]);
    const total = count ?? 0;
    return json({ data: posts, total, hasNextPage: from + posts.length < total });
  }

  if (request.method === 'POST' && pathname === '/api/posts') {
    const { content, attachmentName, category, mediaUrls } = await readJson<{
      content?: string;
      attachmentName?: string;
      category?: string;
      mediaUrls?: string[];
    }>(request);
    const normalizedContent = content?.trim() || '';
    const images = Array.isArray(mediaUrls) ? mediaUrls.filter((item) => typeof item === 'string').slice(0, 10) : [];
    const validCategories = ['general', 'technical', 'safety', 'announcement'];

    if (!normalizedContent && images.length === 0) return json({ error: 'Nội dung hoặc media không được để trống' }, 400);
    if (normalizedContent.length > 10000) return json({ error: 'Nội dung quá dài (tối đa 10000 ký tự)' }, 400);
    if (category && !validCategories.includes(category)) return json({ error: 'Danh mục không hợp lệ' }, 400);

    const { error } = await supabase.from('posts').insert({
      id: crypto.randomUUID(),
      author_id: user.id,
      content: normalizedContent,
      images,
      attachment_name: attachmentName || '',
      category: category || 'general',
    });
    if (error) throw error;

    const { data, error: fetchError, count } = await supabase
      .from('posts')
      .select(POST_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, 19);
    if (fetchError) throw fetchError;
    return json({ data: await formatPosts(supabase, (data || []) as PostRow[]), total: count ?? 0, hasNextPage: (count ?? 0) > 20 });
  }

  const postMatch = pathname.match(/^\/api\/posts\/([^/]+)(?:\/(like|share|comments))?(?:\/([^/]+))?(?:\/(like))?$/);
  if (!postMatch) return json({ error: 'API endpoint chưa được hỗ trợ trên Cloudflare Worker' }, 404);
  const [, postId, action, commentId, commentLike] = postMatch;

  const { data: post, error: postError } = await supabase.from('posts').select(POST_SELECT).eq('id', postId).maybeSingle<PostRow>();
  if (postError) throw postError;
  if (!post) return json({ error: 'Bài viết không tồn tại' }, 404);

  if (request.method === 'DELETE' && !action) {
    if (post.author_id !== user.id && user.role !== 'admin') return json({ error: 'Bạn không có quyền xóa bài viết này' }, 403);
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw error;
    return json({ message: 'Đã xóa bài viết' });
  }

  if (request.method === 'POST' && action === 'like') {
    const { data: existing, error } = await supabase
      .from('likes')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('target_type', 'post')
      .eq('target_id', postId)
      .maybeSingle();
    if (error) throw error;
    if (existing) {
      const { error: deleteError } = await supabase.from('likes').delete().eq('user_id', user.id).eq('target_type', 'post').eq('target_id', postId);
      if (deleteError) throw deleteError;
    } else {
      const { error: insertError } = await supabase.from('likes').insert({ user_id: user.id, target_type: 'post', target_id: postId });
      if (insertError) throw insertError;
    }
    return json({ message: 'OK' });
  }

  if (request.method === 'POST' && action === 'share') {
    await supabase.from('shares').upsert({ user_id: user.id, post_id: postId });
    await supabase.from('posts').update({ shares: (post.shares || 0) + 1 }).eq('id', postId);
    return json({ message: 'OK' });
  }

  if (request.method === 'POST' && action === 'comments' && !commentId) {
    const { content, parentId } = await readJson<{ content?: string; parentId?: string }>(request);
    const normalizedContent = content?.trim() || '';
    if (!normalizedContent) return json({ error: 'Nội dung bình luận không được trống' }, 400);
    if (normalizedContent.length > 2000) return json({ error: 'Bình luận quá dài (tối đa 2000 ký tự)' }, 400);
    const { error } = await supabase.from('comments').insert({
      id: crypto.randomUUID(),
      post_id: postId,
      author_id: user.id,
      content: normalizedContent,
      parent_id: parentId || null,
    });
    if (error) throw error;
    return json({ message: 'OK' });
  }

  if (commentId && action === 'comments') {
    const { data: comment, error } = await supabase.from('comments').select('*').eq('id', commentId).maybeSingle<any>();
    if (error) throw error;
    if (!comment) return json({ error: 'Bình luận không tồn tại' }, 404);

    if (request.method === 'PUT' && !commentLike) {
      if (comment.author_id !== user.id) return json({ error: 'Bạn không có quyền sửa bình luận này' }, 403);
      const { content } = await readJson<{ content?: string }>(request);
      const normalizedContent = content?.trim() || '';
      if (!normalizedContent) return json({ error: 'Nội dung không được trống' }, 400);
      const { error: updateError } = await supabase.from('comments').update({ content: normalizedContent, edited_at: new Date().toISOString() }).eq('id', commentId);
      if (updateError) throw updateError;
      return json({ message: 'OK' });
    }

    if (request.method === 'DELETE' && !commentLike) {
      if (comment.author_id !== user.id && user.role !== 'admin') return json({ error: 'Bạn không có quyền xóa bình luận này' }, 403);
      const { error: deleteError } = await supabase.from('comments').delete().eq('id', commentId);
      if (deleteError) throw deleteError;
      return json({ message: 'OK' });
    }

    if (request.method === 'POST' && commentLike === 'like') {
      const { error: insertError } = await supabase.from('likes').upsert({ user_id: user.id, target_type: 'comment', target_id: commentId });
      if (insertError) throw insertError;
      return json({ message: 'OK' });
    }
  }

  return json({ error: 'API endpoint chưa được hỗ trợ trên Cloudflare Worker' }, 404);
}

async function handleDocuments(request: Request, env: Env, pathname: string, url: URL): Promise<Response> {
  const auth = await requireAuth(request, env);
  if ('response' in auth) return auth.response;
  const { supabase, user } = auth;

  const formatResult = async (query: any) => {
    const { data, error, count } = await query;
    if (error) throw error;
    return { data: await formatDocuments(supabase, (data || []) as DocumentRow[]), count: count ?? (data || []).length };
  };

  if (request.method === 'GET' && pathname === '/api/documents') {
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const result = await formatResult(
      supabase.from('documents').select(DOCUMENT_SELECT, { count: 'exact' }).in('status', ['completed', 'approved']).order('updated_at', { ascending: false }).range(from, to),
    );
    return json({ data: result.data, total: result.count, hasNextPage: from + result.data.length < result.count });
  }

  if (request.method === 'GET' && pathname === '/api/documents/my') {
    const result = await formatResult(supabase.from('documents').select(DOCUMENT_SELECT).eq('author_id', user.id).order('updated_at', { ascending: false }));
    return json(result.data);
  }

  const userDocsMatch = pathname.match(/^\/api\/documents\/user\/([^/]+)$/);
  if (request.method === 'GET' && userDocsMatch) {
    const targetUserId = userDocsMatch[1];
    let query = supabase.from('documents').select(DOCUMENT_SELECT).eq('author_id', targetUserId).order('updated_at', { ascending: false });
    if (targetUserId !== user.id) query = query.eq('status', 'approved');
    const result = await formatResult(query);
    return json(result.data);
  }

  if (request.method === 'POST' && pathname === '/api/documents') {
    const { title, description, dataSnapshot, status, tags } = await readJson<any>(request);
    if (!title?.trim() || !dataSnapshot) return json({ error: 'Thiếu tiêu đề hoặc dữ liệu' }, 400);
    if (title.length > 200) return json({ error: 'Tiêu đề quá dài (tối đa 200 ký tự)' }, 400);
    if (status && !['draft', 'completed', 'approved'].includes(status)) return json({ error: 'Trạng thái không hợp lệ' }, 400);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error } = await supabase.from('documents').insert({
      id,
      title: title.trim(),
      description: description || '',
      author_id: user.id,
      data_snapshot: dataSnapshot,
      status: status || 'draft',
      tags: Array.isArray(tags) ? tags : [],
      updated_at: now,
    });
    if (error) throw error;
    return json({ id, message: 'Đã lưu tài liệu' });
  }

  const docMatch = pathname.match(/^\/api\/documents\/([^/]+)(?:\/(download|downloads))?$/);
  if (!docMatch) return json({ error: 'API endpoint chưa được hỗ trợ trên Cloudflare Worker' }, 404);
  const [, id, action] = docMatch;
  const { data: doc, error: docError } = await supabase.from('documents').select(DOCUMENT_SELECT).eq('id', id).maybeSingle<DocumentRow>();
  if (docError) throw docError;
  if (!doc) return json({ error: 'Tài liệu không tồn tại' }, 404);

  if (request.method === 'POST' && action === 'download') {
    return json({ message: 'Đã ghi nhận lượt tải tài liệu' });
  }
  if (request.method === 'GET' && action === 'downloads') {
    return json([]);
  }
  if (action) return json({ error: 'API endpoint chưa được hỗ trợ trên Cloudflare Worker' }, 404);

  if (request.method === 'PUT') {
    if (doc.author_id !== user.id && user.role !== 'admin') return json({ error: 'Bạn không có quyền chỉnh sửa tài liệu này' }, 403);
    const { title, description, dataSnapshot, status, tags } = await readJson<any>(request);
    if (title && title.length > 200) return json({ error: 'Tiêu đề quá dài (tối đa 200 ký tự)' }, 400);
    if (status !== undefined && !['draft', 'completed', 'approved'].includes(status)) return json({ error: 'Trạng thái không hợp lệ' }, 400);
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) payload.title = title;
    if (description !== undefined) payload.description = description;
    if (dataSnapshot !== undefined) payload.data_snapshot = dataSnapshot;
    if (status !== undefined) payload.status = status;
    if (tags !== undefined) payload.tags = Array.isArray(tags) ? tags : [];
    const { error } = await supabase.from('documents').update(payload).eq('id', id);
    if (error) throw error;
    return json({ message: 'Đã cập nhật tài liệu' });
  }

  if (request.method === 'DELETE') {
    if (doc.author_id !== user.id && user.role !== 'admin') return json({ error: 'Bạn không có quyền xóa tài liệu này' }, 403);
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) throw error;
    return json({ message: 'Đã xóa tài liệu' });
  }

  return json({ error: 'API endpoint chưa được hỗ trợ trên Cloudflare Worker' }, 404);
}

async function handleSocial(request: Request, env: Env, pathname: string): Promise<Response> {
  const auth = await requireAuth(request, env);
  if ('response' in auth) return auth.response;
  const { supabase, user } = auth;

  if (request.method === 'GET' && pathname === '/api/social/notifications/unread-count') {
    const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false);
    if (error) return json({ count: 0 });
    return json({ count: count ?? 0 });
  }

  if (request.method === 'GET' && pathname === '/api/social/notifications') {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    if (error) return json([]);
    return json(data || []);
  }

  if (request.method === 'POST' && pathname === '/api/social/notifications/read-all') {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    return json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc', count: 0 });
  }

  const readMatch = pathname.match(/^\/api\/social\/notifications\/([^/]+)\/read$/);
  if (request.method === 'POST' && readMatch) {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('id', readMatch[1]);
    return json({ message: 'Đã đánh dấu đã đọc', count: 0 });
  }

  if (request.method === 'GET' && pathname === '/api/social/friend-requests') {
    return json({ incoming: [], outgoing: [] });
  }
  if (request.method === 'GET' && pathname === '/api/social/friends') {
    return json([]);
  }
  if (pathname.includes('/followers') || pathname.includes('/following')) {
    return json([]);
  }
  if (pathname.includes('/relationships/')) {
    return json({ isFollowing: false, isFollowedBy: false, friendStatus: 'none', incomingRequest: null, outgoingRequest: null, friends: [] });
  }

  return json({ error: 'API endpoint chưa được migrate sang Cloudflare Worker' }, 501);
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

    if (url.pathname.startsWith('/api/landing')) {
      try {
        return await handleLanding(request, env, url.pathname);
      } catch (error: any) {
        console.error('Worker landing error:', error?.message || error);
        return json({ error: 'Lỗi server backend' }, 500);
      }
    }

    if (url.pathname.startsWith('/api/posts')) {
      try {
        return await handlePosts(request, env, url.pathname, url);
      } catch (error: any) {
        console.error('Worker posts error:', error?.message || error);
        return json({ error: 'Lỗi server backend' }, 500);
      }
    }

    if (url.pathname.startsWith('/api/documents')) {
      try {
        return await handleDocuments(request, env, url.pathname, url);
      } catch (error: any) {
        console.error('Worker documents error:', error?.message || error);
        return json({ error: 'Lỗi server backend' }, 500);
      }
    }

    if (url.pathname.startsWith('/api/social')) {
      try {
        return await handleSocial(request, env, url.pathname);
      } catch (error: any) {
        console.error('Worker social error:', error?.message || error);
        return json({ error: 'Lỗi server backend' }, 500);
      }
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'API endpoint chưa được migrate sang Cloudflare Worker' }, 501);
    }

    return env.ASSETS.fetch(request);
  },
};
