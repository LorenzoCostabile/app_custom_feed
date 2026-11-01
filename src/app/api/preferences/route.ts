import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { preferences } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/auth/api";
import { loadPreferences } from "@/lib/recommendation/engine";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  allowedFormats: z
    .array(z.enum(["video", "podcast", "article"]))
    .optional(),
  minDurationSeconds: z.number().int().nonnegative().nullable().optional(),
  maxDurationSeconds: z.number().int().nonnegative().nullable().optional(),
  editionSize: z.number().int().positive().max(50).optional(),
});

async function upsert(userId: string, key: string, value: unknown) {
  await db
    .insert(preferences)
    .values({ userId, key, value: value as never })
    .onConflictDoUpdate({
      target: [preferences.userId, preferences.key],
      set: { value: value as never, updatedAt: new Date() },
    });
}

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const prefs = await loadPreferences(user.id);
  return NextResponse.json({ preferences: prefs });
}

export async function PUT(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  if (parsed.data.allowedFormats) {
    await upsert(user.id, "allowed_formats", parsed.data.allowedFormats);
  }
  if (parsed.data.minDurationSeconds !== undefined) {
    await upsert(user.id, "min_duration_seconds", parsed.data.minDurationSeconds);
  }
  if (parsed.data.maxDurationSeconds !== undefined) {
    await upsert(user.id, "max_duration_seconds", parsed.data.maxDurationSeconds);
  }
  if (parsed.data.editionSize !== undefined) {
    await upsert(user.id, "edition_size", parsed.data.editionSize);
  }

  const prefs = await loadPreferences(user.id);
  return NextResponse.json({ preferences: prefs });
}
