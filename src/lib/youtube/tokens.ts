import { eq } from "drizzle-orm";

import { db } from "@/db";
import { youtubeAccounts, type YoutubeAccount } from "@/db/schema";

import { decryptSecret, encryptSecret } from "./crypto";
import { refreshAccessToken } from "./oauth";

export async function getValidAccessToken(
  account: YoutubeAccount,
): Promise<string> {
  const now = Date.now();
  const stillValid =
    account.accessTokenEncrypted &&
    account.accessTokenExpiresAt &&
    account.accessTokenExpiresAt.getTime() > now + 60_000;

  if (stillValid) {
    return decryptSecret(account.accessTokenEncrypted as string);
  }

  const tokens = await refreshAccessToken(
    decryptSecret(account.refreshTokenEncrypted),
  );

  await db
    .update(youtubeAccounts)
    .set({
      accessTokenEncrypted: encryptSecret(tokens.access_token),
      accessTokenExpiresAt: new Date(now + tokens.expires_in * 1000),
    })
    .where(eq(youtubeAccounts.id, account.id));

  return tokens.access_token;
}
