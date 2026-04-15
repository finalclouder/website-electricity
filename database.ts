import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

dotenv.config();

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL');
  }

  if (supabaseUrl.includes('supabase.com/dashboard')) {
    throw new Error('SUPABASE_URL must be the project API URL (https://<project-ref>.supabase.co), not the dashboard URL');
  }

  if (!supabaseKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');
  }

  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabase;
}

function safeJsonParse(value: any, fallback: any = []): any {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toIsoNow() {
  return new Date().toISOString();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function maybeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

const warnedMissingTables = new Set<string>();

function getErrorText(error: any) {
  return `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
}

function isMissingTableError(error: any, tableName: string) {
  const normalizedTable = tableName.toLowerCase();
  const text = getErrorText(error);

  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || (text.includes('does not exist') && text.includes(normalizedTable))
    || (text.includes('could not find the table') && text.includes(normalizedTable))
    || text.includes(`public.${normalizedTable}`)
    || text.includes(`'${normalizedTable}'`);
}

function warnMissingTable(tableName: string, error: any) {
  if (warnedMissingTables.has(tableName)) return;
  warnedMissingTables.add(tableName);
  console.warn(
    `Supabase table "${tableName}" is missing. Related features will stay in fallback mode until the SQL hotfix is applied.`,
    error?.message || error
  );
}

function groupRowsBy<T extends Record<string, any>>(rows: T[], key: keyof T) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const groupKey = String(row[key]);
    if (!grouped.has(groupKey)) grouped.set(groupKey, []);
    grouped.get(groupKey)!.push(row);
  }
  return grouped;
}

function groupValuesBy<T extends Record<string, any>, V>(rows: T[], key: keyof T, valueSelector: (row: T) => V) {
  const grouped = new Map<string, V[]>();
  for (const row of rows) {
    const groupKey = String(row[key]);
    if (!grouped.has(groupKey)) grouped.set(groupKey, []);
    grouped.get(groupKey)!.push(valueSelector(row));
  }
  return grouped;
}

async function fetchUsersMap(userIds: string[]) {
  const ids = unique(userIds);
  if (ids.length === 0) return new Map<string, any>();

  const { data, error } = await getSupabase()
    .from('users')
    .select('id, name, email, avatar, bio, role, status, created_at')
    .in('id', ids);

  if (error) throw error;

  return new Map((data || []).map(user => [user.id, user]));
}

function toUserSummary(user: any) {
  return {
    id: user.id,
    name: user.name || '',
    email: user.email || '',
    avatar: user.avatar || '',
    bio: user.bio || '',
    role: user.role || 'user',
    status: user.status || 'approved',
    createdAt: user.created_at,
  };
}

function toFriendRequestStatus(status: string) {
  if (status === 'pending' || status === 'accepted' || status === 'rejected' || status === 'cancelled') {
    return status;
  }
  return 'pending';
}

function buildNotificationMessage(notification: { type: string; actorName?: string; entityType: string }) {
  const actorName = notification.actorName || 'Người dùng';
  if (notification.type === 'follow') {
    return `${actorName} đã theo dõi bạn`;
  }
  if (notification.type === 'friend_request') {
    return `${actorName} đã gửi lời mời kết bạn`;
  }
  if (notification.type === 'friend_accept') {
    return `${actorName} đã chấp nhận lời mời kết bạn`;
  }
  if (notification.type === 'document_download') {
    return `${actorName} đã tải tài liệu của bạn`;
  }
  if (notification.type === 'post_like') {
    return `${actorName} đã thích bài viết của bạn`;
  }
  if (notification.type === 'post_comment') {
    return `${actorName} đã bình luận bài viết của bạn`;
  }
  if (notification.type === 'post_share') {
    return `${actorName} đã chia sẻ bài viết của bạn`;
  }
  if (notification.type === 'comment_like') {
    return `${actorName} đã thích bình luận của bạn`;
  }
  return `${actorName} có hoạt động mới`;
}

async function getDocumentDownloadCounts(documentIds: string[]) {
  const ids = unique(documentIds);
  if (ids.length === 0) return new Map<string, number>();

  const { data, error } = await getSupabase()
    .from('document_downloads')
    .select('document_id')
    .in('document_id', ids);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of maybeArray(data)) {
    counts.set(row.document_id, (counts.get(row.document_id) || 0) + 1);
  }
  return counts;
}

async function deleteLikesByTargetIds(targetType: 'post' | 'comment', targetIds: string[]) {
  const ids = unique(targetIds);
  if (ids.length === 0) return;

  const { error } = await getSupabase()
    .from('likes')
    .delete()
    .eq('target_type', targetType)
    .in('target_id', ids);

  if (error) throw error;
}

async function deleteCommentsByParentIds(parentIds: string[]) {
  const ids = unique(parentIds);
  if (ids.length === 0) return;

  const { error } = await getSupabase()
    .from('comments')
    .delete()
    .in('parent_id', ids);

  if (error) throw error;
}

async function buildCommentsForPosts(postIds: string[]) {
  const ids = unique(postIds);
  if (ids.length === 0) return new Map<string, any[]>();

  const { data: comments, error: commentsError } = await getSupabase()
    .from('comments')
    .select('id, post_id, author_id, content, parent_id, edited_at, created_at')
    .in('post_id', ids)
    .order('created_at', { ascending: true });

  if (commentsError) throw commentsError;

  const commentRows = comments || [];
  const commentIds = commentRows.map(comment => comment.id);
  const commentAuthors = await fetchUsersMap(commentRows.map(comment => comment.author_id));

  let commentLikesById = new Map<string, string[]>();
  if (commentIds.length > 0) {
    const { data: commentLikes, error: commentLikesError } = await getSupabase()
      .from('likes')
      .select('user_id, target_id')
      .eq('target_type', 'comment')
      .in('target_id', commentIds);

    if (commentLikesError) throw commentLikesError;
    commentLikesById = groupValuesBy(commentLikes || [], 'target_id', row => row.user_id);
  }

  const commentsByPostId = groupRowsBy(commentRows, 'post_id');

  return new Map(
    Array.from(commentsByPostId.entries()).map(([postId, postComments]) => [
      postId,
      postComments.map(comment => {
        const author = commentAuthors.get(comment.author_id);
        return {
          id: comment.id,
          authorId: comment.author_id,
          authorName: author?.name || '',
          authorAvatar: author?.avatar || '',
          content: comment.content,
          parentId: comment.parent_id || undefined,
          editedAt: comment.edited_at || undefined,
          createdAt: comment.created_at,
          likes: commentLikesById.get(comment.id) || [],
        };
      }),
    ])
  );
}

export async function seedDefaultUsersIfNeeded() {
  const shouldSeedDefaultUsers =
    process.env.SEED_DEFAULT_USERS === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.SEED_DEFAULT_USERS !== 'false');

  if (!shouldSeedDefaultUsers) {
    console.log('ℹ️ Skipping default user seeding');
    return;
  }

  const hasSupabaseEnv = Boolean(
    process.env.SUPABASE_URL?.trim() &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim())
  );

  if (!hasSupabaseEnv) {
    console.log('ℹ️ Skipping default user seeding because Supabase env vars are missing');
    return;
  }

  const client = getSupabase();
  const { data: adminExists, error: adminError } = await client
    .from('users')
    .select('id')
    .eq('email', 'admin@patctc.vn')
    .maybeSingle();

  if (adminError) throw adminError;
  if (adminExists) return;

  const adminHash = bcrypt.hashSync('p@tctcAdmin2024!', 10);
  const userHash = bcrypt.hashSync('user123', 10);

  const { error: insertError } = await client.from('users').insert([
    {
      id: '1',
      name: 'Nguyễn Tuấn Anh',
      email: 'admin@patctc.vn',
      password: adminHash,
      bio: 'Đội trưởng Đội sửa chữa Hotline - Công ty Điện lực Bắc Ninh',
      role: 'admin',
      status: 'approved',
    },
    {
      id: '2',
      name: 'Chu Đình Dũng',
      email: 'user@patctc.vn',
      password: userHash,
      bio: 'Công nhân Hotline - Đội sửa chữa Hotline, Công ty Điện lực Bắc Ninh',
      role: 'user',
      status: 'pending',
    },
  ]);

  if (insertError) throw insertError;
  console.log('✅ Seeded default admin and user accounts');
}

export const userDb = {
  async findByEmailWithPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await getSupabase()
      .from('users')
      .select('id, name, email, password, avatar, bio, role, status, created_at')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) throw error;
    return data as any;
  },

  async findByEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await getSupabase()
      .from('users')
      .select('id, name, email, avatar, bio, role, status, created_at')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) throw error;
    return data as any;
  },

  async findById(id: string) {
    const { data, error } = await getSupabase()
      .from('users')
      .select('id, name, email, avatar, bio, role, status, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as any;
  },

  async findByIdWithPassword(id: string) {
    const { data, error } = await getSupabase()
      .from('users')
      .select('id, name, email, password, avatar, bio, role, status, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as any;
  },

  async getAll() {
    const { data, error } = await getSupabase()
      .from('users')
      .select('id, name, email, avatar, bio, role, status, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return maybeArray(data) as any[];
  },

  async create(id: string, name: string, email: string, hashedPassword: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await getSupabase().from('users').insert({
      id,
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'user',
      status: 'pending',
    });

    if (error) throw error;
    return this.findById(id);
  },

  async updateProfile(id: string, updates: { name?: string; email?: string; bio?: string; avatar?: string }) {
    const payload: Record<string, any> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.avatar !== undefined) payload.avatar = updates.avatar;
    if (Object.keys(payload).length === 0) return;

    const { error } = await getSupabase().from('users').update(payload).eq('id', id);
    if (error) throw error;
  },

  async changePassword(id: string, newHashedPassword: string) {
    const { error } = await getSupabase().from('users').update({ password: newHashedPassword }).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string) {
    const client = getSupabase();

    const { data: userPosts, error: postsError } = await client
      .from('posts')
      .select('id')
      .eq('author_id', id);
    if (postsError) throw postsError;

    const postIds = maybeArray(userPosts).map(post => post.id);
    if (postIds.length > 0) {
      const { data: postComments, error: postCommentsError } = await client
        .from('comments')
        .select('id')
        .in('post_id', postIds);
      if (postCommentsError) throw postCommentsError;

      await deleteLikesByTargetIds('comment', maybeArray(postComments).map(comment => comment.id));
      await deleteLikesByTargetIds('post', postIds);
    }

    const { data: userComments, error: userCommentsError } = await client
      .from('comments')
      .select('id')
      .eq('author_id', id);
    if (userCommentsError) throw userCommentsError;

    await deleteLikesByTargetIds('comment', maybeArray(userComments).map(comment => comment.id));

    const { error: deleteOwnLikesError } = await client.from('likes').delete().eq('user_id', id);
    if (deleteOwnLikesError) throw deleteOwnLikesError;

    const { error: deleteUserError } = await client.from('users').delete().eq('id', id);
    if (deleteUserError) throw deleteUserError;
  },

  async setStatus(id: string, status: string) {
    const { data, error } = await getSupabase()
      .from('users')
      .update({ status })
      .eq('id', id)
      .select('id, name, email, avatar, bio, role, status, created_at')
      .maybeSingle();

    if (error) throw error;
    return data as any;
  },

  async toggleRole(id: string) {
    const user = await this.findById(id);
    if (!user) return;

    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const { error } = await getSupabase().from('users').update({ role: newRole }).eq('id', id);
    if (error) throw error;
  },

  async resetPassword(id: string, newHashedPassword: string) {
    const { error } = await getSupabase().from('users').update({ password: newHashedPassword }).eq('id', id);
    if (error) throw error;
  },
};

export const postDb = {
  async getAll() {
    const client = getSupabase();
    const { data: posts, error: postsError } = await client
      .from('posts')
      .select('id, author_id, content, images, attachment_name, category, shares, created_at')
      .order('created_at', { ascending: false });

    if (postsError) throw postsError;

    const postRows = posts || [];
    if (postRows.length === 0) return [];

    const postIds = postRows.map(post => post.id);
    const authors = await fetchUsersMap(postRows.map(post => post.author_id));

    const { data: postLikes, error: postLikesError } = await client
      .from('likes')
      .select('user_id, target_id')
      .eq('target_type', 'post')
      .in('target_id', postIds);
    if (postLikesError) throw postLikesError;

    const { data: shares, error: sharesError } = await client
      .from('shares')
      .select('user_id, post_id')
      .in('post_id', postIds);
    if (sharesError) throw sharesError;

    const postLikesById = groupValuesBy(postLikes || [], 'target_id', row => row.user_id);
    const sharedByPostId = groupValuesBy(shares || [], 'post_id', row => row.user_id);
    const commentsByPostId = await buildCommentsForPosts(postIds);

    return postRows.map(post => {
      const author = authors.get(post.author_id);
      return {
        id: post.id,
        authorId: post.author_id,
        authorName: author?.name || '',
        authorAvatar: author?.avatar || '',
        authorRole: author?.role || 'user',
        content: post.content,
        images: safeJsonParse(post.images, []),
        attachmentName: post.attachment_name || '',
        category: post.category,
        shares: post.shares,
        createdAt: post.created_at,
        likes: postLikesById.get(post.id) || [],
        sharedBy: sharedByPostId.get(post.id) || [],
        comments: commentsByPostId.get(post.id) || [],
      };
    });
  },

  async findById(id: string) {
    const { data: post, error } = await getSupabase()
      .from('posts')
      .select('id, author_id')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!post) return null;

    const author = await userDb.findById(post.author_id);
    return {
      id: post.id,
      authorId: post.author_id,
      authorName: author?.name || '',
    };
  },

  async getComments(postId: string) {
    const commentsByPostId = await buildCommentsForPosts([postId]);
    return commentsByPostId.get(postId) || [];
  },

  async findCommentById(commentId: string) {
    const { data, error } = await getSupabase()
      .from('comments')
      .select('id, post_id, author_id, content, parent_id, edited_at, created_at')
      .eq('id', commentId)
      .maybeSingle();

    if (error) throw error;
    return data as any;
  },

  async create(post: { id: string; authorId: string; content: string; images?: string[]; attachmentName?: string; category?: string }) {
    const { error } = await getSupabase().from('posts').insert({
      id: post.id,
      author_id: post.authorId,
      content: post.content,
      images: post.images || [],
      attachment_name: post.attachmentName || '',
      category: post.category || 'general',
    });

    if (error) throw error;
  },

  async delete(id: string) {
    const client = getSupabase();
    const { data: commentIds, error: commentIdsError } = await client
      .from('comments')
      .select('id')
      .eq('post_id', id);

    if (commentIdsError) throw commentIdsError;

    await deleteLikesByTargetIds('comment', maybeArray(commentIds).map(comment => comment.id));
    await deleteLikesByTargetIds('post', [id]);

    const { error: deletePostError } = await client.from('posts').delete().eq('id', id);
    if (deletePostError) throw deletePostError;
  },

  async toggleLike(postId: string, userId: string) {
    const client = getSupabase();
    const { data: existing, error: existingError } = await client
      .from('likes')
      .select('user_id')
      .eq('user_id', userId)
      .eq('target_type', 'post')
      .eq('target_id', postId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      const { error } = await client
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('target_type', 'post')
        .eq('target_id', postId);
      if (error) throw error;
      return false;
    }

    const { error } = await client.from('likes').insert({ user_id: userId, target_type: 'post', target_id: postId });
    if (error) throw error;
    return true;
  },

  async share(postId: string, userId: string) {
    const client = getSupabase();
    const { data: existing, error: existingError } = await client
      .from('shares')
      .select('user_id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return false;

    const { error: insertShareError } = await client.from('shares').insert({ user_id: userId, post_id: postId });
    if (insertShareError) throw insertShareError;

    const { data: post, error: postError } = await client
      .from('posts')
      .select('shares')
      .eq('id', postId)
      .maybeSingle();
    if (postError) throw postError;

    const nextShares = (post?.shares || 0) + 1;
    const { error: updatePostError } = await client.from('posts').update({ shares: nextShares }).eq('id', postId);
    if (updatePostError) throw updatePostError;
    return true;
  },

  async addComment(comment: { id: string; postId: string; authorId: string; content: string; parentId?: string }) {
    const { error } = await getSupabase().from('comments').insert({
      id: comment.id,
      post_id: comment.postId,
      author_id: comment.authorId,
      content: comment.content,
      parent_id: comment.parentId || null,
    });

    if (error) throw error;
  },

  async editComment(commentId: string, newContent: string) {
    const { error } = await getSupabase()
      .from('comments')
      .update({ content: newContent, edited_at: toIsoNow() })
      .eq('id', commentId);

    if (error) throw error;
  },

  async deleteComment(commentId: string) {
    const client = getSupabase();

    const { data: replyIds, error: replyIdsError } = await client
      .from('comments')
      .select('id')
      .eq('parent_id', commentId);
    if (replyIdsError) throw replyIdsError;

    await deleteLikesByTargetIds('comment', maybeArray(replyIds).map(reply => reply.id));
    await deleteLikesByTargetIds('comment', [commentId]);
    await deleteCommentsByParentIds([commentId]);

    const { error: deleteCommentError } = await client.from('comments').delete().eq('id', commentId);
    if (deleteCommentError) throw deleteCommentError;
  },

  async toggleCommentLike(commentId: string, userId: string) {
    const client = getSupabase();
    const { data: existing, error: existingError } = await client
      .from('likes')
      .select('user_id')
      .eq('user_id', userId)
      .eq('target_type', 'comment')
      .eq('target_id', commentId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      const { error } = await client
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('target_type', 'comment')
        .eq('target_id', commentId);
      if (error) throw error;
      return false;
    }

    const { error } = await client.from('likes').insert({ user_id: userId, target_type: 'comment', target_id: commentId });
    if (error) throw error;
    return true;
  },
};

export const docDb = {
  async getAll() {
    const { data: docs, error } = await getSupabase()
      .from('documents')
      .select('id, title, description, author_id, data_snapshot, status, tags, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const docRows = docs || [];
    const authors = await fetchUsersMap(docRows.map(doc => doc.author_id));
    const downloadCounts = await getDocumentDownloadCounts(docRows.map(doc => doc.id));

    return docRows.map(doc => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      authorId: doc.author_id,
      authorName: authors.get(doc.author_id)?.name || '',
      dataSnapshot: doc.data_snapshot,
      status: doc.status,
      tags: safeJsonParse(doc.tags, []),
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      downloadCount: downloadCounts.get(doc.id) || 0,
    }));
  },

  async findById(id: string) {
    const { data: doc, error } = await getSupabase()
      .from('documents')
      .select('id, title, author_id')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!doc) return null;

    const author = await userDb.findById(doc.author_id);
    return { id: doc.id, title: doc.title, authorId: doc.author_id, authorName: author?.name || '' };
  },

  async getByAuthor(authorId: string, viewerId?: string) {
    let query = getSupabase()
      .from('documents')
      .select('id, title, description, author_id, data_snapshot, status, tags, created_at, updated_at')
      .eq('author_id', authorId)
      .order('updated_at', { ascending: false });

    if (viewerId !== undefined && viewerId !== authorId) {
      query = query.eq('status', 'approved');
    }

    const { data: docs, error } = await query;

    if (error) throw error;

    const author = await userDb.findById(authorId);
    const docRows = maybeArray(docs);
    const downloadCounts = await getDocumentDownloadCounts(docRows.map(doc => doc.id));

    return docRows.map(doc => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      authorId: doc.author_id,
      authorName: author?.name || '',
      dataSnapshot: doc.data_snapshot,
      status: doc.status,
      tags: safeJsonParse(doc.tags, []),
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      downloadCount: downloadCounts.get(doc.id) || 0,
    }));
  },

  async create(doc: { id: string; title: string; description: string; authorId: string; dataSnapshot: string; status?: string; tags?: string[] }) {
    const { error } = await getSupabase().from('documents').insert({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      author_id: doc.authorId,
      data_snapshot: doc.dataSnapshot,
      status: doc.status || 'draft',
      tags: doc.tags || [],
      updated_at: toIsoNow(),
    });

    if (error) throw error;
  },

  async update(id: string, updates: { title?: string; description?: string; dataSnapshot?: string; status?: string; tags?: string[] }) {
    const payload: Record<string, any> = { updated_at: toIsoNow() };
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.dataSnapshot !== undefined) payload.data_snapshot = updates.dataSnapshot;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.tags !== undefined) payload.tags = updates.tags;

    const { error } = await getSupabase().from('documents').update(payload).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string) {
    const client = getSupabase();

    const { error: deleteDownloadsError } = await client
      .from('document_downloads')
      .delete()
      .eq('document_id', id);
    if (deleteDownloadsError) throw deleteDownloadsError;

    const { error } = await client.from('documents').delete().eq('id', id);
    if (error) throw error;
  },
};

export const followDb = {
  async getFollowers(userId: string) {
    try {
      const { data, error } = await getSupabase()
        .from('user_follows')
        .select('follower_id, following_id, created_at')
        .eq('following_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = maybeArray(data);
      const users = await fetchUsersMap(rows.map(row => row.follower_id));
      return rows.map(row => ({
        ...toUserSummary(users.get(row.follower_id) || { id: row.follower_id }),
        createdAt: row.created_at,
      }));
    } catch (error: any) {
      if (isMissingTableError(error, 'user_follows')) {
        warnMissingTable('user_follows', error);
        return [];
      }
      throw error;
    }
  },

  async getFollowing(userId: string) {
    try {
      const { data, error } = await getSupabase()
        .from('user_follows')
        .select('follower_id, following_id, created_at')
        .eq('follower_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = maybeArray(data);
      const users = await fetchUsersMap(rows.map(row => row.following_id));
      return rows.map(row => ({
        ...toUserSummary(users.get(row.following_id) || { id: row.following_id }),
        createdAt: row.created_at,
      }));
    } catch (error: any) {
      if (isMissingTableError(error, 'user_follows')) {
        warnMissingTable('user_follows', error);
        return [];
      }
      throw error;
    }
  },

  async isFollowing(followerId: string, followingId: string) {
    try {
      const { data, error } = await getSupabase()
        .from('user_follows')
        .select('follower_id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .maybeSingle();

      if (error) throw error;
      return Boolean(data);
    } catch (error: any) {
      if (isMissingTableError(error, 'user_follows')) {
        warnMissingTable('user_follows', error);
        return false;
      }
      throw error;
    }
  },

  async follow(followerId: string, followingId: string) {
    const client = getSupabase();
    const alreadyFollowing = await this.isFollowing(followerId, followingId);
    if (alreadyFollowing) return false;

    const { error } = await client.from('user_follows').insert({
      follower_id: followerId,
      following_id: followingId,
    });

    if (error) throw error;
    return true;
  },

  async unfollow(followerId: string, followingId: string) {
    const { error } = await getSupabase()
      .from('user_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) throw error;
    return true;
  },

  async getRelationshipSummary(viewerId: string, targetUserId: string) {
    const [isFollowing, followers, following, incomingPending, outgoingPending, acceptedRequest, isFollowedBy] = await Promise.all([
      this.isFollowing(viewerId, targetUserId),
      this.getFollowers(targetUserId),
      this.getFollowing(targetUserId),
      friendRequestDb.findPendingBetween(targetUserId, viewerId),
      friendRequestDb.findPendingBetween(viewerId, targetUserId),
      friendRequestDb.findAcceptedBetween(viewerId, targetUserId),
      this.isFollowing(targetUserId, viewerId),
    ]);

    let friendStatus: 'none' | 'incoming_request' | 'outgoing_request' | 'friends' = 'none';
    if (acceptedRequest) {
      friendStatus = 'friends';
    } else if (incomingPending) {
      friendStatus = 'incoming_request';
    } else if (outgoingPending) {
      friendStatus = 'outgoing_request';
    }

    return {
      targetUserId,
      isFollowing,
      isFollowedBy,
      followerCount: followers.length,
      followingCount: following.length,
      friendStatus,
    };
  },
};

export const friendRequestDb = {
  async listIncoming(userId: string) {
    try {
      const { data, error } = await getSupabase()
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status, created_at, updated_at')
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = maybeArray(data);
      const users = await fetchUsersMap(rows.flatMap(row => [row.sender_id, row.receiver_id]));

      return rows.map(row => ({
        id: row.id,
        senderId: row.sender_id,
        receiverId: row.receiver_id,
        sender: toUserSummary(users.get(row.sender_id) || { id: row.sender_id }),
        receiver: toUserSummary(users.get(row.receiver_id) || { id: row.receiver_id }),
        status: toFriendRequestStatus(row.status),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error: any) {
      if (isMissingTableError(error, 'friend_requests')) {
        warnMissingTable('friend_requests', error);
        return [];
      }
      throw error;
    }
  },

  async listOutgoing(userId: string) {
    try {
      const { data, error } = await getSupabase()
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status, created_at, updated_at')
        .eq('sender_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = maybeArray(data);
      const users = await fetchUsersMap(rows.flatMap(row => [row.sender_id, row.receiver_id]));

      return rows.map(row => ({
        id: row.id,
        senderId: row.sender_id,
        receiverId: row.receiver_id,
        sender: toUserSummary(users.get(row.sender_id) || { id: row.sender_id }),
        receiver: toUserSummary(users.get(row.receiver_id) || { id: row.receiver_id }),
        status: toFriendRequestStatus(row.status),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error: any) {
      if (isMissingTableError(error, 'friend_requests')) {
        warnMissingTable('friend_requests', error);
        return [];
      }
      throw error;
    }
  },

  async listFriends(userId: string) {
    try {
      const { data, error } = await getSupabase()
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status, created_at, updated_at')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const rows = maybeArray(data);
      const friendIds = rows.map(row => row.sender_id === userId ? row.receiver_id : row.sender_id);
      const users = await fetchUsersMap(friendIds);

      return rows.map(row => {
        const friendId = row.sender_id === userId ? row.receiver_id : row.sender_id;
        return {
          requestId: row.id,
          userId: friendId,
          user: toUserSummary(users.get(friendId) || { id: friendId }),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });
    } catch (error: any) {
      if (isMissingTableError(error, 'friend_requests')) {
        warnMissingTable('friend_requests', error);
        return [];
      }
      throw error;
    }
  },

  async findPendingBetween(senderId: string, receiverId: string) {
    try {
      const { data, error } = await getSupabase()
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status, created_at, updated_at')
        .eq('sender_id', senderId)
        .eq('receiver_id', receiverId)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;
      return data as any;
    } catch (error: any) {
      if (isMissingTableError(error, 'friend_requests')) {
        warnMissingTable('friend_requests', error);
        return null;
      }
      throw error;
    }
  },

  async findAcceptedBetween(userA: string, userB: string) {
    try {
      const { data, error } = await getSupabase()
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status, created_at, updated_at')
        .eq('status', 'accepted')
        .in('sender_id', [userA, userB])
        .in('receiver_id', [userA, userB])
        .maybeSingle();

      if (error) throw error;
      return data as any;
    } catch (error: any) {
      if (isMissingTableError(error, 'friend_requests')) {
        warnMissingTable('friend_requests', error);
        return null;
      }
      throw error;
    }
  },

  async sendRequest(senderId: string, receiverId: string) {
    const id = crypto.randomUUID();
    const now = toIsoNow();

    const { error } = await getSupabase().from('friend_requests').insert({
      id,
      sender_id: senderId,
      receiver_id: receiverId,
      status: 'pending',
      created_at: now,
      updated_at: now,
    });

    if (error) throw error;
    return id;
  },

  async acceptRequest(requestId: string, actingUserId: string) {
    const request = await this.getById(requestId);
    if (!request) return null;
    if (request.receiverId !== actingUserId) {
      throw new Error('FORBIDDEN');
    }
    if (request.status !== 'pending') {
      throw new Error('INVALID_STATUS');
    }

    const { error } = await getSupabase()
      .from('friend_requests')
      .update({ status: 'accepted', updated_at: toIsoNow() })
      .eq('id', requestId);

    if (error) throw error;
    return this.getById(requestId);
  },

  async rejectRequest(requestId: string, actingUserId: string) {
    const request = await this.getById(requestId);
    if (!request) return null;
    if (request.receiverId !== actingUserId) {
      throw new Error('FORBIDDEN');
    }
    if (request.status !== 'pending') {
      throw new Error('INVALID_STATUS');
    }

    const { error } = await getSupabase()
      .from('friend_requests')
      .update({ status: 'rejected', updated_at: toIsoNow() })
      .eq('id', requestId);

    if (error) throw error;
    return this.getById(requestId);
  },

  async cancelRequest(requestId: string, actingUserId: string) {
    const request = await this.getById(requestId);
    if (!request) return null;
    if (request.senderId !== actingUserId) {
      throw new Error('FORBIDDEN');
    }
    if (request.status !== 'pending') {
      throw new Error('INVALID_STATUS');
    }

    const { error } = await getSupabase()
      .from('friend_requests')
      .update({ status: 'cancelled', updated_at: toIsoNow() })
      .eq('id', requestId);

    if (error) throw error;
    return this.getById(requestId);
  },

  async getFriendStatus(viewerId: string, targetUserId: string) {
    const accepted = await this.findAcceptedBetween(viewerId, targetUserId);
    if (accepted) return 'friends';

    const incoming = await this.findPendingBetween(targetUserId, viewerId);
    if (incoming) return 'incoming_request';

    const outgoing = await this.findPendingBetween(viewerId, targetUserId);
    if (outgoing) return 'outgoing_request';

    return 'none';
  },

  async getById(requestId: string) {
    const { data, error } = await getSupabase()
      .from('friend_requests')
      .select('id, sender_id, receiver_id, status, created_at, updated_at')
      .eq('id', requestId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      status: toFriendRequestStatus(data.status),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },
};

export const notificationDb = {
  async listForUser(userId: string) {
    try {
      const { data, error } = await getSupabase()
        .from('notifications')
        .select('id, user_id, actor_id, type, entity_type, entity_id, data_json, is_read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = maybeArray(data);
      const users = await fetchUsersMap(rows.map(row => row.actor_id).filter(Boolean));

      return rows.map(row => {
        const actor = row.actor_id ? users.get(row.actor_id) : null;
        return {
          id: row.id,
          userId: row.user_id,
          actorId: row.actor_id || null,
          actor: actor ? toUserSummary(actor) : null,
          type: row.type,
          entityType: row.entity_type,
          entityId: row.entity_id,
          dataJson: safeJsonParse(row.data_json, {}),
          isRead: Boolean(row.is_read),
          createdAt: row.created_at,
          message: buildNotificationMessage({ type: row.type, actorName: actor?.name, entityType: row.entity_type }),
        };
      });
    } catch (error: any) {
      if (isMissingTableError(error, 'notifications')) {
        warnMissingTable('notifications', error);
        return [];
      }
      throw error;
    }
  },

  async getUnreadCount(userId: string) {
    try {
      const { data, error } = await getSupabase()
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return maybeArray(data).length;
    } catch (error: any) {
      if (isMissingTableError(error, 'notifications')) {
        warnMissingTable('notifications', error);
        return 0;
      }
      throw error;
    }
  },

  async create(notification: { userId: string; actorId?: string | null; type: string; entityType: string; entityId: string; dataJson?: Record<string, any> }) {
    const id = crypto.randomUUID();

    try {
      const { error } = await getSupabase().from('notifications').insert({
        id,
        user_id: notification.userId,
        actor_id: notification.actorId || null,
        type: notification.type,
        entity_type: notification.entityType,
        entity_id: notification.entityId,
        data_json: notification.dataJson || {},
        is_read: false,
        created_at: toIsoNow(),
      });

      if (error) throw error;
      return id;
    } catch (error: any) {
      if (isMissingTableError(error, 'notifications')) {
        warnMissingTable('notifications', error);
        return id;
      }
      throw error;
    }
  },

  async markAsRead(notificationId: string, userId: string) {
    try {
      const { error } = await getSupabase()
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      if (isMissingTableError(error, 'notifications')) {
        warnMissingTable('notifications', error);
        return true;
      }
      throw error;
    }
  },

  async markAllAsRead(userId: string) {
    try {
      const { error } = await getSupabase()
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return true;
    } catch (error: any) {
      if (isMissingTableError(error, 'notifications')) {
        warnMissingTable('notifications', error);
        return true;
      }
      throw error;
    }
  },
};

export const documentDownloadDb = {
  async trackDownload({ documentId, downloaderId, ownerId }: { documentId: string; downloaderId: string; ownerId: string }) {
    const id = crypto.randomUUID();

    try {
      const { error } = await getSupabase().from('document_downloads').insert({
        id,
        document_id: documentId,
        downloader_id: downloaderId,
        owner_id: ownerId,
        created_at: toIsoNow(),
      });

      if (error) throw error;
      return id;
    } catch (error: any) {
      if (isMissingTableError(error, 'document_downloads')) {
        warnMissingTable('document_downloads', error);
        return id;
      }
      throw error;
    }
  },

  async listByDocument(documentId: string) {
    try {
      const { data, error } = await getSupabase()
        .from('document_downloads')
        .select('id, document_id, downloader_id, owner_id, created_at')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = maybeArray(data);
      const users = await fetchUsersMap(rows.flatMap(row => [row.downloader_id, row.owner_id]));

      return rows.map(row => ({
        id: row.id,
        documentId: row.document_id,
        downloaderId: row.downloader_id,
        ownerId: row.owner_id,
        downloader: toUserSummary(users.get(row.downloader_id) || { id: row.downloader_id }),
        owner: toUserSummary(users.get(row.owner_id) || { id: row.owner_id }),
        createdAt: row.created_at,
      }));
    } catch (error: any) {
      if (isMissingTableError(error, 'document_downloads')) {
        warnMissingTable('document_downloads', error);
        return [];
      }
      throw error;
    }
  },

  async getCountsByDocumentIds(documentIds: string[]) {
    return getDocumentDownloadCounts(documentIds);
  },
};

export const landingDb = {
  async getConfig() {
    const { data, error } = await getSupabase()
      .from('landing_config')
      .select('config_json')
      .eq('id', 1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return safeJsonParse(data.config_json, null);
  },

  async saveConfig(config: any) {
    const { error } = await getSupabase().from('landing_config').upsert({
      id: 1,
      config_json: config,
      updated_at: toIsoNow(),
    });

    if (error) throw error;
    return true;
  },
};
