import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { youtubeAccounts } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/auth/api";
import { sessionCookieOptions } from "@/lib/auth/session";
import { encryptSecret } from "@/lib/youtube/crypto";
import { exchangeCode } from "@/lib/youtube/oauth";
import { YT_STATE_COOKIE } from "@/lib/youtube/state";
import { importYoutube } from "@/lib/youtube/sync";

export const dynamic = "force-dynamic";

function back(request: Request, params: string): NextResponse {
  return NextResponse.redirect(new URL(`/fuentes?${params}`, request.url));
}

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = cookies().get(YT_STATE_COOKIE)?.value;

  if (error) return back(request, "youtube=error");
  if (!code || !state || !cookieState || state !== cookieState) {
    return back(request, "youtube=state");
  }

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) {
      throw new Error(
        "Google no devolvió un refresh token. Revoca el acceso y vuelve a conectar.",
      );
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await db
      .insert(youtubeAccounts)
      .values({
        userId: user.id,
        refreshTokenEncrypted: encryptSecret(tokens.refresh_token),
        accessTokenEncrypted: encryptSecret(tokens.access_token),
        accessTokenExpiresAt: expiresAt,
        scopes: tokens.scope,
      })
      .onConflictDoUpdate({
        target: youtubeAccounts.userId,
        set: {
          refreshTokenEncrypted: encryptSecret(tokens.refresh_token),
          accessTokenEncrypted: encryptSecret(tokens.access_token),
          accessTokenExpiresAt: expiresAt,
          scopes: tokens.scope,
          connectedAt: new Date(),
        },
      });

    await importYoutube(user.id, tokens.access_token);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Error desconocido";
    return back(request, `youtube=error&msg=${encodeURIComponent(message)}`);
  }

  const response = back(request, "youtube=connected");
  response.cookies.set(YT_STATE_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
