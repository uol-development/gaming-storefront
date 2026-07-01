"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { CheckoutStepper } from "@/components/checkout/checkout-stepper";
import { OrderSummary } from "@/components/checkout/order-summary";
import { useToast } from "@/lib/hooks/use-toast";
import { useCartStore } from "@/lib/store/cart-store";
import { getStoreProductsByIdsAction } from "@/lib/data/store-actions";
import { placeOrder as placeOrderAction } from "@/lib/data/checkout-actions";
import type { Product } from "@/lib/data/products";
import { productGradient } from "@/lib/data/catalog";
import { computeOrderTotals } from "@/lib/data/pricing";
import { formatPrice } from "@/lib/format";
import { fade, scaleIn, stepSlide } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Multi-step checkout orchestrator — the body of the /checkout page.
 *
 * Three steps (Address / Payment / Review) cross under a single AnimatePresence
 * with a direction-aware `stepSlide` transition that degrades to an opacity-only
 * `fade` when the user prefers reduced motion (stepSlide is a FUNCTION variant
 * and is therefore NOT stripped by `variants()`, so we branch explicitly).
 *
 * Order placement is simulated via a setTimeout that is always cleared on unmount
 * through a ref, then swaps the whole grid for a confirmation card. All money is
 * in integer minor units and only formatted at the edge with `formatPrice`.
 *
 * No CLS: every field reserves a fixed-height error slot whether or not an error
 * is present, so showing/clearing validation never reflows the form.
 */

type Step = 0 | 1 | 2;

const STEP_LABELS = ["Address", "Payment", "Review"] as const;

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Japan",
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EXPIRY_RE = /^(0[1-9]|1[0-2])\/\d{2}$/;

type AddressKey = "email" | "firstName" | "lastName" | "address" | "city" | "postal" | "country";
type PaymentKey = "cardName" | "cardNumber" | "expiry" | "cvc";
type FieldKey = AddressKey | PaymentKey;

type Address = Record<AddressKey, string>;
type Payment = Record<PaymentKey, string>;
type Errors = Partial<Record<FieldKey, string>>;

const EMPTY_ADDRESS: Address = {
  email: "",
  firstName: "",
  lastName: "",
  address: "",
  city: "",
  postal: "",
  country: "United States",
};

const EMPTY_PAYMENT: Payment = {
  cardName: "",
  cardNumber: "",
  expiry: "",
  cvc: "",
};

