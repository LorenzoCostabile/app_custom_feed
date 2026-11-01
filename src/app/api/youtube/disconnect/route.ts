import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { youtubeAccounts } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/auth/api";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  await db
    .delete(youtubeAccounts)
    .where(eq(youtubeAccounts.userId, user.id));

  return NextResponse.json({ ok: true });
}
