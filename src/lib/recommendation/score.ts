import { SIGNAL_WEIGHTS, type SignalName } from "./constants";
import type {
  CandidateItem,
  ScoreContext,
  ScoreResult,
  ScoredCandidate,
} from "./types";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function topicMatch(candidate: CandidateItem): number {
  return clamp01(candidate.dominantTopicScore);
}

function preferenceMatch(
  candidate: CandidateItem,
  context: ScoreContext,
): number {
  let score = 1;
  if (!context.allowedFormats.includes(candidate.format)) {
    score -= 0.8;
  }
  if (candidate.durationSeconds === null) {
    score -= 0.3;
  } else {
    const { minDurationSeconds, maxDurationSeconds } = context;
    if (minDurationSeconds !== null && candidate.durationSeconds < minDurationSeconds) {
      score -= 0.8;
    }
    if (maxDurationSeconds !== null && candidate.durationSeconds > maxDurationSeconds) {
      score -= 0.8;
    }
  }
  return clamp01(score);
}

function freshness(candidate: CandidateItem, context: ScoreContext): number {
  const ageMs = context.now.getTime() - candidate.publishedAt.getTime();
  const ageDays = Math.max(0, ageMs / 86_400_000);
  return clamp01(1 - ageDays / context.candidateWindowDays);
}

function affinityScore(candidate: CandidateItem): number {
  return clamp01((candidate.sourceAffinity + 1) / 2);
}

function novelty(candidate: CandidateItem, context: ScoreContext): number {
  if (!candidate.dominantTopicId) return 0.6;
  const seen = context.recentTopicCounts[candidate.dominantTopicId] ?? 0;
  return clamp01(1 - seen / 3);
}

const REASON_BY_SIGNAL: Record<SignalName, (c: CandidateItem) => string> = {
  topicMatch: (c) =>
    c.dominantTopicName
      ? `Coincide con tu interés explícito en ${c.dominantTopicName}.`
      : "Coincide con tus temas declarados.",
  preferenceMatch: () => "Encaja con tus preferencias de formato y duración.",
  freshness: () => "Es una publicación reciente entre tus fuentes.",
  sourceAffinity: (c) =>
    `Tu valoración confirmada de ${c.sourceTitle} lo respalda.`,
  novelty: () => "Aporta variedad frente a tu edición reciente.",
};

export function scoreCandidate(
  candidate: CandidateItem,
  context: ScoreContext,
): ScoredCandidate {
  const signals: Record<SignalName, number> = {
    topicMatch: topicMatch(candidate),
    preferenceMatch: preferenceMatch(candidate, context),
    freshness: freshness(candidate, context),
    sourceAffinity: affinityScore(candidate),
    novelty: novelty(candidate, context),
  };

  let score = 0;
  let dominantSignal: SignalName = "topicMatch";
  let dominantContribution = -1;

  for (const name of Object.keys(SIGNAL_WEIGHTS) as SignalName[]) {
    const contribution = signals[name] * SIGNAL_WEIGHTS[name];
    score += contribution;
    if (contribution > dominantContribution) {
      dominantContribution = contribution;
      dominantSignal = name;
    }
  }

  return {
    ...candidate,
    score: Number((score * (candidate.sourceWeight ?? 1)).toFixed(6)),
    breakdown: signals,
    reason: REASON_BY_SIGNAL[dominantSignal](candidate),
  };
}
