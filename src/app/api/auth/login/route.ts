import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: unknown; password?: unknown }
    | null;

  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Introduce email y contraseña." },
      { status: 400 },
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const valid =
    user && user.isActive
      ? await verifyPassword(password, user.passwordHash)
      : false;

  if (!user || !valid) {
    return NextResponse.json(
      { error: "Credenciales incorrectas." },
      { status: 401 },
    );
  }

  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, isAdmin: user.isAdmin },
  });

  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));

  return response;
}
