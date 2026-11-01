export type ReproduceTarget = {
  externalUrl: string;
  freeTubeUrl: string | null;
};

function isYouTubeUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtu.be"
    );
  } catch {
    return false;
  }
}

export function reproduceTarget(url: string): ReproduceTarget {
  return {
    externalUrl: url,
    freeTubeUrl: isYouTubeUrl(url) ? `freetube://${url}` : null,
  };
}

export function formatDuration(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}
