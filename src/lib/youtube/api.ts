import { googleApiKey } from "./config";

const API_BASE = "https://www.googleapis.com/youtube/v3";

type ListResponse<T> = {
  items?: T[];
  nextPageToken?: string;
};

async function listAll<T>(
  resource: string,
  params: Record<string, string>,
  accessToken: string,
): Promise<T[]> {
  const items: T[] = [];
  let pageToken: string | undefined;

  do {
    const query = new URLSearchParams({ ...params });
    if (pageToken) query.set("pageToken", pageToken);

    const response = await fetch(`${API_BASE}/${resource}?${query.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(
        `YouTube ${resource} (${response.status}): ${await response.text()}`,
      );
    }

    const data = (await response.json()) as ListResponse<T>;
    items.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}

export type YoutubeChannel = {
  id: string;
  snippet?: { title?: string };
};

export type YoutubeSubscription = {
  snippet?: {
    title?: string;
    resourceId?: { channelId?: string };
  };
};

export type YoutubePlaylist = {
  id: string;
  snippet?: { title?: string };
  contentDetails?: { itemCount?: number };
};

export type YoutubePlaylistItem = {
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    resourceId?: { videoId?: string };
  };
  contentDetails?: { videoId?: string };
};

export async function getMyChannel(
  accessToken: string,
): Promise<YoutubeChannel | null> {
  const channels = await listAll<YoutubeChannel>(
    "channels",
    { part: "snippet", mine: "true" },
    accessToken,
  );
  return channels[0] ?? null;
}

export function getSubscriptions(
  accessToken: string,
): Promise<YoutubeSubscription[]> {
  return listAll<YoutubeSubscription>(
    "subscriptions",
    { part: "snippet", mine: "true", maxResults: "50", order: "alphabetical" },
    accessToken,
  );
}

export function getMyPlaylists(
  accessToken: string,
): Promise<YoutubePlaylist[]> {
  return listAll<YoutubePlaylist>(
    "playlists",
    { part: "snippet,contentDetails", mine: "true", maxResults: "50" },
    accessToken,
  );
}

export function getPlaylistItems(
  accessToken: string,
  playlistId: string,
): Promise<YoutubePlaylistItem[]> {
  return listAll<YoutubePlaylistItem>(
    "playlistItems",
    { part: "snippet,contentDetails", playlistId, maxResults: "50" },
    accessToken,
  );
}

function parseIsoDuration(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
    value,
  );
  if (!match) return null;
  const [, days, hours, minutes, seconds] = match;
  const total =
    Number(days ?? 0) * 86_400 +
    Number(hours ?? 0) * 3_600 +
    Number(minutes ?? 0) * 60 +
    Number(seconds ?? 0);
  return total > 0 ? total : null;
}

export async function fetchVideoDurations(
  videoIds: string[],
  accessToken?: string | null,
): Promise<Map<string, number>> {
  const key = googleApiKey();
  const durations = new Map<string, number>();
  const unique = [...new Set(videoIds.filter(Boolean))];
  if (unique.length === 0) return durations;
  if (!key && !accessToken) return durations;

  for (let index = 0; index < unique.length; index += 50) {
    const chunk = unique.slice(index, index + 50);
    const query = new URLSearchParams({
      part: "contentDetails",
      id: chunk.join(","),
    });
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    } else if (key) {
      query.set("key", key);
    }

    try {
      const response = await fetch(`${API_BASE}/videos?${query.toString()}`, {
        headers,
      });
      if (!response.ok) continue;
      const data = (await response.json()) as {
        items?: { id: string; contentDetails?: { duration?: string } }[];
      };
      for (const item of data.items ?? []) {
        const seconds = parseIsoDuration(item.contentDetails?.duration);
        if (seconds != null) durations.set(item.id, seconds);
      }
    } catch {
      continue;
    }
  }

  return durations;
}
