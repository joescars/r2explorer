export interface Bucket { name: string; creationDate?: string }
export interface Folder { prefix: string; name: string }
export interface FileItem { key: string; name: string; size: number; lastModified: string }
export interface ListResult { folders: Folder[]; files: FileItem[]; nextToken?: string }
export interface ObjectDetails {
  key: string; size: number; contentType: string; lastModified: string; etag: string; storageClass: string;
  metadata: Record<string, string>;
}

export type ErrorKind = 'unauthorized' | 'forbidden' | 'notfound' | 'network' | 'server';
export class ApiError extends Error {
  constructor(public kind: ErrorKind, public status: number, message: string) { super(message); }
}

export const UNAUTHORIZED_EVENT = 'r2:unauthorized';

async function request<T>(path: string, init: RequestInit = {}, opts: { silent401?: boolean } = {}): Promise<T> {
  const method = init.method ?? 'GET';
  const headers = new Headers(init.headers);
  if (method !== 'GET') headers.set('X-Requested-With', 'r2-explorer');
  if (init.body) headers.set('Content-Type', 'application/json');
  let res: Response;
  try {
    res = await fetch(path, { ...init, method, headers, credentials: 'same-origin' });
  } catch {
    throw new ApiError('network', 0, 'Can’t reach the server. Check your connection and try again.');
  }
  let body: unknown = null;
  try { body = await res.json(); } catch { /* empty body */ }
  if (res.ok) return body as T;
  const serverMsg = (body as { error?: string } | null)?.error;
  if (res.status === 401) {
    if (!opts.silent401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError('unauthorized', 401, serverMsg || 'Your session has expired. Please sign in again.');
  }
  if (res.status === 403) throw new ApiError('forbidden', 403, serverMsg || 'You don’t have permission to do that.');
  if (res.status === 404) throw new ApiError('notfound', 404, serverMsg || 'That item no longer exists.');
  throw new ApiError(res.status >= 500 || res.status === 0 ? 'server' : 'server', res.status, serverMsg || 'Something went wrong on the server.');
}

const enc = encodeURIComponent;
const b = (bucket: string) => `/api/buckets/${enc(bucket)}`;

export const api = {
  login: (password: string) => request<unknown>('/api/login', { method: 'POST', body: JSON.stringify({ password }) }, { silent401: true }),
  logout: () => request<unknown>('/api/logout', { method: 'POST' }),
  session: () => request<{ authenticated?: boolean }>('/api/session', {}, { silent401: true }),
  config: () => request<{ readOnly: boolean }>('/api/config'),
  buckets: () => request<{ buckets: Bucket[] }>('/api/buckets'),
  list: (bucket: string, prefix: string, token?: string) =>
    request<ListResult>(`${b(bucket)}/list?prefix=${enc(prefix)}${token ? `&token=${enc(token)}` : ''}`),
  details: (bucket: string, key: string) => request<ObjectDetails>(`${b(bucket)}/object?key=${enc(key)}`),
  download: (bucket: string, key: string) => request<{ url: string }>(`${b(bucket)}/download?key=${enc(key)}`),
  deleteObject: (bucket: string, key: string) => request<unknown>(`${b(bucket)}/object?key=${enc(key)}`, { method: 'DELETE' }),
  deletePrefix: (bucket: string, prefix: string) =>
    request<{ deleted: number }>(`${b(bucket)}/prefix?prefix=${enc(prefix)}&confirm=${enc(prefix)}`, { method: 'DELETE' }),
};

export function friendlyError(e: unknown): { title: string; message: string; kind: ErrorKind } {
  if (e instanceof ApiError) {
    const title = { unauthorized: 'You’re signed out', forbidden: 'Access denied', notfound: 'Not found', network: 'You’re offline', server: 'Something went wrong' }[e.kind];
    return { title, message: e.message, kind: e.kind };
  }
  return { title: 'Something went wrong', message: 'An unexpected error occurred.', kind: 'server' };
}
