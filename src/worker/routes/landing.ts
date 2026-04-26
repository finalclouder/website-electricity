import type { Env } from '../types';
import { requireAuth } from '../auth';
import { json, readJson } from '../http';
import { uploadLandingFile } from '../r2';
import { getSupabase } from '../supabase';

export async function handleLanding(request: Request, env: Env, pathname: string): Promise<Response> {
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
    const auth = await requireAuth(request, env, true);
    if ('response' in auth) return auth.response;

    try {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!(file instanceof File)) {
        return json({ error: pathname.endsWith('/image') ? 'Vui long chon file anh' : 'Vui long chon file video MP4' }, 400);
      }

      const kind = pathname.endsWith('/image') ? 'image' : 'video';
      return json(await uploadLandingFile(env, file, kind));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Khong the tai media len R2';
      return json({ error: message }, 400);
    }
  }

  return json({ error: 'API endpoint chưa được hỗ trợ trên Cloudflare Worker' }, 404);
}
