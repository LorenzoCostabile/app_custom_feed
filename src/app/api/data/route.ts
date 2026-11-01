import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  dailyEditions,
  editionItems,
  feedback,
  ingestionRuns,
  itemTopics,
  items,
  preferences,
  savedItems,
  sources,
  topics,
} from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/auth/api";

export const dynamic = "force-dynamic";

export async function DELETE() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const editionIds = db
    .select({ id: dailyEditions.id })
    .from(dailyEditions)
    .where(eq(dailyEditions.userId, user.id));
  const itemIds = db
    .select({ id: items.id })
    .from(items)
    .where(eq(items.userId, user.id));

  await db.transaction(async (tx) => {
    await tx.delete(editionItems).where(inArray(editionItems.editionId, editionIds));
    await tx.delete(dailyEditions).where(eq(dailyEditions.userId, user.id));
    await tx.delete(savedItems).where(eq(savedItems.userId, user.id));
    await tx.delete(feedback).where(eq(feedback.userId, user.id));
    await tx.delete(ingestionRuns).where(eq(ingestionRuns.userId, user.id));
    await tx.delete(itemTopics).where(inArray(itemTopics.itemId, itemIds));
    await tx.delete(items).where(eq(items.userId, user.id));
    await tx.delete(sources).where(eq(sources.userId, user.id));
    await tx.delete(topics).where(eq(topics.userId, user.id));
    await tx.delete(preferences).where(eq(preferences.userId, user.id));
  });

  return NextResponse.json({ ok: true });
}
