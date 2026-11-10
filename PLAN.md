# R2 Explorer — Plan & Agent Prompts

## 1. Decisions

| Topic | Decision | Why |
|---|---|---|
| Credentials | R2 **S3 API token** (Access Key ID + Secret) + Account ID, in `.env`. Optional `CLOUDFLARE_API_TOKEN` for bucket listing. | R2 object ops go through the S3-compatible endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. A normal Cloudflare API token does **not** work for object access. |
| Bucket listing | S3 `ListBuckets` first (works with account-level tokens). Fallback: Cloudflare REST `GET /accounts/{id}/r2/buckets` using `CLOUDFLARE_API_TOKEN`. Last fallback: `R2_BUCKETS=a,b,c`. | Bucket-scoped S3 tokens can't list buckets. |
| Secrets | Server-side only. Browser never sees R2 keys. | Safe by design. |
| App login | Single `APP_PASSWORD` + signed session cookie (`SESSION_SECRET`). | The app can delete data; don't expose it unauthenticated. |
| Safety | `READ_ONLY=true` env disables delete. Delete needs confirmation; folder delete requires typing the folder name. | Destructive ops. |
| Stack | Node 22 + TypeScript, **Hono** API, `@aws-sdk/client-s3` + `s3-request-presigner`, **React + Vite** UI, one container serving both. | Small, one process. |
| Design | **Material Design 3**, implemented as CSS tokens (Tailwind v4 `@theme`, blue ~#0b57d0, tonal surfaces, Roboto, pill buttons, state layers, light+dark). Not `@material/web` (it's in maintenance mode). | M3 is the right choice for this; token approach matches your raiotribe-web-v2 style. |
| Downloads | Server mints a short-lived (60s) presigned GET with `ResponseContentDisposition=attachment`; browser navigates to it. | No proxying large files through the container. |
| Folder delete | Paginated `ListObjectsV2(prefix)` → `DeleteObjects` batches of 1000, streaming progress. | R2 has no real folders. |

## 2. API surface (server)

- `POST /api/login`, `POST /api/logout`, `GET /api/session`
- `GET /api/buckets`
- `GET /api/buckets/:b/list?prefix=&token=` → `{folders[], files[], nextToken}` (delimiter `/`)
- `GET /api/buckets/:b/object?key=` → HeadObject details (size, type, ETag, last modified, storage class, custom metadata)
- `GET /api/buckets/:b/download?key=` → `{url}` presigned
- `DELETE /api/buckets/:b/object?key=`
- `DELETE /api/buckets/:b/prefix?prefix=` (confirm field required) → `{deleted}`
- `GET /api/config` → `{readOnly}`

## 3. `.env.example`

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
CLOUDFLARE_API_TOKEN=        # optional, for bucket listing fallback
R2_BUCKETS=                  # optional comma list / allowlist
APP_PASSWORD=
SESSION_SECRET=              # 32+ random chars
READ_ONLY=false
PORT=3000
```

## 4. Milestones

1. Scaffold, Dockerfile, compose, env validation (fail fast with clear errors).
2. Server: S3 client, buckets, list, head, presign, delete, auth, tests (against MinIO in compose for tests).
3. UI: M3 shell, login, bucket list, browser with breadcrumbs, details side panel, download, delete dialogs.
4. Hardening: path/key validation, rate limit login, security headers, read-only mode, error states.
5. Docker verification against your real account; you test the rebuilt container.

Workflow: feature branch → local preview URL provided before every commit/push → PR.

## 5. Agent prompts

### Agent 1 — Scaffold & container
```
Repo: /home/joe/Code/r2explorer. Create a Node 22 + TypeScript monorepo-lite: /server (Hono) and /web (React + Vite + TS). Root has .env.example (see plan), .gitignore (ignore .env), Dockerfile (multi-stage: build web, build server, slim runtime running as non-root, serves web/dist statically from Hono), docker-compose.yml (service `app` with env_file: .env, port ${PORT:-3000}, healthcheck on GET /healthz; plus a `minio` service under a `test` profile). Add zod env validation in server/src/env.ts that exits with a readable message listing missing vars. Never log secret values. Verify: `docker compose build` succeeds and /healthz returns 200 with a dummy .env. Work on branch feat/scaffold.
```

### Agent 2 — Server API
```
Implement the server API per PLAN.md section 2 in /home/joe/Code/r2explorer/server. Use @aws-sdk/client-s3 with endpoint https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com, region "auto", forcePathStyle true. Buckets: ListBuckets, falling back to the Cloudflare REST API if CLOUDFLARE_API_TOKEN is set, then R2_BUCKETS; if R2_BUCKETS is set it acts as an allowlist. List uses Delimiter "/" and pagination via ContinuationToken. Download returns a 60s presigned URL with ResponseContentDisposition attachment (RFC 5987-encoded filename). Prefix delete loops ListObjectsV2 + DeleteObjects (1000/batch), returns count, and requires body/query confirm matching the prefix. All delete routes return 403 when READ_ONLY=true. Auth: APP_PASSWORD compared with timingSafeEqual, HMAC-signed httpOnly SameSite=Strict cookie, login rate limit, CSRF protection for mutating routes (custom header check). Reject keys with control chars; bucket must be in the visible list. Return direct JSON (no redirects). Write vitest tests against the MinIO compose profile covering list/folders/pagination (>1000 objects)/head/delete/prefix delete/read-only/auth. Run them and report real output.
```

### Agent 3 — M3 design system + UI
```
Build the UI in /home/joe/Code/r2explorer/web (React + Vite + TS + Tailwind v4). Use the skill `material3-web-app-style` if available. Define M3 role tokens via @theme (primary #0b57d0, surface containers, on-* roles, outline, error), Roboto, light+dark following system with a toggle, pill buttons, state-layer hover/press, M3 top app bar, navigation drawer/rail listing buckets, list rows with icons, dialogs, snackbars, linear progress. Components: Button, IconButton, TextField, Dialog, Snackbar, Breadcrumbs, Skeleton, EmptyState. Responsive (drawer collapses to modal on mobile). Accessible (focus rings, aria labels, keyboard nav). No R2 logic yet — create a /design preview route showing every component in both themes. Provide the local dev URL and screenshots.
```

### Agent 4 — Explorer features
```
Wire the UI to the API in /home/joe/Code/r2explorer/web. Screens: Login; Buckets (cards with names); Browser (breadcrumbs tied to URL `/b/:bucket/*prefix`, folders first then files, name/size/modified columns, sort, filter-by-name, "load more" using nextToken); Details side sheet on file select (name, full key, size human-readable, content type, last modified, ETag, storage class, custom metadata, copy-key button); Download (fetch presigned URL then navigate); Delete file (confirm dialog); Delete folder (dialog showing the prefix and requiring the user to type the folder name; show progress/deleted count). Hide delete actions when /api/config says readOnly. Show meaningful names, never raw URLs; friendly error states for 401/403/network. Add Playwright tests against the MinIO profile. Run them, report results, and give the local preview URL.
```

### Agent 5 — Hardening & docs
```
Review /home/joe/Code/r2explorer for security: CSP and security headers, cookie flags, CSRF, key/prefix validation (no empty-prefix delete at bucket root without explicit confirm text "DELETE ALL"), error messages that don't leak secrets, container runs non-root with read-only FS where possible, `docker compose config` doesn't print secrets. Write README with: how to create an R2 API token (R2 → Manage R2 API Tokens → Object Read & Write or Admin Read & Write; copy Access Key ID, Secret, Account ID), .env setup, `docker compose up -d --build`, read-only mode, troubleshooting (403 on ListBuckets = bucket-scoped token → set R2_BUCKETS). Then build the container with a real .env and run a live smoke test: login, list buckets, browse, details, download, delete a test file. Report actual results.
```

## 6. Order
Agent 1 → (2 ∥ 3) → 4 → 5. Agents 2 and 3 are independent and can run in parallel.
