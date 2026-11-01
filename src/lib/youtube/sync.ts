import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  collectionItems,
  collections,
  sources,
  youtubeAccounts,
} from "@/db/schema";

import {
  fetchVideoDurations,
  getMyChannel,
  getMyPlaylists,
  getPlaylistItems,
  getSubscriptions,
  type YoutubePlaylistItem,
} from "./api";

export type SyncSummary = {
  subscriptions: number;
  playlists: number;
  collectionItems: number;
  watchLater: boolean;
  recommendations: number;
  errors: string[];
};

function channelFeedUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

function playlistItemToRow(item: YoutubePlaylistItem) {
  const videoId =
    item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId ?? "";
  return {
    videoId,
    title: item.snippet?.title ?? "",
    url: `https://www.youtube.com/watch?v=${videoId}`,
    channelTitle: item.snippet?.channelTitle ?? null,
    addedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : null,
  };
}

async function replaceCollectionItems(
  collectionId: string,
  rows: ReturnType<typeof playlistItemToRow>[],
  accessToken: string,
): Promise<number> {
  const clean = rows.filter((row) => row.videoId && row.title);
  const durations = await fetchVideoDurations(
    clean.map((row) => row.videoId),
    accessToken,
  );

  await db
    .delete(collectionItems)
    .where(eq(collectionItems.collectionId, collectionId));

  if (clean.length === 0) return 0;

  await db.insert(collectionItems).values(
    clean.map((row, index) => ({
      collectionId,
      videoId: row.videoId,
      title: row.title,
      url: row.url,
      channelTitle: row.channelTitle,
      durationSeconds: durations.get(row.videoId) ?? null,
      position: index,
      addedAt: row.addedAt,
    })),
  );

  return clean.length;
}

async function importPlaylist(
  userId: string,
  accessToken: string,
  playlistId: string,
  title: string,
  kind: "playlist" | "watch_later",
  knownItemCount: number | null,
): Promise<{ items: number; error: string | null }> {
  try {
    const rawItems = await getPlaylistItems(accessToken, playlistId);
    const rows = rawItems.map(playlistItemToRow);

    const [collection] = await db
      .insert(collections)
      .values({ userId, playlistId, title, kind, itemCount: rows.length })
      .onConflictDoUpdate({
        target: [collections.userId, collections.playlistId],
        set: { title, kind, syncedAt: new Date() },
      })
      .returning({ id: collections.id });

    const inserted = await replaceCollectionItems(collection.id, rows, accessToken);

    await db
      .update(collections)
      .set({ itemCount: inserted, syncedAt: new Date() })
      .where(eq(collections.id, collection.id));

    return { items: inserted, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void knownItemCount;
    return { items: 0, error: `${title}: ${message}` };
  }
}

export async function importYoutube(
  userId: string,
  accessToken: string,
): Promise<SyncSummary> {
  const summary: SyncSummary = {
    subscriptions: 0,
    playlists: 0,
    collectionItems: 0,
    watchLater: false,
    recommendations: 0,
    errors: [],
  };

  let hasChannel = false;
  try {
    const channel = await getMyChannel(accessToken);
    if (channel) {
      hasChannel = true;
      await db
        .update(youtubeAccounts)
        .set({
          channelId: channel.id,
          channelTitle: channel.snippet?.title ?? null,
        })
        .where(eq(youtubeAccounts.userId, userId));
    }
  } catch (error) {
    summary.errors.push(`Canal: ${message(error)}`);
  }

  if (!hasChannel) {
    summary.errors.push(
      "Google no devuelve un canal para esta cuenta (la API responde 404 channelNotFound). Si tu canal es una cuenta de marca (Brand Account), vuelve a conectar y elige el canal correcto en la pantalla de selección de Google; si tu cuenta de Google no tiene canal de YouTube, no hay nada que importar.",
    );
  }

  try {
    const subscriptions = await getSubscriptions(accessToken);
    for (const subscription of subscriptions) {
      const channelId = subscription.snippet?.resourceId?.channelId;
      const title = subscription.snippet?.title;
      if (!channelId || !title) continue;
      const feedUrl = channelFeedUrl(channelId);
      await db
        .insert(sources)
        .values({
          userId,
          kind: "youtube",
          title,
          feedUrl,
          siteUrl: `https://www.youtube.com/channel/${channelId}`,
          isFollowed: true,
          isActive: true,
        })
        .onConflictDoNothing({
          target: [sources.userId, sources.feedUrl],
        });
      summary.subscriptions += 1;
    }
  } catch (error) {
    summary.errors.push(`Suscripciones: ${message(error)}`);
  }

  if (hasChannel) {
    try {
      const playlists = await getMyPlaylists(accessToken);
      for (const playlist of playlists) {
        if (playlist.id === "WL" || playlist.id === "LL") continue;
        const title = playlist.snippet?.title;
        if (!title) continue;
        const result = await importPlaylist(
          userId,
          accessToken,
          playlist.id,
          title,
          "playlist",
          playlist.contentDetails?.itemCount ?? null,
        );
        if (result.error) summary.errors.push(result.error);
        else {
          summary.playlists += 1;
          summary.collectionItems += result.items;
        }
      }
    } catch (error) {
      summary.errors.push(`Playlists: ${message(error)}`);
    }
  }

  const watchLater = await importPlaylist(
    userId,
    accessToken,
    "WL",
    "Ver más tarde",
    "watch_later",
    null,
  );
  if (!watchLater.error) {
    summary.watchLater = true;
    summary.collectionItems += watchLater.items;
  }

  await db
    .update(youtubeAccounts)
    .set({ lastSyncedAt: new Date() })
    .where(eq(youtubeAccounts.userId, userId));

  return summary;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
