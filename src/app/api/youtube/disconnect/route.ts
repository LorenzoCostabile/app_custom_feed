import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { youtubeAccounts } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/auth/api";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  await db.transaction(async (tx) => {
    const [account] = await tx
      .select({
        id: youtubeAccounts.id,
        cookieEncrypted: youtubeAccounts.cookieEncrypted,
      })
      .from(youtubeAccounts)
      .where(eq(youtubeAccounts.userId, user.id))
      .limit(1);

    if (!account) return;

    if (account.cookieEncrypted) {
      // Desconectar Google no borra la cookie del feed: son cosas distintas.
      await tx
        .update(youtubeAccounts)
        .set({
          channelId: null,
          channelTitle: null,
          email: null,
          refreshTokenEncrypted: null,
          accessTokenEncrypted: null,
          accessTokenExpiresAt: null,
          scopes: null,
          lastSyncedAt: null,
        })
        .where(eq(youtubeAccounts.id, account.id));
    } else {
      await tx
        .delete(youtubeAccounts)
        .where(eq(youtubeAccounts.id, account.id));
    }
  });

  return NextResponse.json({ ok: true });
}
