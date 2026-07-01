"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useForm,
  type Resolver,
  type SubmitErrorHandler,
  type SubmitHandler,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  VIDEO_STATUSES,
  VIDEO_STATUS_LABEL,
  type VideoInput,
} from "@/lib/admin/videos-schema";
import { createVideo, updateVideo, fetchVideoMetadata } from "@/lib/admin/videos-actions";
import {
  extractYouTubeId,
  youTubeThumbnail,
  youTubeEmbedUrl,
} from "@/lib/data/youtube";

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

export interface VideoFormProps {
  mode: "create" | "edit";
  videoId?: string;
  initial?: Record<string, unknown>;
  products: { id: string; name: string }[];
}

/* -------------------------------------------------------------------------- */
/* Form schema — validates the raw primitives RHF holds. The server action     */
/* re-validates the mapped VideoInput payload, so this is a presentation-layer  */
/* schema mirroring the same rules the storefront relies on.                    */
/* -------------------------------------------------------------------------- */

const formSchema = z.object({
  youtube_url: z
    .string()
    .trim()
    .min(1, "Paste a YouTube link")
    .refine((v) => extractYouTubeId(v) !== null, "Enter a valid YouTube video or Shorts URL"),
  title: z.string().trim().max(300, "Too long (max 300)"),
  channel_name: z.string().trim().max(200, "Too long (max 200)"),
  thumbnail_url: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "Enter a valid URL"),
  product_id: z.string().min(1, "Choose a product"),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  status: z.enum(VIDEO_STATUSES),
  publish_at: z.string(),
  unpublish_at: z.string(),
});

/** The shape RHF holds: every field is a primitive the inputs produce. */
interface FormValues {
  youtube_url: string;
  title: string;
  channel_name: string;
  thumbnail_url: string;
  product_id: string;
  is_active: boolean;
  is_featured: boolean;
  status: (typeof VIDEO_STATUSES)[number];
  publish_at: string;
  unpublish_at: string;
}

type FormParsed = z.output<typeof formSchema>;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** ISO string -> datetime-local value (YYYY-MM-DDTHH:mm). "" when absent. */
function toDateTimeLocal(value: unknown): string {
  return typeof value === "string" && value.length >= 16 ? value.slice(0, 16) : "";
}

/** Build the default values, prefilling from `initial` in edit mode. */
function buildDefaults(props: VideoFormProps): FormValues {
  const initial = props.initial;
  if (props.mode !== "edit" || !initial) {
    return {
      youtube_url: "",
      title: "",
      channel_name: "",
      thumbnail_url: "",
      product_id: "",
      is_active: true,
      is_featured: false,
      status: "published",
      publish_at: "",
      unpublish_at: "",
    };
  }

  return {
    youtube_url: asString(initial.youtube_url),
    title: asString(initial.title),
    channel_name: asString(initial.channel_name),
    thumbnail_url: asString(initial.thumbnail_url),
    product_id: String(initial.product_id ?? ""),
    is_active: initial.is_active !== false,
    is_featured: initial.is_featured === true,
    status: initial.status === "draft" ? "draft" : "published",
    publish_at: toDateTimeLocal(initial.publish_at),
    unpublish_at: toDateTimeLocal(initial.unpublish_at),
  };
}

/** Map the parsed form values to the VideoInput the action expects. */
function toVideoInput(values: FormParsed): VideoInput {
  return {
    youtube_url: values.youtube_url,
    title: values.title,
    channel_name: values.channel_name,
    thumbnail_url: values.thumbnail_url,
    product_id: values.product_id === "" ? null : values.product_id,
    is_active: values.is_active,
    is_featured: values.is_featured,
    status: values.status,
    publish_at: values.publish_at || null,
    unpublish_at: values.unpublish_at || null,
  };
}

/* -------------------------------------------------------------------------- */
/* Small presentational primitives                                             */
/* -------------------------------------------------------------------------- */

const inputClass =
  "h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Live preview                                                                */
/* -------------------------------------------------------------------------- */

