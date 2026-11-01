import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { feedback, items } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/auth/api";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  itemId: z.string().uuid(),
  kind: z.enum(["more_topic", "less_source", "not_useful"]),
  topicId: z.string().uuid().optional(),
  sourceId: z.string().uuid().optional(),
  confirm: z.boolean().optional(),
});

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const [owned] = await db
    .select({ id: items.id })
    .from(items)
    .where(
      and(eq(items.id, parsed.data.itemId), eq(items.userId, user.id)),
    )
    .limit(1);

  if (!owned) {
    return NextResponse.json({ error: "Contenido no encontrado." }, { status: 404 });
  }

  const [created] = await db
    .insert(feedback)
    .values({
      userId: user.id,
      itemId: parsed.data.itemId,
      kind: parsed.data.kind,
      topicId: parsed.data.topicId ?? null,
      sourceId: parsed.data.sourceId ?? null,
      confirmed: parsed.data.confirm ?? false,
    })
    .returning();

  return NextResponse.json({ feedback: created }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const parsed = z
    .object({ id: z.string().uuid() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const [updated] = await db
    .update(feedback)
    .set({ confirmed: true })
    .where(
      and(
        eq(feedback.id, parsed.data.id),
        eq(feedback.userId, user.id),
        eq(feedback.confirmed, false),
      ),
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Valoración no encontrada." }, { status: 404 });
  }
  return NextResponse.json({ feedback: updated });
}
