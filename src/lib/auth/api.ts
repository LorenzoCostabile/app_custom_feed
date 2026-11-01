import { NextResponse } from "next/server";

import type { User } from "@/db/schema";

import { getCurrentUser } from "./current-user";

export function unauthorized() {
  return NextResponse.json({ error: "No autenticado." }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "No autorizado." }, { status: 403 });
}

export async function getApiUser(): Promise<User | null> {
  return getCurrentUser();
}
