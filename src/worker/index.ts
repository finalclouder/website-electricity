import type { Env } from './types';
import { json } from './http';
import { handleAuth } from './routes/auth';
import { handleDocuments } from './routes/documents';
import { handleExport } from './routes/export';
import { handleLanding } from './routes/landing';
import { handlePosts } from './routes/posts';
import { handleSocial } from './routes/social';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (url.pathname === '/api/health') {
      return json({ status: 'ok', runtime: 'cloudflare-worker' });
    }

    if (url.pathname.startsWith('/api/auth/')) {
      try { return await handleAuth(request, env, url.pathname); }
      catch (error: any) { console.error('Worker auth error:', error?.message || error); return json({ error: 'L?i server backend' }, 500); }
    }

    if (url.pathname.startsWith('/api/landing')) {
      try { return await handleLanding(request, env, url.pathname); }
      catch (error: any) { console.error('Worker landing error:', error?.message || error); return json({ error: 'L?i server backend' }, 500); }
    }

    if (url.pathname.startsWith('/api/posts')) {
      try { return await handlePosts(request, env, url.pathname, url); }
      catch (error: any) { console.error('Worker posts error:', error?.message || error); return json({ error: 'L?i server backend' }, 500); }
    }

    if (url.pathname.startsWith('/api/documents')) {
      try { return await handleDocuments(request, env, url.pathname, url); }
      catch (error: any) { console.error('Worker documents error:', error?.message || error); return json({ error: 'L?i server backend' }, 500); }
    }

    if (url.pathname.startsWith('/api/export')) {
      try { return await handleExport(request, env, url.pathname); }
      catch (error: any) { console.error('Worker export error:', error?.message || error); return json({ error: 'L?i server backend' }, 500); }
    }

    if (url.pathname.startsWith('/api/social')) {
      try { return await handleSocial(request, env, url.pathname); }
      catch (error: any) { console.error('Worker social error:', error?.message || error); return json({ error: 'L?i server backend' }, 500); }
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'API endpoint ch?a ???c migrate sang Cloudflare Worker' }, 501);
    }

    return env.ASSETS.fetch(request);
  },
};
