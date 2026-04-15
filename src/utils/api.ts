/**
 * API Client Helper - Centralized fetch wrapper for all API calls
 */

const API_BASE = '/api';

export function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem('patctc-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.token || parsed?.token || null;
    }
  } catch (e) {
    console.warn('Failed to parse auth token from localStorage, clearing corrupted data');
    localStorage.removeItem('patctc-auth');
  }
  return null;
}

export function getAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  if (!token) return headers;

  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // Only set Content-Type for JSON payloads. Let the browser set multipart boundaries for FormData.
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: getAuthHeaders(headers),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Lỗi kết nối server' }));
    throw new Error(errorData.error || `HTTP ${res.status}`);
  }

  // Handle empty body responses (204 No Content, etc.)
  const text = await res.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

function formatBody(body: any): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return body;
  return JSON.stringify(body);
}

export const api = {
  get: <T = any>(endpoint: string) => request<T>(endpoint),
  post: <T = any>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'POST', ...(body !== undefined ? { body: formatBody(body) } : {}) }),
  put: <T = any>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'PUT', ...(body !== undefined ? { body: formatBody(body) } : {}) }),
  delete: <T = any>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'DELETE', ...(body !== undefined ? { body: formatBody(body) } : {}) }),
};
