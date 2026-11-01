import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  feedback,
  items,
  preferences,
  savedItems,
  sources,
  topics,
} from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/auth/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const [sourceRows, topicRows, preferenceRows, savedRows, feedbackRows] =
    await Promise.all([
      db.select().from(sources).where(eq(sources.userId, user.id)),
      db.select().from(topics).where(eq(topics.userId, user.id)),
      db.select().from(preferences).where(eq(preferences.userId, user.id)),
      db
        .select({
          status: savedItems.status,
          note: savedItems.note,
          savedAt: savedItems.savedAt,
          consumedAt: savedItems.consumedAt,
          itemTitle: items.title,
          itemUrl: items.url,
        })
        .from(savedItems)
        .innerJoin(items, eq(items.id, savedItems.itemId))
        .where(eq(savedItems.userId, user.id)),
      db.select().from(feedback).where(eq(feedback.userId, user.id)),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    sources: sourceRows,
    topics: topicRows,
    preferences: preferenceRows,
    savedItems: savedRows,
    feedback: feedbackRows,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="atencion-export.json"',
    },
  });
}
