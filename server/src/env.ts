import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0", ""])
  .default("false")
  .transform((v) => v === "true" || v === "1");

const schema = z.object({
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  CLOUDFLARE_API_TOKEN: z.string().optional().transform((v) => v || undefined),
  R2_BUCKETS: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [])),
  APP_PASSWORD: z.string().min(1),
  SESSION_SECRET: z.string().min(32, "must be at least 32 characters"),
  READ_ONLY: bool,
  // Optional S3 endpoint override (used for MinIO in tests). Defaults to the R2 endpoint.
  R2_ENDPOINT: z.string().url().optional().transform((v) => v || undefined),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const r = schema.safeParse(source);
  if (r.success) return r.data;
  // Report only variable names and rule messages, never values.
  const lines = r.error.issues.map((i) => {
    const name = String(i.path[0]);
    const missing = source[name] === undefined || source[name] === "";
    return `  - ${name}: ${missing ? "missing" : i.message}`;
  });
  console.error(`Invalid configuration. Fix these environment variables (see .env.example):\n${lines.join("\n")}`);
  process.exit(1);
}

export const env = loadEnv();
