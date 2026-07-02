"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoreSettings } from "@/lib/data/settings";
import { saveSettings, type ActionResult } from "@/lib/admin/settings-actions";

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

interface SettingsFormProps {
  initial: StoreSettings;
}

/* -------------------------------------------------------------------------- */
/* Local editable form state                                                   */
/* Money (shipping) is held as whole-Taka STRINGS for smooth typing; converted */
/* back to poisha on save. Everything else mirrors StoreSettings 1:1.          */
/* -------------------------------------------------------------------------- */

interface ShippingFormState {
  insideDhaka: string;
  dhakaSuburb: string;
  outsideDhaka: string;
  freeThreshold: string;
}

interface FormState {
  store: StoreSettings["store"];
  social: StoreSettings["social"];
  shipping: ShippingFormState;
  payments: StoreSettings["payments"];
  maintenance: StoreSettings["maintenance"];
}

/** Poisha (minor units) -> whole-Taka string for an input. */
function poishaToTakaString(poisha: number): string {
  return String(Math.round(poisha / 100));
}

/** Whole-Taka input string -> poisha, guarding NaN/negative -> 0. */
function takaStringToPoisha(taka: string): number {
  const value = Number(taka);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100);
}

function buildInitialState(initial: StoreSettings): FormState {
  return {
    store: { ...initial.store },
    social: { ...initial.social },
    shipping: {
      insideDhaka: poishaToTakaString(initial.shipping.insideDhaka),
      dhakaSuburb: poishaToTakaString(initial.shipping.dhakaSuburb),
      outsideDhaka: poishaToTakaString(initial.shipping.outsideDhaka),
      freeThreshold: poishaToTakaString(initial.shipping.freeThreshold),
    },
    payments: { ...initial.payments },
    maintenance: { ...initial.maintenance },
  };
}

/** Build the canonical StoreSettings payload (shipping back in poisha). */
function toPayload(form: FormState): StoreSettings {
  return {
    store: { ...form.store },
    social: { ...form.social },
    shipping: {
      insideDhaka: takaStringToPoisha(form.shipping.insideDhaka),
      dhakaSuburb: takaStringToPoisha(form.shipping.dhakaSuburb),
      outsideDhaka: takaStringToPoisha(form.shipping.outsideDhaka),
      freeThreshold: takaStringToPoisha(form.shipping.freeThreshold),
    },
    payments: { ...form.payments },
    maintenance: { ...form.maintenance },
  };
}

/* -------------------------------------------------------------------------- */
/* Shared token strings (match the established admin form idiom exactly)        */
/* -------------------------------------------------------------------------- */

const inputClass =
  "h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const textareaClass =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const checkboxClass =
  "mt-0.5 size-4 shrink-0 rounded border-border bg-card text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/* -------------------------------------------------------------------------- */
/* Small presentational primitives                                             */
/* -------------------------------------------------------------------------- */

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
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
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
      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** A labelled money input prefixed with a Taka sign; edits whole Taka. */
function TakaField({
  label,
  htmlFor,
  value,
  onChange,
}: {
  label: string;
  htmlFor: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <Field label={label} htmlFor={htmlFor}>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 grid w-9 place-items-center text-sm text-muted-foreground"
        >
          ৳
        </span>
        <input
          id={htmlFor}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, "pl-9")}
        />
      </div>
    </Field>
  );
}

