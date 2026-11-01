import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { items, sources } from "@/db/schema";
import { contentHash } from "@/lib/ingestion/normalize";

import { decryptSecret } from "./crypto";
import { fetchRecommendations } from "./innertube";

export const RECOMMENDATIONS_FEED = "youtube://recommendations";

export type RecommendationsSummary = {
  found: number;
  imported: number;
};

export function isRecommendationsFeed(feedUrl: string): boolean {
  return feedUrl === RECOMMENDATIONS_FEED;
}

async function ensureRecommendationSource(userId: string): Promise<string> {
  const [existing] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(
      and(
        eq(sources.userId, userId),
        eq(sources.feedUrl, RECOMMENDATIONS_FEED),
      ),
    )
    .limit(1);

  if (existing) return existing.id;

  const [created] = await db
    .insert(sources)
    .values({
      userId,
      kind: "youtube",
      title: "Recomendaciones de YouTube",
      feedUrl: RECOMMENDATIONS_FEED,
      siteUrl: "https://www.youtube.com/",
      isFollowed: false,
      isActive: true,
    })
    .returning({ id: sources.id });

  return created.id;
}

export async function importRecommendations(
  userId: string,
  cookie: string,
): Promise<RecommendationsSummary> {
  const videos = await fetchRecommendations(cookie, 40);
  if (videos.length === 0) {
    return { found: 0, imported: 0 };
  }

  const sourceId = await ensureRecommendationSource(userId);
  const now = new Date();

  const inserted = await db
    .insert(items)
    .values(
      videos.map((video) => {
        const canonicalUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
        return {
          userId,
          sourceId,
          externalId: video.videoId,
          title: video.title,
          url: canonicalUrl,
          canonicalUrl,
          summary: video.channelTitle
            ? `${video.channelTitle}${video.viewCountText ? ` · ${video.viewCountText}` : ""}`
            : video.viewCountText,
          author: video.channelTitle,
          format: "video" as const,
          durationSeconds: video.durationSeconds,
          publishedAt: now,
          contentHash: contentHash(video.title, canonicalUrl),
        };
      }),
    )
    .onConflictDoNothing()
    .returning({ id: items.id });

  await db
    .update(sources)
    .set({ lastFetchedAt: now, lastStatus: "ok", lastError: null })
    .where(eq(sources.id, sourceId));

  return { found: videos.length, imported: inserted.length };
}

export function decryptYoutubeCookie(cookieEncrypted: string): string {
  return decryptSecret(cookieEncrypted);
}
