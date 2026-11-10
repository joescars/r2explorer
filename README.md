# R2 Explorer

Web-based Cloudflare R2 explorer: list buckets, browse folders, view file details, download, and delete files/folders. Runs as a single container; all secrets live in `.env` and never reach the browser.

## 1. Get your R2 credentials

1. **Account ID** — Cloudflare dashboard → **R2 Object Storage** → the Account ID is shown on the right side of the overview page (also in the dashboard URL).
2. **S3 API token** — R2 overview → **Manage API tokens** (Account Details panel) → **Create Account API token**:
   - Permission: **Admin Read & Write** (lets the app list all buckets and delete). Use **Admin Read only** for a view/download-only setup.
   - *Object Read & Write* tokens also work, but can be limited to specific buckets and then **cannot list buckets** (see `R2_BUCKETS` below).
   - Create it, then copy the **Access Key ID** and **Secret Access Key**. The secret is shown only once.
3. A normal Cloudflare API token (Bearer token) does **not** work for object access. It is only used optionally for listing buckets.

## 2. Configure `.env`

```
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `R2_ACCOUNT_ID` | yes | Your Cloudflare account ID. |
| `R2_ACCESS_KEY_ID` | yes | S3 API token Access Key ID. |
| `R2_SECRET_ACCESS_KEY` | yes | S3 API token Secret Access Key. |
| `APP_PASSWORD` | yes | Password to log into this app (it can delete data). |
| `SESSION_SECRET` | yes | 32+ random characters, e.g. `openssl rand -hex 32`. |
| `CLOUDFLARE_API_TOKEN` | no | Cloudflare API token with *Workers R2 Storage: Read*; used to list buckets when the S3 token can't. |
| `R2_BUCKETS` | no | Comma-separated bucket names. Acts as an allowlist, and as the bucket list if the token can't list buckets. |
| `READ_ONLY` | no | `true` disables all deletes. Default `false`. |
| `PORT` | no | Port to serve on. Default `3000`. |
| `R2_ENDPOINT` | no | Override the S3 endpoint (testing with MinIO). Default `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`. |

## 3. Run

```
docker compose up -d --build
```

Open http://localhost:3000 and log in with `APP_PASSWORD`. Rebuild after changes with the same command.

## Usage notes

- R2 has no real folders; they are key prefixes split on `/`.
- Folder delete removes every object under the prefix and requires typing the folder name to confirm.
- Downloads use a 60-second presigned URL.
- Behind a reverse proxy, use HTTPS and pass `X-Forwarded-For` / `X-Forwarded-Proto` (login rate limiting and the `Secure` cookie flag depend on them).

## Troubleshooting

- **Empty bucket list / 403 on listing:** the token is bucket-scoped. Set `R2_BUCKETS=a,b,c` or provide `CLOUDFLARE_API_TOKEN`.
- **403 on a bucket's objects:** the token lacks access to that bucket.
- **Startup exits listing missing variables:** fix `.env` per the table above.
- **Login always fails after repeated attempts:** login is rate limited (5 failures / 15 min); wait or restart the container.

## Development

- `server/`: Hono API (`npm test` runs vitest against MinIO; set `TEST_S3_ENDPOINT`).
- `web/`: React + Vite UI (`VITE_MOCK=true npm run dev` runs it against a mock API).
