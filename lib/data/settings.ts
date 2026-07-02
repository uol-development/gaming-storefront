import {
  INSIDE_DHAKA_FEE,
  DHAKA_SUBURB_FEE,
  OUTSIDE_DHAKA_FEE,
  FREE_SHIPPING_THRESHOLD,
  type ShippingConfig,
} from "@/lib/data/pricing";
import { isPaymentMethod, type PaymentMethod } from "@/lib/data/bd";

/**
 * Store settings model — PURE + client-safe (no server imports), so the admin
 * form, storefront components, and the pricing layer can all share the types,
 * defaults, and the merge/convert helpers. The actual DB read lives in the
 * server-only `settings-read.ts`.
 *
 * Everything here is NON-secret, storefront-facing config. Money (shipping
 * rates + free-ship threshold) is in integer minor units (poisha), matching the
 * pricing layer. `mergeSettings` layers a partial/unknown DB blob over the
 * defaults so a missing table/row/field never yields an incomplete object.
 */

export interface StoreIdentity {
  name: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  whatsapp: string;
  address: string;
}

export interface SocialLinks {
  facebook: string;
  instagram: string;
  youtube: string;
  tiktok: string;
  x: string;
}

export interface ShippingSettings {
  insideDhaka: number;
  dhakaSuburb: number;
  outsideDhaka: number;
  freeThreshold: number;
}

export interface PaymentSettings {
  cod: boolean;
  bkash: boolean;
  nagad: boolean;
  rocket: boolean;
  card: boolean;
}

export interface MaintenanceSettings {
  enabled: boolean;
  message: string;
}

export interface StoreSettings {
  store: StoreIdentity;
  social: SocialLinks;
  shipping: ShippingSettings;
  payments: PaymentSettings;
  maintenance: MaintenanceSettings;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  store: {
    name: "NEXUS",
    tagline:
      "Premium gaming gear, hand-picked rigs, and battle-tested peripherals — built for players who refuse to lose to their hardware.",
    supportEmail: "info@ultimateorganiclife.com",
    supportPhone: "",
    whatsapp: "",
    address: "",
  },
  social: { facebook: "", instagram: "", youtube: "", tiktok: "", x: "" },
  shipping: {
    insideDhaka: INSIDE_DHAKA_FEE,
    dhakaSuburb: DHAKA_SUBURB_FEE,
    outsideDhaka: OUTSIDE_DHAKA_FEE,
    freeThreshold: FREE_SHIPPING_THRESHOLD,
  },
  payments: { cod: true, bkash: true, nagad: true, rocket: true, card: true },
  maintenance: { enabled: false, message: "" },
};

/* ------------------------------- coercion -------------------------------- */

const asObject = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};

const asString = (v: unknown, fallback: string): string =>
  typeof v === "string" ? v : fallback;

const asBool = (v: unknown, fallback: boolean): boolean =>
  typeof v === "boolean" ? v : fallback;

/** Non-negative integer minor-unit amount, else the fallback. */
const asMoney = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : fallback;

/** Layer a raw (partial/unknown) settings blob over the defaults. Never throws. */
export function mergeSettings(raw: unknown): StoreSettings {
  const root = asObject(raw);
  const store = asObject(root.store);
  const social = asObject(root.social);
  const shipping = asObject(root.shipping);
  const payments = asObject(root.payments);
  const maintenance = asObject(root.maintenance);
  const d = DEFAULT_SETTINGS;
  return {
    store: {
      name: asString(store.name, d.store.name),
      tagline: asString(store.tagline, d.store.tagline),
      supportEmail: asString(store.supportEmail, d.store.supportEmail),
      supportPhone: asString(store.supportPhone, d.store.supportPhone),
      whatsapp: asString(store.whatsapp, d.store.whatsapp),
      address: asString(store.address, d.store.address),
    },
    social: {
      facebook: asString(social.facebook, d.social.facebook),
      instagram: asString(social.instagram, d.social.instagram),
      youtube: asString(social.youtube, d.social.youtube),
      tiktok: asString(social.tiktok, d.social.tiktok),
      x: asString(social.x, d.social.x),
    },
    shipping: {
      insideDhaka: asMoney(shipping.insideDhaka, d.shipping.insideDhaka),
      dhakaSuburb: asMoney(shipping.dhakaSuburb, d.shipping.dhakaSuburb),
      outsideDhaka: asMoney(shipping.outsideDhaka, d.shipping.outsideDhaka),
      freeThreshold: asMoney(shipping.freeThreshold, d.shipping.freeThreshold),
    },
    payments: {
      cod: asBool(payments.cod, d.payments.cod),
      bkash: asBool(payments.bkash, d.payments.bkash),
      nagad: asBool(payments.nagad, d.payments.nagad),
      rocket: asBool(payments.rocket, d.payments.rocket),
      card: asBool(payments.card, d.payments.card),
    },
    maintenance: {
      enabled: asBool(maintenance.enabled, d.maintenance.enabled),
      message: asString(maintenance.message, d.maintenance.message),
    },
  };
}

/* ------------------------------ converters ------------------------------- */

export function toShippingConfig(settings: StoreSettings): ShippingConfig {
  return {
    insideDhaka: settings.shipping.insideDhaka,
    dhakaSuburb: settings.shipping.dhakaSuburb,
    outsideDhaka: settings.shipping.outsideDhaka,
    freeThreshold: settings.shipping.freeThreshold,
  };
}

/** The payment methods the owner has enabled, in canonical order. Never empty:
 *  if the owner disables everything, Cash on Delivery is forced back on so the
 *  store can always take an order. */
export function enabledPaymentMethods(settings: StoreSettings): PaymentMethod[] {
  const p = settings.payments;
  const flags: Record<PaymentMethod, boolean> = {
    cod: p.cod,
    bkash: p.bkash,
    nagad: p.nagad,
    rocket: p.rocket,
    card: p.card,
  };
  const order: PaymentMethod[] = ["cod", "bkash", "nagad", "rocket", "card"];
  const enabled = order.filter((m) => flags[m]);
  return enabled.length > 0 ? enabled : ["cod"];
}

export function isPaymentEnabled(settings: StoreSettings, method: string): boolean {
  return isPaymentMethod(method) && enabledPaymentMethods(settings).includes(method);
}
