import type { EditionOrigin, ItemFormat, SignalName } from "./constants";

export type CandidateItem = {
  itemId: string;
  sourceId: string;
  sourceTitle: string;
  title: string;
  format: ItemFormat;
  publishedAt: Date;
  durationSeconds: number | null;
  topicIds: string[];
  dominantTopicId: string | null;
  dominantTopicName: string | null;
  dominantTopicScore: number;
  sourceAffinity: number;
  sourceWeight?: number;
  origin: EditionOrigin;
};

export type ScoreContext = {
  candidateWindowDays: number;
  now: Date;
  recentTopicCounts: Record<string, number>;
  allowedFormats: ItemFormat[];
  minDurationSeconds: number | null;
  maxDurationSeconds: number | null;
};

export type ScoreResult = {
  score: number;
  breakdown: Record<SignalName, number>;
  dominantSignal: SignalName;
  reason: string;
};

export type ScoredCandidate = CandidateItem & {
  score: number;
  breakdown: Record<SignalName, number>;
  reason: string;
};

export type SelectedCandidate = ScoredCandidate & {
  position: number;
};
