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
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BANNER_BADGES,
  BANNER_BADGE_STYLE,
  BANNER_PLACEMENTS,
  BANNER_PLACEMENT_LABEL,
  BANNER_SIZES,
  BANNER_SIZE_LABEL,
  BANNER_STATUSES,
  BANNER_STATUS_LABEL,
  type BannerInput,
} from "@/lib/admin/banners-schema";
import { createBanner, updateBanner } from "@/lib/admin/banners-actions";
import { ImageUploader } from "@/components/admin/products/image-uploader";

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

export interface BannerFormProps {
  mode: "create" | "edit";
  bannerId?: string;
  initial?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* Form schema (over the raw primitives RHF holds).                            */
/* Every field is a string/boolean the inputs produce; the server action       */
/* re-validates the mapped BannerInput, so this is a presentation-layer schema. */
/* -------------------------------------------------------------------------- */

const formSchema = z.object({
  placement: z.enum(BANNER_PLACEMENTS),
  size: z.enum(BANNER_SIZES),
  heading: z.string().trim().max(160, "Too long (max 160)"),
  subheading: z.string().trim().max(200, "Too long (max 200)"),
  description: z.string().trim().max(500, "Too long (max 500)"),
  image_url: z.string(),
  image_mobile_url: z.string(),
  cta_text: z.string().trim().max(60, "Too long (max 60)"),
  cta_link: z.string().trim(),
  cta_new_tab: z.boolean(),
  bg_color: z.string(),
  overlay_color: z.string(),
  overlay_opacity: z
    .string()
    .refine((v) => /^\d+$/.test(v.trim()), { message: "0-100 only" })
    .refine((v) => Number(v) >= 0 && Number(v) <= 100, { message: "0-100 only" }),
  badge: z.string(),
  is_active: z.boolean(),
  status: z.enum(BANNER_STATUSES),
  publish_at: z.string(),
  expire_at: z.string(),
});

/** The shape RHF holds: every field is a primitive the inputs produce. */
interface FormValues {
  placement: (typeof BANNER_PLACEMENTS)[number];
  size: (typeof BANNER_SIZES)[number];
  heading: string;
  subheading: string;
  description: string;
  image_url: string;
  image_mobile_url: string;
  cta_text: string;
  cta_link: string;
  cta_new_tab: boolean;
  bg_color: string;
  overlay_color: string;
  overlay_opacity: string;
  badge: string;
  is_active: boolean;
  status: (typeof BANNER_STATUSES)[number];
  publish_at: string;
  expire_at: string;
}

type FormParsed = z.output<typeof formSchema>;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** An ISO datetime -> the first 16 chars a <input type="datetime-local"> wants. */
function toDatetimeLocal(value: unknown): string {
  return typeof value === "string" && value.length >= 16 ? value.slice(0, 16) : "";
}

/** Build the default values, prefilling from `initial` in edit mode. */
function buildDefaults(props: BannerFormProps): FormValues {
  const initial = props.initial;
  if (props.mode !== "edit" || !initial) {
    return {
      placement: "before_flash_sale",
      size: "medium",
      heading: "",
      subheading: "",
      description: "",
      image_url: "",
      image_mobile_url: "",
      cta_text: "",
      cta_link: "",
      cta_new_tab: false,
      bg_color: "",
      overlay_color: "#000000",
      overlay_opacity: "0",
      badge: "",
      is_active: true,
      status: "published",
      publish_at: "",
      expire_at: "",
    };
  }

  const placementRaw = asString(initial.placement);
  const placement = (BANNER_PLACEMENTS as readonly string[]).includes(placementRaw)
    ? (placementRaw as FormValues["placement"])
    : "before_flash_sale";

  const sizeRaw = asString(initial.size);
  const size = (BANNER_SIZES as readonly string[]).includes(sizeRaw)
    ? (sizeRaw as FormValues["size"])
    : "medium";

  const statusRaw = asString(initial.status);
  const status = (BANNER_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as FormValues["status"])
    : "published";

  return {
    placement,
    size,
    heading: asString(initial.heading),
    subheading: asString(initial.subheading),
    description: asString(initial.description),
    image_url: asString(initial.image_url),
    image_mobile_url: asString(initial.image_mobile_url),
    cta_text: asString(initial.cta_text),
    cta_link: asString(initial.cta_link),
    cta_new_tab: initial.cta_new_tab === true,
    bg_color: asString(initial.bg_color),
    overlay_color: asString(initial.overlay_color) || "#000000",
    overlay_opacity: String(initial.overlay_opacity ?? 0),
    badge: asString(initial.badge),
    is_active: initial.is_active !== false,
    status,
    publish_at: toDatetimeLocal(initial.publish_at),
    expire_at: toDatetimeLocal(initial.expire_at),
  };
}

/** Map the parsed (raw) form values to the BannerInput the action expects. */
function toBannerInput(values: FormParsed): BannerInput {
  return {
    placement: values.placement,
    size: values.size,
    heading: values.heading,
    subheading: values.subheading,
    description: values.description,
    image_url: values.image_url,
    image_mobile_url: values.image_mobile_url,
    cta_text: values.cta_text,
    cta_link: values.cta_link,
    cta_new_tab: values.cta_new_tab,
    bg_color: values.bg_color,
    overlay_color: values.overlay_color,
    overlay_opacity: Number(values.overlay_opacity) || 0,
    badge: values.badge === "" ? "" : values.badge,
    is_active: values.is_active,
    status: values.status,
    publish_at: values.publish_at || null,
    expire_at: values.expire_at || null,
  };
}

/* -------------------------------------------------------------------------- */
/* Small presentational primitives                                             */
/* -------------------------------------------------------------------------- */

const inputClass =
  "h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const textareaClass =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
/* Main form                                                                   */
/* -------------------------------------------------------------------------- */

export function BannerForm(props: BannerFormProps) {
  const { mode, bannerId } = props;
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

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

  // Watched values feed the live preview.
  const wSize = watch("size");
  const wHeading = watch("heading");
  const wSubheading = watch("subheading");
  const wImageUrl = watch("image_url");
  const wImageMobileUrl = watch("image_mobile_url");
  const wCtaText = watch("cta_text");
  const wOverlayColor = watch("overlay_color");
  const wOverlayOpacity = watch("overlay_opacity");
  const wBadge = watch("badge");
  const wBgColor = watch("bg_color");

  const overlayOpacityNumber = useMemo(() => {
    const raw = Number(wOverlayOpacity);
    if (!Number.isFinite(raw)) return 0;
    return Math.min(100, Math.max(0, raw));
  }, [wOverlayOpacity]);

  const onSubmit: SubmitHandler<FormValues> = async () => {
    setServerError(null);
    // Re-parse the raw string field state so the transform runs exactly once.
    const parsed = formSchema.parse(getValues());
    const payload = toBannerInput(parsed);

    const res =
      mode === "edit" && bannerId
        ? await updateBanner(bannerId, payload)
        : await createBanner(payload);

    if (!res.ok) {
      setServerError(res.error ?? "Something went wrong. Please try again.");
      return;
    }
    router.push("/admin/banners");
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
          {/* Content */}
          <Section title="Content" description="Text shown on the banner.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Heading"
                htmlFor="heading"
                error={errors.heading?.message}
                className="sm:col-span-2"
              >
                <input
                  id="heading"
                  type="text"
                  autoComplete="off"
                  className={inputClass}
                  aria-invalid={Boolean(errors.heading)}
                  aria-describedby={errors.heading ? "heading-error" : undefined}
                  {...register("heading")}
                />
              </Field>

              <Field
                label="Subheading"
                htmlFor="subheading"
                error={errors.subheading?.message}
                className="sm:col-span-2"
              >
                <input
                  id="subheading"
                  type="text"
                  autoComplete="off"
                  className={inputClass}
                  aria-invalid={Boolean(errors.subheading)}
                  aria-describedby={errors.subheading ? "subheading-error" : undefined}
                  {...register("subheading")}
                />
              </Field>

              <Field
                label="Description"
                htmlFor="description"
                error={errors.description?.message}
                className="sm:col-span-2"
              >
                <textarea
                  id="description"
                  rows={4}
                  className={textareaClass}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={errors.description ? "description-error" : undefined}
                  {...register("description")}
                />
              </Field>

              <Field
                label="Badge"
                htmlFor="badge"
                error={errors.badge?.message}
                className="sm:col-span-2"
              >
                <select id="badge" className={inputClass} {...register("badge")}>
                  <option value="">No badge</option>
                  {BANNER_BADGES.map((badge) => (
                    <option key={badge} value={badge}>
                      {badge}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          {/* Call to action */}
          <Section title="Call to action" description="Optional button shown on the banner.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Button text" htmlFor="cta_text" error={errors.cta_text?.message}>
                <input
                  id="cta_text"
                  type="text"
                  className={inputClass}
                  placeholder="Shop now"
                  {...register("cta_text")}
                />
              </Field>

              <Field
                label="Button link"
                htmlFor="cta_link"
                error={errors.cta_link?.message}
                hint="Internal path (/products) or full URL"
              >
                <input
                  id="cta_link"
                  type="text"
                  className={inputClass}
                  placeholder="/products"
                  aria-describedby={errors.cta_link ? "cta_link-error" : "cta_link-hint"}
                  {...register("cta_link")}
                />
              </Field>

              <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("cta_new_tab")}
                />
                Open in a new tab
              </label>
            </div>
          </Section>

          {/* Images */}
          <Section title="Images" description="Desktop and optional mobile artwork.">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <span className="block text-sm font-medium text-foreground">Desktop image</span>
                <ImageUploader
                  value={asString(wImageUrl) || null}
                  onChange={(url: string | null) =>
                    setValue("image_url", url ?? "", {
                      shouldDirty: true,
                      shouldValidate: false,
                    })
                  }
                  label="Desktop image"
                />
                {errors.image_url ? (
                  <p className="text-xs text-destructive">{errors.image_url.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <span className="block text-sm font-medium text-foreground">
                  Mobile image (optional)
                </span>
                <ImageUploader
                  value={asString(wImageMobileUrl) || null}
                  onChange={(url: string | null) =>
                    setValue("image_mobile_url", url ?? "", {
                      shouldDirty: true,
                      shouldValidate: false,
                    })
                  }
                  label="Mobile image (optional)"
                />
                {errors.image_mobile_url ? (
                  <p className="text-xs text-destructive">{errors.image_mobile_url.message}</p>
                ) : null}
              </div>
            </div>
          </Section>
        </div>

        {/* Side column */}
        <div className="space-y-5">
          {/* Placement & size */}
          <Section title="Placement & size" description="Where and how large the banner renders.">
            <div className="space-y-4">
              <Field label="Placement" htmlFor="placement" error={errors.placement?.message}>
                <select id="placement" className={inputClass} {...register("placement")}>
                  {BANNER_PLACEMENTS.map((placement) => (
                    <option key={placement} value={placement}>
                      {BANNER_PLACEMENT_LABEL[placement]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Size"
                htmlFor="size"
                error={errors.size?.message}
                hint={`Recommended ratio: ${BANNER_SIZE_LABEL[wSize]}`}
              >
                <select id="size" className={inputClass} {...register("size")}>
                  {BANNER_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {BANNER_SIZE_LABEL[size]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          {/* Style */}
          <Section title="Style" description="Background and overlay treatment.">
            <div className="space-y-4">
              <Field
                label="Background color (optional)"
                htmlFor="bg_color"
                error={errors.bg_color?.message}
              >
                <input
                  id="bg_color"
                  type="color"
                  className="h-10 w-full cursor-pointer rounded-md border border-border bg-card px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("bg_color")}
                />
              </Field>

              <Field
                label="Overlay color"
                htmlFor="overlay_color"
                error={errors.overlay_color?.message}
              >
                <input
                  id="overlay_color"
                  type="color"
                  className="h-10 w-full cursor-pointer rounded-md border border-border bg-card px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("overlay_color")}
                />
              </Field>

              <Field
                label={`Overlay opacity (${overlayOpacityNumber}%)`}
                htmlFor="overlay_opacity"
                error={errors.overlay_opacity?.message}
              >
                <input
                  id="overlay_opacity"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  className="w-full accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("overlay_opacity")}
                />
              </Field>
            </div>
          </Section>

          {/* Visibility */}
          <Section title="Visibility" description="Draft or published, and whether it's shown.">
            <div className="space-y-4">
              <Field label="Status" htmlFor="status" error={errors.status?.message}>
                <select id="status" className={inputClass} {...register("status")}>
                  {BANNER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {BANNER_STATUS_LABEL[status]}
                    </option>
                  ))}
                </select>
              </Field>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("is_active")}
                />
                Enabled
              </label>
            </div>
          </Section>

          {/* Schedule */}
          <Section title="Schedule (optional)" description="Automatically show/hide by date.">
            <div className="space-y-4">
              <Field label="Publish at" htmlFor="publish_at" error={errors.publish_at?.message}>
                <input
                  id="publish_at"
                  type="datetime-local"
                  className={inputClass}
                  {...register("publish_at")}
                />
              </Field>

              <Field label="Expire at" htmlFor="expire_at" error={errors.expire_at?.message}>
                <input
                  id="expire_at"
                  type="datetime-local"
                  className={inputClass}
                  {...register("expire_at")}
                />
              </Field>
            </div>
          </Section>

          {/* Preview */}
          <Section title="Preview" description="How the banner will look once published.">
            <div
              className="relative aspect-video w-full overflow-hidden rounded-xl border border-border"
              style={{ backgroundColor: asString(wBgColor) || undefined }}
            >
              {asString(wImageUrl) ? (
                <img
                  src={asString(wImageUrl)}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-secondary text-xs text-muted-foreground">
                  No image
                </div>
              )}

              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: asString(wOverlayColor) || "#000000",
                  opacity: overlayOpacityNumber / 100,
                }}
              />

              <div className="absolute inset-0 flex flex-col justify-center gap-2 p-4 text-white">
                {asString(wBadge) ? (
                  <span
                    className={cn(
                      "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                      BANNER_BADGE_STYLE[asString(wBadge)] ?? "bg-white/20 text-white",
                    )}
                  >
                    {asString(wBadge)}
                  </span>
                ) : null}

                {asString(wHeading) ? (
                  <p className="text-lg font-bold leading-tight drop-shadow">{asString(wHeading)}</p>
                ) : null}

                {asString(wSubheading) ? (
                  <p className="text-xs opacity-90 drop-shadow">{asString(wSubheading)}</p>
                ) : null}

                {asString(wCtaText) ? (
                  <span className="mt-1 inline-flex w-fit items-center rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                    {asString(wCtaText)}
                  </span>
                ) : null}
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* Sticky action footer */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:pl-64">
        <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/admin/banners"
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
            {mode === "edit" ? "Save changes" : "Add banner"}
          </button>
        </div>
      </div>
    </form>
  );
}
