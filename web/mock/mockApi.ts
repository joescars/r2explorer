// Dev-only mock of the R2 Explorer API (enabled with VITE_MOCK=true). Password: "demo".
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

interface Obj { key: string; size: number; lastModified: string; contentType: string }
const day = 86400000;
const mk = (key: string, size: number, ago: number, contentType = 'application/octet-stream'): Obj =>
  ({ key, size, lastModified: new Date(Date.now() - ago * day).toISOString(), contentType });

function seed(): Record<string, Obj[]> {
  const photos: Obj[] = [];
  for (let i = 1; i <= 120; i++) photos.push(mk(`photos/2024/IMG_${String(i).padStart(4, '0')}.jpg`, 1_200_000 + i * 7311, i, 'image/jpeg'));
  return {
    'family-backups': [
      mk('README.txt', 812, 3, 'text/plain'),
      mk('documents/taxes-2023.pdf', 2_400_000, 40, 'application/pdf'),
      mk('documents/passport-scan.pdf', 880_000, 200, 'application/pdf'),
      mk('documents/notes/ideas.md', 4_300, 5, 'text/markdown'),
      mk('archive/laptop-2022.tar.gz', 5_400_000_000, 600, 'application/gzip'),
      mk('archive/old/readme.txt', 120, 900, 'text/plain'),
      ...photos,
    ],
    'website-assets': [
      mk('logo.svg', 3_100, 12, 'image/svg+xml'), mk('css/site.css', 48_000, 2, 'text/css'),
      mk('js/app.js', 311_000, 2, 'text/javascript'), mk('index.html', 7_400, 1, 'text/html'),
    ],
    'empty-bucket': [],
  };
}

export function mockApi(opts: { readOnly?: boolean } = {}): Plugin {
  const data = seed();
  const PAGE = 50;
  return {
    name: 'r2-mock-api',
    configureServer(server) {
      server.middlewares.use('/api', (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? '/', 'http://x');
        const path = url.pathname;
        const method = req.method ?? 'GET';
        const send = (status: number, body: unknown, headers: Record<string, string> = {}) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
          res.end(JSON.stringify(body));
        };
        const authed = /(^|;\s*)mock_session=1/.test(req.headers.cookie ?? '');
        const readBody = () => new Promise<string>((r) => { let s = ''; req.on('data', (c) => (s += c)); req.on('end', () => r(s)); });
        const mutating = method !== 'GET';
        const go = async () => {
          if (path === '/login' && method === 'POST') {
            const b = JSON.parse((await readBody()) || '{}');
            if (b.password === 'demo') return send(200, { ok: true }, { 'Set-Cookie': 'mock_session=1; Path=/; HttpOnly' });
            return send(401, { error: 'Wrong password' });
          }
          if (path === '/logout') return send(200, { ok: true }, { 'Set-Cookie': 'mock_session=; Path=/; Max-Age=0' });
          if (path === '/session') return authed ? send(200, { authenticated: true }) : send(401, { error: 'Not signed in' });
          if (!authed) return send(401, { error: 'Not signed in' });
          if (path === '/config') return send(200, { readOnly: !!opts.readOnly });
          if (path === '/buckets') return send(200, { buckets: Object.keys(data).map((name, i) => ({ name, creationDate: new Date(Date.now() - (i + 1) * 90 * day).toISOString() })) });
          const m = path.match(/^\/buckets\/([^/]+)\/(list|object|download|prefix)$/);
          if (!m) return send(404, { error: 'Not found' });
          const bucket = decodeURIComponent(m[1]);
          const objs = data[bucket];
          if (!objs) return send(404, { error: 'Bucket not found' });
          if (mutating && req.headers['x-requested-with'] !== 'r2-explorer') return send(403, { error: 'Missing CSRF header' });
          const q = url.searchParams;
          if (m[2] === 'list') {
            const prefix = q.get('prefix') ?? '';
            const inside = objs.filter((o) => o.key.startsWith(prefix));
            const folders = [...new Set(inside.filter((o) => o.key.includes('/', prefix.length)).map((o) => prefix + o.key.slice(prefix.length).split('/')[0] + '/'))]
              .map((p) => ({ prefix: p, name: p.slice(prefix.length, -1) }));
            const files = inside.filter((o) => !o.key.includes('/', prefix.length) && o.key !== prefix)
              .map((o) => ({ key: o.key, name: o.key.slice(prefix.length), size: o.size, lastModified: o.lastModified }));
            const start = Number(q.get('token') ?? 0) || 0;
            const page = files.slice(start, start + PAGE);
            await new Promise((r) => setTimeout(r, 350));
            return send(200, { folders: start === 0 ? folders : [], files: page, ...(start + PAGE < files.length ? { nextToken: String(start + PAGE) } : {}) });
          }
          if (m[2] === 'prefix') {
            if (opts.readOnly) return send(403, { error: 'Read-only mode' });
            const prefix = q.get('prefix') ?? '';
            if (!prefix || q.get('confirm') !== prefix) return send(400, { error: 'Confirmation does not match' });
            const before = objs.length;
            data[bucket] = objs.filter((o) => !o.key.startsWith(prefix));
            await new Promise((r) => setTimeout(r, 900));
            return send(200, { deleted: before - data[bucket].length });
          }
          const key = q.get('key') ?? '';
          const o = objs.find((x) => x.key === key);
          if (!o) return send(404, { error: 'Object not found' });
          if (m[2] === 'object' && method === 'DELETE') {
            if (opts.readOnly) return send(403, { error: 'Read-only mode' });
            data[bucket] = objs.filter((x) => x !== o);
            return send(200, { deleted: 1 });
          }
          if (m[2] === 'object') return send(200, { ...o, etag: '"9b2cf535f27731c974343645a3985328"', storageClass: 'STANDARD', metadata: key.endsWith('.jpg') ? { camera: 'Pixel 8', 'uploaded-by': 'sync-job' } : {} });
          if (m[2] === 'download') return send(200, { url: 'data:text/plain;charset=utf-8,Mock%20download%20of%20' + encodeURIComponent(key) });
          return send(404, { error: 'Not found' });
        };
        go().catch((e) => send(500, { error: String(e) }));
      });
    },
  };
}
