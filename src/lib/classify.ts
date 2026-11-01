import { normalizeTitle } from "./ingestion/normalize";

export type TopicForClassification = {
  id: string;
  keywords: string[];
};

export type TopicMatch = {
  topicId: string;
  score: number;
};

export function classifyText(
  text: string,
  topics: TopicForClassification[],
): TopicMatch[] {
  const haystack = normalizeTitle(text);
  if (haystack.length === 0) return [];

  const matches: TopicMatch[] = [];
  for (const topic of topics) {
    const keywords = topic.keywords
      .map((keyword) => normalizeTitle(keyword))
      .filter((keyword) => keyword.length > 0);
    if (keywords.length === 0) continue;

    const hits = keywords.filter((keyword) => haystack.includes(keyword));
    if (hits.length === 0) continue;

    const score = Math.min(1, hits.length / Math.max(3, keywords.length));
    matches.push({ topicId: topic.id, score });
  }
  return matches;
}
