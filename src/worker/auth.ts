import type { Env, UserRow } from './types';
import { USER_SELECT } from './types';
import { json } from './http';
import { verifyJwt } from './jwt';
import { getSupabase } from './supabase';

export async function requireAuth(request: Request, env: Env, adminOnly = false) {
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
