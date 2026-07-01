/**
 * YouTube helpers — pure functions safe for both client and server. Supports
 * standard videos, youtu.be short links, Shorts, embed, and live URLs, plus a
 * bare 11-character id.
 */

export type VideoKind = "video" | "short";

const ID_PATTERNS: readonly RegExp[] = [
  /[?&]v=([A-Za-z0-9_-]{11})/,
  /youtu\.be\/([A-Za-z0-9_-]{11})/,
  /\/shorts\/([A-Za-z0-9_-]{11})/,
  /\/embed\/([A-Za-z0-9_-]{11})/,
  /\/live\/([A-Za-z0-9_-]{11})/,
];

/** Extract the 11-char video id from any common YouTube URL (or a bare id). */
export function extractYouTubeId(input: string): string | null {
  const value = input.trim();
  for (const pattern of ID_PATTERNS) {
    const match = value.match(pattern);
    if (match && match[1]) return match[1];
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  return null;
}

export function isValidYouTubeUrl(input: string): boolean {
  return extractYouTubeId(input) !== null;
}

/** A Shorts URL is a short; everything else is treated as a standard video. */
export function youTubeKind(input: string): VideoKind {
  return /\/shorts\//.test(input) ? "short" : "video";
}

/** hqdefault always exists (unlike maxresdefault, which 404s on some videos). */
export function youTubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** Privacy-friendly (no-cookie) embed URL. Only loaded when the user hits play. */
export function youTubeEmbedUrl(videoId: string, autoplay = true): string {
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
