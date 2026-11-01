import { createHash } from "node:crypto";

const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
];

export function canonicalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    for (const param of TRACKING_PARAMS) {
      url.searchParams.delete(param);
    }
    url.hash = "";
    let result = url.toString();
    if (result.endsWith("/")) {
      result = result.slice(0, -1);
    }
    return result;
  } catch {
    return rawUrl.trim();
  }
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function contentHash(title: string, canonicalUrl: string): string {
  return createHash("sha256")
    .update(`${normalizeTitle(title)}|${canonicalUrl}`)
    .digest("hex");
}

export function stripHtml(input: string | null | undefined): string | null {
  if (!input) return null;
  const text = input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text : null;
}

export function parseDurationSeconds(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  const raw = String(value).trim();
  if (raw === "") return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  const parts = raw.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return null;
  return parts.reduce((acc, part) => acc * 60 + part, 0);
}

export function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function youtubeVideoId(input: string): string | null {
  const withPrefix = /^yt:video:([\w-]+)$/.exec(input.trim());
  if (withPrefix) return withPrefix[1];
  try {
    const url = new URL(input);
    const v = url.searchParams.get("v");
    if (v) return v;
    const shortsOrEmbed = /\/(?:shorts|embed)\/([\w-]+)/.exec(url.pathname);
    if (shortsOrEmbed) return shortsOrEmbed[1];
  } catch {
    return null;
  }
  return null;
}
