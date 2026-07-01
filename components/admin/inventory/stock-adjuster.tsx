"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Equal, Loader2, Minus, Plus } from "lucide-react";
import { adjustStock, setLowStockThreshold } from "@/lib/admin/inventory-actions";
import {
  MOVEMENT_REASONS,
  MOVEMENT_REASON_LABEL,
  type AdjustMode,
  type MovementReason,
} from "@/lib/admin/inventory-schema";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

export interface StockAdjusterProps {
  productId: string;
  currentStock: number;
  lowStockThreshold: number;
}

/* -------------------------------------------------------------------------- */
/* Shared style tokens (mirrors order-manager / the product form).             */
/* -------------------------------------------------------------------------- */

const inputClass =
  "h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";

const cardClass = "rounded-xl border border-border bg-card p-5";

const primaryButtonClass =
  "inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Narrow an arbitrary string to a known reason, defaulting to "restock". */
function toReason(value: string): MovementReason {
  return (MOVEMENT_REASONS as readonly string[]).includes(value)
    ? (value as MovementReason)
    : "restock";
}

/**
 * Parse a controlled amount string to a whole, non-negative integer.
 * Returns null when the value is empty or not a valid whole number.
 */
function parseWhole(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** Resulting stock level for a mode + amount, clamped like the server. */
function nextLevel(mode: AdjustMode, current: number, amount: number): number {
  if (mode === "add") return current + amount;
  if (mode === "remove") return Math.max(0, current - amount);
  return amount; // set
}

const MODE_OPTIONS: ReadonlyArray<{
  value: AdjustMode;
  label: string;
  Icon: typeof Plus;
}> = [
  { value: "add", label: "Add", Icon: Plus },
  { value: "remove", label: "Remove", Icon: Minus },
  { value: "set", label: "Set", Icon: Equal },
];

/** Small inline saved/error region. */
function StatusLine({
  saved,
  error,
  id,
}: {
  saved: boolean;
  error: string | null;
  id: string;
}) {
  return (
    <p id={id} aria-live="polite" className="min-h-4 text-xs">
      {error ? (
        <span className="inline-flex items-center gap-1 text-destructive">
          <AlertCircle className="size-3.5" />
          {error}
        </span>
      ) : saved ? (
        <span className="inline-flex items-center gap-1 text-emerald-400">
          <Check className="size-3.5" />
          Saved
        </span>
      ) : null}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function StockAdjuster(props: StockAdjusterProps) {
  const { productId, currentStock, lowStockThreshold } = props;
  const router = useRouter();

  /* ---- Card 1: Adjust stock --------------------------------------------- */
  const [mode, setMode] = useState<AdjustMode>("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<MovementReason>("restock");
  const [note, setNote] = useState("");
  const [adjustSaved, setAdjustSaved] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustPending, startAdjustTransition] = useTransition();

  const parsedAmount = parseWhole(amount);
  // add/remove require > 0; set requires >= 0.
  const amountValid =
    parsedAmount !== null && (mode === "set" ? parsedAmount >= 0 : parsedAmount > 0);
  const previewLevel = nextLevel(mode, currentStock, parsedAmount ?? 0);
  const previewInvalid = parsedAmount === null || !amountValid;

  function onApply() {
    if (parsedAmount === null || !amountValid) return;
    const amountToSend = parsedAmount;
    const reasonToSend = reason;
    const noteToSend = note.trim();
    setAdjustSaved(false);
    setAdjustError(null);
    startAdjustTransition(async () => {
      const res = await adjustStock(productId, {
        mode,
        amount: amountToSend,
        reason: reasonToSend,
        note: noteToSend.length > 0 ? noteToSend : undefined,
      });
      if (!res.ok) {
        setAdjustError(res.error ?? "Could not adjust stock.");
        return;
      }
      setAmount("");
      setNote("");
      setAdjustSaved(true);
      router.refresh();
      window.setTimeout(() => setAdjustSaved(false), 2000);
    });
  }

  /* ---- Card 2: Reorder threshold ---------------------------------------- */
  const [threshold, setThreshold] = useState(String(lowStockThreshold));
  const [thresholdSaved, setThresholdSaved] = useState(false);
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [thresholdPending, startThresholdTransition] = useTransition();

  const parsedThreshold = parseWhole(threshold);
  const thresholdValid = parsedThreshold !== null;
  const thresholdUnchanged = parsedThreshold === lowStockThreshold;

  function onSaveThreshold() {
    if (parsedThreshold === null || thresholdUnchanged) return;
    const valueToSend = parsedThreshold;
    setThresholdSaved(false);
    setThresholdError(null);
    startThresholdTransition(async () => {
      const res = await setLowStockThreshold(productId, valueToSend);
      if (!res.ok) {
        setThresholdError(res.error ?? "Could not save threshold.");
        return;
      }
      setThresholdSaved(true);
      router.refresh();
      window.setTimeout(() => setThresholdSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-5">
      {/* ---- Card 1: Adjust stock ------------------------------------------ */}
      <div className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Adjust stock</h2>

        {/* Mode segmented control */}
        <div className="mt-4 space-y-1.5">
          <span className="block text-sm font-medium text-foreground">Mode</span>
          <div
            role="group"
            aria-label="Adjustment mode"
            className="inline-flex rounded-md border border-border p-0.5"
          >
            {MODE_OPTIONS.map(({ value, label, Icon }) => {
              const active = mode === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  disabled={adjustPending}
                  onClick={() => setMode(value)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount */}
        <div className="mt-4 space-y-1.5">
          <label
            htmlFor="stock-amount"
            className="block text-sm font-medium text-foreground"
          >
            Amount
          </label>
          <input
            id="stock-amount"
            type="text"
            inputMode="numeric"
            className={inputClass}
            placeholder="0"
            value={amount}
            disabled={adjustPending}
            aria-describedby="stock-adjust-feedback"
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {/* Reason */}
        <div className="mt-4 space-y-1.5">
          <label
            htmlFor="stock-reason"
            className="block text-sm font-medium text-foreground"
          >
            Reason
          </label>
          <select
            id="stock-reason"
            className={inputClass}
            value={reason}
            disabled={adjustPending}
            onChange={(e) => setReason(toReason(e.target.value))}
          >
            {MOVEMENT_REASONS.map((value) => (
              <option key={value} value={value}>
                {MOVEMENT_REASON_LABEL[value]}
              </option>
            ))}
          </select>
        </div>

        {/* Note */}
        <div className="mt-4 space-y-1.5">
          <label
            htmlFor="stock-note"
            className="block text-sm font-medium text-foreground"
          >
            Note
          </label>
          <input
            id="stock-note"
            type="text"
            className={inputClass}
            placeholder="Optional note"
            value={note}
            disabled={adjustPending}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Live preview */}
        <p className="mt-4 text-sm text-muted-foreground">
          New level:{" "}
          <b className="tabular-nums text-foreground">
            {previewInvalid ? currentStock : previewLevel}
          </b>
        </p>

        {/* Apply */}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onApply}
            disabled={adjustPending || !amountValid}
            className={primaryButtonClass}
          >
            {adjustPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Apply
          </button>
          <StatusLine
            id="stock-adjust-feedback"
            saved={adjustSaved}
            error={adjustError}
          />
        </div>
      </div>

      {/* ---- Card 2: Reorder threshold ------------------------------------- */}
      <div className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Reorder threshold</h2>

        <div className="mt-4 space-y-1.5">
          <label
            htmlFor="low-stock-threshold"
            className="block text-sm font-medium text-foreground"
          >
            Low stock threshold
          </label>
          <input
            id="low-stock-threshold"
            type="text"
            inputMode="numeric"
            className={inputClass}
            placeholder="0"
            value={threshold}
            disabled={thresholdPending}
            aria-describedby="threshold-feedback"
            onChange={(e) => setThreshold(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Flag as low stock at or below this level
          </p>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onSaveThreshold}
            disabled={thresholdPending || thresholdUnchanged || !thresholdValid}
            className={primaryButtonClass}
          >
            {thresholdPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </button>
          <StatusLine
            id="threshold-feedback"
            saved={thresholdSaved}
            error={thresholdError}
          />
        </div>
      </div>
    </div>
  );
}
