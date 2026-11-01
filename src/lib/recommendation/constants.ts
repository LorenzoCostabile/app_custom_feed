import type { itemFormat, editionOrigin } from "@/db/schema";

export type ItemFormat = (typeof itemFormat.enumValues)[number];
export type EditionOrigin = (typeof editionOrigin.enumValues)[number];

export const ALGORITHM_VERSION = "mvp-1.0";

export const SIGNAL_WEIGHTS = {
  topicMatch: 0.35,
  preferenceMatch: 0.2,
  freshness: 0.15,
  sourceAffinity: 0.15,
  novelty: 0.15,
} as const;

export type SignalName = keyof typeof SIGNAL_WEIGHTS;

export const ORIGIN_QUOTAS: Record<EditionOrigin, number> = {
  followed: 5,
  discovery: 3,
  contextual: 2,
};

export const MAX_ITEMS_PER_SOURCE = 2;

export const DIVERSITY_PENALTY = {
  source: 0.15,
  topic: 0.1,
} as const;

export const DEFAULT_EDITION_SIZE = 10;
export const DEFAULT_CANDIDATE_WINDOW_DAYS = 14;
export const DEFAULT_REPEAT_COOLDOWN_DAYS = 7;
