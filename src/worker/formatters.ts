import type { SupabaseClient } from '@supabase/supabase-js';
import type { DocumentRow, PostRow, UserRow } from './types';
import { USER_SELECT } from './types';

export const normalizeUser = (user: UserRow) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || '',
  bio: user.bio || '',
  role: user.role,
  status: user.status,
  createdAt: user.created_at,
});

export const toArray = (value: unknown): any[] => {
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

export async function fetchUsersMap(supabase: SupabaseClient, userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return new Map<string, UserRow>();

  const { data, error } = await supabase
    .from('users')
    .select(USER_SELECT)
    .in('id', ids);
  if (error) throw error;

  return new Map((data || []).map((user: any) => [user.id, user as UserRow]));
}

export async function formatPosts(supabase: SupabaseClient, posts: PostRow[]) {
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

export async function formatDocuments(supabase: SupabaseClient, docs: DocumentRow[]) {
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
