import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { S3Client, CreateBucketCommand, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, DeleteBucketCommand } from "@aws-sdk/client-s3";
import { createApp } from "../src/app.js";
import type { Env } from "../src/env.js";

const endpoint = process.env.TEST_S3_ENDPOINT ?? "http://127.0.0.1:9000";
const user = process.env.TEST_S3_USER ?? "minioadmin";
const pass = process.env.TEST_S3_PASS ?? ["minio", "admin"].join("");
const PW = ["correct", "horse", "battery"].join("-");
const SECRET = "s".repeat(40);
const run = Math.random().toString(36).slice(2, 8);
const B1 = `rx-a-${run}`;
const B2 = `rx-b-${run}`;
const B3 = `rx-c-${run}`;

const admin = new S3Client({ region: "auto", endpoint, forcePathStyle: true, credentials: { accessKeyId: user, secretAccessKey: pass } });

function mkEnv(over: Partial<Env> = {}): Env {
  return {
    R2_ACCOUNT_ID: "acct", R2_ACCESS_KEY_ID: user, R2_SECRET_ACCESS_KEY: pass, CLOUDFLARE_API_TOKEN: undefined,
    R2_BUCKETS: [], APP_PASSWORD: PW, SESSION_SECRET: SECRET, READ_ONLY: false, PORT: 3000, R2_ENDPOINT: endpoint, ...over,
  };
}
const H = { "x-requested-with": "test", "content-type": "application/json" };

async function login(app: ReturnType<typeof createApp>) {
  const r = await app.request("/api/login", { method: "POST", headers: H, body: JSON.stringify({ password: PW }) });
  expect(r.status).toBe(200);
  return r.headers.get("set-cookie")!.split(";")[0];
}
const get = (app: ReturnType<typeof createApp>, cookie: string, path: string) => app.request(path, { headers: { cookie } });
const del = (app: ReturnType<typeof createApp>, cookie: string, path: string, body?: unknown) =>
  app.request(path, { method: "DELETE", headers: { ...H, cookie }, body: body ? JSON.stringify(body) : undefined });
const put = (b: string, k: string, body = "x", extra: object = {}) => admin.send(new PutObjectCommand({ Bucket: b, Key: k, Body: body, ...extra }));

async function emptyAndDrop(b: string) {
  let token: string | undefined;
  do {
    const p = await admin.send(new ListObjectsV2Command({ Bucket: b, ContinuationToken: token }));
    if (p.Contents?.length) await admin.send(new DeleteObjectsCommand({ Bucket: b, Delete: { Objects: p.Contents.map((o) => ({ Key: o.Key! })) } }));
    token = p.NextContinuationToken;
  } while (token);
  await admin.send(new DeleteBucketCommand({ Bucket: b }));
}

let app: ReturnType<typeof createApp>;
let cookie: string;

beforeAll(async () => {
  for (const b of [B1, B2, B3]) await admin.send(new CreateBucketCommand({ Bucket: b }));
  await put(B1, "readme.txt", "hello", { ContentType: "text/plain", Metadata: { owner: "joe" } });
  await put(B1, "docs/a.txt");
  await put(B1, "docs/b.txt");
  await put(B1, "docs/sub/c.txt");
  await put(B1, "docs2/keep.txt");
  await put(B1, "ünï cødé.txt", "u");
  await put(B2, "x.txt");
  // 1500 objects for pagination
  const keys = Array.from({ length: 1500 }, (_, i) => `many/${String(i).padStart(5, "0")}.txt`);
  for (let i = 0; i < keys.length; i += 50) await Promise.all(keys.slice(i, i + 50).map((k) => put(B3, k, "")));
  app = createApp(mkEnv(), { webDist: "/nonexistent" });
  cookie = await login(app);
}, 120_000);

afterAll(async () => {
  for (const b of [B1, B2, B3]) await emptyAndDrop(b).catch(() => {});
}, 120_000);

