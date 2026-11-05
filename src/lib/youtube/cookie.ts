export type CookieSource = "header" | "netscape";

export type NormalizedCookie = {
  /** Cabecera `name=value; name=value` lista para youtubei.js. */
  cookie: string;
  /** Nombres de las cookies incluidas. Nunca los valores. */
  names: string[];
  /** Cookies imprescindibles que faltan. */
  missing: string[];
  /** Problemas que no impiden guardar, pero conviene mostrar. */
  warnings: string[];
  source: CookieSource;
};

const PRIMARY_AUTH = new Set(["SID", "__Secure-1PSID", "__Secure-3PSID"]);

const SECONDARY_AUTH = new Set([
  "HSID",
  "SSID",
  "APISID",
  "SAPISID",
  "__Secure-1PAPISID",
  "__Secure-3PAPISID",
]);

/** Cookies de google.com que forman parte de la sesión de YouTube. */
const GOOGLE_AUTH = new Set([
  ...PRIMARY_AUTH,
  ...SECONDARY_AUTH,
  "__Secure-1PSIDTS",
  "__Secure-3PSIDTS",
  "__Secure-1PSIDCC",
  "__Secure-3PSIDCC",
]);

function parseHeader(input: string): Map<string, string> {
  const entries = new Map<string, string>();
  const cleaned = input.trim().replace(/^cookie\s*:/i, "").trim();

  for (const part of cleaned.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const name = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1);
    if (!name || /\s/.test(name)) continue;
    entries.set(name, value);
  }

  return entries;
}

function parseNetscape(input: string): Map<string, string> {
  const entries = new Map<string, string>();

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.startsWith("#HttpOnly_")
      ? rawLine.slice("#HttpOnly_".length)
      : rawLine;
    if (!line || line.startsWith("#")) continue;

    const fields = line.split("\t");
    if (fields.length < 7) continue;

    const [domain, , , , , name, value] = fields;
    if (!name) continue;

    const host = domain.replace(/^\./, "").toLowerCase();
    const isYoutube = host === "youtube.com" || host.endsWith(".youtube.com");
    const isGoogle = host === "google.com" || host.endsWith(".google.com");

    if (!isYoutube && !(isGoogle && GOOGLE_AUTH.has(name))) continue;
    if (!entries.has(name) || isYoutube) {
      entries.set(name, value);
    }
  }

  return entries;
}

function looksLikeNetscape(input: string): boolean {
  return (
    input.includes("\t") ||
    input.startsWith("# Netscape HTTP Cookie File") ||
    input.includes("#HttpOnly_")
  );
}

/**
 * Acepta la cabecera `cookie` copiada del navegador o un `cookies.txt` de
 * Netscape (lo que exporta yt-dlp) y devuelve una cabecera corta y limpia.
 *
 * No valida la sesión contra YouTube: eso lo hace `validateCookie`.
 */
export function normalizeYoutubeCookie(input: string): NormalizedCookie {
  const source: CookieSource = looksLikeNetscape(input)
    ? "netscape"
    : "header";
  const entries =
    source === "netscape" ? parseNetscape(input) : parseHeader(input);

  const names = [...entries.keys()];
  const header = [...entries.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  const missing: string[] = [];
  if (names.length === 0) {
    missing.push("ninguna cookie de youtube.com");
  } else if (!names.some((name) => PRIMARY_AUTH.has(name))) {
    missing.push("SID o __Secure-1PSID");
  }

  const warnings: string[] = [];
  if (
    names.length > 0 &&
    !names.some((name) => SECONDARY_AUTH.has(name))
  ) {
    warnings.push(
      "No se encontraron cookies secundarias de sesión (HSID, SSID o SAPISID).",
    );
  }

  return { cookie: header, names, missing, warnings, source };
}

/** Nombres imprescindibles, para mensajes de error. */
export const REQUIRED_COOKIE_NAMES = [
  "SID o __Secure-1PSID",
  "HSID, SSID o SAPISID",
] as const;
