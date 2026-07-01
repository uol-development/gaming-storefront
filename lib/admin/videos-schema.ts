import { z } from "zod";
import { extractYouTubeId } from "@/lib/data/youtube";

export const VIDEO_STATUSES = ["draft", "published"] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const VIDEO_STATUS_LABEL: Record<VideoStatus, string> = {
  draft: "Draft",
  published: "Published",
};

/** Form/validation schema for creating & editing featured videos. */
export const videoInputSchema = z.object({
  youtube_url: z
    .string()
    .trim()
    .min(1, "Paste a YouTube link")
    .refine((v) => extractYouTubeId(v) !== null, "Enter a valid YouTube video or Shorts URL"),
  title: z.string().trim().max(300).optional().or(z.literal("")),
  channel_name: z.string().trim().max(200).optional().or(z.literal("")),
  thumbnail_url: z.string().url().optional().or(z.literal("")),
  product_id: z.string().uuid("Choose a product").nullable().optional(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  status: z.enum(VIDEO_STATUSES).default("published"),
  publish_at: z.string().trim().nullable().optional(),
  unpublish_at: z.string().trim().nullable().optional(),
});

export type VideoInput = z.input<typeof videoInputSchema>;
export type VideoParsed = z.output<typeof videoInputSchema>;

const emptyToNull = (value: string | null | undefined): string | null =>
  value === undefined || value === null || value.trim() === "" ? null : value.trim();

/**
 * Map validated input + resolved YouTube metadata to a featured_videos row.
 * `meta` carries the extracted id/kind and any auto-fetched title/channel/thumb;
 * explicit input values (admin overrides) win over the fetched ones.
 */
export function toVideoRow(
  input: VideoParsed,
  meta: { videoId: string; kind: string; title: string | null; channel: string | null; thumbnail: string | null },
): Record<string, unknown> {
  return {
    youtube_url: input.youtube_url.trim(),
    video_id: meta.videoId,
    kind: meta.kind,
    title: (emptyToNull(input.title) ?? meta.title ?? "").trim(),
    channel_name: emptyToNull(input.channel_name) ?? meta.channel,
    thumbnail_url: emptyToNull(input.thumbnail_url) ?? meta.thumbnail,
    product_id: input.product_id ?? null,
    is_active: input.is_active,
    is_featured: input.is_featured,
    status: input.status,
    publish_at: emptyToNull(input.publish_at),
    unpublish_at: emptyToNull(input.unpublish_at),
  };
}
