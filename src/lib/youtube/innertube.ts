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

async function createClient(cookie: string): Promise<InnertubeClient> {
  return Innertube.create({
    cookie: withConsent(cookie),
    retrieve_player: false,
  });
}

function collectVideos(
  nodes: readonly unknown[] | undefined,
  limit: number,
): RecommendedVideo[] {
  const videos: RecommendedVideo[] = [];
  const seen = new Set<string>();

  for (const node of nodes ?? []) {
    const video = extractVideo(node);
    if (!video || seen.has(video.videoId)) continue;
    seen.add(video.videoId);
    videos.push(video);
    if (videos.length >= limit) break;
  }

  return videos;
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

export type CookieCheck = {
  status: "valid" | "invalid" | "no_feed" | "error";
  message: string | null;
  videoCount: number;
};

type AccountCheck =
  | { kind: "ok" }
  | { kind: "signed-out" }
  | { kind: "error"; message: string };

/**
 * `session.logged_in` solo mira si hay cookies de sesión, no si son válidas:
 * una cookie inventada también lo activa. La lista de cuentas del usuario sí
 * exige una sesión real, así que es la puerta que usamos.
 *
 * Un fallo de red no es una cookie caducada: se devuelve `error` para no
 * pedir al usuario que exporte una cookie que probablemente sigue valiendo.
 */
async function checkAccounts(innertube: InnertubeClient): Promise<AccountCheck> {
  if (!innertube.session.logged_in) return { kind: "signed-out" };

  try {
    const accounts = await innertube.account.getInfo(true);
    return accounts.length > 0 ? { kind: "ok" } : { kind: "signed-out" };
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Error desconocido de YouTube.";
    if (/signed in/i.test(message)) return { kind: "signed-out" };
    return { kind: "error", message };
  }
}

function isSignedOutError(cause: unknown): boolean {
  return cause instanceof Error && /signed in/i.test(cause.message);
}

/**
 * Comprueba que la cookie abre una sesión real y que el feed responde.
 *
 * `no_feed` significa que la sesión es válida pero YouTube no ofrece
 * recomendaciones (historial desactivado, consentimiento pendiente…). La
 * cookie se puede guardar; el feed simplemente no aportará ítems.
 */
export async function validateCookie(cookie: string): Promise<CookieCheck> {
  let innertube: InnertubeClient;
  try {
    innertube = await createClient(cookie);
  } catch (cause) {
    return {
      status: "error",
      message:
        cause instanceof Error
          ? `No se pudo crear el cliente de YouTube: ${cause.message}`
          : "No se pudo crear el cliente de YouTube.",
      videoCount: 0,
    };
  }

  const account = await checkAccounts(innertube);
  if (account.kind === "error") {
    return {
      status: "error",
      message: `No se pudo comprobar la sesión con YouTube: ${account.message}`,
      videoCount: 0,
    };
  }
  if (account.kind === "signed-out") {
    return {
      status: "invalid",
      message:
        "La cookie de YouTube no abre ninguna cuenta: ha caducado o no es válida. Vuelve a exportarla desde el navegador.",
      videoCount: 0,
    };
  }

  try {
    const feed = await innertube.getHomeFeed();
    const videos = collectVideos(feed.videos, 40);
    if (videos.length === 0) {
      return {
        status: "no_feed",
        message: await explainEmptyFeed(innertube),
        videoCount: 0,
      };
    }
    return { status: "valid", message: null, videoCount: videos.length };
  } catch (cause) {
    if (isSignedOutError(cause)) {
      return {
        status: "invalid",
        message:
          "La cookie de YouTube ya no abre la sesión. Vuelve a exportarla desde el navegador.",
        videoCount: 0,
      };
    }
    return {
      status: "error",
      message:
        cause instanceof Error
          ? `No se pudo leer el feed de YouTube: ${cause.message}`
          : "No se pudo leer el feed de YouTube.",
      videoCount: 0,
    };
  }
}

export async function fetchRecommendations(
  cookie: string,
  limit = 40,
): Promise<RecommendedVideo[]> {
  const innertube = await createClient(cookie);

  const account = await checkAccounts(innertube);
  if (account.kind === "error") {
    throw new Error(
      `No se pudo comprobar la sesión con YouTube: ${account.message}`,
    );
  }
  if (account.kind === "signed-out") {
    throw new Error(
      "La cookie de YouTube no abre ninguna cuenta: ha caducado o no es válida. Vuelve a exportarla desde el navegador.",
    );
  }

  const feed = await innertube.getHomeFeed();
  const videos = collectVideos(feed.videos, limit);

  if (videos.length === 0) {
    throw new Error(await explainEmptyFeed(innertube));
  }

  return videos;
}
