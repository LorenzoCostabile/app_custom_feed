import Parser from "rss-parser";

import type { Source } from "@/db/schema";

import {
  canonicalizeUrl,
  contentHash,
  parseDurationSeconds,
  stripHtml,
  toDate,
} from "./normalize";

export type RawFeedItem = {
  externalId: string;
  title: string;
  url: string;
  canonicalUrl: string;
  summary: string | null;
  author: string | null;
  durationSeconds: number | null;
  publishedAt: Date;
  contentHash: string;
};

export type ParsedFeed = {
  title: string | null;
  items: RawFeedItem[];
};

type FeedItem = {
  guid?: string;
  id?: string;
  link?: string;
  title?: string;
  content?: string;
  contentSnippet?: string;
  summary?: string;
  creator?: string;
  author?: string;
  isoDate?: string;
  pubDate?: string;
  enclosure?: { url?: string; type?: string };
  itunes?: { duration?: string; author?: string };
};

const parser = new Parser<Record<string, unknown>, FeedItem>({
  customFields: {
    item: [
      ["itunes:duration", "itunes.duration"],
      ["itunes:author", "itunes.author"],
    ],
  },
});

export function formatForSource(kind: Source["kind"]) {
  switch (kind) {
    case "youtube":
      return "video" as const;
    case "podcast":
      return "podcast" as const;
    case "news":
      return "article" as const;
  }
}

function resolveUrl(item: FeedItem): string | null {
  if (item.link) return item.link;
  if (item.guid && /^https?:\/\//i.test(item.guid)) return item.guid;
  if (item.enclosure?.url) return item.enclosure.url;
  return null;
}

export async function parseFeed(
  url: string,
  kind: Source["kind"],
  userAgent: string,
): Promise<ParsedFeed> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      Accept:
        "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Respuesta ${response.status} al obtener ${url}`);
  }

  const xml = await response.text();
  const feed = await parser.parseString(xml);
  const now = new Date();

  const items: RawFeedItem[] = [];
  for (const entry of feed.items ?? []) {
    const rawUrl = resolveUrl(entry);
    const title = stripHtml(entry.title);
    if (!rawUrl || !title) continue;

    const canonicalUrl = canonicalizeUrl(rawUrl);
    const externalId =
      entry.guid?.trim() ||
      entry.id?.trim() ||
      canonicalUrl;
    const publishedAt =
      toDate(entry.isoDate) ?? toDate(entry.pubDate) ?? now;

    const summary =
      stripHtml(entry.contentSnippet) ??
      stripHtml(entry.summary) ??
      stripHtml(entry.content)?.slice(0, 600) ??
      null;

    items.push({
      externalId,
      title,
      url: rawUrl,
      canonicalUrl,
      summary,
      author: entry.creator ?? entry.author ?? entry.itunes?.author ?? null,
      durationSeconds: parseDurationSeconds(entry.itunes?.duration),
      publishedAt,
      contentHash: contentHash(title, canonicalUrl),
    });
  }

  return { title: stripHtml(feed.title) ?? null, items };
}

export type { Source };
