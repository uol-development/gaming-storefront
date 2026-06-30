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
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRODUCT_STATUSES,
  deriveInventoryStatus,
  type ProductInput,
} from "@/lib/admin/products-schema";
import { createProduct, updateProduct } from "@/lib/admin/products-actions";
import { ImageUploader } from "@/components/admin/products/image-uploader";

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

export interface ProductFormProps {
  mode: "create" | "edit";
  categories: { id: string; name: string }[];
  productId?: string;
  initial?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* Form schema (DOLLARS in the UI; converted to integer cents on submit).      */
/* This mirrors productInputSchema but the three money fields are dollars so    */
/* the inputs read naturally (24.99). The server action re-validates the cents  */
/* payload with productInputSchema, so this is a presentation-layer schema.     */
/* -------------------------------------------------------------------------- */

/**
 * A required dollar amount entered as a string. Empty -> 0. Validates >= 0.
 * Keeping the *input* type a plain string makes the RHF field types clean.
 */
const requiredDollarField = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v === "" || !Number.isNaN(Number(v)), { message: "Enter a valid amount" })
  .refine((v) => v === "" || Number(v) >= 0, { message: "Must be 0 or more" })
  .transform((v) => (v === "" ? 0 : Number(v)));

/** An optional dollar amount entered as a string. Empty -> null. Validates >= 0. */
const optionalDollarField = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v === "" || !Number.isNaN(Number(v)), { message: "Enter a valid amount" })
  .refine((v) => v === "" || Number(v) >= 0, { message: "Must be 0 or more" })
  .transform((v): number | null => (v === "" ? null : Number(v)));

/** Required integer quantity entered as a string. Empty -> 0. */
const quantityField = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v === "" || /^\d+$/.test(v), { message: "Whole numbers only" })
  .transform((v) => (v === "" ? 0 : Number.parseInt(v, 10)));

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Too long (max 200)"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers, and hyphens only"),
  sku: z.string().trim().max(120),
  barcode: z.string().trim().max(120),
  brand: z.string().trim().max(120),
  category_id: z.string(),
  short_description: z.string().trim().max(500, "Too long (max 500)"),
  description: z.string(),
  features: z.array(z.string().trim().min(1)),
  tags: z.array(z.string().trim().min(1)),
  status: z.enum(PRODUCT_STATUSES),
  scheduled_at: z.string(),
  price: requiredDollarField,
  sale_price: optionalDollarField,
  cost_price: optionalDollarField,
  tax_class: z.string().trim().max(120),
  shipping_class: z.string().trim().max(120),
  weight: optionalDollarField,
  warranty: z.string().trim().max(200),
  stock_quantity: quantityField,
  featured_image_url: z.string(),
  seo_meta_title: z.string().trim().max(200, "Too long (max 200)"),
  seo_meta_description: z.string().trim().max(400, "Too long (max 400)"),
  seo_og_image: z.string(),
});

