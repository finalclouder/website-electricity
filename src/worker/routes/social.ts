import type { Env } from '../types';
import { requireAuth } from '../auth';
import { json } from '../http';

export async function handleSocial(request: Request, env: Env, pathname: string): Promise<Response> {
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
