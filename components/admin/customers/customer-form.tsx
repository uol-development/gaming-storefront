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
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomerInput } from "@/lib/admin/customers-schema";
import { createCustomer, updateCustomer } from "@/lib/admin/customers-actions";
import type { AdminCustomerDetail } from "@/lib/admin/customers-queries";

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

export interface CustomerFormProps {
  mode: "create" | "edit";
  customerId?: string;
  initial?: AdminCustomerDetail;
}

/* -------------------------------------------------------------------------- */
/* Form schema over the raw primitives the inputs produce.                     */
/* Email is validated with .email(); everything else trims and is optional.    */
/* onSubmit parses getValues() ONCE, then maps to the CustomerInput payload.   */
/* -------------------------------------------------------------------------- */

const formSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(200),
  name: z.string().trim().max(200),
  phone: z.string().trim().max(60),
  tags: z.array(z.string().trim().min(1)),
  notes: z.string().trim().max(4000),
  marketing_opt_in: z.boolean(),
  is_blocked: z.boolean(),
  address_line1: z.string().trim().max(200),
  address_city: z.string().trim().max(120),
  address_postal: z.string().trim().max(40),
  address_country: z.string().trim().max(120),
});

/** The shape RHF holds: every field is a primitive the inputs produce. */
interface FormValues {
  email: string;
  name: string;
  phone: string;
  tags: string[];
  notes: string;
  marketing_opt_in: boolean;
  is_blocked: boolean;
  address_line1: string;
  address_city: string;
  address_postal: string;
  address_country: string;
}

type FormParsed = z.output<typeof formSchema>;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Build the default values, prefilling from `initial` in edit mode. */
function buildDefaults(props: CustomerFormProps): FormValues {
  const initial = props.initial;
  if (props.mode !== "edit" || !initial) {
    return {
      email: "",
      name: "",
      phone: "",
      tags: [],
      notes: "",
      marketing_opt_in: false,
      is_blocked: false,
      address_line1: "",
      address_city: "",
      address_postal: "",
      address_country: "",
    };
  }

  const address = initial.default_address;

  return {
    email: initial.email,
    name: initial.name,
    phone: initial.phone ?? "",
    tags: initial.tags,
    notes: initial.notes ?? "",
    marketing_opt_in: initial.marketing_opt_in,
    is_blocked: initial.is_blocked,
    address_line1: String(address.line1 ?? ""),
    address_city: String(address.city ?? ""),
    address_postal: String(address.postal_code ?? ""),
    address_country: String(address.country ?? ""),
  };
}

