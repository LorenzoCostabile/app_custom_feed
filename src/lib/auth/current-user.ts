import { cookies } from "next/headers";

import type { User } from "@/db/schema";

import { SESSION_COOKIE } from "./constants";
import { resolveSession } from "./session";

export async function getCurrentUser(): Promise<User | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return resolveSession(token);
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("No autenticado");
    this.name = "UnauthorizedError";
  }
}
