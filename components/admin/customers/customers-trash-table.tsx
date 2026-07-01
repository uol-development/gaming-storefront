"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminCustomerRow } from "@/lib/admin/customers-queries";
import { permanentlyDeleteCustomers, restoreCustomers } from "@/lib/admin/customers-actions";
import { formatPrice } from "@/lib/format";

export interface CustomersTrashTableProps {
  rows: AdminCustomerRow[];
}

function initials(name: string, email: string): string {
  const source = name.trim() || email.trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  const combined = (first + second).toUpperCase();
  return combined || "?";
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

export function CustomersTrashTable({ rows }: CustomersTrashTableProps) {
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
      const res = await restoreCustomers(ids);
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
        ? "Permanently delete this customer? This cannot be undone."
        : `Permanently delete ${count} customers? This cannot be undone.`,
    );
    if (!ok) return;
    setError(null);
    if (rowId) setPendingId(rowId);
    else setBulkPending("delete");
    try {
      const res = await permanentlyDeleteCustomers(ids);
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
          <p className="text-sm font-medium text-foreground">No archived customers</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Customers you archive will appear here, where you can restore them or permanently
            remove them.
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
                    aria-label="Select all customers"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    className="size-4 rounded border-border bg-card text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Customer
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Orders
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Spent
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
                const label = row.name || row.email || "customer";
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
                        aria-label={`Select ${label}`}
                        checked={isSelected}
                        onChange={() => toggleOne(row.id)}
                        className="size-4 rounded border-border bg-card text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                          {initials(row.name, row.email)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {row.name || "Unnamed customer"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right tabular-nums text-foreground">
                      {row.order_count}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right tabular-nums text-foreground">
                      {formatPrice(row.total_spent)}
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
                          aria-label={`Delete ${label} permanently`}
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
