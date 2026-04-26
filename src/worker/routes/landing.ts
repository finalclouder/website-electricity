import type { Env } from '../types';
import { requireAuth } from '../auth';
import { json, readJson } from '../http';
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
    return json({
      error: 'Upload landing media chưa được migrate sang R2 trên Cloudflare Worker. Hãy dùng URL ảnh/video trực tiếp.',
    }, 501);
  }

  return json({ error: 'API endpoint chưa được hỗ trợ trên Cloudflare Worker' }, 404);
}
