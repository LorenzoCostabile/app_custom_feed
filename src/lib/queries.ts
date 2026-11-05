import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import {
  collectionItems,
  collections,
  dailyEditions,
  editionItems,
  ingestionRuns,
  items,
  savedItems,
  sources,
  topics,
  youtubeAccounts,
} from "@/db/schema";

export type EditionView = {
  id: string;
  editionDate: string;
  algorithmVersion: string;
  items: EditionItemView[];
};

export type EditionItemView = {
  itemId: string;
  title: string;
  url: string;
  format: string;
  durationSeconds: number | null;
  reason: string;
  origin: string;
  position: number;
  sourceTitle: string;
  sourceKind: string;
  publishedAt: Date;
};

export async function getLatestEdition(
  userId: string,
): Promise<EditionView | null> {
  const [edition] = await db
    .select()
    .from(dailyEditions)
    .where(eq(dailyEditions.userId, userId))
    .orderBy(desc(dailyEditions.editionDate), desc(dailyEditions.createdAt))
    .limit(1);

  if (!edition) return null;
  return buildEditionView(edition);
}

async function buildEditionView(edition: {
  id: string;
  editionDate: string;
  algorithmVersion: string;
}): Promise<EditionView> {
  const rows = await db
    .select({
      itemId: editionItems.itemId,
      title: items.title,
      url: items.url,
      format: items.format,
      durationSeconds: items.durationSeconds,
      reason: editionItems.reason,
      origin: editionItems.origin,
      position: editionItems.position,
      sourceTitle: sources.title,
      sourceKind: sources.kind,
      publishedAt: items.publishedAt,
    })
    .from(editionItems)
    .innerJoin(items, eq(items.id, editionItems.itemId))
    .innerJoin(sources, eq(sources.id, items.sourceId))
    .where(eq(editionItems.editionId, edition.id))
    .orderBy(editionItems.position);

  return {
    id: edition.id,
    editionDate: edition.editionDate,
    algorithmVersion: edition.algorithmVersion,
    items: rows,
  };
}

export type EditionSummary = {
  id: string;
  editionDate: string;
  algorithmVersion: string;
  size: number;
  createdAt: Date;
};

export async function listEditions(
  userId: string,
  limit = 30,
): Promise<EditionSummary[]> {
  return db
    .select({
      id: dailyEditions.id,
      editionDate: dailyEditions.editionDate,
      algorithmVersion: dailyEditions.algorithmVersion,
      size: dailyEditions.size,
      createdAt: dailyEditions.createdAt,
    })
    .from(dailyEditions)
    .where(eq(dailyEditions.userId, userId))
    .orderBy(desc(dailyEditions.editionDate), desc(dailyEditions.createdAt))
    .limit(limit);
}

export async function getEditionById(
  userId: string,
  editionId: string,
): Promise<EditionView | null> {
  const [edition] = await db
    .select()
    .from(dailyEditions)
    .where(and(eq(dailyEditions.userId, userId), eq(dailyEditions.id, editionId)))
    .limit(1);

  if (!edition) return null;
  return buildEditionView(edition);
}

export type IngestionRunView = {
  id: string;
  sourceTitle: string;
  status: string | null;
  itemsFound: number;
  itemsNew: number;
  error: string | null;
  startedAt: Date;
  finishedAt: Date | null;
};

export async function listIngestionRuns(
  userId: string,
  limit = 25,
): Promise<IngestionRunView[]> {
  return db
    .select({
      id: ingestionRuns.id,
      sourceTitle: sources.title,
      status: ingestionRuns.status,
      itemsFound: ingestionRuns.itemsFound,
      itemsNew: ingestionRuns.itemsNew,
      error: ingestionRuns.error,
      startedAt: ingestionRuns.startedAt,
      finishedAt: ingestionRuns.finishedAt,
    })
    .from(ingestionRuns)
    .innerJoin(sources, eq(sources.id, ingestionRuns.sourceId))
    .where(eq(ingestionRuns.userId, userId))
    .orderBy(desc(ingestionRuns.startedAt))
    .limit(limit);
}

export type SavedItemView = {
  savedId: string;
  itemId: string;
  title: string;
  url: string;
  format: string;
  status: string;
  savedAt: Date;
  sourceTitle: string;
  durationSeconds: number | null;
};

export async function getSavedItems(userId: string): Promise<SavedItemView[]> {
  return db
    .select({
      savedId: savedItems.id,
      itemId: items.id,
      title: items.title,
      url: items.url,
      format: items.format,
      status: savedItems.status,
      savedAt: savedItems.savedAt,
      sourceTitle: sources.title,
      durationSeconds: items.durationSeconds,
    })
    .from(savedItems)
    .innerJoin(items, eq(items.id, savedItems.itemId))
    .innerJoin(sources, eq(sources.id, items.sourceId))
    .where(
      and(eq(savedItems.userId, userId), sql`${savedItems.status} <> 'removed'`),
    )
    .orderBy(desc(savedItems.savedAt));
}

export type HemerotecaParams = {
  query?: string;
  sourceId?: string;
  topicId?: string;
  page?: number;
  pageSize?: number;
};

export type HemerotecaResult = {
  items: {
    id: string;
    title: string;
    url: string;
    summary: string | null;
    format: string;
    durationSeconds: number | null;
    publishedAt: Date;
    sourceTitle: string;
  }[];
  total: number;
  page: number;
  pageSize: number;
};