/** The shape RHF holds: every field is a primitive the inputs produce. */
interface FormValues {
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  brand: string;
  category_id: string;
  short_description: string;
  description: string;
  features: string[];
  tags: string[];
  status: (typeof PRODUCT_STATUSES)[number];
  scheduled_at: string;
  price: string;
  sale_price: string;
  cost_price: string;
  tax_class: string;
  shipping_class: string;
  weight: string;
  warranty: string;
  stock_quantity: string;
  featured_image_url: string;
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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

/** cents (number|null) -> dollar string for a controlled input ("" when null). */
function centsToDollarField(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value / 100) : "";
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Build the default values, prefilling from `initial` in edit mode. */
function buildDefaults(props: ProductFormProps): FormValues {
  const initial = props.initial;
  if (props.mode !== "edit" || !initial) {
    return {
      name: "",
      slug: "",
      sku: "",
      barcode: "",
      brand: "",
      category_id: "",
      short_description: "",
      description: "",
      features: [],
      tags: [],
      status: "draft",
      scheduled_at: "",
      price: "",
      sale_price: "",
      cost_price: "",
      tax_class: "",
      shipping_class: "",
      weight: "",
      warranty: "",
      stock_quantity: "",
      featured_image_url: "",
      seo_meta_title: "",
      seo_meta_description: "",
      seo_og_image: "",
    };
  }

  const seo =
    typeof initial.seo === "object" && initial.seo !== null
      ? (initial.seo as Record<string, unknown>)
      : {};

  const statusRaw = asString(initial.status);
  const status = (PRODUCT_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as FormValues["status"])
    : "draft";

  return {
    name: asString(initial.name),
    slug: asString(initial.slug),
    sku: asString(initial.sku),
    barcode: asString(initial.barcode),
    brand: asString(initial.brand),
    category_id: asString(initial.category_id),
    short_description: asString(initial.short_description),
    description: asString(initial.description),
    features: asStringArray(initial.features),
    tags: asStringArray(initial.tags),
    status,
    scheduled_at: asString(initial.scheduled_at),
    price: centsToDollarField(initial.price),
    sale_price: centsToDollarField(initial.sale_price),
    cost_price: centsToDollarField(initial.cost_price),
    tax_class: asString(initial.tax_class),
    shipping_class: asString(initial.shipping_class),
    weight: typeof initial.weight === "number" ? String(initial.weight) : "",
    warranty: asString(initial.warranty),
    stock_quantity:
      typeof initial.stock_quantity === "number" ? String(initial.stock_quantity) : "",
    featured_image_url: asString(initial.featured_image_url),
    seo_meta_title: asString(seo.meta_title),
    seo_meta_description: asString(seo.meta_description),
    seo_og_image: asString(seo.og_image),
  };
}

/** dollars (or null) -> integer cents (or null). */
function dollarsToCents(value: number | null): number | null {
  return value === null ? null : Math.round(value * 100);
}

/** Map the parsed (dollar) form to the cents ProductInput the action expects. */
function toProductInput(values: FormParsed): ProductInput {
  return {
    name: values.name,
    slug: values.slug,
    sku: values.sku,
    barcode: values.barcode,
    brand: values.brand,
    category_id: emptyToNull(values.category_id),
    short_description: values.short_description,
    description: values.description,
    features: values.features,
    tags: values.tags,
    status: values.status,
    scheduled_at: values.status === "scheduled" ? emptyToNull(values.scheduled_at) : null,
    price: Math.round(values.price * 100),
    sale_price: dollarsToCents(values.sale_price),
    cost_price: dollarsToCents(values.cost_price),
    tax_class: values.tax_class,
    shipping_class: values.shipping_class,
    weight: values.weight,
    warranty: values.warranty,
    stock_quantity: values.stock_quantity,
    featured_image_url: emptyToNull(values.featured_image_url) ?? "",
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

const STATUS_BADGE: Record<string, string> = {
  in_stock: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  low_stock: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  out_of_stock: "bg-destructive/15 text-destructive border-destructive/30",
  backorder: "bg-sky-500/15 text-sky-400 border-sky-500/30",
};

const INVENTORY_LABEL: Record<string, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  backorder: "Backorder",
};

/* -------------------------------------------------------------------------- */
/* Tag list editor                                                             */
/* -------------------------------------------------------------------------- */

function TagListEditor({
  id,
  label,
  hint,
  values,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const next = draft.trim();
    if (next.length === 0) return;
    if (values.includes(next)) {
      setDraft("");
      return;
    }
    onChange([...values, next]);
    setDraft("");
  }

  function remove(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className={inputClass}
          placeholder="Type and press Enter"
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex h-10 shrink-0 items-center gap-1 rounded-md border border-border bg-secondary px-3 text-sm font-medium text-foreground hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4" />
          Add
        </button>
      </div>
      {values.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {values.map((value, index) => (
            <li
              key={`${value}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground"
            >
              <span className="max-w-[12rem] truncate">{value}</span>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove ${value}`}
                className="grid size-4 place-items-center rounded text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/* Main form                                                                   */
/* -------------------------------------------------------------------------- */

export function ProductForm(props: ProductFormProps) {
  const { mode, categories, productId } = props;
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
  const statusValue = watch("status");
  const stockValue = watch("stock_quantity");
  const featuredImage = watch("featured_image_url");
  const features = watch("features") ?? [];
  const tags = watch("tags") ?? [];

  // Auto-fill slug from the name until the user manually edits the slug.
  useEffect(() => {
    if (slugEditedRef.current) return;
    setValue("slug", slugify(asString(nameValue)), { shouldValidate: false });
  }, [nameValue, setValue]);

  const derivedInventory = useMemo(() => {
    const raw = Number(stockValue);
    const stock = Number.isFinite(raw) ? raw : 0;
    return deriveInventoryStatus(stock);
  }, [stockValue]);

  const onSubmit: SubmitHandler<FormValues> = async () => {
    setServerError(null);
    // The resolver hands back transformed (dollars->number) values; re-derive
    // from the raw string field state so the transform runs exactly once.
    const parsed = formSchema.parse(getValues());
    const payload = toProductInput(parsed);

    const res =
      mode === "edit" && productId
        ? await updateProduct(productId, payload)
        : await createProduct(payload);

    if (!res.ok) {
      setServerError(res.error ?? "Something went wrong. Please try again.");
      return;
    }
    router.push("/admin/products");
    router.refresh();
  };

  // When validation blocks submit, surface it and jump to the first bad field
  // (e.g. a missing Name that's scrolled off-screen).
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
          <Section title="General" description="Core product information.">
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
                label="Short description"
                htmlFor="short_description"
                error={errors.short_description?.message}
                className="sm:col-span-2"
              >
                <textarea
                  id="short_description"
                  rows={2}
                  className={textareaClass}
                  aria-invalid={Boolean(errors.short_description)}
                  aria-describedby={errors.short_description ? "short_description-error" : undefined}
                  {...register("short_description")}
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
                  rows={6}
                  className={textareaClass}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={errors.description ? "description-error" : undefined}
                  {...register("description")}
                />
              </Field>

              <Field label="Brand" htmlFor="brand" error={errors.brand?.message}>
                <input id="brand" type="text" className={inputClass} {...register("brand")} />
              </Field>

              <Field label="SKU" htmlFor="sku" error={errors.sku?.message}>
                <input id="sku" type="text" className={inputClass} {...register("sku")} />
              </Field>

              <Field label="Barcode" htmlFor="barcode" error={errors.barcode?.message}>
                <input id="barcode" type="text" className={inputClass} {...register("barcode")} />
              </Field>

              <Field label="Category" htmlFor="category_id" error={errors.category_id?.message}>
                <select id="category_id" className={inputClass} {...register("category_id")}>
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          {/* Pricing */}
          <Section title="Pricing" description="Amounts are entered in dollars.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Price ($)" htmlFor="price" error={errors.price?.message}>
                <input
                  id="price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  className={inputClass}
                  aria-invalid={Boolean(errors.price)}
                  aria-describedby={errors.price ? "price-error" : undefined}
                  {...register("price")}
                />
              </Field>

              <Field
                label="Sale price ($)"
                htmlFor="sale_price"
                error={errors.sale_price?.message}
              >
                <input
                  id="sale_price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  className={inputClass}
                  {...register("sale_price")}
                />
              </Field>

              <Field
                label="Cost price ($)"
                htmlFor="cost_price"
                error={errors.cost_price?.message}
              >
                <input
                  id="cost_price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  className={inputClass}
                  {...register("cost_price")}
                />
              </Field>

              <Field label="Tax class" htmlFor="tax_class" error={errors.tax_class?.message}>
                <input
                  id="tax_class"
                  type="text"
                  className={inputClass}
                  {...register("tax_class")}
                />
              </Field>

              <Field
                label="Shipping class"
                htmlFor="shipping_class"
                error={errors.shipping_class?.message}
              >
                <input
                  id="shipping_class"
                  type="text"
                  className={inputClass}
                  {...register("shipping_class")}
                />
              </Field>
            </div>
          </Section>

          {/* Inventory */}
          <Section title="Inventory" description="Stock level and derived availability.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Stock quantity"
                htmlFor="stock_quantity"
                error={errors.stock_quantity?.message}
              >
                <input
                  id="stock_quantity"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
                  className={inputClass}
                  aria-invalid={Boolean(errors.stock_quantity)}
                  aria-describedby={errors.stock_quantity ? "stock_quantity-error" : undefined}
                  {...register("stock_quantity")}
                />
              </Field>

              <div className="space-y-1.5">
                <span className="block text-sm font-medium text-foreground">Inventory status</span>
                <div className="flex h-10 items-center">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium",
                      STATUS_BADGE[derivedInventory] ?? "border-border bg-secondary text-foreground",
                    )}
                  >
                    {INVENTORY_LABEL[derivedInventory] ?? derivedInventory}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Derived automatically from the stock quantity.
                </p>
              </div>
            </div>
          </Section>

          {/* Details */}
          <Section title="Details" description="Highlights, tags, and physical attributes.">
            <div className="space-y-4">
              <TagListEditor
                id="features-input"
                label="Features"
                hint="Key selling points, one per tag."
                values={features}
                onChange={(next) =>
                  setValue("features", next, { shouldDirty: true, shouldValidate: false })
                }
              />
              <TagListEditor
                id="tags-input"
                label="Tags"
                hint="Used for search and filtering."
                values={tags}
                onChange={(next) =>
                  setValue("tags", next, { shouldDirty: true, shouldValidate: false })
                }
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Weight" htmlFor="weight" error={errors.weight?.message}>
                  <input
                    id="weight"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    className={inputClass}
                    {...register("weight")}
                  />
                </Field>
                <Field label="Warranty" htmlFor="warranty" error={errors.warranty?.message}>
                  <input
                    id="warranty"
                    type="text"
                    className={inputClass}
                    placeholder="e.g. 2 years"
                    {...register("warranty")}
                  />
                </Field>
              </div>
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
          {/* Publish */}
          <Section title="Publish" description="Visibility and scheduling.">
            <div className="space-y-4">
              <Field label="Status" htmlFor="status" error={errors.status?.message}>
                <select id="status" className={inputClass} {...register("status")}>
                  {PRODUCT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>

              {statusValue === "scheduled" ? (
                <Field
                  label="Publish at"
                  htmlFor="scheduled_at"
                  error={errors.scheduled_at?.message}
                  hint="The product goes live at this time."
                >
                  <input
                    id="scheduled_at"
                    type="datetime-local"
                    className={inputClass}
                    {...register("scheduled_at")}
                  />
                </Field>
              ) : null}
            </div>
          </Section>

          {/* Media */}
          <Section title="Media" description="Featured image for listings and the product page.">
            <ImageUploader
              value={asString(featuredImage) || null}
              onChange={(url: string | null) =>
                setValue("featured_image_url", url ?? "", {
                  shouldDirty: true,
                  shouldValidate: false,
                })
              }
            />
            {errors.featured_image_url ? (
              <p className="mt-2 text-xs text-destructive">{errors.featured_image_url.message}</p>
            ) : null}
          </Section>
        </div>
      </div>

      {/* Sticky action footer */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 backdrop-blur-xl lg:pl-64">
        <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/admin/products"
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
            {mode === "edit" ? "Save changes" : "Create product"}
          </button>
        </div>
      </div>
    </form>
  );
}
