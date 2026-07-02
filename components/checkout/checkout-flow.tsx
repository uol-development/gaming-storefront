"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckoutStepper } from "@/components/checkout/checkout-stepper";
import { OrderSummary } from "@/components/checkout/order-summary";
import { useToast } from "@/lib/hooks/use-toast";
import { useCartStore } from "@/lib/store/cart-store";
import { getStoreProductsByIdsAction } from "@/lib/data/store-actions";
import { placeOrder as placeOrderAction } from "@/lib/data/checkout-actions";
import type { Product } from "@/lib/data/products";
import { productGradient } from "@/lib/data/catalog";
import { computeOrderTotals, DEFAULT_SHIPPING_CONFIG, type ShippingConfig } from "@/lib/data/pricing";
import {
  BD_AREAS,
  BD_PHONE_RE,
  DELIVERY_ZONE_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_OPTIONS,
  isBdArea,
  paymentKind,
  zoneForArea,
} from "@/lib/data/bd";
import type { PaymentMethod, PaymentOption } from "@/lib/data/bd";
import { formatPrice } from "@/lib/format";
import { fade, scaleIn, stepSlide } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Multi-step checkout orchestrator — the body of the /checkout page (Bangladesh).
 *
 * Three steps (Address / Payment / Review) cross under a single AnimatePresence
 * with a direction-aware `stepSlide` transition that degrades to an opacity-only
 * `fade` when the user prefers reduced motion (stepSlide is a FUNCTION variant
 * and is therefore NOT stripped by `variants()`, so we branch explicitly).
 *
 * The address is fixed to Bangladesh: the district drives the delivery zone
 * (`zoneForArea`) which in turn drives the shipping fee via
 * `computeOrderTotals`. Payment is a method selector (COD / bKash / Nagad /
 * Rocket / Card) whose extra fields — and validation — depend on the method's
 * `paymentKind`. All money is in integer minor units (poisha) and only formatted
 * at the edge with `formatPrice` (which renders ৳).
 *
 * No CLS: every field reserves a fixed-height error slot whether or not an error
 * is present, so showing/clearing validation never reflows the form.
 */

type Step = 0 | 1 | 2;

const STEP_LABELS = ["Address", "Payment", "Review"] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EXPIRY_RE = /^(0[1-9]|1[0-2])\/\d{2}$/;

const BD_PHONE_MESSAGE = "Enter a valid Bangladeshi mobile number, e.g. 01712345678";

type AddressKey = "name" | "email" | "phone" | "line1" | "area" | "district";
type PaymentKey = "cardName" | "cardNumber" | "expiry" | "cvc" | "walletNumber" | "walletTxn";
type FieldKey = AddressKey | PaymentKey;

type Address = Record<AddressKey, string>;
type PaymentFields = Record<Exclude<PaymentKey, never>, string>;
type Errors = Partial<Record<FieldKey, string>>;

interface PaymentState extends PaymentFields {
  method: PaymentMethod;
}

const EMPTY_ADDRESS: Address = {
  name: "",
  email: "",
  phone: "",
  line1: "",
  area: "",
  district: "Dhaka City",
};

const EMPTY_PAYMENT: PaymentState = {
  method: "cod",
  cardName: "",
  cardNumber: "",
  expiry: "",
  cvc: "",
  walletNumber: "",
  walletTxn: "",
};

