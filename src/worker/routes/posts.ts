import type { Env, PostRow } from '../types';
import { POST_SELECT } from '../types';
import { requireAuth } from '../auth';
import { formatPosts } from '../formatters';
import { json, readJson } from '../http';
import { deleteR2MediaUrls, generatePresignedUpload } from '../r2';

export async function handlePosts(request: Request, env: Env, pathname: string, url: URL): Promise<Response> {
  const auth = await requireAuth(request, env);
  if ('response' in auth) return auth.response;
  const { supabase, user } = auth;

  if (request.method === 'POST' && pathname === '/api/posts/presign') {
    try {
      const { files } = await readJson<{ files?: { contentType?: string; fileSize?: number; fileName?: string }[] }>(request);
      if (!Array.isArray(files) || files.length === 0) return json({ error: 'Danh sach files khong hop le' }, 400);
      if (files.length > 10) return json({ error: 'Toi da 10 files moi bai dang' }, 400);

      const uploads = await Promise.all(files.map((file) => generatePresignedUpload(
        env,
        file.contentType || '',
        Number(file.fileSize),
        'posts',
      )));
      return json({ uploads });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Loi tao presigned URL';
      return json({ error: message }, 400);
    }
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
    const mediaUrls = Array.isArray(post.images) ? post.images.filter((item): item is string => typeof item === 'string') : [];
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw error;
    if (mediaUrls.length > 0) await deleteR2MediaUrls(env, mediaUrls);
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
