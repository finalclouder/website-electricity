import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env, UserRow } from '../types';
import { USER_SELECT } from '../types';
import { requireAuth } from '../auth';
import { fetchUsersMap, formatNotifications, isMissingTableError, toUserSummary } from '../formatters';
import { json } from '../http';

type FriendRequestRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at: string;
};

async function findUser(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from('users').select(USER_SELECT).eq('id', id).maybeSingle<UserRow>();
  if (error) throw error;
  return data;
}

async function createNotification(
  supabase: SupabaseClient,
  notification: { userId: string; actorId?: string | null; type: string; entityType: string; entityId: string; dataJson?: Record<string, unknown> },
) {
  const { error } = await supabase.from('notifications').insert({
    id: crypto.randomUUID(),
    user_id: notification.userId,
    actor_id: notification.actorId || null,
    type: notification.type,
    entity_type: notification.entityType,
    entity_id: notification.entityId,
    data_json: notification.dataJson || {},
    is_read: false,
    created_at: new Date().toISOString(),
  });
  if (error && !isMissingTableError(error, 'notifications')) throw error;
}

async function isFollowing(supabase: SupabaseClient, followerId: string, followingId: string) {
  const { data, error } = await supabase
    .from('user_follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error, 'user_follows')) return false;
    throw error;
  }
  return Boolean(data);
}

async function listFollowers(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('user_follows')
    .select('follower_id, created_at')
    .eq('following_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    if (isMissingTableError(error, 'user_follows')) return [];
    throw error;
  }

  const rows = data || [];
  const users = await fetchUsersMap(supabase, rows.map((row: any) => row.follower_id));
  return rows.map((row: any) => ({ ...toUserSummary(users.get(row.follower_id) || { id: row.follower_id }), createdAt: row.created_at }));
}

async function listFollowing(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('user_follows')
    .select('following_id, created_at')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    if (isMissingTableError(error, 'user_follows')) return [];
    throw error;
  }

  const rows = data || [];
  const users = await fetchUsersMap(supabase, rows.map((row: any) => row.following_id));
  return rows.map((row: any) => ({ ...toUserSummary(users.get(row.following_id) || { id: row.following_id }), createdAt: row.created_at }));
}

async function findPendingBetween(supabase: SupabaseClient, senderId: string, receiverId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, sender_id, receiver_id, status, created_at, updated_at')
    .eq('sender_id', senderId)
    .eq('receiver_id', receiverId)
    .eq('status', 'pending')
    .maybeSingle<FriendRequestRow>();
  if (error) {
    if (isMissingTableError(error, 'friend_requests')) return null;
    throw error;
  }
  return data;
}

async function findAcceptedBetween(supabase: SupabaseClient, userA: string, userB: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, sender_id, receiver_id, status, created_at, updated_at')
    .eq('status', 'accepted')
    .in('sender_id', [userA, userB])
    .in('receiver_id', [userA, userB])
    .maybeSingle<FriendRequestRow>();
  if (error) {
    if (isMissingTableError(error, 'friend_requests')) return null;
    throw error;
  }
  return data;
}

