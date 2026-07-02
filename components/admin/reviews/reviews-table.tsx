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
import {
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  Search,
  ShieldAlert,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  setReviewsStatus,
  deleteReviews,
  type ActionResult,
} from "@/lib/admin/reviews-actions";
import type { AdminReviewRow } from "@/lib/admin/reviews-queries";
import {
  REVIEW_STATUSES,
  REVIEW_STATUS_BADGE,
  REVIEW_STATUS_LABEL,
  isReviewStatus,
} from "@/lib/admin/reviews-schema";

export interface ReviewsTableProps {
  rows: AdminReviewRow[];
  total: number;
  page: number;
  perPage: number;
  search: string;
  status: string;
  productId: string;
  counts: Record<string, number>;
  productChoices: { id: string; name: string }[];
}

const MUTED_BADGE = "border-border bg-secondary text-muted-foreground";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function ReviewStatusBadge({ status }: { status: string }) {
  const className = isReviewStatus(status) ? REVIEW_STATUS_BADGE[status] : MUTED_BADGE;
  const label = isReviewStatus(status) ? REVIEW_STATUS_LABEL[status] : status || "—";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}

function StarRating({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`${filled} out of 5 stars`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={cn(
            "size-3.5",
            i < filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}

export function ReviewsTable({
  rows,
  total,
  page,
  perPage,
  search,
  status,
  productId,
  counts,
  productChoices,
}: ReviewsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(search);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the controlled search box in sync when the URL changes externally
  // (e.g. browser back/forward) without clobbering active typing.
  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  // Clear stale selections whenever the visible rows change (page/filter).
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(rows.map((r) => r.id));
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (visible.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, perPage)));
  const working = pending || busy;

  const pushParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname);
      });
    },
    [pathname, router, searchParams],
  );

  // Debounced search -> ?search= (resets page to 1).
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

  function clearSearch() {
    setSearchValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushParams((params) => {
      params.delete("search");
      params.delete("page");
    });
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleStatusChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    pushParams((params) => {
      if (value) params.set("status", value);
      else params.delete("status");
      params.delete("page");
    });
  }

  function handleProductChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    pushParams((params) => {
      if (value) params.set("product", value);
      else params.delete("product");
      params.delete("page");
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

  const allVisibleSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const someSelected = selected.size > 0 && !allVisibleSelected;

  function toggleSelectAll() {
    setSelected((prev) => {
      if (rows.every((row) => prev.has(row.id)) && rows.length > 0) {
        const next = new Set(prev);
        for (const row of rows) next.delete(row.id);
        return next;
      }
      const next = new Set(prev);
      for (const row of rows) next.add(row.id);
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

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const runAction = useCallback(
    async (label: string, action: () => Promise<ActionResult>, clearSelection: boolean) => {
      setErrorMessage(null);
      setBusy(true);
      try {
        const result = await action();
        if (!result.ok) {
          setErrorMessage(result.error ?? `Failed to ${label}.`);
          return;
        }
        if (clearSelection) setSelected(new Set());
        startTransition(() => {
          router.refresh();
        });
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : `Failed to ${label}.`);
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  function handleRowStatus(row: AdminReviewRow, next: (typeof REVIEW_STATUSES)[number]) {
    if (working || row.status === next) return;
    void runAction(`set the review to ${next}`, () => setReviewsStatus([row.id], next), false);
  }

  function handleDeleteRow(row: AdminReviewRow) {
    if (working) return;
    if (!window.confirm(`Delete this review by ${row.author_name || "guest"}?`)) return;
    void runAction("delete the review", () => deleteReviews([row.id]), true);
  }

  function handleBulkStatus(next: (typeof REVIEW_STATUSES)[number]) {
    if (working || selectedIds.length === 0) return;
    void runAction(`set status to ${next}`, () => setReviewsStatus(selectedIds, next), true);
  }

  function handleBulkDelete() {
    if (working || selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} review(s)?`)) return;
    void runAction("delete the reviews", () => deleteReviews(selectedIds), true);
  }

  const hasFilters = Boolean(search || status || productId);
  const rangeStart = total === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeEnd = Math.min(total, (page - 1) * perPage + rows.length);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchValue}
              onChange={handleSearchChange}
              placeholder="Search author, title, email…"
              aria-label="Search reviews"
              className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            {searchValue ? (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="status-filter" className="sr-only">
              Filter by status
            </label>
            <select
              id="status-filter"
              value={isReviewStatus(status) ? status : ""}
              onChange={handleStatusChange}
              className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All statuses</option>
              {REVIEW_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {REVIEW_STATUS_LABEL[value]} ({counts[value] ?? 0})
                </option>
              ))}
            </select>

            <label htmlFor="product-filter" className="sr-only">
              Filter by product
            </label>
            <select
              id="product-filter"
              value={productChoices.some((p) => p.id === productId) ? productId : ""}
              onChange={handleProductChange}
              className="h-9 max-w-[12rem] rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All products</option>
              {productChoices.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          {working ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          {total === 0 ? (
            "No results"
          ) : (
            <span>
              {rangeStart}–{rangeEnd} of {total}
            </span>
          )}
        </p>
      </div>

      {/* Error banner */}
      {errorMessage ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error"
            className="shrink-0 rounded text-destructive/80 hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {/* Bulk action bar */}
      {selected.size > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleBulkStatus("approved")}
              disabled={working}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Check className="size-3.5" />
              Approve
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatus("rejected")}
              disabled={working}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <X className="size-3.5" />
              Reject
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatus("spam")}
              disabled={working}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <ShieldAlert className="size-3.5" />
              Spam
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={working}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
              Delete
            </button>
          </div>
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleSelectAll}
                    disabled={rows.length === 0}
                    className="size-4 cursor-pointer rounded border-border bg-card accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </th>
                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                  Review
                </th>
                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                  Product
                </th>
                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                  Date
                </th>
                <th scope="col" className="w-px px-3 py-2.5 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16">
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <span className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
                        <MessageSquare className="size-6" />
                      </span>
                      <div>
                        <p className="font-medium">
                          {hasFilters ? "No reviews match your filters" : "No reviews yet"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {hasFilters
                            ? "Try adjusting or clearing your search and filters."
                            : "Customer reviews will appear here once submitted."}
                        </p>
                      </div>
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
                      <td className="px-3 py-2.5 align-top">
                        <input
                          type="checkbox"
                          aria-label={`Select review by ${row.author_name || "guest"}`}
                          checked={isSelected}
                          onChange={() => toggleRow(row.id)}
                          className="mt-0.5 size-4 cursor-pointer rounded border-border bg-card accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </td>
                      <td className="max-w-md px-3 py-2.5 align-top">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <StarRating rating={row.rating} />
                            {row.is_verified ? (
                              <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-400">
                                Verified
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-foreground">{row.author_name || "Guest"}</span>
                            {row.author_email ? (
                              <span className="text-muted-foreground"> · {row.author_email}</span>
                            ) : null}
                          </p>
                          {row.title ? (
                            <p className="font-medium text-foreground">{row.title}</p>
                          ) : null}
                          <p className="line-clamp-3 text-sm text-muted-foreground">{row.body}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top text-foreground">
                        {row.product_name ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <ReviewStatusBadge status={row.status} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-top text-muted-foreground">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleRowStatus(row, "approved")}
                            disabled={working || row.status === "approved"}
                            aria-label="Approve review"
                            title="Approve"
                            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                          >
                            <Check className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRowStatus(row, "rejected")}
                            disabled={working || row.status === "rejected"}
                            aria-label="Reject review"
                            title="Reject"
                            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                          >
                            <X className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRowStatus(row, "spam")}
                            disabled={working || row.status === "spam"}
                            aria-label="Mark review as spam"
                            title="Spam"
                            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                          >
                            <Ban className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row)}
                            disabled={working}
                            aria-label="Delete review"
                            title="Delete"
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

      {/* Pagination footer */}
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
