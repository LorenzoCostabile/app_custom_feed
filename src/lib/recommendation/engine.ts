import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  dailyEditions,
  editionItems,
  feedback,
  itemTopics,
  items,
  preferences,
  sources,
  topics,
  type Source,
} from "@/db/schema";

import {
  ALGORITHM_VERSION,
  DEFAULT_CANDIDATE_WINDOW_DAYS,
  DEFAULT_EDITION_SIZE,
  DEFAULT_REPEAT_COOLDOWN_DAYS,
  ORIGIN_QUOTAS,
  type EditionOrigin,
  type ItemFormat,
} from "./constants";
import { selectEdition } from "./select";
import { scoreCandidate } from "./score";
import type { CandidateItem, SelectedCandidate } from "./types";

export type Preferences = {
  allowedFormats: ItemFormat[];
  minDurationSeconds: number | null;
  maxDurationSeconds: number | null;
  editionSize: number;
};

const ALL_FORMATS: ItemFormat[] = ["video", "podcast", "article"];

function positiveInt(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : null;
}

export async function loadPreferences(userId: string): Promise<Preferences> {
  const rows = await db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, userId));
  const map = new Map(rows.map((row) => [row.key, row.value]));

  const formats = map.get("allowed_formats");
  const min = map.get("min_duration_seconds");
  const max = map.get("max_duration_seconds");
  const envEditionSize = positiveInt(
    Number.parseInt(process.env.EDITION_SIZE ?? "", 10),
  );

  return {
    allowedFormats: Array.isArray(formats)
      ? (formats.filter((value): value is ItemFormat =>
          ALL_FORMATS.includes(value as ItemFormat),
        ) as ItemFormat[])
      : ALL_FORMATS,
    minDurationSeconds: typeof min === "number" ? min : null,
    maxDurationSeconds: typeof max === "number" ? max : null,
    editionSize:
      positiveInt(map.get("edition_size")) ??
      envEditionSize ??
      DEFAULT_EDITION_SIZE,
  };
}

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type TopicInfo = {
  id: string;
  name: string;
  score: number;
};

async function loadTopicMatches(
  userId: string,
  itemIds: string[],
): Promise<Map<string, TopicInfo[]>> {
  const result = new Map<string, TopicInfo[]>();
  if (itemIds.length === 0) return result;

  const rows = await db
    .select({
      itemId: itemTopics.itemId,
      topicId: itemTopics.topicId,
      score: itemTopics.score,
      name: topics.name,
    })
    .from(itemTopics)
    .innerJoin(topics, eq(topics.id, itemTopics.topicId))
    .where(
      and(
        inArray(itemTopics.itemId, itemIds),
        eq(topics.isIncluded, true),
        eq(topics.userId, userId),
      ),
    );

  for (const row of rows) {
    const list = result.get(row.itemId) ?? [];
    list.push({ id: row.topicId, name: row.name, score: row.score });
    result.set(row.itemId, list);
  }
  for (const list of result.values()) {
    list.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  }
  return result;
}

async function loadSourceAffinity(
  userId: string,
): Promise<Record<string, number>> {
  const rows = await db
    .select({
      sourceId: feedback.sourceId,
      kind: feedback.kind,
      count: sql<number>`count(*)::int`,
    })
    .from(feedback)
    .where(
      and(
        eq(feedback.userId, userId),
        eq(feedback.confirmed, true),
        sql`${feedback.sourceId} is not null`,
      ),
    )
    .groupBy(feedback.sourceId, feedback.kind);

  const affinity: Record<string, number> = {};
  for (const row of rows) {
    if (!row.sourceId) continue;
    const delta =
      row.kind === "less_source"
        ? -1
        : row.kind === "not_useful"
          ? -0.5
          : 0.5;
    affinity[row.sourceId] = (affinity[row.sourceId] ?? 0) + delta * row.count;
  }
  for (const key of Object.keys(affinity)) {
    affinity[key] = Math.max(-1, Math.min(1, affinity[key]));
  }
  return affinity;
}

