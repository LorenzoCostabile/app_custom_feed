import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { youtubeAccounts } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/auth/api";
import {
  decryptYoutubeCookie,
  importRecommendations,
} from "@/lib/youtube/recommendations";
import { importYoutube } from "@/lib/youtube/sync";
import { getValidAccessToken } from "@/lib/youtube/tokens";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const [account] = await db
    .select()
    .from(youtubeAccounts)
    .where(eq(youtubeAccounts.userId, user.id))
    .limit(1);

  if (!account) {
    return NextResponse.json(
      { error: "Conecta tu cuenta de YouTube primero." },
      { status: 400 },
    );
  }

  try {
    const accessToken = await getValidAccessToken(account);
    const summary = await importYoutube(user.id, accessToken);

    if (account.cookieEncrypted) {
      try {
        const cookie = decryptYoutubeCookie(account.cookieEncrypted);
        const reco = await importRecommendations(user.id, cookie);
        summary.recommendations = reco.imported;
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Error desconocido";
        summary.errors.push(`Recomendaciones: ${message}`);
      }
    }

    return NextResponse.json({ summary });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