export function CheckoutFlow({
  shipping = DEFAULT_SHIPPING_CONFIG,
  enabledPayments,
}: {
  shipping?: ShippingConfig;
  enabledPayments?: PaymentMethod[];
} = {}) {
  const router = useRouter();
  const toast = useToast();
  const { prefersReduced } = useReducedMotion();

  const lines = useCartStore((s) => s.lines);
  const clear = useCartStore((s) => s.clear);

  // Enabled payment methods (from Store Settings) drive which options render and
  // the initial selection. Never empty — falls back to COD.
  const enabledMethods = useMemo<PaymentMethod[]>(() => {
    const all = PAYMENT_OPTIONS.map((o) => o.value);
    const list = (enabledPayments && enabledPayments.length > 0 ? enabledPayments : all).filter(
      (m): m is PaymentMethod => all.includes(m),
    );
    return list.length > 0 ? list : ["cod"];
  }, [enabledPayments]);
  const paymentOptions = useMemo(
    () => PAYMENT_OPTIONS.filter((o) => enabledMethods.includes(o.value)),
    [enabledMethods],
  );

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
  const [payment, setPayment] = useState<PaymentState>(() => ({
    ...EMPTY_PAYMENT,
    method: enabledMethods[0] ?? "cod",
  }));
  const [errors, setErrors] = useState<Errors>({});

  const idBase = useId();

  // Delivery zone is derived reactively from the chosen district.
  const zone = zoneForArea(address.district);

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
    return {
      total: computeOrderTotals(subtotal, zone, shipping).total,
      confirmEmail: address.email,
    };
  }, [lines, productsById, address.email, zone, shipping]);

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

  const setPaymentMethod = useCallback((method: PaymentMethod) => {
    setPayment((prev) => ({ ...prev, method }));
    // Switching method invalidates any per-method field errors.
    setErrors((prev) => {
      const next = { ...prev };
      delete next.cardName;
      delete next.cardNumber;
      delete next.expiry;
      delete next.cvc;
      delete next.walletNumber;
      delete next.walletTxn;
      return next;
    });
  }, []);

  const validateStep = useCallback(
    (current: Step): Errors => {
      const next: Errors = {};
      if (current === 0) {
        if (address.name.trim().length === 0) next.name = "Name is required";
        if (!EMAIL_RE.test(address.email.trim())) next.email = "Enter a valid email address.";
        if (!BD_PHONE_RE.test(address.phone.trim())) next.phone = BD_PHONE_MESSAGE;
        if (address.line1.trim().length === 0) next.line1 = "Address is required.";
        if (address.area.trim().length === 0) next.area = "Area / Thana is required.";
        if (address.district.trim().length === 0 || !isBdArea(address.district))
          next.district = "Select your district";
      } else if (current === 1) {
        const kind = paymentKind(payment.method);
        if (kind === "wallet") {
          if (!BD_PHONE_RE.test(payment.walletNumber.trim())) next.walletNumber = BD_PHONE_MESSAGE;
        } else if (kind === "card") {
          if (payment.cardName.trim().length === 0) next.cardName = "Name on card is required.";
          const digits = payment.cardNumber.replace(/\D/g, "");
          if (digits.length < 12 || digits.length > 19) next.cardNumber = "Enter a valid card number.";
          if (!EXPIRY_RE.test(payment.expiry.trim())) next.expiry = "Use MM/YY format.";
          const cvc = payment.cvc.trim();
          if (!/^\d{3,4}$/.test(cvc)) next.cvc = "Enter a 3 or 4 digit code.";
        }
        // "cod": no extra fields to validate.
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
      const kind = paymentKind(payment.method);
      const paymentRef =
        kind === "wallet"
          ? payment.walletNumber.trim()
          : kind === "card"
            ? `•••• ${payment.cardNumber.replace(/\D/g, "").slice(-4)}`
            : "";
      const result = await placeOrderAction({
        customer: {
          email: address.email.trim(),
          name: address.name.trim(),
          phone: address.phone.trim(),
        },
        shippingAddress: {
          line1: address.line1.trim(),
          area: address.area.trim(),
          district: address.district,
          postal_code: "",
        },
        deliveryZone: zone,
        paymentMethod: payment.method,
        paymentRef,
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
  }, [placing, toast, address, payment, zone, lines]);

  const continueShopping = useCallback(() => {
    clear();
    router.push("/");
  }, [clear, router]);

  const isCod = payment.method === "cod";

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
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Payment</dt>
            <dd className="text-foreground">{PAYMENT_METHOD_LABEL[payment.method]}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-border pt-2">
            <dt className="font-medium text-foreground">
              {isCod ? "Amount due (Cash on Delivery)" : "Total paid"}
            </dt>
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
                zone={zone}
                onChange={setAddressField}
              />
            ) : null}

            {step === 1 ? (
              <PaymentStep
                idBase={idBase}
                payment={payment}
                errors={errors}
                options={paymentOptions}
                onChange={setPaymentField}
                onMethodChange={setPaymentMethod}
              />
            ) : null}

            {step === 2 ? (
              <ReviewStep address={address} payment={payment} rows={reviewRows} />
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
          <OrderSummary zone={zone} shippingConfig={shipping} />
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
  inputMode?: "text" | "numeric" | "email" | "tel";
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
 * Step 0 — Address (Bangladesh)
 * ================================================================== */

interface AddressStepProps {
  idBase: string;
  address: Address;
  errors: Errors;
  zone: ReturnType<typeof zoneForArea>;
  onChange: (key: AddressKey, value: string) => void;
}

function AddressStep({ idBase, address, errors, zone, onChange }: AddressStepProps) {
  const districtId = `${idBase}-district`;
  const districtErrorId = `${districtId}-error`;
  const districtHelpId = `${districtId}-help`;
  const districtInvalid = Boolean(errors.district);
  return (
    <div className="space-y-1">
      <h3 className="text-base font-semibold text-foreground">Shipping address</h3>
      <p className="pb-3 text-sm text-muted-foreground">
        Where in Bangladesh should we send your order?
      </p>

      <Field
        id={`${idBase}-name`}
        label="Name"
        autoComplete="name"
        placeholder="Full name"
        value={address.name}
        error={errors.name}
        onChange={(v) => onChange("name", v)}
      />

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

      <Field
        id={`${idBase}-phone`}
        label="Mobile number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="01XXXXXXXXX"
        maxLength={11}
        value={address.phone}
        error={errors.phone}
        onChange={(v) => onChange("phone", v)}
      />

      <Field
        id={`${idBase}-line1`}
        label="Address"
        autoComplete="street-address"
        placeholder="House 12, Road 5"
        value={address.line1}
        error={errors.line1}
        onChange={(v) => onChange("line1", v)}
      />

      <Field
        id={`${idBase}-area`}
        label="Area / Thana"
        autoComplete="address-level3"
        placeholder="Gulshan"
        value={address.area}
        error={errors.area}
        onChange={(v) => onChange("area", v)}
      />

      <div className="space-y-1.5">
        <label htmlFor={districtId} className="block text-sm font-medium text-foreground">
          District / Delivery area
        </label>
        <select
          id={districtId}
          value={address.district}
          aria-invalid={districtInvalid || undefined}
          aria-describedby={districtInvalid ? districtErrorId : districtHelpId}
          onChange={(event) => onChange("district", event.target.value)}
          className={cn(
            "h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            districtInvalid ? "border-destructive ring-1 ring-destructive" : "border-border",
          )}
        >
          <optgroup label={DELIVERY_ZONE_LABEL.inside_dhaka}>
            {BD_AREAS.filter((area) => area.zone === "inside_dhaka").map((area) => (
              <option key={area.name} value={area.name}>
                {area.name}
              </option>
            ))}
          </optgroup>
          <optgroup label={DELIVERY_ZONE_LABEL.dhaka_suburb}>
            {BD_AREAS.filter((area) => area.zone === "dhaka_suburb").map((area) => (
              <option key={area.name} value={area.name}>
                {area.name}
              </option>
            ))}
          </optgroup>
          <optgroup label={DELIVERY_ZONE_LABEL.outside_dhaka}>
            {BD_AREAS.filter((area) => area.zone === "outside_dhaka").map((area) => (
              <option key={area.name} value={area.name}>
                {area.name}
              </option>
            ))}
          </optgroup>
        </select>
        {districtInvalid ? (
          <p id={districtErrorId} className="min-h-4 text-xs leading-4 text-destructive">
            {errors.district ?? ""}
          </p>
        ) : (
          <p id={districtHelpId} className="min-h-4 text-xs leading-4 text-muted-foreground">
            Delivery: {DELIVERY_ZONE_LABEL[zone]}
          </p>
        )}
      </div>

      <p className="pt-1 text-xs text-muted-foreground">Country: Bangladesh</p>
    </div>
  );
}

/* ================================================================== *
 * Step 1 — Payment (Bangladesh methods)
 * ================================================================== */

interface PaymentStepProps {
  idBase: string;
  payment: PaymentState;
  errors: Errors;
  options: readonly PaymentOption[];
  onChange: (key: PaymentKey, value: string) => void;
  onMethodChange: (method: PaymentMethod) => void;
}

function PaymentStep({ idBase, payment, errors, options, onChange, onMethodChange }: PaymentStepProps) {
  const kind = paymentKind(payment.method);
  const walletLabel = PAYMENT_METHOD_LABEL[payment.method];
  return (
    <div className="space-y-1">
      <h3 className="text-base font-semibold text-foreground">Payment</h3>
      <p className="pb-3 text-sm text-muted-foreground">
        Choose how you&apos;d like to pay for your order.
      </p>

      <fieldset className="space-y-3">
        <legend className="sr-only">Payment method</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((option) => {
            const selected = payment.method === option.value;
            const optionId = `${idBase}-pm-${option.value}`;
            return (
              <label
                key={option.value}
                htmlFor={optionId}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 transition-colors",
                  "focus-within:ring-2 focus-within:ring-ring",
                  selected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50",
                )}
              >
                <input
                  id={optionId}
                  type="radio"
                  name={`${idBase}-payment-method`}
                  value={option.value}
                  checked={selected}
                  onChange={() => onMethodChange(option.value)}
                  className="mt-0.5 size-4 shrink-0 accent-primary focus-visible:outline-none"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="pt-4">
        {kind === "wallet" ? (
          <div className="space-y-1">
            <Field
              id={`${idBase}-walletNumber`}
              label={`${walletLabel} account number`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              maxLength={11}
              value={payment.walletNumber}
              error={errors.walletNumber}
              onChange={(v) => onChange("walletNumber", v)}
            />
            <Field
              id={`${idBase}-walletTxn`}
              label="Transaction ID (optional)"
              autoComplete="off"
              placeholder="e.g. 8N7A6B5C4D"
              value={payment.walletTxn}
              error={errors.walletTxn}
              onChange={(v) => onChange("walletTxn", v)}
            />
          </div>
        ) : null}

        {kind === "card" ? (
          <div className="space-y-1">
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
          </div>
        ) : null}

        {kind === "cod" ? (
          <p className="text-sm text-muted-foreground">Pay in cash when your order arrives.</p>
        ) : null}
      </div>
    </div>
  );
}

/* ================================================================== *
 * Step 2 — Review
 * ================================================================== */

interface ReviewStepProps {
  address: Address;
  payment: PaymentState;
  rows: { id: string; name: string; quantity: number; gradient: string; lineTotal: number }[];
}

function paymentReference(payment: PaymentState): string {
  const kind = paymentKind(payment.method);
  if (kind === "wallet") return payment.walletNumber || "—";
  if (kind === "card") {
    const last4 = payment.cardNumber.replace(/\D/g, "").slice(-4);
    return `•••• ${last4 || "----"}`;
  }
  return "Cash on Delivery";
}

function ReviewStep({ address, payment, rows }: ReviewStepProps) {
  const fullName = address.name.trim();
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
            <div>{fullName || "—"}</div>
            <div className="text-muted-foreground">{address.phone || "—"}</div>
            <div className="truncate text-muted-foreground">{address.email || "—"}</div>
            <div className="text-muted-foreground">{address.line1 || "—"}</div>
            <div className="text-muted-foreground">{address.area || "—"}</div>
            <div className="text-muted-foreground">{address.district || "—"}</div>
            <div className="text-muted-foreground">Bangladesh</div>
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Payment
          </h4>
          <dl className="space-y-1 text-sm text-foreground">
            <div>{PAYMENT_METHOD_LABEL[payment.method]}</div>
            <div className="font-mono tabular-nums text-muted-foreground">
              {paymentReference(payment)}
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
