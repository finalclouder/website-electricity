import bcrypt from 'bcryptjs';
import type { Env, UserRow } from '../types';
import { USER_SELECT, USER_SELECT_WITH_PASSWORD } from '../types';
import { requireAuth } from '../auth';
import { normalizeUser } from '../formatters';
import { json, readJson } from '../http';
import { signJwt } from '../jwt';
import { getSupabase } from '../supabase';

export async function handleAuth(request: Request, env: Env, pathname: string): Promise<Response> {
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
