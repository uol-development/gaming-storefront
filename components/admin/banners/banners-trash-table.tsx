"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageOff, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminBannerRow } from "@/lib/admin/banners-queries";
import { permanentlyDeleteBanners, restoreBanners } from "@/lib/admin/banners-actions";

export interface BannersTrashTableProps {
  rows: AdminBannerRow[];
}

function formatDeletedAt(value: string | null): string {
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

export function BannersTrashTable({ rows }: BannersTrashTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [bulkPending, setBulkPending] = useState<"restore" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const selectedIds = useMemo(() => allIds.filter((id) => selected.has(id)), [allIds, selected]);
  const allSelected = allIds.length > 0 && selectedIds.length === allIds.length;
  const someSelected = selectedIds.length > 0 && !allSelected;
  const busy = pendingId !== null || bulkPending !== null;

  function toggleAll() {
    setSelected((prev) => (prev.size === allIds.length ? new Set() : new Set(allIds)));
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
      const res = await restoreBanners(ids);
      if (!res.ok) {
        setError(res.error ?? "Failed to restore.");
        return;
      }
      setSelected(new Set());
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
    const ok = window.confirm(
      ids.length === 1
        ? "Permanently delete this banner? This cannot be undone."
        : `Permanently delete ${ids.length} banners? This cannot be undone.`,
    );
    if (!ok) return;
    setError(null);
    if (rowId) setPendingId(rowId);
    else setBulkPending("delete");
    try {
      const res = await permanentlyDeleteBanners(ids);
      if (!res.ok) {
        setError(res.error ?? "Failed to delete.");
        return;
      }
      setSelected(new Set());
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
          <p className="text-sm font-medium text-foreground">Recycle bin is empty</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Banners you remove appear here, where you can restore them or delete them for good.
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

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all banners"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    className="size-4 rounded border-border bg-card accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">Banner</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Archived</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isSelected = selected.has(row.id);
                const rowBusy = pendingId === row.id;
                const heading = row.heading || "Untitled banner";
                const isPublished = row.status === "published";
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
                        aria-label={`Select ${heading}`}
                        checked={isSelected}
                        onChange={() => toggleOne(row.id)}
                        className="size-4 rounded border-border bg-card accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-16 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-secondary text-muted-foreground">
                          {row.image_url ? (
                            <img
                              src={row.image_url}
                              alt=""
                              className="size-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <ImageOff className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{heading}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.placement} · {row.size}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          isPublished
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {isPublished ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-middle text-muted-foreground">
                      {formatDeletedAt(row.deleted_at)}
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
                          aria-label={`Delete ${heading} permanently`}
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
