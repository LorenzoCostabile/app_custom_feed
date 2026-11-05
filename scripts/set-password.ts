import "dotenv/config";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";

/**
 * Cambia la contraseña de un usuario existente y cierra sus sesiones.
 *
 *   ADMIN_EMAIL=yo@ejemplo.com ADMIN_PASSWORD='nueva' npm run db:set-password
 *
 * Pensado para el primer arranque en el NAS y para rotar la contraseña del
 * administrador sin tocar la base de datos a mano. No revela hashes ni
 * contraseñas.
 */
async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("[contraseña] Define ADMIN_EMAIL y ADMIN_PASSWORD.");
    process.exitCode = 1;
    return;
  }

  if (password.length < 8) {
    console.log("[contraseña] La contraseña debe tener al menos 8 caracteres.");
    process.exitCode = 1;
    return;
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    console.log(
      `[contraseña] No existe ningún usuario con ${email}. Créalo desde /admin/usuarios.`,
    );
    process.exitCode = 1;
    return;
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(users.id, user.id));

  const closed = await db
    .delete(sessions)
    .where(eq(sessions.userId, user.id))
    .returning({ id: sessions.id });

  console.log(
    `[contraseña] Actualizada para ${email}. Sesiones cerradas: ${closed.length}.`,
  );
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
