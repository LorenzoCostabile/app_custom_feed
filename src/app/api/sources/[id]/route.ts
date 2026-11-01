import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { sources } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/auth/api";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  isFollowed: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  maxItemsPerEdition: z.number().int().min(0).max(50).optional(),
  weight: z.number().min(0).max(5).optional(),
  title: z.string().min(1).max(300).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const [updated] = await db
    .update(sources)
    .set(parsed.data)
    .where(and(eq(sources.id, params.id), eq(sources.userId, user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Fuente no encontrada." }, { status: 404 });
  }
  return NextResponse.json({ source: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const [deleted] = await db
    .delete(sources)
    .where(and(eq(sources.id, params.id), eq(sources.userId, user.id)))
    .returning({ id: sources.id });

  if (!deleted) {
    return NextResponse.json({ error: "Fuente no encontrada." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
