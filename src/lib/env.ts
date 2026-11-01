import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  INGEST_USER_AGENT: z
    .string()
    .min(1)
    .default("Atencion/0.1 (personal feed reader)"),
  EDITION_SIZE: z.coerce.number().int().positive().default(10),
  CANDIDATE_WINDOW_DAYS: z.coerce.number().int().positive().default(14),
  REPEAT_COOLDOWN_DAYS: z.coerce.number().int().nonnegative().default(7),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_API_KEY: z.string().min(1).optional(),
  YOUTUBE_REDIRECT_URI: z.string().url().optional(),
  TOKEN_ENCRYPTION_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (!cached) {
    cached = schema.parse(process.env);
  }
  return cached;
}
