import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { youtubeAccounts } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/auth/api";
import { normalizeYoutubeCookie } from "@/lib/youtube/cookie";
import { encryptSecret } from "@/lib/youtube/crypto";
import { validateCookie } from "@/lib/youtube/innertube";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  cookie: z.string().min(10).max(1_000_000),
});

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "No se recibió ninguna cookie. Pega la cabecera «cookie» o sube el archivo cookies.txt.",
      },
      { status: 400 },
    );
  }

  const normalized = normalizeYoutubeCookie(parsed.data.cookie);
  if (normalized.missing.length > 0 || !normalized.cookie) {
    return NextResponse.json(
      {
        error: `La cookie no contiene la sesión de YouTube. Falta: ${normalized.missing.join(", ")}.`,
        missing: normalized.missing,
      },
      { status: 400 },
    );
  }

  const check = await validateCookie(normalized.cookie);

  if (check.status === "invalid") {
    return NextResponse.json(
      { error: check.message ?? "La cookie ha caducado." },
      { status: 400 },
    );
  }
  if (check.status === "error") {
    return NextResponse.json(
      {
        error:
          check.message ??
          "No se pudo comprobar la cookie con YouTube. Inténtalo de nuevo.",
      },
      { status: 502 },
    );
  }

  const cookieEncrypted = encryptSecret(normalized.cookie);

  // La cuenta puede existir solo por la cookie: OAuth es opcional.
  await db
    .insert(youtubeAccounts)
    .values({ userId: user.id, cookieEncrypted })
    .onConflictDoUpdate({
      target: youtubeAccounts.userId,
      set: { cookieEncrypted },
    });

  return NextResponse.json({
    ok: true,
    status: check.status,
    videoCount: check.videoCount,
    cookieCount: normalized.names.length,
    warnings: [
      ...normalized.warnings,
      ...(check.status === "no_feed" && check.message ? [check.message] : []),
    ],
  });
}

export async function DELETE() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  await db.transaction(async (tx) => {
    const [account] = await tx
      .select({
        id: youtubeAccounts.id,
        refreshTokenEncrypted: youtubeAccounts.refreshTokenEncrypted,
      })
      .from(youtubeAccounts)
      .where(eq(youtubeAccounts.userId, user.id))
      .limit(1);

    if (!account) return;

    if (account.refreshTokenEncrypted) {
      await tx
        .update(youtubeAccounts)
        .set({ cookieEncrypted: null })
        .where(eq(youtubeAccounts.id, account.id));
    } else {
      // No queda nada que guardar: la fila solo existía por la cookie.
      await tx
        .delete(youtubeAccounts)
        .where(eq(youtubeAccounts.id, account.id));
    }
  });

  return NextResponse.json({ ok: true });
}
