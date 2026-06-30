"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { createCategory, updateCategory } from "@/lib/admin/categories-actions";
import type { CategoryInput } from "@/lib/admin/categories-schema";
import { ImageUploader } from "@/components/admin/products/image-uploader";

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

export interface CategoryFormProps {
  mode: "create" | "edit";
  parents: { id: string; name: string }[];
  categoryId?: string;
  initial?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* Form schema (raw primitives the inputs produce). RHF holds these values;    */
/* onSubmit parses them ONCE then maps to the CategoryInput the action wants.   */
/* The server action re-validates with categoryInputSchema, so this is a        */
/* presentation-layer schema.                                                   */
/* -------------------------------------------------------------------------- */

/** Required whole-number entered as a string. Empty -> 0. */
const positionField = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v === "" || /^\d+$/.test(v), { message: "Whole numbers only" })
  .transform((v) => (v === "" ? 0 : Number.parseInt(v, 10)));

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Too long (max 120)"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers, and hyphens only"),
  parent_id: z.string(),
  description: z.string().trim().max(2000, "Too long (max 2000)"),
  image_url: z.string(),
  banner_url: z.string(),
  position: positionField,
  is_active: z.boolean(),
  seo_meta_title: z.string().trim().max(200, "Too long (max 200)"),
  seo_meta_description: z.string().trim().max(400, "Too long (max 400)"),
  seo_og_image: z.string(),
});

/** The shape RHF holds: every field is a primitive the inputs produce. */
interface FormValues {
  name: string;
  slug: string;
  parent_id: string;
  description: string;
  image_url: string;
  banner_url: string;
  position: string;
  is_active: boolean;
  seo_meta_title: string;
  seo_meta_description: string;
  seo_og_image: string;
}

type FormParsed = z.output<typeof formSchema>;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Build the default values, prefilling from `initial` in edit mode. */
function buildDefaults(props: CategoryFormProps): FormValues {
  const initial = props.initial;
  if (props.mode !== "edit" || !initial) {
    return {
      name: "",
      slug: "",
      parent_id: "",
      description: "",
      image_url: "",
      banner_url: "",
      position: "0",
      is_active: true,
      seo_meta_title: "",
      seo_meta_description: "",
      seo_og_image: "",
    };
  }

  const seo =
    typeof initial.seo === "object" && initial.seo !== null
      ? (initial.seo as Record<string, unknown>)
      : {};

  return {
    name: asString(initial.name),
    slug: asString(initial.slug),
    parent_id: String(initial.parent_id ?? ""),
    description: asString(initial.description),
    image_url: asString(initial.image_url),
    banner_url: asString(initial.banner_url),
    position: typeof initial.position === "number" ? String(initial.position) : "0",
    is_active: initial.is_active !== false,
    seo_meta_title: asString(seo.meta_title),
    seo_meta_description: asString(seo.meta_description),
    seo_og_image: asString(seo.og_image),
  };
}

