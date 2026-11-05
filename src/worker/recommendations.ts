import "dotenv/config";

import { and, eq, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { sources, youtubeAccounts } from "@/db/schema";
import {
  decryptYoutubeCookie,
  importRecommendations,
  RECOMMENDATIONS_FEED,
} from "@/lib/youtube/recommendations";

/**
 * Refresca el feed de recomendaciones de cada cuenta con cookie guardada.
 *
 * Va aparte de `npm run ingest` a propósito: el feed centinela
 * `youtube://recommendations` no es un RSS y se ingiere con la sesión de
 * YouTube. Si falla, se registra el motivo en `sources.last_error` y el hueco
 * se queda vacío: no se sustituye por otras fuentes.
 */
async function main(): Promise<void> {
  const accounts = await db
    .select({
      userId: youtubeAccounts.userId,
      channelTitle: youtubeAccounts.channelTitle,
      cookieEncrypted: youtubeAccounts.cookieEncrypted,
    })
    .from(youtubeAccounts)
    .where(isNotNull(youtubeAccounts.cookieEncrypted));

  if (accounts.length === 0) {
    console.log("[recomendaciones] No hay ninguna cuenta con cookie guardada.");
    return;
  }

  let failures = 0;

  for (const account of accounts) {
    if (!account.cookieEncrypted) continue;
    const label = account.channelTitle || account.userId;

    try {
      const cookie = decryptYoutubeCookie(account.cookieEncrypted);
      const summary = await importRecommendations(account.userId, cookie);
      console.log(
        `[recomendaciones] ${label}: ${summary.imported} nuevos de ${summary.found}.`,
      );
    } catch (cause) {
      failures += 1;
      const message =
        cause instanceof Error ? cause.message : "Error desconocido";

      await db
        .update(sources)
        .set({ lastStatus: "error", lastError: message.slice(0, 500) })
        .where(
          and(
            eq(sources.userId, account.userId),
            eq(sources.feedUrl, RECOMMENDATIONS_FEED),
          ),
        );

      console.error(`[recomendaciones] ${label}: ${message}`);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