function VideoPreview({
  youtubeUrl,
  thumbnailUrl,
}: {
  youtubeUrl: string;
  thumbnailUrl: string;
}) {
  const [playing, setPlaying] = useState(false);
  const videoId = extractYouTubeId(youtubeUrl);
  const thumbSrc =
    thumbnailUrl.trim().length > 0
      ? thumbnailUrl.trim()
      : videoId
        ? youTubeThumbnail(videoId)
        : null;

  // Reset the lazily-mounted iframe if the underlying video changes.
  const canPlay = videoId !== null;

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-secondary">
        {playing && canPlay ? (
          <iframe
            key={videoId}
            src={youTubeEmbedUrl(videoId, true)}
            title="Video preview"
            className="absolute inset-0 size-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : thumbSrc ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbSrc}
              alt="Video thumbnail"
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 grid place-items-center bg-black/25">
              <span className="grid size-14 place-items-center rounded-full bg-black/60 text-white">
                <Play className="size-6 translate-x-0.5" fill="currentColor" />
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            Paste a YouTube link to preview
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setPlaying(true)}
        disabled={!canPlay || playing}
        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-secondary px-3 text-sm font-medium text-foreground hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Play className="size-4" fill="currentColor" />
        {playing ? "Playing" : "Play preview"}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main form                                                                   */
/* -------------------------------------------------------------------------- */

export function VideoForm(props: VideoFormProps) {
  const { mode, videoId, products } = props;
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [fetchState, setFetchState] = useState<{
    loading: boolean;
    note: string | null;
    error: string | null;
  }>({ loading: false, note: null, error: null });

  const defaultValues = useMemo(() => buildDefaults(props), [props]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues,
    mode: "onBlur",
  });

  const youtubeUrlValue = watch("youtube_url");
  const thumbnailUrlValue = watch("thumbnail_url");

  async function onFetchDetails() {
    const url = getValues("youtube_url").trim();
    if (url.length === 0) {
      setFetchState({ loading: false, note: null, error: "Paste a YouTube link first" });
      return;
    }
    setFetchState({ loading: true, note: null, error: null });
    const res = await fetchVideoMetadata(url);
    if (!res.ok || !res.data) {
      setFetchState({
        loading: false,
        note: null,
        error: res.error ?? "Couldn't fetch details. Enter them manually.",
      });
      return;
    }
    const data = res.data;
    setValue("title", data.title, { shouldDirty: true, shouldValidate: false });
    setValue("channel_name", data.channel, { shouldDirty: true, shouldValidate: false });
    setValue("thumbnail_url", data.thumbnail, { shouldDirty: true, shouldValidate: false });
    setFetchState({ loading: false, note: "Details filled from YouTube.", error: null });
  }

  const onSubmit: SubmitHandler<FormValues> = async () => {
    setServerError(null);
    // Re-derive from the raw field state so the schema transform runs exactly once.
    const parsed = formSchema.parse(getValues());
    const payload = toVideoInput(parsed);

    const res =
      mode === "edit" && videoId
        ? await updateVideo(videoId, payload)
        : await createVideo(payload);

    if (!res.ok) {
      setServerError(res.error ?? "Something went wrong. Please try again.");
      return;
    }
    router.push("/admin/videos");
    router.refresh();
  };

  // When validation blocks submit, surface it and jump to the first bad field.
  const onInvalid: SubmitErrorHandler<FormValues> = (formErrors) => {
    setServerError("Please fix the highlighted fields and try again.");
    const firstKey = Object.keys(formErrors)[0];
    if (firstKey) {
      const el = document.getElementById(firstKey);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="pb-24">
      {serverError ? (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-5 lg:col-span-2">
          {/* YouTube */}
          <Section title="YouTube" description="Paste a video or Shorts link, then fetch its details.">
            <Field
              label="YouTube URL"
              htmlFor="youtube_url"
              error={errors.youtube_url?.message}
              hint="Supports standard videos, youtu.be links, and Shorts."
            >
              <div className="flex gap-2">
                <input
                  id="youtube_url"
                  type="url"
                  autoComplete="off"
                  placeholder="https://www.youtube.com/watch?v=…"
                  className={inputClass}
                  aria-invalid={Boolean(errors.youtube_url)}
                  aria-describedby={
                    errors.youtube_url ? "youtube_url-error" : "youtube_url-hint"
                  }
                  {...register("youtube_url")}
                />
                <button
                  type="button"
                  onClick={() => void onFetchDetails()}
                  disabled={fetchState.loading}
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-border bg-secondary px-3 text-sm font-medium text-foreground hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {fetchState.loading ? <Loader2 className="size-4 animate-spin" /> : null}
                  Fetch details
                </button>
              </div>
            </Field>

            {fetchState.note ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                {fetchState.note}
              </p>
            ) : null}
            {fetchState.error ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="size-3.5" />
                {fetchState.error}
              </p>
            ) : null}
          </Section>

          {/* Details */}
          <Section title="Details" description="Auto-filled from YouTube — edit as needed.">
            <div className="space-y-4">
              <Field label="Title" htmlFor="title" error={errors.title?.message}>
                <input
                  id="title"
                  type="text"
                  className={inputClass}
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? "title-error" : undefined}
                  {...register("title")}
                />
              </Field>

              <Field
                label="Channel name"
                htmlFor="channel_name"
                error={errors.channel_name?.message}
              >
                <input
                  id="channel_name"
                  type="text"
                  className={inputClass}
                  aria-invalid={Boolean(errors.channel_name)}
                  aria-describedby={errors.channel_name ? "channel_name-error" : undefined}
                  {...register("channel_name")}
                />
              </Field>

              <Field
                label="Thumbnail URL"
                htmlFor="thumbnail_url"
                error={errors.thumbnail_url?.message}
                hint="Auto-filled from YouTube; override if you want a custom image."
              >
                <input
                  id="thumbnail_url"
                  type="url"
                  placeholder="https://…"
                  className={inputClass}
                  aria-invalid={Boolean(errors.thumbnail_url)}
                  aria-describedby={
                    errors.thumbnail_url ? "thumbnail_url-error" : "thumbnail_url-hint"
                  }
                  {...register("thumbnail_url")}
                />
              </Field>
            </div>
          </Section>

          {/* Product */}
          <Section
            title="Product"
            description="Linked product shown alongside the video on the storefront."
          >
            <Field
              label="Product"
              htmlFor="product_id"
              error={errors.product_id?.message}
              hint="The storefront only shows videos that have a product."
            >
              <select
                id="product_id"
                className={inputClass}
                aria-invalid={Boolean(errors.product_id)}
                aria-describedby={errors.product_id ? "product_id-error" : "product_id-hint"}
                {...register("product_id")}
              >
                <option value="">Select a product…</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </Field>
          </Section>
        </div>

        {/* Side column */}
        <div className="space-y-5">
          {/* Preview */}
          <Section title="Preview" description="How the video appears before playback.">
            <VideoPreview youtubeUrl={youtubeUrlValue} thumbnailUrl={thumbnailUrlValue} />
          </Section>

          {/* Visibility */}
          <Section title="Visibility" description="Where and whether this video appears.">
            <div className="space-y-4">
              <Field label="Status" htmlFor="status" error={errors.status?.message}>
                <select id="status" className={inputClass} {...register("status")}>
                  {VIDEO_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {VIDEO_STATUS_LABEL[status]}
                    </option>
                  ))}
                </select>
              </Field>

              <label className="flex items-start gap-3">
                <input
                  id="is_active"
                  type="checkbox"
                  className="mt-0.5 size-4 rounded border-border bg-card text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("is_active")}
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">Enabled</span>
                  <span className="block text-xs text-muted-foreground">
                    Disabled videos are hidden from the storefront
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  id="is_featured"
                  type="checkbox"
                  className="mt-0.5 size-4 rounded border-border bg-card text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("is_featured")}
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    Feature on homepage
                  </span>
                </span>
              </label>
            </div>
          </Section>

          {/* Schedule */}
          <Section title="Schedule (optional)" description="Control when the video goes live.">
            <div className="space-y-4">
              <Field
                label="Publish at"
                htmlFor="publish_at"
                error={errors.publish_at?.message}
                hint="Leave blank to publish immediately"
              >
                <input
                  id="publish_at"
                  type="datetime-local"
                  className={inputClass}
                  {...register("publish_at")}
                />
              </Field>

              <Field
                label="Unpublish at"
                htmlFor="unpublish_at"
                error={errors.unpublish_at?.message}
                hint="Leave blank to keep it live"
              >
                <input
                  id="unpublish_at"
                  type="datetime-local"
                  className={inputClass}
                  {...register("unpublish_at")}
                />
              </Field>
            </div>
          </Section>
        </div>
      </div>

      {/* Sticky action footer */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:pl-64">
        <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/admin/videos"
            className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "edit" ? "Save changes" : "Add video"}
          </button>
        </div>
      </div>
    </form>
  );
}
