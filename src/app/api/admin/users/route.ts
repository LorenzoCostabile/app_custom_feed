import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { forbidden, getApiUser, unauthorized } from "@/lib/auth/api";
import { hashPassword } from "@/lib/auth/password";

export async function GET() {
  const admin = await getApiUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) return forbidden();

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isAdmin: users.isAdmin,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.createdAt));

  return NextResponse.json({ users: rows });
}

export async function POST(request: Request) {
  const admin = await getApiUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) return forbidden();

  const body = (await request.json().catch(() => null)) as
    | {
        email?: unknown;
        name?: unknown;
        password?: unknown;
        isAdmin?: unknown;
      }
    | null;

  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const isAdmin = body?.isAdmin === true;

  if (!email || !name || password.length < 8) {
    return NextResponse.json(
      { error: "Email, nombre y contraseña (mínimo 8 caracteres) son obligatorios." },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un usuario con ese email." },
      { status: 409 },
    );
  }

  const [created] = await db
    .insert(users)
    .values({
      email,
      name,
      isAdmin,
      passwordHash: await hashPassword(password),
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      isAdmin: users.isAdmin,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });

  return NextResponse.json({ user: created }, { status: 201 });
}
