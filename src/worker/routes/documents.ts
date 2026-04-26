import type { Env, DocumentRow } from '../types';
import { DOCUMENT_SELECT } from '../types';
import { requireAuth } from '../auth';
import { fetchUsersMap, formatDocuments, isMissingTableError, toUserSummary } from '../formatters';
import { json, readJson } from '../http';

export async function handleDocuments(request: Request, env: Env, pathname: string, url: URL): Promise<Response> {
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
    if (doc.author_id !== user.id) {
      const downloadId = crypto.randomUUID();
      const { error: downloadError } = await supabase.from('document_downloads').insert({
        id: downloadId,
        document_id: doc.id,
        downloader_id: user.id,
        owner_id: doc.author_id,
        created_at: new Date().toISOString(),
      });
      if (downloadError && !isMissingTableError(downloadError, 'document_downloads')) throw downloadError;

      const { error: notificationError } = await supabase.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: doc.author_id,
        actor_id: user.id,
        type: 'document_download',
        entity_type: 'document',
        entity_id: doc.id,
        data_json: { documentId: doc.id, downloaderId: user.id, ownerId: doc.author_id },
        is_read: false,
        created_at: new Date().toISOString(),
      });
      if (notificationError && !isMissingTableError(notificationError, 'notifications')) throw notificationError;
    }
    return json({ message: 'Đã ghi nhận lượt tải tài liệu' });
  }
  if (request.method === 'GET' && action === 'downloads') {
    if (doc.author_id !== user.id && user.role !== 'admin') return json({ error: 'Bạn không có quyền xem lượt tải tài liệu này' }, 403);
    const { data, error } = await supabase
      .from('document_downloads')
      .select('id, document_id, downloader_id, owner_id, created_at')
      .eq('document_id', id)
      .order('created_at', { ascending: false });
    if (error) {
      if (isMissingTableError(error, 'document_downloads')) return json([]);
      throw error;
    }

    const userIds = (data || []).flatMap((row: any) => [row.downloader_id, row.owner_id]);
    const users = await fetchUsersMap(supabase, userIds);
    return json((data || []).map((row: any) => ({
      id: row.id,
      documentId: row.document_id,
      downloaderId: row.downloader_id,
      ownerId: row.owner_id,
      downloader: toUserSummary(users.get(row.downloader_id) || { id: row.downloader_id }),
      owner: toUserSummary(users.get(row.owner_id) || { id: row.owner_id }),
      createdAt: row.created_at,
    })));
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
