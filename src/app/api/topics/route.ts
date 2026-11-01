import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { topics } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/auth/api";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  keywords: z.array(z.string().min(1).max(80)).min(1),
  isIncluded: z.boolean().optional(),
});

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const rows = await db
    .select()
    .from(topics)
    .where(eq(topics.userId, user.id));
  return NextResponse.json({ topics: rows });
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos de tema inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const [created] = await db
      .insert(topics)
      .values({
        userId: user.id,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        keywords: parsed.data.keywords,
        isIncluded: parsed.data.isIncluded ?? true,
      })
      .returning();
    return NextResponse.json({ topic: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "No se pudo crear el tema (¿ya existe?)." },
      { status: 409 },
    );
  }
}
