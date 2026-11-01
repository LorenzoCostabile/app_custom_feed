import assert from "node:assert/strict";
import { test } from "node:test";

import type { EditionOrigin, ItemFormat } from "./constants";
import { selectEdition } from "./select";
import { scoreCandidate } from "./score";
import type { CandidateItem, ScoreContext } from "./types";

const NOW = new Date("2026-01-15T00:00:00.000Z");

function candidate(overrides: Partial<CandidateItem> = {}): CandidateItem {
  return {
    itemId: overrides.itemId ?? "item-1",
    sourceId: overrides.sourceId ?? "source-1",
    sourceTitle: overrides.sourceTitle ?? "Canal 1",
    title: overrides.title ?? "Título",
    format: (overrides.format ?? "video") as ItemFormat,
    publishedAt: overrides.publishedAt ?? NOW,
    durationSeconds: overrides.durationSeconds ?? 1200,
    topicIds: overrides.topicIds ?? ["topic-1"],
    dominantTopicId: overrides.dominantTopicId ?? "topic-1",
    dominantTopicName: overrides.dominantTopicName ?? "IA abierta",
    dominantTopicScore: overrides.dominantTopicScore ?? 0.8,
    sourceAffinity: overrides.sourceAffinity ?? 0,
    origin: (overrides.origin ?? "followed") as EditionOrigin,
  };
}

const context: ScoreContext = {
  candidateWindowDays: 14,
  now: NOW,
  recentTopicCounts: {},
  allowedFormats: ["video", "podcast", "article"],
  minDurationSeconds: null,
  maxDurationSeconds: null,
};

test("scoreCandidate es determinista y acotado", () => {
  const a = scoreCandidate(candidate(), context);
  const b = scoreCandidate(candidate(), context);
  assert.deepEqual(a.breakdown, b.breakdown);
  assert.equal(a.score, b.score);
  assert.ok(a.score >= 0 && a.score <= 1);
  assert.ok(a.reason.length > 0);
});

test("scoreCandidate penaliza formatos no permitidos", () => {
  const allowed = scoreCandidate(candidate({ format: "video" }), context);
  const disallowed = scoreCandidate(
    candidate({ format: "video" }),
    { ...context, allowedFormats: ["article"] },
  );
  assert.ok(disallowed.score < allowed.score);
});

test("selectEdition respeta el tamaño máximo de la edición", () => {
  const scored = Array.from({ length: 20 }, (_, index) =>
    scoreCandidate(
      candidate({
        itemId: `item-${index}`,
        sourceId: `source-${index}`,
        dominantTopicId: `topic-${index}`,
      }),
      context,
    ),
  );
  const selected = selectEdition(scored, {
    editionSize: 10,
    originQuotas: { followed: 10, discovery: 0, contextual: 0 },
  });
  assert.equal(selected.length, 10);
});

test("selectEdition limita a dos ítems por fuente", () => {
  const scored = Array.from({ length: 8 }, (_, index) =>
    scoreCandidate(
      candidate({
        itemId: `item-${index}`,
        sourceId: "source-1",
        dominantTopicId: `topic-${index}`,
      }),
      context,
    ),
  );
  const selected = selectEdition(scored, {
    editionSize: 10,
    maxItemsPerSource: 2,
  });
  assert.equal(selected.length, 2);
  assert.ok(selected.every((item) => item.sourceId === "source-1"));
});

test("selectEdition respeta las cuotas por origen", () => {
  const followed = Array.from({ length: 8 }, (_, index) =>
    scoreCandidate(
      candidate({
        itemId: `f-${index}`,
        sourceId: `fs-${index}`,
        dominantTopicId: `ft-${index}`,
        origin: "followed",
      }),
      context,
    ),
  );
  const discovery = Array.from({ length: 8 }, (_, index) =>
    scoreCandidate(
      candidate({
        itemId: `d-${index}`,
        sourceId: `ds-${index}`,
        dominantTopicId: `dt-${index}`,
        origin: "discovery",
      }),
      context,
    ),
  );
  const contextual = Array.from({ length: 8 }, (_, index) =>
    scoreCandidate(
      candidate({
        itemId: `c-${index}`,
        sourceId: `cs-${index}`,
        dominantTopicId: `ct-${index}`,
        origin: "contextual",
      }),
      context,
    ),
  );
  const selected = selectEdition(
    [...followed, ...discovery, ...contextual],
    {
      editionSize: 10,
      originQuotas: { followed: 5, discovery: 3, contextual: 2 },
    },
  );
  const counts = selected.reduce<Record<string, number>>((acc, item) => {
    acc[item.origin] = (acc[item.origin] ?? 0) + 1;
    return acc;
  }, {});
  assert.equal(counts.followed, 5);
  assert.equal(counts.discovery, 3);
  assert.equal(counts.contextual, 2);
});

test("selectEdition asigna posiciones consecutivas y es reproducible", () => {
  const build = () =>
    Array.from({ length: 15 }, (_, index) =>
      scoreCandidate(
        candidate({
          itemId: `item-${index}`,
          sourceId: `source-${index % 6}`,
          dominantTopicId: `topic-${index % 4}`,
        }),
        context,
      ),
    );
  const first = selectEdition(build(), { editionSize: 8 });
  const second = selectEdition(build(), { editionSize: 8 });
  assert.deepEqual(
    first.map((item) => item.itemId),
    second.map((item) => item.itemId),
  );
  assert.deepEqual(
    first.map((item) => item.position),
    first.map((_, index) => index + 1),
  );
});
