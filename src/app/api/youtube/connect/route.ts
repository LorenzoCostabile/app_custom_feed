import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { getApiUser, unauthorized } from "@/lib/auth/api";
import { sessionCookieOptions } from "@/lib/auth/session";
import { buildAuthUrl } from "@/lib/youtube/oauth";
import { isYoutubeConfigured } from "@/lib/youtube/config";
import { YT_STATE_COOKIE } from "@/lib/youtube/state";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  if (!isYoutubeConfigured()) {
    return NextResponse.json(
      { error: "YouTube no está configurado en el servidor." },
      { status: 400 },
    );
  }

  const state = randomBytes(16).toString("base64url");
  const response = NextResponse.redirect(buildAuthUrl(state));
  response.cookies.set(YT_STATE_COOKIE, state, {
    ...sessionCookieOptions(),
    maxAge: 600,
  });
  return response;
}
