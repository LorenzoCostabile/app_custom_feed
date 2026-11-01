import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { youtubeAccounts } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/auth/api";
import {
  decryptYoutubeCookie,
  importRecommendations,
} from "@/lib/youtube/recommendations";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const [account] = await db
    .select({ cookieEncrypted: youtubeAccounts.cookieEncrypted })
    .from(youtubeAccounts)
    .where(eq(youtubeAccounts.userId, user.id))
    .limit(1);

  if (!account?.cookieEncrypted) {
    return NextResponse.json(
      { error: "Guarda primero tu cookie de YouTube." },
      { status: 400 },
    );
  }

  try {
    const cookie = decryptYoutubeCookie(account.cookieEncrypted);
    const summary = await importRecommendations(user.id, cookie);
    return NextResponse.json({ summary });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
