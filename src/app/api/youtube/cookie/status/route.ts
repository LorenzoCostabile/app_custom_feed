import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { youtubeAccounts } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/auth/api";
import { decryptYoutubeCookie } from "@/lib/youtube/recommendations";
import { validateCookie } from "@/lib/youtube/innertube";

export const dynamic = "force-dynamic";

/**
 * Estado real de la cookie guardada. Hace una comprobación en vivo contra
 * YouTube, así que solo se llama desde acciones explícitas (el asistente o el
 * botón «Comprobar cookie»), no desde cada carga de página.
 */
export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const [account] = await db
    .select({ cookieEncrypted: youtubeAccounts.cookieEncrypted })
    .from(youtubeAccounts)
    .where(eq(youtubeAccounts.userId, user.id))
    .limit(1);

  if (!account) {
    return NextResponse.json({
      hasCookie: false,
      status: "no_account",
      message: "Conecta tu cuenta de YouTube primero.",
      checkedAt: new Date().toISOString(),
    });
  }

  if (!account.cookieEncrypted) {
    return NextResponse.json({
      hasCookie: false,
      status: "missing",
      message: "No hay ninguna cookie guardada.",
      checkedAt: new Date().toISOString(),
    });
  }

  let cookie: string;
  try {
    cookie = decryptYoutubeCookie(account.cookieEncrypted);
  } catch {
    return NextResponse.json({
      hasCookie: true,
      status: "error",
      message:
        "La cookie guardada no se pudo descifrar. Vuelve a guardarla desde el asistente.",
      checkedAt: new Date().toISOString(),
    });
  }

  const check = await validateCookie(cookie);

  return NextResponse.json(
    {
      hasCookie: true,
      status: check.status,
      message: check.message,
      videoCount: check.videoCount,
      checkedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
