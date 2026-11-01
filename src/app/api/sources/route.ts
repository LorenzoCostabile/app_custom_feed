import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { sources } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/auth/api";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  kind: z.enum(["youtube", "podcast", "news"]),
  title: z.string().min(1).max(300),
  feedUrl: z.string().url(),
  siteUrl: z.string().url().optional(),
  isFollowed: z.boolean().optional(),
});

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const rows = await db
    .select()
    .from(sources)
    .where(eq(sources.userId, user.id));
  return NextResponse.json({ sources: rows });
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos de fuente inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const [created] = await db
      .insert(sources)
      .values({
        userId: user.id,
        kind: parsed.data.kind,
        title: parsed.data.title,
        feedUrl: parsed.data.feedUrl,
        siteUrl: parsed.data.siteUrl ?? null,
        isFollowed: parsed.data.isFollowed ?? true,
      })
      .returning();
    return NextResponse.json({ source: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "No se pudo crear la fuente (¿ya existe?)." },
      { status: 409 },
    );
  }
}