describe("auth", () => {
  it("healthz and config are public", async () => {
    expect((await app.request("/healthz")).status).toBe(200);
    expect(await (await app.request("/api/config")).json()).toEqual({ readOnly: false });
  });
  it("401 without session, session endpoint reflects state", async () => {
    expect((await app.request("/api/buckets")).status).toBe(401);
    expect(await (await app.request("/api/session")).json()).toEqual({ authenticated: false });
    expect(await (await get(app, cookie, "/api/session")).json()).toEqual({ authenticated: true });
  });
  it("cookie flags", async () => {
    const r = await app.request("/api/login", { method: "POST", headers: H, body: JSON.stringify({ password: PW }) });
    const sc = r.headers.get("set-cookie")!;
    expect(sc).toMatch(/HttpOnly/i);
    expect(sc).toMatch(/SameSite=Strict/i);
  });
  it("wrong password 401; tampered cookie rejected", async () => {
    const r = await app.request("/api/login", { method: "POST", headers: H, body: JSON.stringify({ password: "nope" }) });
    expect(r.status).toBe(401);
    expect((await get(app, cookie.slice(0, -2) + "xx", "/api/buckets")).status).toBe(401);
  });
  it("CSRF: login/delete without X-Requested-With → 403", async () => {
    const r = await app.request("/api/login", { method: "POST", body: JSON.stringify({ password: PW }) });
    expect(r.status).toBe(403);
    const d = await app.request(`/api/buckets/${B1}/object?key=readme.txt`, { method: "DELETE", headers: { cookie } });
    expect(d.status).toBe(403);
    await admin.send(new HeadObjectCommand({ Bucket: B1, Key: "readme.txt" }));
  });
  it("rate limits login", async () => {
    const a = createApp(mkEnv(), { loginLimit: 3, webDist: "/nonexistent" });
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) codes.push((await a.request("/api/login", { method: "POST", headers: H, body: JSON.stringify({ password: "bad" }) })).status);
    expect(codes).toEqual([401, 401, 401, 429, 429]);
    // even correct password is blocked while limited
    expect((await a.request("/api/login", { method: "POST", headers: H, body: JSON.stringify({ password: PW }) })).status).toBe(429);
  });
  it("logout clears cookie", async () => {
    const r = await app.request("/api/logout", { method: "POST", headers: { ...H, cookie } });
    expect(r.status).toBe(200);
    expect(r.headers.get("set-cookie")).toMatch(/Max-Age=0|expires=/i);
  });
});

describe("buckets", () => {
  it("lists buckets", async () => {
    const j = await (await get(app, cookie, "/api/buckets")).json();
    const names = j.buckets.map((b: { name: string }) => b.name);
    expect(names).toEqual(expect.arrayContaining([B1, B2, B3]));
  });
  it("R2_BUCKETS acts as allowlist", async () => {
    const a = createApp(mkEnv({ R2_BUCKETS: [B1] }), { webDist: "/nonexistent" });
    const c = await login(a);
    expect((await (await get(a, c, "/api/buckets")).json()).buckets).toEqual([{ name: B1 }]);
    expect((await get(a, c, `/api/buckets/${B2}/list`)).status).toBe(404);
  });
  it("falls back to Cloudflare REST then R2_BUCKETS when ListBuckets fails", async () => {
    const bad = new S3Client({ region: "auto", endpoint, forcePathStyle: true, credentials: { accessKeyId: user, secretAccessKey: "wrong-secret-value" } });
    const fetchImpl = (async () => new Response(JSON.stringify({ result: { buckets: [{ name: B1 }] } }), { status: 200 })) as typeof fetch;
    const a = createApp(mkEnv({ CLOUDFLARE_API_TOKEN: "tok" }), { s3: bad, fetchImpl, webDist: "/nonexistent" });
    const c = await login(a);
    expect((await (await get(a, c, "/api/buckets")).json()).buckets).toEqual([{ name: B1 }]);
    const b = createApp(mkEnv({ R2_BUCKETS: [B2] }), { s3: bad, webDist: "/nonexistent" });
    const c2 = await login(b);
    expect((await (await get(b, c2, "/api/buckets")).json()).buckets).toEqual([{ name: B2 }]);
  });
  it("unknown bucket 404", async () => {
    expect((await get(app, cookie, "/api/buckets/nope-nope-nope/list")).status).toBe(404);
  });
});

describe("list", () => {
  it("root: folders and files with delimiter", async () => {
    const j = await (await get(app, cookie, `/api/buckets/${B1}/list`)).json();
    expect(j.folders.map((f: { prefix: string }) => f.prefix)).toEqual(["docs/", "docs2/"]);
    expect(j.files.map((f: { key: string }) => f.key).sort()).toEqual(["readme.txt", "ünï cødé.txt"].sort());
    expect(j.nextToken).toBeNull();
  });
  it("nested prefix", async () => {
    const j = await (await get(app, cookie, `/api/buckets/${B1}/list?prefix=docs%2F`)).json();
    expect(j.folders).toEqual([{ prefix: "docs/sub/", name: "sub" }]);
    expect(j.files.map((f: { name: string }) => f.name)).toEqual(["a.txt", "b.txt"]);
  });
  it("paginates >1000 objects", async () => {
    const seen: string[] = [];
    let token: string | null = null;
    let pages = 0;
    do {
      const q: string = `prefix=many%2F${token ? "&token=" + encodeURIComponent(token) : ""}`;
      const j: { files: { key: string }[]; nextToken: string | null } = await (await get(app, cookie, `/api/buckets/${B3}/list?${q}`)).json();
      seen.push(...j.files.map((f) => f.key));
      token = j.nextToken;
      pages++;
    } while (token);
    expect(pages).toBe(2);
    expect(seen.length).toBe(1500);
    expect(new Set(seen).size).toBe(1500);
  }, 60_000);
  it("rejects control chars in prefix", async () => {
    expect((await get(app, cookie, `/api/buckets/${B1}/list?prefix=a%00b`)).status).toBe(400);
  });
});

