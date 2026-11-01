import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { items, savedItems } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/auth/api";

export const dynamic = "force-dynamic";

const itemSchema = z.object({ itemId: z.string().uuid() });

const patchSchema = z.object({
  itemId: z.string().uuid(),
  status: z.enum(["saved", "consumed"]),
});

async function ownsItem(userId: string, itemId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, userId)))
    .limit(1);
  return Boolean(row);
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const parsed = itemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "itemId inválido." }, { status: 400 });
  }

  if (!(await ownsItem(user.id, parsed.data.itemId))) {
    return NextResponse.json({ error: "Contenido no encontrado." }, { status: 404 });
  }

  const [row] = await db
    .insert(savedItems)
    .values({ userId: user.id, itemId: parsed.data.itemId, status: "saved" })
    .onConflictDoUpdate({
      target: savedItems.itemId,
      set: { status: "saved", savedAt: new Date() },
    })
    .returning();

  return NextResponse.json({ saved: row }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const [row] = await db
    .update(savedItems)
    .set({
      status: parsed.data.status,
      consumedAt: parsed.data.status === "consumed" ? new Date() : null,
    })
    .where(
      and(
        eq(savedItems.itemId, parsed.data.itemId),
        eq(savedItems.userId, user.id),
      ),
    )
    .returning();

  if (!row) {
    return NextResponse.json({ error: "No está guardado." }, { status: 404 });
  }
  return NextResponse.json({ saved: row });
}

export async function DELETE(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const parsed = itemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "itemId inválido." }, { status: 400 });
  }

  await db
    .update(savedItems)
    .set({ status: "removed" })
    .where(
      and(
        eq(savedItems.itemId, parsed.data.itemId),
        eq(savedItems.userId, user.id),
      ),
    );

  return NextResponse.json({ ok: true });
}
