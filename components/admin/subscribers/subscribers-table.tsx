"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Loader2, Mail, Search, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminSubscriberRow } from "@/lib/admin/subscribers-queries";
import { deleteSubscribers, exportSubscribers } from "@/lib/admin/subscribers-actions";

export interface SubscribersTableProps {
  rows: AdminSubscriberRow[];
  total: number;
  page: number;
  perPage: number;
  search: string;
}

function formatDate(value: string): string {
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

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function SubscribersTable({ rows, total, page, perPage, search }: SubscribersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(search);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setSearchValue(search), [search]);

  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(rows.map((r) => r.id));
      const next = new Set<string>();
      let changed = false;
      for (const id of prev) {
        if (visible.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [rows]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, perPage)));
  const working = pending || busy;

  const pushParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
    },
    [pathname, router, searchParams],
  );

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams((params) => {
        const trimmed = value.trim();
        if (trimmed) params.set("search", trimmed);
        else params.delete("search");
        params.delete("page");
      });
    }, 350);
  }

  const allVisibleSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = selected.size > 0 && !allVisibleSelected;
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  function toggleSelectAll() {
    setSelected((prev) => {
      if (rows.length > 0 && rows.every((r) => prev.has(r.id))) {
        const next = new Set(prev);
        for (const r of rows) next.delete(r.id);
        return next;
      }
      const next = new Set(prev);
      for (const r of rows) next.add(r.id);
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function goToPage(next: number) {
    const target = Math.min(totalPages, Math.max(1, next));
    if (target === page) return;
    pushParams((params) => {
      if (target <= 1) params.delete("page");
      else params.set("page", String(target));
    });
  }

  const runDelete = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0 || working) return;
      if (!window.confirm(`Remove ${ids.length} subscriber${ids.length === 1 ? "" : "s"}?`)) return;
      setError(null);
      setBusy(true);
      try {
        const res = await deleteSubscribers(ids);
        if (!res.ok) {
          setError(res.error ?? "Failed to remove.");
          return;
        }
        setSelected(new Set());
        startTransition(() => router.refresh());
      } catch {
        setError("Something went wrong while removing.");
      } finally {
        setBusy(false);
      }
    },
    [router, working],
  );

  async function handleExport() {
    if (exporting) return;
    setError(null);
    setExporting(true);
    try {
      const all = await exportSubscribers();
      const header = "email,source,status,subscribed_at";
      const lines = all.map((r) =>
        [r.email, r.source ?? "", r.status, r.created_at].map((c) => csvCell(String(c))).join(","),
      );
      const csv = [header, ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nexus-subscribers.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeEnd = Math.min(total, (page - 1) * perPage + rows.length);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Search email…"
            aria-label="Search subscribers"
            className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          {searchValue ? (
            <button
              type="button"
              onClick={() =>
                pushParams((params) => {
                  params.delete("search");
                  params.delete("page");
                })
              }
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {total === 0 ? "No subscribers" : `${rangeStart}–${rangeEnd} of ${total}`}
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export CSV
          </button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss error" className="shrink-0">
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {selected.size > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2">
          <p className="text-sm font-medium">
            {selected.size} selected
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-2 text-xs font-normal text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Clear
            </button>
          </p>
          <button
            type="button"
            onClick={() => void runDelete(selectedIds)}
            disabled={working}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
            Remove
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all subscribers"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleSelectAll}
                    disabled={rows.length === 0}
                    className="size-4 cursor-pointer rounded border-border bg-card accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">Email</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Source</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Subscribed</th>
                <th scope="col" className="w-px px-3 py-2.5 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16">
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <span className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
                        <Mail className="size-6" />
                      </span>
                      <p className="font-medium">
                        {search ? "No subscribers match your search" : "No subscribers yet"}
                      </p>
                      <p className="max-w-sm text-sm text-muted-foreground">
                        Sign-ups from the storefront newsletter form appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isSelected = selected.has(row.id);
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-border last:border-b-0 hover:bg-secondary/50",
                        isSelected && "bg-secondary/40",
                      )}
                    >
                      <td className="px-3 py-2.5 align-middle">
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.email}`}
                          checked={isSelected}
                          onChange={() => toggleRow(row.id)}
                          className="size-4 cursor-pointer rounded border-border bg-card accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </td>
                      <td className="px-3 py-2.5 align-middle font-medium text-foreground">
                        {row.email}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-muted-foreground">
                        {row.source ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle text-muted-foreground">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => void runDelete([row.id])}
                            disabled={working}
                            aria-label={`Remove ${row.email}`}
                            title="Remove"
                            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || working}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="size-4" />
              Prev
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages || working}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