describe("object details and download", () => {
  it("head", async () => {
    const j = await (await get(app, cookie, `/api/buckets/${B1}/object?key=readme.txt`)).json();
    expect(j).toMatchObject({ key: "readme.txt", size: 5, contentType: "text/plain", metadata: { owner: "joe" } });
    expect(j.etag).toBeTruthy();
    expect(j.lastModified).toBeTruthy();
    expect(j.storageClass).toBeTruthy();
  });
  it("head 404 / bad key 400", async () => {
    expect((await get(app, cookie, `/api/buckets/${B1}/object?key=missing.txt`)).status).toBe(404);
    expect((await get(app, cookie, `/api/buckets/${B1}/object?key=a%0Ab`)).status).toBe(400);
    expect((await get(app, cookie, `/api/buckets/${B1}/object`)).status).toBe(400);
  });
  it("download returns 60s presigned URL with attachment disposition that works", async () => {
    const r = await get(app, cookie, `/api/buckets/${B1}/download?key=${encodeURIComponent("ünï cødé.txt")}`);
    expect(r.status).toBe(200);
    const { url } = await r.json();
    const u = new URL(url);
    expect(u.searchParams.get("X-Amz-Expires")).toBe("60");
    const cd = u.searchParams.get("response-content-disposition")!;
    expect(cd).toMatch(/^attachment; filename="[^"]*"; filename\*=UTF-8''%C3%BCn%C3%AF%20c%C3%B8d%C3%A9\.txt$/);
    const f = await fetch(url);
    expect(f.status).toBe(200);
    expect(await f.text()).toBe("u");
    expect(f.headers.get("content-disposition")).toMatch(/^attachment/);
  });
  it("download of missing key 404", async () => {
    expect((await get(app, cookie, `/api/buckets/${B1}/download?key=missing`)).status).toBe(404);
  });
});

describe("delete", () => {
  it("deletes a single object", async () => {
    await put(B2, "tmp/one.txt");
    const r = await del(app, cookie, `/api/buckets/${B2}/object?key=tmp%2Fone.txt`);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ deleted: 1 });
    expect((await get(app, cookie, `/api/buckets/${B2}/object?key=tmp%2Fone.txt`)).status).toBe(404);
  });
  it("prefix delete requires matching confirm", async () => {
    expect((await del(app, cookie, `/api/buckets/${B1}/prefix?prefix=docs%2F`)).status).toBe(400);
    expect((await del(app, cookie, `/api/buckets/${B1}/prefix?prefix=docs%2F&confirm=wrong`)).status).toBe(400);
    expect((await del(app, cookie, `/api/buckets/${B1}/prefix?prefix=docs`, { confirm: "docs" })).status).toBe(400);
    const j = await (await get(app, cookie, `/api/buckets/${B1}/list?prefix=docs%2F`)).json();
    expect(j.files.length).toBe(2);
  });
  it("prefix delete removes only that prefix (confirm via body)", async () => {
    const r = await del(app, cookie, `/api/buckets/${B1}/prefix?prefix=docs%2F`, { confirm: "docs/" });
    expect(await r.json()).toEqual({ deleted: 3 });
    const root = await (await get(app, cookie, `/api/buckets/${B1}/list`)).json();
    expect(root.folders.map((f: { prefix: string }) => f.prefix)).toEqual(["docs2/"]);
  });
  it("prefix delete handles >1000 objects in batches", async () => {
    const r = await del(app, cookie, `/api/buckets/${B3}/prefix?prefix=many%2F&confirm=${encodeURIComponent("many/")}`);
    expect(await r.json()).toEqual({ deleted: 1500 });
    const j = await (await get(app, cookie, `/api/buckets/${B3}/list`)).json();
    expect(j.files).toEqual([]);
    expect(j.folders).toEqual([]);
  }, 60_000);
  it("empty prefix needs 'DELETE ALL'", async () => {
    expect((await del(app, cookie, `/api/buckets/${B2}/prefix?prefix=&confirm=`)).status).toBe(400);
    expect((await del(app, cookie, `/api/buckets/${B2}/prefix?prefix=&confirm=delete%20all`)).status).toBe(400);
    expect((await get(app, cookie, `/api/buckets/${B2}/object?key=x.txt`)).status).toBe(200);
    const r = await del(app, cookie, `/api/buckets/${B2}/prefix?prefix=&confirm=DELETE%20ALL`);
    expect(await r.json()).toEqual({ deleted: 1 });
  });
  it("delete requires auth", async () => {
    expect((await app.request(`/api/buckets/${B1}/object?key=readme.txt`, { method: "DELETE", headers: H })).status).toBe(401);
  });
});

describe("read-only", () => {
  it("blocks deletes with 403 but allows reads", async () => {
    const a = createApp(mkEnv({ READ_ONLY: true }), { webDist: "/nonexistent" });
    const c = await login(a);
    expect(await (await a.request("/api/config")).json()).toEqual({ readOnly: true });
    expect((await del(a, c, `/api/buckets/${B1}/object?key=readme.txt`)).status).toBe(403);
    expect((await del(a, c, `/api/buckets/${B1}/prefix?prefix=docs2%2F&confirm=docs2%2F`)).status).toBe(403);
    expect((await get(a, c, `/api/buckets/${B1}/object?key=readme.txt`)).status).toBe(200);
    await admin.send(new HeadObjectCommand({ Bucket: B1, Key: "docs2/keep.txt" }));
  });
});
