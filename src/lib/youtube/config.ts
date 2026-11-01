export type GoogleConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function googleConfig(): GoogleConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o YOUTUBE_REDIRECT_URI.",
    );
  }

  return { clientId, clientSecret, redirectUri };
}

export function googleApiKey(): string | null {
  return process.env.GOOGLE_API_KEY ?? null;
}

export function isYoutubeConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.YOUTUBE_REDIRECT_URI,
  );
}
