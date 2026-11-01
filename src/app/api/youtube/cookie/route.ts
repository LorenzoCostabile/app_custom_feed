import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { youtubeAccounts } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/auth/api";
import { encryptSecret } from "@/lib/youtube/crypto";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  cookie: z.string().min(20).max(8000),
});

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "La cookie no parece válida." },
      { status: 400 },
    );
  }

  const [account] = await db
    .select({ id: youtubeAccounts.id })
    .from(youtubeAccounts)
    .where(eq(youtubeAccounts.userId, user.id))
    .limit(1);

  if (!account) {
    return NextResponse.json(
      { error: "Conecta tu cuenta de YouTube primero." },
      { status: 400 },
    );
  }

  await db
    .update(youtubeAccounts)
    .set({ cookieEncrypted: encryptSecret(parsed.data.cookie) })
    .where(eq(youtubeAccounts.id, account.id));

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  await db
    .update(youtubeAccounts)
    .set({ cookieEncrypted: null })
    .where(eq(youtubeAccounts.userId, user.id));

  return NextResponse.json({ ok: true });
}
