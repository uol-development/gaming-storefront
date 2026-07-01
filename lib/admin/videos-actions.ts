"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, can, type AdminProfile } from "@/lib/auth/server";
import { logAudit } from "@/lib/admin/audit";
import { videoInputSchema, toVideoRow, type VideoInput } from "@/lib/admin/videos-schema";
import { extractYouTubeId, youTubeKind, youTubeThumbnail } from "@/lib/data/youtube";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export interface VideoMetadata {
  videoId: string;
  kind: string;
  title: string;
  channel: string;
  thumbnail: string;
}

async function requireManage(): Promise<AdminProfile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");
  if (!can.manageVideos(profile.role))
    throw new Error("You don't have permission to manage videos");
  return profile;
}

function firstIssue(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Invalid input";
}

function plural(n: number): string {
  return n === 1 ? "video" : "videos";
}

function revalidateVideos(id?: string): void {
  revalidatePath("/admin/videos");
  if (id) revalidatePath(`/admin/videos/${id}`);
  revalidatePath("/"); // homepage Featured in Videos section
}

/** Refresh the linked product's page so its "In the videos" section updates. */
async function revalidateProductPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  productId: string | null | undefined,
): Promise<void> {
  if (!productId) return;
  const { data } = await supabase.from("products").select("slug").eq("id", productId).maybeSingle();
  const slug = (data as { slug?: string } | null)?.slug;
  if (slug) revalidatePath(`/products/${slug}`);
}

/** Fetch title/channel/thumbnail from YouTube's public oEmbed endpoint (no key). */
async function fetchOEmbed(
  url: string,
): Promise<{ title: string | null; channel: string | null; thumbnail: string | null }> {
  try {
    const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) return { title: null, channel: null, thumbnail: null };
    const data = (await res.json()) as {
      title?: unknown;
      author_name?: unknown;
      thumbnail_url?: unknown;
    };
    return {
      title: typeof data.title === "string" ? data.title : null,
      channel: typeof data.author_name === "string" ? data.author_name : null,
      thumbnail: typeof data.thumbnail_url === "string" ? data.thumbnail_url : null,
    };
  } catch {
    return { title: null, channel: null, thumbnail: null };
  }
}

/** Client-callable: resolve metadata for a pasted URL to prefill the form. */
export async function fetchVideoMetadata(
  url: string,
): Promise<{ ok: boolean; error?: string; data?: VideoMetadata }> {
  await requireManage();
  const videoId = extractYouTubeId(url);
  if (!videoId) return { ok: false, error: "Enter a valid YouTube video or Shorts URL" };
  const oe = await fetchOEmbed(url);
  return {
    ok: true,
    data: {
      videoId,
      kind: youTubeKind(url),
      title: oe.title ?? "",
      channel: oe.channel ?? "",
      thumbnail: oe.thumbnail ?? youTubeThumbnail(videoId),
    },
  };
}

async function resolveMeta(url: string, input: VideoInput) {
  const videoId = extractYouTubeId(url) ?? "";
  const kind = youTubeKind(url);
  const needsFetch = !input.title || !input.thumbnail_url || !input.channel_name;
  const oe = needsFetch
    ? await fetchOEmbed(url)
    : { title: null, channel: null, thumbnail: null };
  return {
    videoId,
    kind,
    title: oe.title,
    channel: oe.channel,
    thumbnail: oe.thumbnail ?? youTubeThumbnail(videoId),
  };
}

export async function createVideo(input: VideoInput): Promise<ActionResult> {
  await requireManage();
  const parsed = videoInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };

  const supabase = await createSupabaseServerClient();
  const { data: maxRow } = await supabase
    .from("featured_videos")
    .select("position")
    .is("deleted_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = ((maxRow?.position as number | undefined) ?? 0) + 1;

  const meta = await resolveMeta(parsed.data.youtube_url, input);
  const row = toVideoRow(parsed.data, meta);
  row.position = nextPos;

  const { data, error } = await supabase.from("featured_videos").insert(row).select("id").single();
  if (error) return { ok: false, error: error.message };
  const id = (data as { id: string }).id;
  await logAudit({
    action: "create",
    entity: "video",
    entityId: id,
    summary: `Added video "${String(row.title)}"`,
  });
  revalidateVideos();
  await revalidateProductPage(supabase, parsed.data.product_id ?? null);
  return { ok: true, id };
}

export async function updateVideo(id: string, input: VideoInput): Promise<ActionResult> {
  await requireManage();
  const parsed = videoInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };

  const supabase = await createSupabaseServerClient();
  const meta = await resolveMeta(parsed.data.youtube_url, input);
  const row = toVideoRow(parsed.data, meta); // note: does not touch `position`

  const { error } = await supabase.from("featured_videos").update(row).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAudit({
    action: "update",
    entity: "video",
    entityId: id,
    summary: `Updated video "${String(row.title)}"`,
  });
  revalidateVideos(id);
  await revalidateProductPage(supabase, parsed.data.product_id ?? null);
  return { ok: true, id };
}

export async function reorderVideos(orderedIds: string[]): Promise<ActionResult> {
  await requireManage();
  if (orderedIds.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  let index = 0;
  for (const videoId of orderedIds) {
    const { error } = await supabase
      .from("featured_videos")
      .update({ position: index })
      .eq("id", videoId);
    if (error) return { ok: false, error: error.message };
    index += 1;
  }
  await logAudit({ action: "reorder", entity: "video", summary: `Reordered ${orderedIds.length} ${plural(orderedIds.length)}` });
  revalidateVideos();
  return { ok: true };
}

export async function setVideosActive(ids: string[], active: boolean): Promise<ActionResult> {
  await requireManage();
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("featured_videos").update({ is_active: active }).in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "status", entity: "video", summary: `${active ? "Enabled" : "Disabled"} ${ids.length} ${plural(ids.length)}` });
  revalidateVideos();
  return { ok: true };
}

export async function setVideosFeatured(ids: string[], featured: boolean): Promise<ActionResult> {
  await requireManage();
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("featured_videos").update({ is_featured: featured }).in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "feature", entity: "video", summary: `${featured ? "Featured" : "Unfeatured"} ${ids.length} ${plural(ids.length)}` });
  revalidateVideos();
  return { ok: true };
}

export async function setVideosStatus(ids: string[], status: "draft" | "published"): Promise<ActionResult> {
  await requireManage();
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("featured_videos").update({ status }).in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "status", entity: "video", summary: `Set ${ids.length} ${plural(ids.length)} to ${status}` });
  revalidateVideos();
  return { ok: true };
}

export async function softDeleteVideos(ids: string[]): Promise<ActionResult> {
  const profile = await requireManage();
  if (!can.delete(profile.role)) return { ok: false, error: "You don't have permission to delete" };
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("featured_videos")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "delete", entity: "video", summary: `Moved ${ids.length} ${plural(ids.length)} to trash` });
  revalidateVideos();
  return { ok: true };
}

export async function restoreVideos(ids: string[]): Promise<ActionResult> {
  await requireManage();
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("featured_videos").update({ deleted_at: null }).in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "restore", entity: "video", summary: `Restored ${ids.length} ${plural(ids.length)}` });
  revalidateVideos();
  return { ok: true };
}

export async function permanentlyDeleteVideos(ids: string[]): Promise<ActionResult> {
  const profile = await requireManage();
  if (!can.delete(profile.role)) return { ok: false, error: "You don't have permission to delete" };
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("featured_videos").delete().in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "purge", entity: "video", summary: `Permanently deleted ${ids.length} ${plural(ids.length)}` });
  revalidateVideos();
  return { ok: true };
}
