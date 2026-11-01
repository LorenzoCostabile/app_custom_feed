import { and, eq, inArray, isNull, ne } from "drizzle-orm";

import { db } from "@/db";
import {
  ingestionRuns,
  itemTopics,
  items,
  sources,
  topics,
  youtubeAccounts,
} from "@/db/schema";
import { classifyText } from "@/lib/classify";
import { fetchVideoDurations } from "@/lib/youtube/api";
import { googleApiKey } from "@/lib/youtube/config";
import { RECOMMENDATIONS_FEED } from "@/lib/youtube/recommendations";
import { getValidAccessToken } from "@/lib/youtube/tokens";

import { youtubeVideoId } from "./normalize";
import { formatForSource, parseFeed } from "./rss";

export type SourceIngestionResult = {
  sourceId: string;
  sourceTitle: string;
  status: "ok" | "error";
  itemsFound: number;
  itemsNew: number;
  error?: string;
};

const DEFAULT_USER_AGENT = "Atencion/0.1 (personal feed reader)";

async function classifyNewItems(
  userId: string,
  itemIds: string[],
): Promise<void> {
  if (itemIds.length === 0) return;

  const topicRows = await db
    .select({ id: topics.id, keywords: topics.keywords })
    .from(topics)
    .where(and(eq(topics.isIncluded, true), eq(topics.userId, userId)));

  if (topicRows.length === 0) return;

  const inserted = await db
    .select({
      id: items.id,
      title: items.title,
      summary: items.summary,
    })
    .from(items)
    .where(inArray(items.id, itemIds));

  const links: { itemId: string; topicId: string; score: number }[] = [];
  for (const item of inserted) {
    const text = [item.title, item.summary ?? ""].join(" ");
    for (const match of classifyText(text, topicRows)) {
      links.push({ itemId: item.id, topicId: match.topicId, score: match.score });
    }
  }

  if (links.length > 0) {
    await db.insert(itemTopics).values(links).onConflictDoNothing();
  }
}

async function resolveYoutubeAuth(userId: string): Promise<string | null> {
  if (googleApiKey()) return null;
  try {
    const [account] = await db
      .select()
      .from(youtubeAccounts)
      .where(eq(youtubeAccounts.userId, userId))
      .limit(1);
    if (!account) return null;
    return await getValidAccessToken(account);
  } catch {
    return null;
  }
}

async function enrichYoutubeDurations(
  userId: string,
  itemIds: string[],
): Promise<void> {
  if (itemIds.length === 0) return;

  const rows = await db
    .select({ id: items.id, canonicalUrl: items.canonicalUrl })
    .from(items)
    .where(
      and(inArray(items.id, itemIds), isNull(items.durationSeconds)),
    );

  const byVideo = new Map<string, string[]>();
  for (const row of rows) {
    const videoId = youtubeVideoId(row.canonicalUrl ?? "");
    if (!videoId) continue;
    const ids = byVideo.get(videoId) ?? [];
    ids.push(row.id);
    byVideo.set(videoId, ids);
  }

  if (byVideo.size === 0) return;

  const accessToken = await resolveYoutubeAuth(userId);
  const durations = await fetchVideoDurations(
    [...byVideo.keys()],
    accessToken,
  );
  for (const [videoId, ids] of byVideo) {
    const seconds = durations.get(videoId);
    if (seconds == null) continue;
    await db
      .update(items)
      .set({ durationSeconds: seconds })
      .where(inArray(items.id, ids));
  }
}

export async function ingestSource(
  sourceId: string,
  userAgent: string = process.env.INGEST_USER_AGENT ?? DEFAULT_USER_AGENT,
): Promise<SourceIngestionResult> {
  const [source] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, sourceId));

  if (!source) {
    throw new Error(`Fuente ${sourceId} no encontrada.`);
  }

  const [run] = await db
    .insert(ingestionRuns)
    .values({ userId: source.userId, sourceId: source.id })
    .returning({ id: ingestionRuns.id });

  try {
    const feed = await parseFeed(source.feedUrl, source.kind, userAgent);
    const format = formatForSource(source.kind);

    let itemsNew = 0;
    const newItemIds: string[] = [];

    if (feed.items.length > 0) {
      const inserted = await db
        .insert(items)
        .values(
          feed.items.map((item) => ({
            userId: source.userId,
            sourceId: source.id,
            externalId: item.externalId,
            title: item.title,
            url: item.url,
            canonicalUrl: item.canonicalUrl,
            summary: item.summary,
            author: item.author,
            format,
            durationSeconds: item.durationSeconds,
            publishedAt: item.publishedAt,
            contentHash: item.contentHash,
          })),
        )
        .onConflictDoNothing()
        .returning({ id: items.id });

      itemsNew = inserted.length;
      for (const row of inserted) newItemIds.push(row.id);
      await classifyNewItems(source.userId, newItemIds);
      if (source.kind === "youtube") {
        await enrichYoutubeDurations(source.userId, newItemIds);
      }
    }

    await db
      .update(sources)
      .set({
        lastFetchedAt: new Date(),
        lastStatus: "ok",
        lastError: null,
        title: source.title || feed.title || source.title,
      })
      .where(eq(sources.id, source.id));

    await db
      .update(ingestionRuns)
      .set({
        finishedAt: new Date(),
        status: "ok",
        itemsFound: feed.items.length,
        itemsNew,
      })
      .where(eq(ingestionRuns.id, run.id));

    return {
      sourceId: source.id,
      sourceTitle: source.title,
      status: "ok",
      itemsFound: feed.items.length,
      itemsNew,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await db
      .update(sources)
      .set({ lastFetchedAt: new Date(), lastStatus: "error", lastError: message })
      .where(eq(sources.id, source.id));

    await db
      .update(ingestionRuns)
      .set({ finishedAt: new Date(), status: "error", error: message })
      .where(eq(ingestionRuns.id, run.id));

    return {
      sourceId: source.id,
      sourceTitle: source.title,
      status: "error",
      itemsFound: 0,
      itemsNew: 0,
      error: message,
    };
  }
}

export async function ingestAllSources(options?: {
  userId?: string;
  userAgent?: string;
}): Promise<SourceIngestionResult[]> {
  const activeSources = await db
    .select({ id: sources.id })
    .from(sources)
    .where(
      options?.userId
        ? and(
            eq(sources.isActive, true),
            eq(sources.userId, options.userId),
            ne(sources.feedUrl, RECOMMENDATIONS_FEED),
          )
        : and(
            eq(sources.isActive, true),
            ne(sources.feedUrl, RECOMMENDATIONS_FEED),
          ),
    );

  const results: SourceIngestionResult[] = [];
  for (const source of activeSources) {
    results.push(await ingestSource(source.id, options?.userAgent));
  }
  return results;
}