/** Map the parsed form to the CustomerInput the action expects. */
function toCustomerInput(values: FormParsed): CustomerInput {
  return {
    email: values.email,
    name: values.name,
    phone: values.phone,
    tags: values.tags,
    notes: values.notes,
    marketing_opt_in: values.marketing_opt_in,
    is_blocked: values.is_blocked,
    address_line1: values.address_line1,
    address_city: values.address_city,
    address_postal: values.address_postal,
    address_country: values.address_country,
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

export function CustomerForm(props: CustomerFormProps) {
  const { mode, customerId } = props;
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

  const tags = watch("tags") ?? [];
  const marketingOptIn = watch("marketing_opt_in");
  const isBlocked = watch("is_blocked");

  const onSubmit: SubmitHandler<FormValues> = async () => {
    setServerError(null);
    // Re-derive from the raw field state so the transform runs exactly once.
    const parsed = formSchema.parse(getValues());
    const payload = toCustomerInput(parsed);

    const res =
      mode === "edit" && customerId
        ? await updateCustomer(customerId, payload)
        : await createCustomer(payload);

    if (!res.ok) {
      setServerError(res.error ?? "Something went wrong. Please try again.");
      return;
    }
    router.push("/admin/customers");
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
          {/* Profile */}
          <Section title="Profile" description="Contact details for this customer.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {mode === "edit" ? (
                <Field
                  label="Email"
                  htmlFor="email"
                  hint="Identifies the customer; not editable here"
                  className="sm:col-span-2"
                >
                  <input
                    id="email"
                    type="email"
                    readOnly
                    className={cn(
                      inputClass,
                      "cursor-not-allowed bg-secondary text-muted-foreground",
                    )}
                    aria-describedby="email-hint"
                    {...register("email")}
                  />
                </Field>
              ) : (
                <Field
                  label="Email"
                  htmlFor="email"
                  error={errors.email?.message}
                  className="sm:col-span-2"
                >
                  <input
                    id="email"
                    type="email"
                    autoComplete="off"
                    className={inputClass}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    {...register("email")}
                  />
                </Field>
              )}

              <Field label="Name" htmlFor="name" error={errors.name?.message}>
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

              <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="off"
                  className={inputClass}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                  {...register("phone")}
                />
              </Field>
            </div>
          </Section>

          {/* Address */}
          <Section title="Address" description="Default address for this customer.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Line 1"
                htmlFor="address_line1"
                error={errors.address_line1?.message}
                className="sm:col-span-2"
              >
                <input
                  id="address_line1"
                  type="text"
                  className={inputClass}
                  {...register("address_line1")}
                />
              </Field>

              <Field label="City" htmlFor="address_city" error={errors.address_city?.message}>
                <input
                  id="address_city"
                  type="text"
                  className={inputClass}
                  {...register("address_city")}
                />
              </Field>

              <Field
                label="Postal code"
                htmlFor="address_postal"
                error={errors.address_postal?.message}
              >
                <input
                  id="address_postal"
                  type="text"
                  className={inputClass}
                  {...register("address_postal")}
                />
              </Field>

              <Field
                label="Country"
                htmlFor="address_country"
                error={errors.address_country?.message}
              >
                <input
                  id="address_country"
                  type="text"
                  className={inputClass}
                  {...register("address_country")}
                />
              </Field>
            </div>
          </Section>

          {/* Notes */}
          <Section title="Notes" description="Internal notes about this customer.">
            <Field label="Notes" htmlFor="notes" error={errors.notes?.message}>
              <textarea
                id="notes"
                rows={5}
                className={textareaClass}
                aria-invalid={Boolean(errors.notes)}
                aria-describedby={errors.notes ? "notes-error" : undefined}
                {...register("notes")}
              />
            </Field>
          </Section>
        </div>

        {/* Side column */}
        <div className="space-y-5">
          {/* Segmentation */}
          <Section title="Segmentation" description="Tags and account flags.">
            <div className="space-y-4">
              <TagListEditor
                id="tags-input"
                label="Tags"
                hint="e.g. VIP, wholesale"
                values={tags}
                onChange={(next) =>
                  setValue("tags", next, { shouldDirty: true, shouldValidate: false })
                }
              />

              <label
                htmlFor="marketing_opt_in"
                className="flex items-start gap-3 text-sm text-foreground"
              >
                <input
                  id="marketing_opt_in"
                  type="checkbox"
                  checked={marketingOptIn}
                  className="mt-0.5 size-4 shrink-0 rounded border-border bg-card text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("marketing_opt_in")}
                />
                <span className="font-medium">Subscribed to marketing emails</span>
              </label>

              <div className="space-y-1.5">
                <label
                  htmlFor="is_blocked"
                  className="flex items-start gap-3 text-sm text-foreground"
                >
                  <input
                    id="is_blocked"
                    type="checkbox"
                    checked={isBlocked}
                    className="mt-0.5 size-4 shrink-0 rounded border-border bg-card text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...register("is_blocked")}
                  />
                  <span className="font-medium">Block this customer</span>
                </label>
                <p className="pl-7 text-xs text-muted-foreground">
                  Blocked customers are flagged in the admin
                </p>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* Sticky action footer */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:pl-64">
        <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/admin/customers"
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
            {mode === "edit" ? "Save changes" : "Create customer"}
          </button>
        </div>
      </div>
    </form>
  );
}
