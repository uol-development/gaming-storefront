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
  Archive,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileEdit,
  ImageOff,
  Loader2,
  PackageOpen,
  Pencil,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import {
  duplicateProduct,
  setProductsStatus,
  softDeleteProducts,
  type ActionResult,
} from "@/lib/admin/products-actions";
import type { AdminProductRow } from "@/lib/admin/products-queries";

export interface ProductsTableProps {
  rows: AdminProductRow[];
  total: number;
  page: number;
  perPage: number;
  search: string;
  status: string;
  sort: string;
  dir: "asc" | "desc";
}

type SortableColumn = "name" | "price" | "stock_quantity" | "updated_at";

const SORTABLE: ReadonlySet<string> = new Set<SortableColumn>([
  "name",
  "price",
  "stock_quantity",
  "updated_at",
]);

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

const STATUS_BADGE: Record<string, string> = {
  draft: "border-border bg-secondary text-muted-foreground",
  published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  archived: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  scheduled: "border-sky-500/30 bg-sky-500/10 text-sky-400",
};

const INVENTORY_BADGE: Record<string, string> = {
  in_stock: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  low_stock: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  out_of_stock: "border-destructive/40 bg-destructive/10 text-destructive",
  backorder: "border-sky-500/30 bg-sky-500/10 text-sky-400",
};

const INVENTORY_LABEL: Record<string, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  backorder: "Backorder",
};

function titleCase(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        STATUS_BADGE[status] ?? STATUS_BADGE.draft,
      )}
    >
      {titleCase(status)}
    </span>
  );
}

function InventoryBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        INVENTORY_BADGE[status] ?? INVENTORY_BADGE.out_of_stock,
      )}
    >
      {INVENTORY_LABEL[status] ?? titleCase(status.replace(/_/g, " "))}
    </span>
  );
}

export function ProductsTable({
  rows,
  total,
  page,
  perPage,
  search,
  status,
  sort,
  dir,
}: ProductsTableProps) {
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

  function handleStatusChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    pushParams((params) => {
      if (value) params.set("status", value);
      else params.delete("status");
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
        nextDir = column === "name" ? "asc" : "desc";
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

  function handleDuplicate(id: string) {
    if (working) return;
    void runAction("duplicate the product", () => duplicateProduct(id), false);
  }

  function handleDeleteRow(row: AdminProductRow) {
    if (working) return;
    if (!window.confirm(`Move "${row.name}" to trash?`)) return;
    void runAction("delete the product", () => softDeleteProducts([row.id]), true);
  }

  function handleBulkStatus(target: "draft" | "published" | "archived") {
    if (working || selectedIds.length === 0) return;
    void runAction(`set status to ${target}`, () => setProductsStatus(selectedIds, target), true);
  }

  function handleBulkDelete() {
    if (working || selectedIds.length === 0) return;
    if (!window.confirm(`Move ${selectedIds.length} product(s) to trash?`)) return;
    void runAction("delete the products", () => softDeleteProducts(selectedIds), true);
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
              aria-label="Search products"
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
              value={STATUS_FILTER_OPTIONS.some((o) => o.value === status) ? status : ""}
              onChange={handleStatusChange}
              className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
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
            <button
              type="button"
              onClick={() => handleBulkStatus("published")}
              disabled={working}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Upload className="size-3.5" />
              Publish
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatus("draft")}
              disabled={working}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <FileEdit className="size-3.5" />
              Draft
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatus("archived")}
              disabled={working}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Archive className="size-3.5" />
              Archive
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
                <th scope="col" className="w-14 px-2 py-2.5 text-left font-medium">
                  <span className="sr-only">Image</span>
                </th>
                <SortHeader
                  column="name"
                  label="Name"
                  activeSort={sort}
                  activeDir={dir}
                  onSort={toggleSort}
                  className="text-left"
                />
                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                  SKU
                </th>
                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                  Brand
                </th>
                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                  Status
                </th>
                <SortHeader
                  column="price"
                  label="Price"
                  activeSort={sort}
                  activeDir={dir}
                  onSort={toggleSort}
                  className="text-right"
                />
                <SortHeader
                  column="stock_quantity"
                  label="Stock"
                  activeSort={sort}
                  activeDir={dir}
                  onSort={toggleSort}
                  className="text-left"
                />
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
                  <td colSpan={10} className="px-4 py-16">
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <span className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
                        <PackageOpen className="size-6" />
                      </span>
                      <div>
                        <p className="font-medium">
                          {search || status ? "No products match your filters" : "No products yet"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {search || status
                            ? "Try adjusting or clearing your search and filters."
                            : "Create your first product to get started."}
                        </p>
                      </div>
                      <Link
                        href="/admin/products/new"
                        className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        New product
                      </Link>
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
                      <td className="px-2 py-2 align-middle">
                        <Thumbnail src={row.featured_image_url} alt={row.name} />
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <Link
                          href={`/admin/products/${row.id}`}
                          className="font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {row.name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">/{row.slug}</p>
                      </td>
                      <td className="px-3 py-2.5 align-middle text-muted-foreground">
                        {row.sku ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-muted-foreground">
                        {row.brand ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-3 py-2.5 align-middle text-right tabular-nums">
                        {row.sale_price != null && row.sale_price < row.price ? (
                          <span className="flex flex-col items-end leading-tight">
                            <span className="font-medium text-foreground">
                              {formatPrice(row.sale_price)}
                            </span>
                            <span className="text-xs text-muted-foreground line-through">
                              {formatPrice(row.price)}
                            </span>
                          </span>
                        ) : (
                          <span className="font-medium text-foreground">
                            {formatPrice(row.price)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <span className="flex items-center gap-2">
                          <span className="tabular-nums text-foreground">{row.stock_quantity}</span>
                          <InventoryBadge status={row.inventory_status} />
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle text-muted-foreground">
                        {formatDate(row.updated_at)}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/products/${row.id}`}
                            aria-label={`Edit ${row.name}`}
                            title="Edit"
                            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Pencil className="size-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(row.id)}
                            disabled={working}
                            aria-label={`Duplicate ${row.name}`}
                            title="Duplicate"
                            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                          >
                            <Copy className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row)}
                            disabled={working}
                            aria-label={`Delete ${row.name}`}
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

function Thumbnail({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="grid size-10 place-items-center rounded-md border border-border bg-secondary text-muted-foreground">
        <ImageOff className="size-4" aria-hidden />
        <span className="sr-only">No image</span>
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-10 rounded-md border border-border bg-secondary object-cover"
    />
  );
}
