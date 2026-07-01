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
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Loader2,
  Package,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { bulkRestock, type ActionResult } from "@/lib/admin/inventory-actions";
import type { AdminInventoryRow } from "@/lib/admin/inventory-queries";
import {
  INVENTORY_STATUS_BADGE,
  INVENTORY_STATUS_LABEL,
  MOVEMENT_REASONS,
  MOVEMENT_REASON_LABEL,
} from "@/lib/admin/inventory-schema";

export interface InventoryTableProps {
  rows: AdminInventoryRow[];
  total: number;
  page: number;
  perPage: number;
  search: string;
  stock: string;
  sort: string;
  dir: "asc" | "desc";
}

type SortableColumn = "name" | "stock_quantity" | "updated_at";

const SORTABLE: ReadonlySet<string> = new Set<SortableColumn>([
  "name",
  "stock_quantity",
  "updated_at",
]);

// Columns that default to descending on first click; the rest default ascending.
const DEFAULT_DESC: ReadonlySet<string> = new Set<SortableColumn>(["updated_at"]);

const STOCK_FILTER_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "All stock" },
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
];

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

function Thumbnail({ src, alt }: { src: string | null; alt: string }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-secondary text-muted-foreground">
      {src ? (
        <img src={src} alt={alt} className="size-full object-cover" loading="lazy" />
      ) : (
        <ImageOff className="size-4" aria-hidden />
      )}
    </span>
  );
}

function InventoryStatusBadge({ status }: { status: AdminInventoryRow["inventory_status"] }) {
  const className = INVENTORY_STATUS_BADGE[status] ?? MUTED_BADGE;
  const label = INVENTORY_STATUS_LABEL[status] ?? status;
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

export function InventoryTable({
  rows,
  total,
  page,
  perPage,
  search,
  stock,
  sort,
  dir,
}: InventoryTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(search);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [restockAmount, setRestockAmount] = useState("");
  const [restockReason, setRestockReason] = useState<string>("restock");
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the controlled search box in sync when the URL changes externally
  // (e.g. browser back/forward) without clobbering active typing.
  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  // Clear stale selections whenever the visible rows change (page/filter/sort).
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

  function handleStockChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    pushParams((params) => {
      if (value) params.set("stock", value);
      else params.delete("stock");
      params.delete("page");
    });
  }

  function toggleSort(column: SortableColumn) {
    pushParams((params) => {
      const currentSort = params.get("sort") ?? sort;
      const currentDir = (params.get("dir") ?? dir) === "asc" ? "asc" : "desc";
      let nextDir: "asc" | "desc" = "asc";
      if (currentSort === column) {
        nextDir = currentDir === "asc" ? "desc" : "asc";
      } else {
        // Sensible default direction per column.
        nextDir = DEFAULT_DESC.has(column) ? "desc" : "asc";
      }
      params.set("sort", column);
      params.set("dir", nextDir);
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

  const parsedAmount = Number(restockAmount);
  const amountIsValid =
    restockAmount.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    Number.isInteger(parsedAmount) &&
    parsedAmount > 0;

  function handleRestock() {
    if (working || selectedIds.length === 0 || !amountIsValid) return;
    void runAction(
      "restock the products",
      () => bulkRestock(selectedIds, parsedAmount, restockReason),
      true,
    ).then(() => {
      setRestockAmount("");
    });
  }

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
              placeholder="Search name, SKU, brand…"
              aria-label="Search inventory"
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
            <label htmlFor="stock-filter" className="sr-only">
              Filter by stock
            </label>
            <select
              id="stock-filter"
              value={STOCK_FILTER_OPTIONS.some((o) => o.value === stock) ? stock : ""}
              onChange={handleStockChange}
              className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {STOCK_FILTER_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
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
            <label htmlFor="bulk-restock-amount" className="sr-only">
              Restock amount
            </label>
            <input
              id="bulk-restock-amount"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={restockAmount}
              onChange={(event) => setRestockAmount(event.target.value)}
              disabled={working}
              placeholder="Qty"
              className="h-8 w-20 rounded-md border border-border bg-card px-2.5 text-xs font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
            <label htmlFor="bulk-restock-reason" className="sr-only">
              Restock reason
            </label>
            <select
              id="bulk-restock-reason"
              value={restockReason}
              onChange={(event) => setRestockReason(event.target.value)}
              disabled={working}
              className="h-8 rounded-md border border-border bg-card px-2.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {MOVEMENT_REASONS.map((value) => (
                <option key={value} value={value}>
                  {MOVEMENT_REASON_LABEL[value]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleRestock}
              disabled={working || !amountIsValid}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 text-xs font-medium hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {working ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
              Restock
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
                <th scope="col" className="w-14 px-3 py-2.5 text-left font-medium">
                  <span className="sr-only">Image</span>
                </th>
                <SortHeader
                  column="name"
                  label="Product"
                  activeSort={sort}
                  activeDir={dir}
                  onSort={toggleSort}
                  className="text-left"
                />
                <SortHeader
                  column="stock_quantity"
                  label="Stock"
                  activeSort={sort}
                  activeDir={dir}
                  onSort={toggleSort}
                  className="text-left"
                />
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Reorder at
                </th>
                <SortHeader
                  column="updated_at"
                  label="Updated"
                  activeSort={sort}
                  activeDir={dir}
                  onSort={toggleSort}
                  className="text-left"
                />
                <th scope="col" className="w-px px-3 py-2.5 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16">
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <span className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
                        <Package className="size-6" />
                      </span>
                      <div>
                        <p className="font-medium">
                          {search || stock
                            ? "No products match your filters"
                            : "No products in inventory"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {search || stock
                            ? "Try adjusting or clearing your search and filters."
                            : "Products will appear here once they are added to the catalog."}
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
                      <td className="px-3 py-2.5 align-middle">
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.name}`}
                          checked={isSelected}
                          onChange={() => toggleRow(row.id)}
                          className="size-4 cursor-pointer rounded border-border bg-card accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <Thumbnail src={row.featured_image_url} alt={row.name} />
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <Link
                          href={`/admin/inventory/${row.id}`}
                          className="font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {row.name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.sku ?? "No SKU"}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums font-medium text-foreground">
                            {row.stock_quantity}
                          </span>
                          <InventoryStatusBadge status={row.inventory_status} />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-middle text-right tabular-nums text-muted-foreground">
                        {row.low_stock_threshold}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle text-muted-foreground">
                        {formatDate(row.updated_at)}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/inventory/${row.id}`}
                            aria-label={`Adjust stock for ${row.name}`}
                            title="Adjust"
                            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <SlidersHorizontal className="size-4" />
                          </Link>
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

function SortHeader({
  column,
  label,
  activeSort,
  activeDir,
  onSort,
  className,
}: {
  column: SortableColumn;
  label: string;
  activeSort: string;
  activeDir: "asc" | "desc";
  onSort: (column: SortableColumn) => void;
  className?: string;
}) {
  const isActive = activeSort === column && SORTABLE.has(activeSort);
  const ariaSort: "ascending" | "descending" | "none" = isActive
    ? activeDir === "asc"
      ? "ascending"
      : "descending"
    : "none";
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn("px-3 py-2.5 font-medium", className)}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 rounded text-xs uppercase tracking-wider hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive ? "text-foreground" : "text-muted-foreground",
          className?.includes("text-right") && "flex-row-reverse",
        )}
      >
        {label}
        {isActive ? (
          activeDir === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <span className="size-3.5" aria-hidden />
        )}
      </button>
    </th>
  );
}