export function CheckoutFlow() {
  const router = useRouter();
  const toast = useToast();
  const { prefersReduced } = useReducedMotion();

  const lines = useCartStore((s) => s.lines);
  const clear = useCartStore((s) => s.clear);

  // Resolve cart line ids to real DB products (client components never touch the
  // server-only data layer directly). `null` = not yet loaded.
  const [productsById, setProductsById] = useState<Map<string, Product> | null>(null);
  const idsKey = useMemo(() => lines.map((line) => line.productId).join(","), [lines]);
  useEffect(() => {
    let cancelled = false;
    const ids = idsKey.length > 0 ? idsKey.split(",") : [];
    if (ids.length === 0) {
      setProductsById(new Map());
      return () => {
        cancelled = true;
      };
    }
    void getStoreProductsByIdsAction(ids).then((products) => {
      if (cancelled) return;
      const map = new Map<string, Product>();
      for (const product of products) map.set(product.id, product);
      setProductsById(map);
    });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const [step, setStep] = useState<Step>(0);
  const [direction, setDirection] = useState<number>(1);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [payment, setPayment] = useState<Payment>(EMPTY_PAYMENT);
  const [billingSame, setBillingSame] = useState(true);
  const [saveCard, setSaveCard] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const idBase = useId();

  /* ---- Order totals for the confirmation recap (minor units throughout) ---- */
  const { total, confirmEmail } = useMemo(() => {
    let subtotal = 0;
    if (productsById) {
      for (const line of lines) {
        const product = productsById.get(line.productId);
        if (!product) continue;
        subtotal += product.price * line.quantity;
      }
    }
    return { total: computeOrderTotals(subtotal).total, confirmEmail: address.email };
  }, [lines, productsById, address.email]);

  /* ---- Review-step line items (resolve ids -> products, skip stale) ---- */
  const reviewRows = useMemo(() => {
    const rows: { id: string; name: string; quantity: number; gradient: string; lineTotal: number }[] =
      [];
    if (productsById) {
      for (const line of lines) {
        const product = productsById.get(line.productId);
        if (!product) continue;
        rows.push({
          id: product.id,
          name: product.name,
          quantity: line.quantity,
          gradient: productGradient(product),
          lineTotal: product.price * line.quantity,
        });
      }
    }
    return rows;
  }, [lines, productsById]);

  const setAddressField = useCallback((key: AddressKey, value: string) => {
    setAddress((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const setPaymentField = useCallback((key: PaymentKey, value: string) => {
    setPayment((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const validateStep = useCallback(
    (current: Step): Errors => {
      const next: Errors = {};
      if (current === 0) {
        if (!EMAIL_RE.test(address.email.trim())) next.email = "Enter a valid email address.";
        if (address.firstName.trim().length === 0) next.firstName = "First name is required.";
        if (address.lastName.trim().length === 0) next.lastName = "Last name is required.";
        if (address.address.trim().length === 0) next.address = "Street address is required.";
        if (address.city.trim().length === 0) next.city = "City is required.";
        if (address.postal.trim().length === 0) next.postal = "Postal code is required.";
        if (address.country.trim().length === 0) next.country = "Select a country.";
      } else if (current === 1) {
        if (payment.cardName.trim().length === 0) next.cardName = "Name on card is required.";
        const digits = payment.cardNumber.replace(/\D/g, "");
        if (digits.length < 12 || digits.length > 19) next.cardNumber = "Enter a valid card number.";
        if (!EXPIRY_RE.test(payment.expiry.trim())) next.expiry = "Use MM/YY format.";
        const cvc = payment.cvc.trim();
        if (!/^\d{3,4}$/.test(cvc)) next.cvc = "Enter a 3 or 4 digit code.";
      }
      return next;
    },
    [address, payment],
  );

  const next = useCallback(() => {
    if (step === 2) return;
    const found = validateStep(step);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setErrors({});
    setDirection(1);
    setStep((prev) => (prev + 1) as Step);
  }, [step, validateStep, toast]);

  const back = useCallback(() => {
    if (step === 0) return;
    setDirection(-1);
    setErrors({});
    setStep((prev) => (prev - 1) as Step);
  }, [step]);

  const placeOrder = useCallback(async () => {
    if (placing) return;
    setPlacing(true);
    try {
      const result = await placeOrderAction({
        customer: {
          email: address.email.trim(),
          firstName: address.firstName.trim(),
          lastName: address.lastName.trim(),
        },
        shippingAddress: {
          line1: address.address.trim(),
          city: address.city.trim(),
          postal_code: address.postal.trim(),
          country: address.country.trim(),
        },
        lines: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      });
      if (!result.ok || !result.orderNumber) {
        toast.error("We couldn't place your order", {
          description: result.error ?? "Please try again.",
        });
        setPlacing(false);
        return;
      }
      setOrderNumber(result.orderNumber);
      setPlaced(true);
      setPlacing(false);
      toast.success("Order placed!", { description: "A confirmation email is on its way." });
    } catch {
      toast.error("We couldn't place your order", { description: "Please try again." });
      setPlacing(false);
    }
  }, [placing, toast, address, lines]);

  const continueShopping = useCallback(() => {
    clear();
    router.push("/");
  }, [clear, router]);

  /* ---------------------------- Empty state ---------------------------- */
  if (lines.length === 0 && !placed) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-2xl border border-border bg-card px-6 py-16 text-center">
        <span
          aria-hidden
          className="grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground"
        >
          <ShoppingCart className="size-7" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
            Your cart is empty
          </h2>
          <p className="text-sm text-muted-foreground">
            Add some gear before heading to checkout.
          </p>
        </div>
        <Link
          href="/products"
          className={cn(
            "mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-[transform,background-color] hover:bg-primary/90 active:scale-[0.97]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          Browse products
        </Link>
      </div>
    );
  }

  /* --------------------------- Confirmation --------------------------- */
  if (placed) {
    return (
      <motion.div
        variants={prefersReduced ? fade : scaleIn}
        initial="hidden"
        animate="visible"
        className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-2xl border border-border bg-card px-6 py-14 text-center"
      >
        <motion.span
          aria-hidden
          variants={prefersReduced ? fade : scaleIn}
          className="grid size-16 place-items-center rounded-full bg-success/15 text-success"
        >
          <CheckCircle2 className="size-9" aria-hidden />
        </motion.span>

        <div className="space-y-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Thank you for your order
          </h2>
          <p className="text-sm text-muted-foreground">
            We&apos;ve received your order and a confirmation is on its way.
          </p>
        </div>

        <dl className="w-full space-y-2 rounded-xl border border-border bg-background/40 p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Order number</dt>
            <dd className="font-semibold tabular-nums text-foreground">{orderNumber}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Confirmation sent to</dt>
            <dd className="min-w-0 truncate text-foreground">{confirmEmail || "your inbox"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-border pt-2">
            <dt className="font-medium text-foreground">Total paid</dt>
            <dd className="text-base font-bold tabular-nums text-foreground">
              {formatPrice(total)}
            </dd>
          </div>
        </dl>

        <Button onClick={continueShopping} className="mt-1">
          Continue shopping
        </Button>
      </motion.div>
    );
  }

  /* ----------------------------- Checkout ----------------------------- */
  const motionProps = prefersReduced
    ? ({ variants: fade, initial: "hidden", animate: "visible", exit: "exit" } as const)
    : ({
        variants: stepSlide,
        custom: direction,
        initial: "enter",
        animate: "center",
        exit: "exit",
      } as const);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      {/* LEFT: stepper + step content + nav */}
      <div className="min-w-0 space-y-8">
        <CheckoutStepper steps={[...STEP_LABELS]} current={step} />

        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div key={step} {...motionProps}>
            {step === 0 ? (
              <AddressStep
                idBase={idBase}
                address={address}
                errors={errors}
                billingSame={billingSame}
                onChange={setAddressField}
                onBillingSameChange={setBillingSame}
              />
            ) : null}

            {step === 1 ? (
              <PaymentStep
                idBase={idBase}
                payment={payment}
                errors={errors}
                saveCard={saveCard}
                onChange={setPaymentField}
                onSaveCardChange={setSaveCard}
              />
            ) : null}

            {step === 2 ? (
              <ReviewStep
                address={address}
                payment={payment}
                billingSame={billingSame}
                rows={reviewRows}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
          <Button variant="outline" onClick={back} disabled={step === 0}>
            Back
          </Button>
          {step === 2 ? (
            <Button loading={placing} onClick={() => void placeOrder()}>
              Place order
            </Button>
          ) : (
            <Button onClick={next}>Continue</Button>
          )}
        </div>
      </div>

      {/* RIGHT: sticky order summary */}
      <aside className="min-w-0">
        <div className="lg:sticky lg:top-24">
          <OrderSummary />
        </div>
      </aside>
    </div>
  );
}

/* ================================================================== *
 * Field primitives
 * ================================================================== */

interface FieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "email";
  placeholder?: string;
  maxLength?: number;
  className?: string;
  onChange: (value: string) => void;
}

function Field({
  id,
  label,
  value,
  error,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  maxLength,
  className,
  onChange,
}: FieldProps) {
  const errorId = `${id}-error`;
  const invalid = Boolean(error);
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          invalid ? "border-destructive ring-1 ring-destructive" : "border-border",
        )}
      />
      {/* Reserve a fixed-height slot so toggling the error never causes CLS. */}
      <p id={errorId} className="min-h-4 text-xs leading-4 text-destructive">
        {error ?? ""}
      </p>
    </div>
  );
}

/* ================================================================== *
 * Step 0 — Address
 * ================================================================== */

interface AddressStepProps {
  idBase: string;
  address: Address;
  errors: Errors;
  billingSame: boolean;
  onChange: (key: AddressKey, value: string) => void;
  onBillingSameChange: (checked: boolean) => void;
}

function AddressStep({
  idBase,
  address,
  errors,
  billingSame,
  onChange,
  onBillingSameChange,
}: AddressStepProps) {
  const countryId = `${idBase}-country`;
  const countryErrorId = `${countryId}-error`;
  const countryInvalid = Boolean(errors.country);
  return (
    <div className="space-y-1">
      <h3 className="text-base font-semibold text-foreground">Shipping address</h3>
      <p className="pb-3 text-sm text-muted-foreground">Where should we send your order?</p>

      <Field
        id={`${idBase}-email`}
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={address.email}
        error={errors.email}
        onChange={(v) => onChange("email", v)}
      />

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field
          id={`${idBase}-firstName`}
          label="First name"
          autoComplete="given-name"
          value={address.firstName}
          error={errors.firstName}
          onChange={(v) => onChange("firstName", v)}
        />
        <Field
          id={`${idBase}-lastName`}
          label="Last name"
          autoComplete="family-name"
          value={address.lastName}
          error={errors.lastName}
          onChange={(v) => onChange("lastName", v)}
        />
      </div>

      <Field
        id={`${idBase}-address`}
        label="Street address"
        autoComplete="street-address"
        placeholder="123 Player One Ave"
        value={address.address}
        error={errors.address}
        onChange={(v) => onChange("address", v)}
      />

      <div className="grid gap-x-4 sm:grid-cols-3">
        <Field
          id={`${idBase}-city`}
          label="City"
          autoComplete="address-level2"
          className="sm:col-span-1"
          value={address.city}
          error={errors.city}
          onChange={(v) => onChange("city", v)}
        />
        <Field
          id={`${idBase}-postal`}
          label="Postal code"
          autoComplete="postal-code"
          className="sm:col-span-1"
          value={address.postal}
          error={errors.postal}
          onChange={(v) => onChange("postal", v)}
        />
        <div className="space-y-1.5 sm:col-span-1">
          <label htmlFor={countryId} className="block text-sm font-medium text-foreground">
            Country
          </label>
          <select
            id={countryId}
            value={address.country}
            aria-invalid={countryInvalid || undefined}
            aria-describedby={countryInvalid ? countryErrorId : undefined}
            onChange={(event) => onChange("country", event.target.value)}
            className={cn(
              "h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              countryInvalid ? "border-destructive ring-1 ring-destructive" : "border-border",
            )}
          >
            {COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
          <p id={countryErrorId} className="min-h-4 text-xs leading-4 text-destructive">
            {errors.country ?? ""}
          </p>
        </div>
      </div>

      <div className="pt-1">
        <Checkbox
          label="Billing address same as shipping"
          checked={billingSame}
          onCheckedChange={onBillingSameChange}
        />
      </div>
    </div>
  );
}

/* ================================================================== *
 * Step 1 — Payment
 * ================================================================== */

interface PaymentStepProps {
  idBase: string;
  payment: Payment;
  errors: Errors;
  saveCard: boolean;
  onChange: (key: PaymentKey, value: string) => void;
  onSaveCardChange: (checked: boolean) => void;
}

function PaymentStep({
  idBase,
  payment,
  errors,
  saveCard,
  onChange,
  onSaveCardChange,
}: PaymentStepProps) {
  return (
    <div className="space-y-1">
      <h3 className="text-base font-semibold text-foreground">Payment</h3>
      <p className="pb-3 text-sm text-muted-foreground">All transactions are secure and encrypted.</p>

      <Field
        id={`${idBase}-cardName`}
        label="Name on card"
        autoComplete="cc-name"
        placeholder="Jordan Smith"
        value={payment.cardName}
        error={errors.cardName}
        onChange={(v) => onChange("cardName", v)}
      />

      <Field
        id={`${idBase}-cardNumber`}
        label="Card number"
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="1234 5678 9012 3456"
        maxLength={23}
        value={payment.cardNumber}
        error={errors.cardNumber}
        onChange={(v) => onChange("cardNumber", v)}
      />

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field
          id={`${idBase}-expiry`}
          label="Expiry (MM/YY)"
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="MM/YY"
          maxLength={5}
          value={payment.expiry}
          error={errors.expiry}
          onChange={(v) => onChange("expiry", v)}
        />
        <Field
          id={`${idBase}-cvc`}
          label="CVC"
          inputMode="numeric"
          autoComplete="cc-csc"
          placeholder="123"
          maxLength={4}
          value={payment.cvc}
          error={errors.cvc}
          onChange={(v) => onChange("cvc", v)}
        />
      </div>

      <div className="pt-1">
        <Switch
          label="Save card for next time"
          checked={saveCard}
          onCheckedChange={onSaveCardChange}
        />
      </div>
    </div>
  );
}

/* ================================================================== *
 * Step 2 — Review
 * ================================================================== */

interface ReviewStepProps {
  address: Address;
  payment: Payment;
  billingSame: boolean;
  rows: { id: string; name: string; quantity: number; gradient: string; lineTotal: number }[];
}

function maskCard(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  return `•••• •••• •••• ${last4 || "----"}`;
}

function ReviewStep({ address, payment, billingSame, rows }: ReviewStepProps) {
  const fullName = `${address.firstName} ${address.lastName}`.trim();
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">Review your order</h3>
        <p className="text-sm text-muted-foreground">
          Confirm everything looks right before placing your order.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contact &amp; shipping
          </h4>
          <dl className="space-y-1 text-sm text-foreground">
            <div className="truncate">{address.email || "—"}</div>
            <div>{fullName || "—"}</div>
            <div className="text-muted-foreground">{address.address || "—"}</div>
            <div className="text-muted-foreground">
              {[address.city, address.postal].filter(Boolean).join(", ") || "—"}
            </div>
            <div className="text-muted-foreground">{address.country}</div>
            <div className="pt-1 text-xs text-muted-foreground">
              Billing {billingSame ? "same as shipping" : "entered separately"}
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Payment
          </h4>
          <dl className="space-y-1 text-sm text-foreground">
            <div>{payment.cardName || "—"}</div>
            <div className="font-mono tabular-nums text-muted-foreground">
              {maskCard(payment.cardNumber)}
            </div>
            <div className="text-muted-foreground">
              Expires {payment.expiry || "—"}
            </div>
          </dl>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Items
        </h4>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={cn(
                    "size-10 shrink-0 rounded-lg border border-border/60 bg-gradient-to-br",
                    row.gradient,
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">{row.name}</p>
                  <p className="text-xs text-muted-foreground">Qty {row.quantity}</p>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                  {formatPrice(row.lineTotal)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