async function loadRecentTopicCounts(
  userId: string,
  since: Date,
): Promise<Record<string, number>> {
  const presented = await db
    .select({ itemId: editionItems.itemId })
    .from(editionItems)
    .innerJoin(dailyEditions, eq(dailyEditions.id, editionItems.editionId))
    .where(
      and(
        eq(dailyEditions.userId, userId),
        gte(dailyEditions.editionDate, formatDate(since)),
      ),
    );

  const itemIds = presented.map((row) => row.itemId);
  if (itemIds.length === 0) return {};

  const rows = await db
    .select({
      topicId: itemTopics.topicId,
      count: sql<number>`count(*)::int`,
    })
    .from(itemTopics)
    .where(inArray(itemTopics.itemId, itemIds))
    .groupBy(itemTopics.topicId);

  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.topicId] = row.count;
  return counts;
}

function assignOrigins(
  candidates: CandidateItem[],
  followedSourceIds: Set<string>,
): CandidateItem[] {
  const followedCandidates = candidates.filter((candidate) =>
    followedSourceIds.has(candidate.sourceId),
  );

  const topicCounts = new Map<string, number>();
  for (const candidate of followedCandidates) {
    if (!candidate.dominantTopicId) continue;
    topicCounts.set(
      candidate.dominantTopicId,
      (topicCounts.get(candidate.dominantTopicId) ?? 0) + 1,
    );
  }

  const distinctTopics = [...topicCounts.entries()].sort(
    (a, b) => a[1] - b[1] || a[0].localeCompare(b[0]),
  );
  const underrepresented = new Set<string>();
  if (distinctTopics.length >= 3) {
    const cutoff = Math.max(1, Math.ceil(distinctTopics.length / 3));
    for (let index = 0; index < cutoff; index += 1) {
      underrepresented.add(distinctTopics[index][0]);
    }
  }

  return candidates.map((candidate) => {
    if (!followedSourceIds.has(candidate.sourceId)) {
      return { ...candidate, origin: "discovery" as EditionOrigin };
    }
    const isContextual =
      candidate.dominantTopicId !== null &&
      underrepresented.has(candidate.dominantTopicId) &&
      candidate.dominantTopicScore < 0.5;
    return {
      ...candidate,
      origin: (isContextual ? "contextual" : "followed") as EditionOrigin,
    };
  });
}

export type GenerateEditionResult = {
  editionId: string;
  editionDate: string;
  algorithmVersion: string;
  items: SelectedCandidate[];
};