/** Map the parsed form to the CategoryInput the action expects. */
function toCategoryInput(values: FormParsed): CategoryInput {
  return {
    name: values.name,
    slug: values.slug,
    parent_id: values.parent_id === "" ? null : values.parent_id,
    description: values.description,
    image_url: values.image_url === "" ? "" : values.image_url,
    banner_url: values.banner_url === "" ? "" : values.banner_url,
    position: Number(values.position) || 0,
    is_active: values.is_active,
    seo_meta_title: values.seo_meta_title,
    seo_meta_description: values.seo_meta_description,
    seo_og_image: values.seo_og_image,
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

export function CategoryForm(props: CategoryFormProps) {
  const { mode, parents, categoryId } = props;
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const slugEditedRef = useRef(mode === "edit");

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

  const nameValue = watch("name");
  const imageUrl = watch("image_url");
  const bannerUrl = watch("banner_url");

  // Auto-fill slug from the name until the user manually edits the slug.
  useEffect(() => {
    if (slugEditedRef.current) return;
    setValue("slug", slugify(asString(nameValue)), { shouldValidate: false });
  }, [nameValue, setValue]);

  const onSubmit: SubmitHandler<FormValues> = async () => {
    setServerError(null);
    // Re-derive from the raw string field state so the transform runs exactly once.
    const parsed = formSchema.parse(getValues());
    const payload = toCategoryInput(parsed);

    const res =
      mode === "edit" && categoryId
        ? await updateCategory(categoryId, payload)
        : await createCategory(payload);

    if (!res.ok) {
      setServerError(res.error ?? "Something went wrong. Please try again.");
      return;
    }
    router.push("/admin/categories");
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

  const slugRegister = register("slug");

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
          {/* General */}
          <Section title="General" description="Core category information.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Name"
                htmlFor="name"
                error={errors.name?.message}
                className="sm:col-span-2"
              >
                <input
                  id="name"
                  type="text"
                  autoComplete="off"
                  className={inputClass}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  {...register("name")}
                />
              </Field>

              <Field
                label="Slug"
                htmlFor="slug"
                error={errors.slug?.message}
                hint="URL-friendly identifier. Auto-generated from the name."
                className="sm:col-span-2"
              >
                <input
                  id="slug"
                  type="text"
                  autoComplete="off"
                  className={inputClass}
                  aria-invalid={Boolean(errors.slug)}
                  aria-describedby={errors.slug ? "slug-error" : "slug-hint"}
                  {...slugRegister}
                  onChange={(e) => {
                    slugEditedRef.current = true;
                    void slugRegister.onChange(e);
                  }}
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
                  rows={5}
                  className={textareaClass}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={errors.description ? "description-error" : undefined}
                  {...register("description")}
                />
              </Field>

              <Field
                label="Parent"
                htmlFor="parent_id"
                error={errors.parent_id?.message}
                className="sm:col-span-2"
              >
                <select id="parent_id" className={inputClass} {...register("parent_id")}>
                  <option value="">No parent (top level)</option>
                  {parents.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          {/* SEO */}
          <Section title="SEO" description="Search and social sharing metadata.">
            <div className="space-y-4">
              <Field
                label="Meta title"
                htmlFor="seo_meta_title"
                error={errors.seo_meta_title?.message}
              >
                <input
                  id="seo_meta_title"
                  type="text"
                  className={inputClass}
                  {...register("seo_meta_title")}
                />
              </Field>
              <Field
                label="Meta description"
                htmlFor="seo_meta_description"
                error={errors.seo_meta_description?.message}
              >
                <textarea
                  id="seo_meta_description"
                  rows={3}
                  className={textareaClass}
                  {...register("seo_meta_description")}
                />
              </Field>
              <Field
                label="Open Graph image URL"
                htmlFor="seo_og_image"
                error={errors.seo_og_image?.message}
              >
                <input
                  id="seo_og_image"
                  type="url"
                  className={inputClass}
                  placeholder="https://…"
                  {...register("seo_og_image")}
                />
              </Field>
            </div>
          </Section>
        </div>

        {/* Side column */}
        <div className="space-y-5">
          {/* Organization */}
          <Section title="Organization" description="Ordering and visibility.">
            <div className="space-y-4">
              <Field label="Position" htmlFor="position" error={errors.position?.message}>
                <input
                  id="position"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
                  className={inputClass}
                  aria-invalid={Boolean(errors.position)}
                  aria-describedby={errors.position ? "position-error" : undefined}
                  {...register("position")}
                />
              </Field>

              <div className="space-y-1.5">
                <label
                  htmlFor="is_active"
                  className="flex items-center gap-2 text-sm font-medium text-foreground"
                >
                  <input
                    id="is_active"
                    type="checkbox"
                    className="size-4 rounded border-border bg-card text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...register("is_active")}
                  />
                  Active
                </label>
                <p className="text-xs text-muted-foreground">Visible on the storefront</p>
              </div>
            </div>
          </Section>

          {/* Image */}
          <Section title="Image" description="Thumbnail shown in listings and nav.">
            <ImageUploader
              label="Category image"
              value={asString(imageUrl) || null}
              onChange={(url: string | null) =>
                setValue("image_url", url ?? "", {
                  shouldDirty: true,
                  shouldValidate: false,
                })
              }
            />
            {errors.image_url ? (
              <p className="mt-2 text-xs text-destructive">{errors.image_url.message}</p>
            ) : null}
          </Section>

          {/* Banner */}
          <Section title="Banner" description="Wide hero image for the category page.">
            <ImageUploader
              label="Banner image"
              value={asString(bannerUrl) || null}
              onChange={(url: string | null) =>
                setValue("banner_url", url ?? "", {
                  shouldDirty: true,
                  shouldValidate: false,
                })
              }
            />
            {errors.banner_url ? (
              <p className="mt-2 text-xs text-destructive">{errors.banner_url.message}</p>
            ) : null}
          </Section>
        </div>
      </div>

      {/* Sticky action footer */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 backdrop-blur-xl lg:pl-64">
        <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/admin/categories"
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
            {mode === "edit" ? "Save changes" : "Create category"}
          </button>
        </div>
      </div>
    </form>
  );
}
