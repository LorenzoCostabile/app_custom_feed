import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { destroySession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

export async function POST() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  await destroySession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    expires: undefined,
    maxAge: 0,
  });
  return response;
}