export async function generateEdition(
  userId: string,
  options?: {
    editionDate?: string;
    editionSize?: number;
    candidateWindowDays?: number;
    repeatCooldownDays?: number;
    persist?: boolean;
  },
): Promise<GenerateEditionResult> {
  const now = new Date();
  const editionDate = options?.editionDate ?? startOfDayUtc(now).toISOString().slice(0, 10);
  const candidateWindowDays =
    options?.candidateWindowDays ?? DEFAULT_CANDIDATE_WINDOW_DAYS;
  const repeatCooldownDays =
    options?.repeatCooldownDays ?? DEFAULT_REPEAT_COOLDOWN_DAYS;

  const prefs = await loadPreferences(userId);
  const editionSize = options?.editionSize ?? prefs.editionSize;

  const activeSources = await db
    .select()
    .from(sources)
    .where(
      and(
        eq(sources.isActive, true),
        eq(sources.isHidden, false),
        eq(sources.userId, userId),
      ),
    );

  if (activeSources.length === 0) {
    return { editionId: "", editionDate, algorithmVersion: ALGORITHM_VERSION, items: [] };
  }

  const sourceById = new Map<string, Source>(
    activeSources.map((source) => [source.id, source]),
  );
  const followedSourceIds = new Set(
    activeSources.filter((source) => source.isFollowed).map((source) => source.id),
  );
  const maxItemsPerSourceBySource: Record<string, number> = {};
  for (const source of activeSources) {
    maxItemsPerSourceBySource[source.id] = source.maxItemsPerEdition;
  }

  const windowStart = new Date(
    now.getTime() - candidateWindowDays * 86_400_000,
  );
  const cooldownStart = new Date(now.getTime() - repeatCooldownDays * 86_400_000);

  const [sourceAffinity, recentTopicCounts, presentedIds] = await Promise.all([
    loadSourceAffinity(userId),
    loadRecentTopicCounts(userId, cooldownStart),
    db
      .select({ itemId: editionItems.itemId })
      .from(editionItems)
      .innerJoin(dailyEditions, eq(dailyEditions.id, editionItems.editionId))
      .where(
        and(
          eq(dailyEditions.userId, userId),
          gte(dailyEditions.editionDate, formatDate(cooldownStart)),
        ),
      ),
  ]);

  const presentedSet = new Set(presentedIds.map((row) => row.itemId));

  const candidateRows = await db
    .select()
    .from(items)
    .where(
      and(
        eq(items.userId, userId),
        gte(items.publishedAt, windowStart),
        inArray(items.sourceId, [...sourceById.keys()]),
      ),
    )
    .orderBy(desc(items.publishedAt));

  const topicMatches = await loadTopicMatches(
    userId,
    candidateRows.map((row) => row.id),
  );

  const candidates: CandidateItem[] = [];
  for (const row of candidateRows) {
    if (presentedSet.has(row.id)) continue;
    const matches = topicMatches.get(row.id) ?? [];
    const dominant = matches[0] ?? null;

    const source = sourceById.get(row.sourceId);
    if (!source) continue;

    candidates.push({
      itemId: row.id,
      sourceId: row.sourceId,
      sourceTitle: source.title,
      title: row.title,
      format: row.format,
      publishedAt: row.publishedAt,
      durationSeconds: row.durationSeconds,
      topicIds: matches.map((match) => match.id),
      dominantTopicId: dominant?.id ?? null,
      dominantTopicName: dominant?.name ?? null,
      dominantTopicScore: dominant?.score ?? 0,
      sourceAffinity: sourceAffinity[row.sourceId] ?? 0,
      sourceWeight: source.weight,
      origin: followedSourceIds.has(row.sourceId) ? "followed" : "discovery",
    });
  }

  const withOrigins = assignOrigins(candidates, followedSourceIds);

  const scored = withOrigins.map((candidate) =>
    scoreCandidate(candidate, {
      candidateWindowDays,
      now,
      recentTopicCounts,
      allowedFormats: prefs.allowedFormats,
      minDurationSeconds: prefs.minDurationSeconds,
      maxDurationSeconds: prefs.maxDurationSeconds,
    }),
  );

  const selected = selectEdition(scored, {
    editionSize,
    originQuotas: ORIGIN_QUOTAS,
    maxItemsPerSourceBySource,
  });

  if (options?.persist === false || selected.length === 0) {
    return {
      editionId: "",
      editionDate,
      algorithmVersion: ALGORITHM_VERSION,
      items: selected,
    };
  }

  const editionId = await persistEdition(userId, editionDate, selected);
  return { editionId, editionDate, algorithmVersion: ALGORITHM_VERSION, items: selected };
}

async function persistEdition(
  userId: string,
  editionDate: string,
  selected: SelectedCandidate[],
): Promise<string> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: dailyEditions.id })
      .from(dailyEditions)
      .where(
        and(
          eq(dailyEditions.userId, userId),
          eq(dailyEditions.editionDate, editionDate),
          eq(dailyEditions.algorithmVersion, ALGORITHM_VERSION),
        ),
      );

    for (const edition of existing) {
      await tx.delete(editionItems).where(eq(editionItems.editionId, edition.id));
      await tx.delete(dailyEditions).where(eq(dailyEditions.id, edition.id));
    }

    const [created] = await tx
      .insert(dailyEditions)
      .values({
        userId,
        editionDate,
        algorithmVersion: ALGORITHM_VERSION,
        size: selected.length,
      })
      .returning({ id: dailyEditions.id });

    if (selected.length > 0) {
      await tx.insert(editionItems).values(
        selected.map((item) => ({
          editionId: created.id,
          itemId: item.itemId,
          origin: item.origin,
          score: item.score,
          signalBreakdown: item.breakdown as unknown as Record<string, number>,
          reason: item.reason,
          position: item.position,
        })),
      );
    }

    return created.id;
  });
}
