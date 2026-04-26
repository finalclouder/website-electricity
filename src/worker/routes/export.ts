import type { Env } from '../types';
import { requireAuth } from '../auth';
import { readJson } from '../http';
import { createPatctcDocx, makePatctcDocxFilename } from '../exportDocx';

export async function handleExport(request: Request, env: Env, pathname: string): Promise<Response> {
  if (request.method !== 'POST' || pathname !== '/api/export/docx') {
    return Response.json({ error: 'API endpoint chưa được hỗ trợ trên Cloudflare Worker' }, { status: 404 });
  }

  const auth = await requireAuth(request, env);
  if ('response' in auth) return auth.response;

  try {
    const data = await readJson<any>(request);
    const body = await createPatctcDocx(data);
    return new Response(body, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${makePatctcDocxFilename(data)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Worker DOCX export error:', error instanceof Error ? error.message : error);
    return Response.json({ error: 'Lỗi tạo file. Vui lòng kiểm tra lại dữ liệu.' }, { status: 500 });
  }
}
