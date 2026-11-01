import { Innertube } from "youtubei.js";

export type RecommendedVideo = {
  videoId: string;
  title: string;
  channelTitle: string | null;
  durationSeconds: number | null;
  publishedText: string | null;
  viewCountText: string | null;
};

type LooseNode = {
  video_id?: string;
  content_id?: string;
  content_type?: string;
  entity_id?: string;
  title?: unknown;
  view_count?: unknown;
  published?: unknown;
  duration?: { seconds?: number };
  author?: { name?: string };
  metadata?: {
    title?: unknown;
    metadata?: {
      metadata_rows?: {
        metadata_parts?: { text?: unknown }[];
      }[];
    };
  };
  overlay_metadata?: {
    primary_text?: unknown;
    secondary_text?: unknown;
  };
};

const VIDEO_CONTENT_TYPES = new Set([
  undefined,
  "UNSPECIFIED",
  "VIDEO",
  "SHORT",
]);

function nodeText(node: unknown): string | null {
  if (node === null || node === undefined) return null;
  const value =
    typeof node === "string"
      ? node
      : (node as { toString?: () => string }).toString?.();
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function firstMetadataText(node: LooseNode): string | null {
  const rows = node.metadata?.metadata?.metadata_rows ?? [];
  for (const row of rows) {
    const text = nodeText(row.metadata_parts?.[0]?.text);
    if (text) return text;
  }
  return null;
}

function extractVideo(node: unknown): RecommendedVideo | null {
  const raw = node as LooseNode;

  if (raw.entity_id) {
    const videoId = raw.entity_id.replace(/^(?:shorts-shelf-item|shorts|reel)-/, "");
    const title = nodeText(raw.overlay_metadata?.primary_text);
    if (!videoId || !title) return null;
    return {
      videoId,
      title,
      channelTitle: null,
      durationSeconds: null,
      publishedText: null,
      viewCountText: nodeText(raw.overlay_metadata?.secondary_text),
    };
  }

  const videoId =
    raw.video_id ??
    (VIDEO_CONTENT_TYPES.has(raw.content_type) ? raw.content_id : undefined);
  if (!videoId) return null;

  const title =
    nodeText(raw.title) ?? nodeText(raw.metadata?.title);
  if (!title) return null;

  const channelTitle =
    raw.author?.name?.trim() || firstMetadataText(raw);

  return {
    videoId,
    title,
    channelTitle: channelTitle ?? null,
    durationSeconds:
      typeof raw.duration?.seconds === "number" ? raw.duration.seconds : null,
    publishedText: nodeText(raw.published),
    viewCountText: nodeText(raw.view_count),
  };
}

type InnertubeClient = Awaited<ReturnType<typeof Innertube.create>>;

const EMPTY_FEED_MESSAGE =
  "YouTube no devolvió recomendaciones. Comprueba que el historial de reproducción está activado y que la cuenta ha aceptado las cookies de YouTube; luego vuelve a intentarlo.";

function withConsent(cookie: string): string {
  if (/(^|;\s*)(SOCS|CONSENT)=/i.test(cookie)) return cookie;
  return `${cookie}; SOCS=CAI`;
}

async function explainEmptyFeed(innertube: InnertubeClient): Promise<string> {
  try {
    const response = await innertube.actions.execute("/browse", {
      browseId: "FEwhat_to_watch",
    });
    const data = (response as unknown as { data?: unknown }).data ?? response;
    const text = JSON.stringify(data).toLowerCase();
    const historyOff =
      text.includes("history is off") ||
      text.includes("watch and search history");
    const loggedOut =
      text.includes("start watching videos to help us build a feed") ||
      text.includes("try searching to get started");
    if (loggedOut && !historyOff) {
      return "La cookie de YouTube ha caducado o no es válida: YouTube trata la sesión como cerrada. Inicia sesión en el navegador y copia una cookie nueva.";
    }
    if (historyOff) {
      return "YouTube no devuelve recomendaciones porque el historial de reproducción está desactivado. Actívalo en https://www.youtube.com/feed/history y vuelve a intentarlo.";
    }
    if (text.includes("before you continue to youtube")) {
      return "YouTube requiere aceptar sus cookies. Abre https://www.youtube.com, acepta el aviso y vuelve a guardar la cookie.";
    }
  } catch {
    // Si el diagnóstico falla, devolvemos el mensaje genérico.
  }
  return EMPTY_FEED_MESSAGE;
}

export async function fetchRecommendations(
  cookie: string,
  limit = 40,
): Promise<RecommendedVideo[]> {
  const innertube = await Innertube.create({
    cookie: withConsent(cookie),
    retrieve_player: false,
  });

  if (!innertube.session.logged_in) {
    throw new Error(
      "La cookie de YouTube no es válida o la sesión ha caducado. Vuelve a copiarla desde el navegador.",
    );
  }

  const feed = await innertube.getHomeFeed();

  const videos: RecommendedVideo[] = [];
  const seen = new Set<string>();

  for (const node of feed.videos ?? []) {
    const video = extractVideo(node);
    if (!video || seen.has(video.videoId)) continue;
    seen.add(video.videoId);
    videos.push(video);
    if (videos.length >= limit) break;
  }

  if (videos.length === 0) {
    throw new Error(await explainEmptyFeed(innertube));
  }

  return videos;
}
