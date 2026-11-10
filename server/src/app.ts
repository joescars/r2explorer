import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { Hono, type Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { serveStatic } from "@hono/node-server/serve-static";
import {
  S3Client, ListBucketsCommand, ListObjectsV2Command, HeadObjectCommand,
  GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Env } from "./env.js";
import { COOKIE_NAME, SESSION_TTL_S, RateLimiter, makeSession, passwordMatches, verifySession } from "./auth.js";
import { attachmentDisposition, validKey, validPrefix } from "./validate.js";

export function createS3(env: Env) {
  return new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT ?? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
}

export interface AppOptions {
  s3?: S3Client;
  webDist?: string;
  fetchImpl?: typeof fetch;
  loginLimit?: number;
}

export function createApp(env: Env, opts: AppOptions = {}) {
  const s3 = opts.s3 ?? createS3(env);
  const doFetch = opts.fetchImpl ?? fetch;
  const limiter = new RateLimiter(opts.loginLimit ?? 5, 15 * 60_000);
  const app = new Hono();

  const err = (c: Context, status: 400 | 401 | 403 | 404 | 429 | 502, error: string) => c.json({ error }, status);

  // Security headers
  app.use("*", async (c, next) => {
    await next();
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "no-referrer");
    if (c.req.path.startsWith("/api/")) c.header("Cache-Control", "no-store");
  });

  app.get("/healthz", (c) => c.json({ ok: true }));
  app.get("/api/config", (c) => c.json({ readOnly: env.READ_ONLY }));

  // CSRF: mutating API routes must carry a custom header (not sendable cross-site without CORS preflight).
  app.use("/api/*", async (c, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method) && !c.req.header("x-requested-with")) {
      return err(c, 403, "Missing X-Requested-With header");
    }
    await next();
  });

  const clientKey = (c: Context) =>
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  app.post("/api/login", async (c) => {
    const ip = clientKey(c);
    if (limiter.blocked(ip)) return err(c, 429, "Too many attempts. Try again later.");
    const body = await c.req.json().catch(() => null);
    const pw = body && typeof body.password === "string" ? body.password : "";
    if (!passwordMatches(pw, env.APP_PASSWORD)) {
      limiter.fail(ip);
      return err(c, 401, "Invalid password");
    }
    limiter.reset(ip);
    setCookie(c, COOKIE_NAME, makeSession(env.SESSION_SECRET), {
      httpOnly: true, sameSite: "Strict", path: "/", maxAge: SESSION_TTL_S,
      secure: c.req.header("x-forwarded-proto") === "https" || new URL(c.req.url).protocol === "https:",
    });
    return c.json({ ok: true });
  });

  app.post("/api/logout", (c) => {
    deleteCookie(c, COOKIE_NAME, { path: "/" });
    return c.json({ ok: true });
  });

  const authed = (c: Context) => verifySession(getCookie(c, COOKIE_NAME), env.SESSION_SECRET);

  app.get("/api/session", (c) => c.json({ authenticated: authed(c) }));

  // Everything below requires a session.
  app.use("/api/buckets", requireAuth);
  app.use("/api/buckets/*", requireAuth);
  async function requireAuth(c: Context, next: () => Promise<void>) {
    if (!authed(c)) return err(c, 401, "Not authenticated");
    await next();
  }

  async function visibleBuckets(): Promise<string[]> {
    let names: string[] | null = null;
    try {
      const r = await s3.send(new ListBucketsCommand({}));
      names = (r.Buckets ?? []).map((b) => b.Name!).filter(Boolean);
    } catch {
      /* fall through */
    }
    if (names === null && env.CLOUDFLARE_API_TOKEN) {
      try {
        const res = await doFetch(
          `https://api.cloudflare.com/client/v4/accounts/${env.R2_ACCOUNT_ID}/r2/buckets?per_page=1000`,
          { headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` } },
        );
        if (res.ok) {
          const j = (await res.json()) as { result?: { buckets?: { name: string }[] } };
          names = (j.result?.buckets ?? []).map((b) => b.name);
        }
      } catch {
        /* fall through */
      }
    }
    if (names === null) return [...env.R2_BUCKETS];
    if (env.R2_BUCKETS.length) names = names.filter((n) => env.R2_BUCKETS.includes(n));
    return names;
  }

  app.get("/api/buckets", async (c) => {
    const buckets = await visibleBuckets();
    return c.json({ buckets: buckets.map((name) => ({ name })) });
  });

  // Bucket must be in the visible list.
  app.use("/api/buckets/:b/*", async (c, next) => {
    const b = c.req.param("b");
    if (!(await visibleBuckets()).includes(b)) return err(c, 404, "Bucket not found");
    await next();
  });

  app.get("/api/buckets/:b/list", async (c) => {
    const prefix = c.req.query("prefix") ?? "";
    if (!validPrefix(prefix)) return err(c, 400, "Invalid prefix");
    const token = c.req.query("token") || undefined;
    try {
      const r = await s3.send(new ListObjectsV2Command({
        Bucket: c.req.param("b"), Prefix: prefix, Delimiter: "/", ContinuationToken: token, MaxKeys: 1000,
      }));
      return c.json({
        folders: (r.CommonPrefixes ?? []).map((p) => ({ prefix: p.Prefix!, name: p.Prefix!.slice(prefix.length).replace(/\/$/, "") })),
        files: (r.Contents ?? [])
          .filter((o) => o.Key !== prefix || !prefix.endsWith("/"))
          .map((o) => ({
            key: o.Key!, name: o.Key!.slice(prefix.length), size: o.Size ?? 0,
            lastModified: o.LastModified?.toISOString() ?? null, etag: o.ETag ?? null,
            storageClass: o.StorageClass ?? null,
          })),
        nextToken: r.IsTruncated ? r.NextContinuationToken ?? null : null,
      });
    } catch {
      return err(c, 502, "Failed to list objects");
    }
  });

  app.get("/api/buckets/:b/object", async (c) => {
    const key = c.req.query("key");
    if (!validKey(key)) return err(c, 400, "Invalid key");
    try {
      const r = await s3.send(new HeadObjectCommand({ Bucket: c.req.param("b"), Key: key }));
      return c.json({
        key, name: key.split("/").pop(), size: r.ContentLength ?? 0, contentType: r.ContentType ?? null,
        etag: r.ETag ?? null, lastModified: r.LastModified?.toISOString() ?? null,
        storageClass: r.StorageClass ?? "STANDARD", metadata: r.Metadata ?? {},
      });
    } catch (e) {
      if ((e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return err(c, 404, "Object not found");
      return err(c, 502, "Failed to read object");
    }
  });

  app.get("/api/buckets/:b/download", async (c) => {
    const key = c.req.query("key");
    if (!validKey(key)) return err(c, 400, "Invalid key");
    try {
      await s3.send(new HeadObjectCommand({ Bucket: c.req.param("b"), Key: key }));
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: c.req.param("b"), Key: key, ResponseContentDisposition: attachmentDisposition(key) }),
        { expiresIn: 60 },
      );
      return c.json({ url, expiresIn: 60 });
    } catch (e) {
      if ((e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return err(c, 404, "Object not found");
      return err(c, 502, "Failed to create download link");
    }
  });

  const readOnlyGuard = (c: Context) => (env.READ_ONLY ? err(c, 403, "Server is in read-only mode") : null);

  app.delete("/api/buckets/:b/object", async (c) => {
    const ro = readOnlyGuard(c);
    if (ro) return ro;
    const key = c.req.query("key");
    if (!validKey(key)) return err(c, 400, "Invalid key");
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: c.req.param("b"), Key: key }));
      return c.json({ deleted: 1 });
    } catch {
      return err(c, 502, "Failed to delete object");
    }
  });

  app.delete("/api/buckets/:b/prefix", async (c) => {
    const ro = readOnlyGuard(c);
    if (ro) return ro;
    const prefix = c.req.query("prefix") ?? "";
    if (!validPrefix(prefix)) return err(c, 400, "Invalid prefix");
    if (prefix !== "" && !prefix.endsWith("/")) return err(c, 400, "Prefix must end with '/'");
    let confirm = c.req.query("confirm");
    if (confirm === undefined) {
      const body = await c.req.json().catch(() => null);
      if (body && typeof body.confirm === "string") confirm = body.confirm;
    }
    const expected = prefix === "" ? "DELETE ALL" : prefix;
    if (confirm !== expected) return err(c, 400, prefix === "" ? "confirm must be 'DELETE ALL' to empty a bucket" : "confirm must match prefix");

    const Bucket = c.req.param("b");
    let deleted = 0;
    let token: string | undefined;
    try {
      do {
        const page = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }));
        const objs = (page.Contents ?? []).map((o) => ({ Key: o.Key! }));
        if (objs.length) {
          const r = await s3.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: objs, Quiet: true } }));
          if (r.Errors?.length) return c.json({ error: "Some objects failed to delete", deleted: deleted + objs.length - r.Errors.length }, 502);
          deleted += objs.length;
        }
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (token);
    } catch {
      return c.json({ error: "Prefix delete failed", deleted }, 502);
    }
    return c.json({ deleted });
  });

  app.all("/api/*", (c) => err(c, 404, "Not found"));

  // Static web build with SPA fallback (only if it exists).
  const webDist = resolve(opts.webDist ?? process.env.WEB_DIST ?? "../web/dist");
  if (existsSync(webDist)) {
    app.use("/*", serveStatic({ root: relative(process.cwd(), webDist) || "." }));
    app.get("*", (c) => {
      const index = resolve(webDist, "index.html");
      return existsSync(index) ? c.html(readFileSync(index, "utf8")) : c.notFound();
    });
  }
  return app;
}
