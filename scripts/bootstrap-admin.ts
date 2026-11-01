import "dotenv/config";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Administrador";

  if (!email || !password) {
    console.log(
      "[bootstrap] ADMIN_EMAIL y ADMIN_PASSWORD no están definidos; se omite.",
    );
    return;
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    console.log(`[bootstrap] El usuario ${email} ya existe.`);
    return;
  }

  await db.insert(users).values({
    email,
    name,
    isAdmin: true,
    passwordHash: await hashPassword(password),
  });

  console.log(`[bootstrap] Administrador ${email} creado.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
