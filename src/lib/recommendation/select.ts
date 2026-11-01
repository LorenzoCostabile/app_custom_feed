import {
  DIVERSITY_PENALTY,
  MAX_ITEMS_PER_SOURCE,
  ORIGIN_QUOTAS,
} from "./constants";
import type { EditionOrigin } from "./constants";
import type { ScoredCandidate, SelectedCandidate } from "./types";

export type SelectionOptions = {
  editionSize: number;
  originQuotas?: Record<EditionOrigin, number>;
  maxItemsPerSource?: number;
  maxItemsPerSourceBySource?: Record<string, number>;
  diversityPenalty?: { source: number; topic: number };
};

type Scored = {
  candidate: ScoredCandidate;
  adjusted: number;
};

function adjustedScore(
  candidate: ScoredCandidate,
  sourceCounts: Record<string, number>,
  topicCounts: Record<string, number>,
  penalty: { source: number; topic: number },
): number {
  const sourceHits = sourceCounts[candidate.sourceId] ?? 0;
  const topicHits = candidate.dominantTopicId
    ? topicCounts[candidate.dominantTopicId] ?? 0
    : 0;
  return (
    candidate.score -
    penalty.source * sourceHits -
    penalty.topic * topicHits
  );
}

function compareDesc(a: Scored, b: Scored): number {
  if (b.adjusted !== a.adjusted) return b.adjusted - a.adjusted;
  if (b.candidate.score !== a.candidate.score) {
    return b.candidate.score - a.candidate.score;
  }
  const dateDiff =
    b.candidate.publishedAt.getTime() - a.candidate.publishedAt.getTime();
  if (dateDiff !== 0) return dateDiff;
  return a.candidate.itemId.localeCompare(b.candidate.itemId);
}

function pickCandidate(
  remaining: ScoredCandidate[],
  sourceCounts: Record<string, number>,
  topicCounts: Record<string, number>,
  penalty: { source: number; topic: number },
  capFor: (sourceId: string) => number,
  quotas: Record<EditionOrigin, number>,
  enforceQuotas: boolean,
  last: ScoredCandidate | undefined,
): ScoredCandidate | null {
  const eligible: Scored[] = [];
  const fallback: Scored[] = [];

  for (const candidate of remaining) {
    if (enforceQuotas && (quotas[candidate.origin] ?? 0) <= 0) continue;
    if ((sourceCounts[candidate.sourceId] ?? 0) >= capFor(candidate.sourceId)) {
      continue;
    }

    const scored: Scored = {
      candidate,
      adjusted: adjustedScore(candidate, sourceCounts, topicCounts, penalty),
    };

    const isConsecutiveTopic =
      last !== undefined &&
      candidate.dominantTopicId !== null &&
      candidate.dominantTopicId === last.dominantTopicId;

    if (isConsecutiveTopic) {
      fallback.push(scored);
    } else {
      eligible.push(scored);
    }
  }

  const pool = eligible.length > 0 ? eligible : fallback;
  if (pool.length === 0) return null;

  pool.sort(compareDesc);
  return pool[0].candidate;
}

export function selectEdition(
  candidates: ScoredCandidate[],
  options: SelectionOptions,
): SelectedCandidate[] {
  const rawQuotas: Record<EditionOrigin, number> = {
    ...(options.originQuotas ?? ORIGIN_QUOTAS),
  };
  const rawTotal = Object.values(rawQuotas).reduce(
    (sum, value) => sum + value,
    0,
  );
  const scale = rawTotal > 0 ? options.editionSize / rawTotal : 1;
  const quotas: Record<EditionOrigin, number> = {
    followed: 0,
    discovery: 0,
    contextual: 0,
  };
  for (const key of Object.keys(rawQuotas) as EditionOrigin[]) {
    quotas[key] = Math.max(0, Math.round((rawQuotas[key] ?? 0) * scale));
  }

  const maxPerSource = options.maxItemsPerSource ?? MAX_ITEMS_PER_SOURCE;
  const penalty = options.diversityPenalty ?? DIVERSITY_PENALTY;
  const capFor = (sourceId: string): number =>
    options.maxItemsPerSourceBySource?.[sourceId] ?? maxPerSource;

  const selected: ScoredCandidate[] = [];
  const sourceCounts: Record<string, number> = {};
  const topicCounts: Record<string, number> = {};
  const remaining = [...candidates];

  while (selected.length < options.editionSize && remaining.length > 0) {
    const last = selected[selected.length - 1];
    const winner =
      pickCandidate(
        remaining,
        sourceCounts,
        topicCounts,
        penalty,
        capFor,
        quotas,
        true,
        last,
      ) ??
      pickCandidate(
        remaining,
        sourceCounts,
        topicCounts,
        penalty,
        capFor,
        quotas,
        false,
        last,
      );

    if (!winner) break;

    selected.push(winner);
    quotas[winner.origin] = (quotas[winner.origin] ?? 0) - 1;
    sourceCounts[winner.sourceId] = (sourceCounts[winner.sourceId] ?? 0) + 1;
    if (winner.dominantTopicId) {
      topicCounts[winner.dominantTopicId] =
        (topicCounts[winner.dominantTopicId] ?? 0) + 1;
    }

    const index = remaining.indexOf(winner);
    if (index >= 0) remaining.splice(index, 1);
  }

  return selected.map((candidate, index) => ({
    ...candidate,
    position: index + 1,
  }));
}