async function formatFriendRequests(supabase: SupabaseClient, rows: FriendRequestRow[]) {
  const users = await fetchUsersMap(supabase, rows.flatMap((row) => [row.sender_id, row.receiver_id]));
  return rows.map((row) => ({
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    sender: toUserSummary(users.get(row.sender_id) || { id: row.sender_id }),
    receiver: toUserSummary(users.get(row.receiver_id) || { id: row.receiver_id }),
    status: row.status || 'pending',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function listFriendRequests(supabase: SupabaseClient, userId: string, direction: 'incoming' | 'outgoing') {
  const column = direction === 'incoming' ? 'receiver_id' : 'sender_id';
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, sender_id, receiver_id, status, created_at, updated_at')
    .eq(column, userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) {
    if (isMissingTableError(error, 'friend_requests')) return [];
    throw error;
  }
  return formatFriendRequests(supabase, (data || []) as FriendRequestRow[]);
}

async function listFriends(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, sender_id, receiver_id, status, created_at, updated_at')
    .eq('status', 'accepted')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('updated_at', { ascending: false });
  if (error) {
    if (isMissingTableError(error, 'friend_requests')) return [];
    throw error;
  }

  const rows = (data || []) as FriendRequestRow[];
  const friendIds = rows.map((row) => row.sender_id === userId ? row.receiver_id : row.sender_id);
  const users = await fetchUsersMap(supabase, friendIds);
  return rows.map((row) => {
    const friendId = row.sender_id === userId ? row.receiver_id : row.sender_id;
    return {
      requestId: row.id,
      userId: friendId,
      user: toUserSummary(users.get(friendId) || { id: friendId }),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

async function relationshipSummary(supabase: SupabaseClient, viewerId: string, targetUserId: string) {
  const [viewerFollows, targetFollows, followers, following, incomingPending, outgoingPending, accepted] = await Promise.all([
    isFollowing(supabase, viewerId, targetUserId),
    isFollowing(supabase, targetUserId, viewerId),
    listFollowers(supabase, targetUserId),
    listFollowing(supabase, targetUserId),
    findPendingBetween(supabase, targetUserId, viewerId),
    findPendingBetween(supabase, viewerId, targetUserId),
    findAcceptedBetween(supabase, viewerId, targetUserId),
  ]);

  return {
    targetUserId,
    isFollowing: viewerFollows,
    isFollowedBy: targetFollows,
    followerCount: followers.length,
    followingCount: following.length,
    friendStatus: accepted ? 'friends' : incomingPending ? 'incoming_request' : outgoingPending ? 'outgoing_request' : 'none',
  };
}

async function currentFriendLists(supabase: SupabaseClient, userId: string) {
  const [incoming, outgoing] = await Promise.all([
    listFriendRequests(supabase, userId, 'incoming'),
    listFriendRequests(supabase, userId, 'outgoing'),
  ]);
  return { incoming, outgoing };
}

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
    const { data, error } = await supabase.from('notifications').select('id, user_id, actor_id, type, entity_type, entity_id, data_json, is_read, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    if (error) return json([]);
    return json(await formatNotifications(supabase, data || []));
  }

  if (request.method === 'POST' && pathname === '/api/social/notifications/read-all') {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    return json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc', count: 0 });
  }

  const readMatch = pathname.match(/^\/api\/social\/notifications\/([^/]+)\/read$/);
  if (request.method === 'POST' && readMatch) {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('id', readMatch[1]);
    const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false);
    return json({ message: 'Đã đánh dấu đã đọc', count: count ?? 0 });
  }

  const relationshipMatch = pathname.match(/^\/api\/social\/relationships\/([^/]+)$/);
  if (request.method === 'GET' && relationshipMatch) {
    const targetUserId = relationshipMatch[1];
    const target = await findUser(supabase, targetUserId);
    if (!target) return json({ error: 'Không tìm thấy người dùng' }, 404);
    return json(await relationshipSummary(supabase, user.id, targetUserId));
  }

  const followersMatch = pathname.match(/^\/api\/social\/users\/([^/]+)\/followers$/);
  if (request.method === 'GET' && followersMatch) {
    const target = await findUser(supabase, followersMatch[1]);
    if (!target) return json({ error: 'Không tìm thấy người dùng' }, 404);
    return json(await listFollowers(supabase, followersMatch[1]));
  }

  const followingMatch = pathname.match(/^\/api\/social\/users\/([^/]+)\/following$/);
  if (request.method === 'GET' && followingMatch) {
    const target = await findUser(supabase, followingMatch[1]);
    if (!target) return json({ error: 'Không tìm thấy người dùng' }, 404);
    return json(await listFollowing(supabase, followingMatch[1]));
  }

  const followMatch = pathname.match(/^\/api\/social\/users\/([^/]+)\/follow$/);
  if (followMatch) {
    const targetUserId = followMatch[1];
    if (targetUserId === user.id) return json({ error: 'Không thể tự theo dõi chính mình' }, 400);
    const target = await findUser(supabase, targetUserId);
    if (!target) return json({ error: 'Không tìm thấy người dùng' }, 404);

    if (request.method === 'POST') {
      if (!(await isFollowing(supabase, user.id, targetUserId))) {
        const { error } = await supabase.from('user_follows').insert({ follower_id: user.id, following_id: targetUserId });
        if (error && !isMissingTableError(error, 'user_follows')) throw error;
        await createNotification(supabase, { userId: targetUserId, actorId: user.id, type: 'follow', entityType: 'user', entityId: user.id, dataJson: { actorId: user.id, targetUserId } });
      }
      return json({ message: 'Đã theo dõi người dùng', relationship: await relationshipSummary(supabase, user.id, targetUserId) });
    }

    if (request.method === 'DELETE') {
      const { error } = await supabase.from('user_follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
      if (error && !isMissingTableError(error, 'user_follows')) throw error;
      return json({ message: 'Đã bỏ theo dõi người dùng', relationship: await relationshipSummary(supabase, user.id, targetUserId) });
    }
  }

  if (request.method === 'GET' && pathname === '/api/social/friends') {
    return json(await listFriends(supabase, user.id));
  }

  if (request.method === 'GET' && pathname === '/api/social/friend-requests') {
    return json(await currentFriendLists(supabase, user.id));
  }

  const friendActionMatch = pathname.match(/^\/api\/social\/friend-requests\/([^/]+)(?:\/(accept|reject))?$/);
  if (friendActionMatch) {
    const [, id, action] = friendActionMatch;

    if (request.method === 'POST' && !action) {
      const receiverId = id;
      if (receiverId === user.id) return json({ error: 'Không thể gửi lời mời kết bạn cho chính mình' }, 400);
      const receiver = await findUser(supabase, receiverId);
      if (!receiver) return json({ error: 'Không tìm thấy người dùng' }, 404);
      if (await findAcceptedBetween(supabase, user.id, receiverId)) return json({ error: 'Hai người đã là bạn bè' }, 400);
      if (await findPendingBetween(supabase, user.id, receiverId) || await findPendingBetween(supabase, receiverId, user.id)) {
        return json({ error: 'Đã tồn tại lời mời kết bạn đang chờ xử lý' }, 400);
      }

      const requestId = crypto.randomUUID();
      const now = new Date().toISOString();
      const { error } = await supabase.from('friend_requests').insert({ id: requestId, sender_id: user.id, receiver_id: receiverId, status: 'pending', created_at: now, updated_at: now });
      if (error && !isMissingTableError(error, 'friend_requests')) throw error;
      await createNotification(supabase, { userId: receiverId, actorId: user.id, type: 'friend_request', entityType: 'friend_request', entityId: requestId, dataJson: { requestId, senderId: user.id, receiverId } });
      return json({ message: 'Đã gửi lời mời kết bạn', ...(await currentFriendLists(supabase, user.id)) });
    }

    const { data: row, error } = await supabase.from('friend_requests').select('id, sender_id, receiver_id, status, created_at, updated_at').eq('id', id).maybeSingle<FriendRequestRow>();
    if (error) {
      if (isMissingTableError(error, 'friend_requests')) return json({ error: 'Lời mời kết bạn không tồn tại' }, 404);
      throw error;
    }
    if (!row) return json({ error: 'Lời mời kết bạn không tồn tại' }, 404);

    if (request.method === 'POST' && action === 'accept') {
      if (row.receiver_id !== user.id) return json({ error: 'Bạn không có quyền chấp nhận lời mời này' }, 403);
      if (row.status !== 'pending') return json({ error: 'Lời mời kết bạn không còn ở trạng thái chờ' }, 400);
      await supabase.from('friend_requests').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', id);
      await createNotification(supabase, { userId: row.sender_id, actorId: user.id, type: 'friend_accept', entityType: 'friend_request', entityId: row.id, dataJson: { requestId: row.id, senderId: row.sender_id, receiverId: row.receiver_id } });
      const lists = await currentFriendLists(supabase, user.id);
      return json({ message: 'Đã chấp nhận lời mời kết bạn', ...lists, friends: await listFriends(supabase, user.id) });
    }

    if (request.method === 'POST' && action === 'reject') {
      if (row.receiver_id !== user.id) return json({ error: 'Bạn không có quyền từ chối lời mời này' }, 403);
      if (row.status !== 'pending') return json({ error: 'Lời mời kết bạn không còn ở trạng thái chờ' }, 400);
      await supabase.from('friend_requests').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', id);
      return json({ message: 'Đã từ chối lời mời kết bạn', ...(await currentFriendLists(supabase, user.id)) });
    }

    if (request.method === 'DELETE') {
      if (row.sender_id !== user.id) return json({ error: 'Bạn không có quyền hủy lời mời này' }, 403);
      if (row.status !== 'pending') return json({ error: 'Lời mời kết bạn không còn ở trạng thái chờ' }, 400);
      await supabase.from('friend_requests').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id);
      return json({ message: 'Đã hủy lời mời kết bạn', ...(await currentFriendLists(supabase, user.id)) });
    }
  }

  return json({ error: 'API endpoint chưa được hỗ trợ trên Cloudflare Worker' }, 404);
}