/** A real checkbox toggle row with a label. */
function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={checkboxClass}
      />
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description ? (
          <span className="block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Main form                                                                   */
/* -------------------------------------------------------------------------- */

export function SettingsForm({ initial }: SettingsFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => buildInitialState(initial));
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const noPaymentEnabled =
    !form.payments.cod &&
    !form.payments.bkash &&
    !form.payments.nagad &&
    !form.payments.rocket &&
    !form.payments.card;

  /* Section-scoped updaters — keep updates immutable and typed. */
  function setStore<K extends keyof FormState["store"]>(
    key: K,
    value: FormState["store"][K],
  ) {
    setForm((prev) => ({ ...prev, store: { ...prev.store, [key]: value } }));
  }
  function setSocial<K extends keyof FormState["social"]>(
    key: K,
    value: FormState["social"][K],
  ) {
    setForm((prev) => ({ ...prev, social: { ...prev.social, [key]: value } }));
  }
  function setShipping<K extends keyof ShippingFormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, shipping: { ...prev.shipping, [key]: value } }));
  }
  function setPayment<K extends keyof FormState["payments"]>(key: K, value: boolean) {
    setForm((prev) => ({ ...prev, payments: { ...prev.payments, [key]: value } }));
  }
  function setMaintenance<K extends keyof FormState["maintenance"]>(
    key: K,
    value: FormState["maintenance"][K],
  ) {
    setForm((prev) => ({ ...prev, maintenance: { ...prev.maintenance, [key]: value } }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;
    setSuccess(false);
    setError(null);

    const payload = toPayload(form);

    startTransition(async () => {
      try {
        const result: ActionResult = await saveSettings(payload);
        if (result.ok) {
          setSuccess(true);
          router.refresh();
        } else {
          setError(result.error ?? "Couldn't save settings. Please try again.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save settings.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="pb-24">
      {/* Success / error banners — reserved via aria-live so no layout shift. */}
      <div aria-live="polite" className="empty:hidden">
        {success ? (
          <div className="mb-5 flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>Settings saved.</span>
          </div>
        ) : null}
      </div>
      <div aria-live="assertive" className="empty:hidden">
        {error ? (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-5 lg:col-span-2">
          {/* 1. Store details */}
          <Section title="Store details" description="Public identity and contact details.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Store name" htmlFor="store-name" className="sm:col-span-2">
                <input
                  id="store-name"
                  type="text"
                  required
                  value={form.store.name}
                  onChange={(e) => setStore("name", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Tagline" htmlFor="store-tagline" className="sm:col-span-2">
                <textarea
                  id="store-tagline"
                  rows={3}
                  value={form.store.tagline}
                  onChange={(e) => setStore("tagline", e.target.value)}
                  className={textareaClass}
                />
              </Field>

              <Field label="Support email" htmlFor="store-supportEmail">
                <input
                  id="store-supportEmail"
                  type="email"
                  value={form.store.supportEmail}
                  onChange={(e) => setStore("supportEmail", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Support phone" htmlFor="store-supportPhone">
                <input
                  id="store-supportPhone"
                  type="tel"
                  value={form.store.supportPhone}
                  onChange={(e) => setStore("supportPhone", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="WhatsApp" htmlFor="store-whatsapp">
                <input
                  id="store-whatsapp"
                  type="tel"
                  value={form.store.whatsapp}
                  onChange={(e) => setStore("whatsapp", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Address" htmlFor="store-address" className="sm:col-span-2">
                <textarea
                  id="store-address"
                  rows={2}
                  value={form.store.address}
                  onChange={(e) => setStore("address", e.target.value)}
                  className={textareaClass}
                />
              </Field>
            </div>
          </Section>

          {/* 2. Social links */}
          <Section title="Social links" description="Linked from the storefront footer.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Facebook" htmlFor="social-facebook">
                <input
                  id="social-facebook"
                  type="url"
                  placeholder="https://…"
                  value={form.social.facebook}
                  onChange={(e) => setSocial("facebook", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Instagram" htmlFor="social-instagram">
                <input
                  id="social-instagram"
                  type="url"
                  placeholder="https://…"
                  value={form.social.instagram}
                  onChange={(e) => setSocial("instagram", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="YouTube" htmlFor="social-youtube">
                <input
                  id="social-youtube"
                  type="url"
                  placeholder="https://…"
                  value={form.social.youtube}
                  onChange={(e) => setSocial("youtube", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="TikTok" htmlFor="social-tiktok">
                <input
                  id="social-tiktok"
                  type="url"
                  placeholder="https://…"
                  value={form.social.tiktok}
                  onChange={(e) => setSocial("tiktok", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="X" htmlFor="social-x">
                <input
                  id="social-x"
                  type="url"
                  placeholder="https://…"
                  value={form.social.x}
                  onChange={(e) => setSocial("x", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>

          {/* 3. Delivery rates */}
          <Section title="Delivery rates" description="Shipping charges in Bangladeshi Taka.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TakaField
                label="Inside Dhaka"
                htmlFor="shipping-insideDhaka"
                value={form.shipping.insideDhaka}
                onChange={(v) => setShipping("insideDhaka", v)}
              />
              <TakaField
                label="Dhaka Sub-area"
                htmlFor="shipping-dhakaSuburb"
                value={form.shipping.dhakaSuburb}
                onChange={(v) => setShipping("dhakaSuburb", v)}
              />
              <TakaField
                label="Outside Dhaka"
                htmlFor="shipping-outsideDhaka"
                value={form.shipping.outsideDhaka}
                onChange={(v) => setShipping("outsideDhaka", v)}
              />
              <TakaField
                label="Free delivery from"
                htmlFor="shipping-freeThreshold"
                value={form.shipping.freeThreshold}
                onChange={(v) => setShipping("freeThreshold", v)}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Charged by delivery zone; waived at or above the free-delivery amount.
            </p>
          </Section>
        </div>

        {/* Side column */}
        <div className="space-y-5">
          {/* 4. Payment methods */}
          <Section title="Payment methods" description="Which options customers can choose at checkout.">
            <div className="space-y-4">
              <ToggleRow
                id="payments-cod"
                label="Cash on Delivery"
                checked={form.payments.cod}
                onChange={(v) => setPayment("cod", v)}
              />
              <ToggleRow
                id="payments-bkash"
                label="bKash"
                checked={form.payments.bkash}
                onChange={(v) => setPayment("bkash", v)}
              />
              <ToggleRow
                id="payments-nagad"
                label="Nagad"
                checked={form.payments.nagad}
                onChange={(v) => setPayment("nagad", v)}
              />
              <ToggleRow
                id="payments-rocket"
                label="Rocket"
                checked={form.payments.rocket}
                onChange={(v) => setPayment("rocket", v)}
              />
              <ToggleRow
                id="payments-card"
                label="Card"
                checked={form.payments.card}
                onChange={(v) => setPayment("card", v)}
              />
            </div>
            {noPaymentEnabled ? (
              <p
                className="mt-4 inline-flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-400"
                aria-live="polite"
              >
                <Info className="mt-0.5 size-3.5 shrink-0" />
                Cash on Delivery will stay available.
              </p>
            ) : null}
          </Section>

          {/* 5. Maintenance mode */}
          <Section title="Maintenance mode" description="Temporarily pause the storefront.">
            <div className="space-y-4">
              <ToggleRow
                id="maintenance-enabled"
                label="Enable maintenance mode"
                description="Shows a maintenance notice to visitors."
                checked={form.maintenance.enabled}
                onChange={(v) => setMaintenance("enabled", v)}
              />
              <Field label="Message" htmlFor="maintenance-message">
                <textarea
                  id="maintenance-message"
                  rows={3}
                  placeholder="We are briefly down for maintenance…"
                  value={form.maintenance.message}
                  onChange={(e) => setMaintenance("message", e.target.value)}
                  className={textareaClass}
                />
              </Field>
            </div>
          </Section>
        </div>
      </div>

      {/* Sticky action footer */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:pl-64">
        <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </button>
        </div>
      </div>
    </form>
  );
}
