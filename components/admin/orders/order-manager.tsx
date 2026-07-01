"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import {
  setOrderStatus,
  setOrderPaymentStatus,
  updateOrderNotes,
} from "@/lib/admin/orders-actions";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/admin/orders-schema";

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

export interface OrderManagerProps {
  orderId: string;
  status: string;
  paymentStatus: string;
  notes: string;
}

/* -------------------------------------------------------------------------- */
/* Shared style tokens (mirrors the product form).                             */
/* -------------------------------------------------------------------------- */

const inputClass =
  "h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";
const textareaClass =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Narrow an arbitrary string to a known OrderStatus, falling back to the first
 * status. Keeps the controlled <select> value typed so indexing the label map
 * is sound under noUncheckedIndexedAccess.
 */
function toOrderStatus(value: string): OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value)
    ? (value as OrderStatus)
    : ORDER_STATUSES[0];
}

function toPaymentStatus(value: string): PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value)
    ? (value as PaymentStatus)
    : PAYMENT_STATUSES[0];
}

/** Small inline status/error region. */
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

export function OrderManager(props: OrderManagerProps) {
  const { orderId } = props;
  const router = useRouter();

  // ---- Order status --------------------------------------------------------
  const [status, setStatus] = useState<OrderStatus>(toOrderStatus(props.status));
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusSaved, setStatusSaved] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  async function onStatusChange(next: OrderStatus) {
    const previous = status;
    if (next === previous) return;

    // Optimistically apply, clear prior feedback, mark in-flight.
    setStatus(next);
    setStatusSaved(false);
    setStatusError(null);
    setStatusSaving(true);

    const res = await setOrderStatus(orderId, next);

    setStatusSaving(false);
    if (!res.ok) {
      setStatus(previous); // revert
      setStatusError(res.error ?? "Could not update order status.");
      return;
    }
    setStatusSaved(true);
    router.refresh();
    window.setTimeout(() => setStatusSaved(false), 2000);
  }

  // ---- Payment status ------------------------------------------------------
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    toPaymentStatus(props.paymentStatus),
  );
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  async function onPaymentChange(next: PaymentStatus) {
    const previous = paymentStatus;
    if (next === previous) return;

    setPaymentStatus(next);
    setPaymentSaved(false);
    setPaymentError(null);
    setPaymentSaving(true);

    const res = await setOrderPaymentStatus(orderId, next);

    setPaymentSaving(false);
    if (!res.ok) {
      setPaymentStatus(previous); // revert
      setPaymentError(res.error ?? "Could not update payment status.");
      return;
    }
    setPaymentSaved(true);
    router.refresh();
    window.setTimeout(() => setPaymentSaved(false), 2000);
  }

  // ---- Notes ---------------------------------------------------------------
  const [notes, setNotes] = useState(props.notes);
  const [savedNotes, setSavedNotes] = useState(props.notes);
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notesPending, startNotesTransition] = useTransition();

  const notesUnchanged = notes === savedNotes;

  function onSaveNotes() {
    setNotesSaved(false);
    setNotesError(null);
    const value = notes;
    startNotesTransition(async () => {
      const res = await updateOrderNotes(orderId, value);
      if (!res.ok) {
        setNotesError(res.error ?? "Could not save notes.");
        return;
      }
      setSavedNotes(value);
      setNotesSaved(true);
      router.refresh();
      window.setTimeout(() => setNotesSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Manage order</h2>

      {/* Order status */}
      <div className="space-y-1.5">
        <label
          htmlFor="order-status"
          className="block text-sm font-medium text-foreground"
        >
          Order status
        </label>
        <div className="flex items-center gap-2">
          <select
            id="order-status"
            className={inputClass}
            value={status}
            disabled={statusSaving}
            aria-describedby="order-status-feedback"
            onChange={(e) => void onStatusChange(toOrderStatus(e.target.value))}
          >
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {ORDER_STATUS_LABEL[value]}
              </option>
            ))}
          </select>
          {statusSaving ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        <StatusLine
          id="order-status-feedback"
          saved={statusSaved}
          error={statusError}
        />
      </div>

      {/* Payment status */}
      <div className="space-y-1.5">
        <label
          htmlFor="payment-status"
          className="block text-sm font-medium text-foreground"
        >
          Payment status
        </label>
        <div className="flex items-center gap-2">
          <select
            id="payment-status"
            className={inputClass}
            value={paymentStatus}
            disabled={paymentSaving}
            aria-describedby="payment-status-feedback"
            onChange={(e) => void onPaymentChange(toPaymentStatus(e.target.value))}
          >
            {PAYMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {PAYMENT_STATUS_LABEL[value]}
              </option>
            ))}
          </select>
          {paymentSaving ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        <StatusLine
          id="payment-status-feedback"
          saved={paymentSaved}
          error={paymentError}
        />
      </div>

      {/* Internal notes */}
      <div className="space-y-1.5">
        <label
          htmlFor="order-notes"
          className="block text-sm font-medium text-foreground"
        >
          Internal notes
        </label>
        <textarea
          id="order-notes"
          rows={4}
          className={textareaClass}
          placeholder="Notes visible to staff only"
          value={notes}
          disabled={notesPending}
          aria-describedby="order-notes-feedback"
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSaveNotes}
            disabled={notesPending || notesUnchanged}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {notesPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save notes
          </button>
          <StatusLine
            id="order-notes-feedback"
            saved={notesSaved}
            error={notesError}
          />
        </div>
      </div>
    </div>
  );
}
