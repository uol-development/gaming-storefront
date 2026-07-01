"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminOrderRow } from "@/lib/admin/orders-queries";
import { permanentlyDeleteOrders, restoreOrders } from "@/lib/admin/orders-actions";
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABEL, isOrderStatus } from "@/lib/admin/orders-schema";
import { formatPrice } from "@/lib/format";

export interface OrdersTrashTableProps {
  rows: AdminOrderRow[];
}

function StatusBadge({ status }: { status: string }) {
  const isKnown = isOrderStatus(status);
  const cls = isKnown ? ORDER_STATUS_BADGE[status] : "border-border bg-secondary text-muted-foreground";
  const label = isKnown ? ORDER_STATUS_LABEL[status] : status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        cls,
      )}
    >
      {label}
    </span>
  );
}

function formatArchivedAt(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function OrdersTrashTable({ rows }: OrdersTrashTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [bulkPending, setBulkPending] = useState<"restore" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const selectedIds = useMemo(
    () => allIds.filter((id) => selected.has(id)),
    [allIds, selected],
  );
  const allSelected = allIds.length > 0 && selectedIds.length === allIds.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const busy = pendingId !== null || bulkPending !== null;

  function toggleAll() {
    setSelected((prev) => {
      if (prev.size === allIds.length) return new Set();
      return new Set(allIds);
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runRestore(ids: string[], rowId: string | null) {
    if (ids.length === 0) return;
    setError(null);
    if (rowId) setPendingId(rowId);
    else setBulkPending("restore");
    try {
      const res = await restoreOrders(ids);
      if (!res.ok) {
        setError(res.error ?? "Failed to restore.");
        return;
      }
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      router.refresh();
    } catch {
      setError("Something went wrong while restoring.");
    } finally {
      setPendingId(null);
      setBulkPending(null);
    }
  }

  async function runPurge(ids: string[], rowId: string | null) {
    if (ids.length === 0) return;
    const count = ids.length;
    const ok = window.confirm(
      count === 1
        ? "Permanently delete this order? This cannot be undone."
        : `Permanently delete ${count} orders? This cannot be undone.`,
    );
    if (!ok) return;
    setError(null);
    if (rowId) setPendingId(rowId);
    else setBulkPending("delete");
    try {
      const res = await permanentlyDeleteOrders(ids);
      if (!res.ok) {
        setError(res.error ?? "Failed to delete.");
        return;
      }
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      router.refresh();
    } catch {
      setError("Something went wrong while deleting.");
    } finally {
      setPendingId(null);
      setBulkPending(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
            <Trash2 className="size-6" />
          </span>
          <p className="text-sm font-medium text-foreground">No archived orders</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Orders you archive will appear here, where you can restore them or permanently remove
            them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {/* Bulk action bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {selectedIds.length > 0
            ? `${selectedIds.length} selected`
            : `${rows.length} item${rows.length === 1 ? "" : "s"} in trash`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => void runRestore(selectedIds, null)}
            disabled={selectedIds.length === 0 || busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bulkPending === "restore" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            Restore
          </button>
          <button
            type="button"
            onClick={() => void runPurge(selectedIds, null)}
            disabled={selectedIds.length === 0 || busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-destructive px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bulkPending === "delete" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Delete permanently
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all orders"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    className="size-4 rounded border-border bg-card text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Order
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Total
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Archived
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isSelected = selected.has(row.id);
                const rowBusy = pendingId === row.id;
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border last:border-0 transition-colors hover:bg-secondary/50",
                      isSelected && "bg-secondary/40",
                    )}
                  >
                    <td className="px-3 py-2.5 align-middle">
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.order_number}`}
                        checked={isSelected}
                        onChange={() => toggleOne(row.id)}
                        className="size-4 rounded border-border bg-card text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{row.order_number}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.customer_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.customer_email}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right tabular-nums text-foreground">
                      {formatPrice(row.total)}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-muted-foreground">
                      {formatArchivedAt(row.deleted_at)}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void runRestore([row.id], row.id)}
                          disabled={busy}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {rowBusy ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="size-3.5" />
                          )}
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => void runPurge([row.id], row.id)}
                          disabled={busy}
                          aria-label={`Delete ${row.order_number} permanently`}
                          className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
