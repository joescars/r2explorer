// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/;

export function validKey(key: unknown): key is string {
  return typeof key === "string" && key.length > 0 && Buffer.byteLength(key) <= 1024 && !CONTROL.test(key);
}

/** Prefix may be empty (bucket root); otherwise same rules as a key. */
export function validPrefix(prefix: unknown): prefix is string {
  return typeof prefix === "string" && (prefix === "" || validKey(prefix));
}

export function validBucketName(b: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9.\-_]{1,62}$/.test(b);
}

/** RFC 5987 / 6266 attachment disposition with ASCII fallback. */
export function attachmentDisposition(key: string): string {
  const name = key.split("/").pop() || "download";
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\%;]/g, "_");
  const enc = encodeURIComponent(name).replace(/['()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
  return `attachment; filename="${ascii}"; filename*=UTF-8''${enc}`;
}