export async function getHemeroteca(
  userId: string,
  params: HemerotecaParams,
): Promise<HemerotecaResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const conditions: SQL[] = [eq(items.userId, userId)];
  if (params.query && params.query.trim().length > 0) {
    const term = `%${params.query.trim()}%`;
    const titleOrSummary = or(ilike(items.title, term), ilike(items.summary, term));
    if (titleOrSummary) conditions.push(titleOrSummary);
  }
  if (params.sourceId) {
    conditions.push(eq(items.sourceId, params.sourceId));
  }
  if (params.topicId) {
    conditions.push(
      sql`exists (select 1 from item_topics it where it.item_id = ${items.id} and it.topic_id = ${params.topicId})`,
    );
  }

  const where = and(...conditions);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(items)
    .where(where);

  const rows = await db
    .select({
      id: items.id,
      title: items.title,
      url: items.url,
      summary: items.summary,
      format: items.format,
      durationSeconds: items.durationSeconds,
      publishedAt: items.publishedAt,
      sourceTitle: sources.title,
    })
    .from(items)
    .innerJoin(sources, eq(sources.id, items.sourceId))
    .where(where)
    .orderBy(desc(items.publishedAt))
    .limit(pageSize)
    .offset(offset);

  return { items: rows, total: countRow?.count ?? 0, page, pageSize };
}

export async function listSources(userId: string) {
  return db
    .select({
      id: sources.id,
      kind: sources.kind,
      title: sources.title,
      feedUrl: sources.feedUrl,
      isFollowed: sources.isFollowed,
      isActive: sources.isActive,
      isHidden: sources.isHidden,
      maxItemsPerEdition: sources.maxItemsPerEdition,
      weight: sources.weight,
      lastStatus: sources.lastStatus,
      lastError: sources.lastError,
      lastFetchedAt: sources.lastFetchedAt,
    })
    .from(sources)
    .where(eq(sources.userId, userId))
    .orderBy(desc(sources.createdAt));
}

export async function listTopics(userId: string) {
  return db
    .select({
      id: topics.id,
      name: topics.name,
      keywords: topics.keywords,
      isIncluded: topics.isIncluded,
    })
    .from(topics)
    .where(eq(topics.userId, userId))
    .orderBy(topics.name);
}

export async function listSourceOptions(userId: string) {
  return db
    .select({ id: sources.id, title: sources.title, kind: sources.kind })
    .from(sources)
    .where(eq(sources.userId, userId))
    .orderBy(sources.title);
}

export async function getSavedItemIdsForEdition(
  userId: string,
  itemIds: string[],
): Promise<Set<string>> {
  if (itemIds.length === 0) return new Set();
  const rows = await db
    .select({ itemId: savedItems.itemId })
    .from(savedItems)
    .where(
      and(
        eq(savedItems.userId, userId),
        inArray(savedItems.itemId, itemIds),
        sql`${savedItems.status} <> 'removed'`,
      ),
    );
  return new Set(rows.map((row) => row.itemId));
}

export type YoutubeAccountView = {
  channelTitle: string | null;
  connectedAt: Date;
  lastSyncedAt: Date | null;
  hasOAuth: boolean;
  hasCookie: boolean;
};

export async function getYoutubeAccount(
  userId: string,
): Promise<YoutubeAccountView | null> {
  const [account] = await db
    .select({
      channelTitle: youtubeAccounts.channelTitle,
      connectedAt: youtubeAccounts.connectedAt,
      lastSyncedAt: youtubeAccounts.lastSyncedAt,
      hasOAuth: sql<boolean>`${youtubeAccounts.refreshTokenEncrypted} is not null`,
      hasCookie: sql<boolean>`${youtubeAccounts.cookieEncrypted} is not null`,
    })
    .from(youtubeAccounts)
    .where(eq(youtubeAccounts.userId, userId))
    .limit(1);

  return account ?? null;
}

export type CollectionView = {
  id: string;
  title: string;
  kind: string;
  itemCount: number;
  syncedAt: Date;
  items: {
    id: string;
    title: string;
    url: string;
    channelTitle: string | null;
    durationSeconds: number | null;
    position: number;
  }[];
};

export async function listCollections(
  userId: string,
): Promise<CollectionView[]> {
  const collectionRows = await db
    .select({
      id: collections.id,
      title: collections.title,
      kind: collections.kind,
      itemCount: collections.itemCount,
      syncedAt: collections.syncedAt,
    })
    .from(collections)
    .where(eq(collections.userId, userId))
    .orderBy(collections.kind, collections.title);

  if (collectionRows.length === 0) return [];

  const itemRows = await db
    .select({
      id: collectionItems.id,
      collectionId: collectionItems.collectionId,
      title: collectionItems.title,
      url: collectionItems.url,
      channelTitle: collectionItems.channelTitle,
      durationSeconds: collectionItems.durationSeconds,
      position: collectionItems.position,
    })
    .from(collectionItems)
    .where(
      inArray(
        collectionItems.collectionId,
        collectionRows.map((row) => row.id),
      ),
    )
    .orderBy(collectionItems.position);

  const byCollection = new Map<string, CollectionView["items"]>();
  for (const row of itemRows) {
    const list = byCollection.get(row.collectionId) ?? [];
    list.push({
      id: row.id,
      title: row.title,
      url: row.url,
      channelTitle: row.channelTitle,
      durationSeconds: row.durationSeconds,
      position: row.position,
    });
    byCollection.set(row.collectionId, list);
  }

  return collectionRows.map((row) => ({
    ...row,
    items: byCollection.get(row.id) ?? [],
  }));
}
