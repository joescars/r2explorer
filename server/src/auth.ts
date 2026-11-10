import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "r2x_session";
export const SESSION_TTL_S = 12 * 60 * 60;

function sha(s: string) {
  return createHmac("sha256", "r2x-compare").update(s).digest();
}

/** Constant-time password comparison (hashes first so lengths match). */
export function passwordMatches(input: string, expected: string): boolean {
  return timingSafeEqual(sha(input), sha(expected));
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function makeSession(secret: string, now = Date.now()): string {
  const payload = String(Math.floor(now / 1000) + SESSION_TTL_S);
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySession(token: string | undefined, secret: string, now = Date.now()): boolean {
  if (!token) return false;
  const [payload, mac, extra] = token.split(".");
  if (!payload || !mac || extra !== undefined) return false;
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(payload, secret));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const exp = Number(payload);
  return Number.isFinite(exp) && exp > now / 1000;
}

/** Simple in-memory limiter: max `limit` failures per `windowMs` per key. */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private limit: number, private windowMs: number) {}
  private recent(key: string, now: number) {
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    this.hits.set(key, arr);
    return arr;
  }
  blocked(key: string, now = Date.now()) {
    return this.recent(key, now).length >= this.limit;
  }
  fail(key: string, now = Date.now()) {
    this.recent(key, now).push(now);
  }
  reset(key: string) {
    this.hits.delete(key);
  }
}
