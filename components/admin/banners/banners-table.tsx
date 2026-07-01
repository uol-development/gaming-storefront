"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type DragEvent,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  GripVertical,
  ImageOff,
  Images,
  Loader2,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminBannerRow } from "@/lib/admin/banners-queries";
import {
  duplicateBanner,
  reorderBanners,
  setBannersActive,
  setBannersStatus,
  softDeleteBanners,
  type ActionResult,
} from "@/lib/admin/banners-actions";
import {
  BANNER_BADGE_STYLE,
  BANNER_PLACEMENT_LABEL,
  BANNER_PLACEMENTS,
  BANNER_SIZE_LABEL,
  type BannerPlacement,
  type BannerSize,
} from "@/lib/admin/banners-schema";

export interface BannersTableProps {
  rows: AdminBannerRow[];
  total: number;
  page: number;
  perPage: number;
  search: string;
  status: string;
  placement: string;
  sort: string;
  dir: "asc" | "desc";
}

const STATUS_FILTER_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
];

const SORT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "position", label: "Position" },
  { value: "created_at", label: "Newest" },
  { value: "heading", label: "Heading" },
];

const PUBLISHED_BADGE =
  "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
const MUTED_BADGE = "border-border bg-secondary text-muted-foreground";

function placementLabel(placement: string): string {
  return BANNER_PLACEMENT_LABEL[placement as BannerPlacement] ?? placement;
}

function sizeLabel(size: string): string {
  return BANNER_SIZE_LABEL[size as BannerSize] ?? size;
}

function StatusBadge({ status }: { status: string }) {
  const isPublished = status === "published";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        isPublished ? PUBLISHED_BADGE : MUTED_BADGE,
      )}
    >
      {isPublished ? "Published" : "Draft"}
    </span>
  );
}

/** Immutably move item at `from` to `to`, guarding undefined index access. */
function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return items;
  next.splice(to, 0, moved);
  return next;
}

export function BannersTable({
  rows,
  total,
  page,
  perPage,
  search,
  status,
  placement,
  sort,
}: BannersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(search);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local copy of rows so drag-and-drop / up-down reordering updates instantly,
  // before the reorder is persisted and the server re-renders.
  const [orderedRows, setOrderedRows] = useState<AdminBannerRow[]>(rows);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  const canReorder = sort === "position";

  // Reset the local order whenever the server rows change (page/filter/sort/refresh).
  useEffect(() => {
    setOrderedRows(rows);
  }, [rows]);

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
  const working = pending || busy || reordering;

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

  function handlePlacementChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    pushParams((params) => {
      if (value) params.set("placement", value);
      else params.delete("placement");
      params.delete("page");
    });
  }

  function handleSortChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    pushParams((params) => {
      if (value && value !== "position") params.set("sort", value);
      else params.delete("sort");
      params.delete("dir");
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

  const allVisibleSelected =
    orderedRows.length > 0 && orderedRows.every((row) => selected.has(row.id));
  const someSelected = selected.size > 0 && !allVisibleSelected;

  function toggleSelectAll() {
    setSelected((prev) => {
      if (orderedRows.every((row) => prev.has(row.id)) && orderedRows.length > 0) {
        const next = new Set(prev);
        for (const row of orderedRows) next.delete(row.id);
        return next;
      }
      const next = new Set(prev);
      for (const row of orderedRows) next.add(row.id);
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

  // Persist a new ordering (optimistically applied to `orderedRows` already).
  const persistOrder = useCallback(
    async (nextRows: AdminBannerRow[]) => {
      setErrorMessage(null);
      setReordering(true);
      try {
        const result = await reorderBanners(nextRows.map((r) => r.id));
        if (!result.ok) {
          setErrorMessage(result.error ?? "Failed to reorder banners.");
          setOrderedRows(rows); // revert to the server order
          return;
        }
        startTransition(() => {
          router.refresh();
        });
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to reorder banners.");
        setOrderedRows(rows);
      } finally {
        setReordering(false);
      }
    },
    [rows, router],
  );

  // --- Up/Down accessible fallback ---
  function moveRow(index: number, delta: number) {
    if (!canReorder || working) return;
    const target = index + delta;
    if (target < 0 || target >= orderedRows.length) return;
    const next = moveItem(orderedRows, index, target);
    if (next === orderedRows) return;
    setOrderedRows(next);
    void persistOrder(next);
  }

  // --- Native HTML5 drag-and-drop ---
  function handleDragStart(index: number) {
    if (!canReorder || working) return;
    setDragIndex(index);
  }

  function handleDragOver(event: DragEvent<HTMLTableRowElement>, overIndex: number) {
    if (!canReorder || dragIndex === null) return;
    event.preventDefault();
    if (dragIndex === overIndex) return;
    setOrderedRows((prev) => {
      const next = moveItem(prev, dragIndex, overIndex);
      return next;
    });
    setDragIndex(overIndex);
  }

  function handleDrop(event: DragEvent<HTMLTableRowElement>) {
    if (!canReorder) return;
    event.preventDefault();
  }

  function handleDragEnd() {
    if (dragIndex === null) return;
    setDragIndex(null);
    void persistOrder(orderedRows);
  }

  function handleBulk(
    label: string,
    action: () => Promise<ActionResult>,
    confirm?: string,
  ) {
    if (working || selectedIds.length === 0) return;
    if (confirm && !window.confirm(confirm)) return;
    void runAction(label, action, true);
  }

  function handleToggleActive(row: AdminBannerRow) {
    if (working) return;
    void runAction(
      row.is_active ? "disable the banner" : "enable the banner",
      () => setBannersActive([row.id], !row.is_active),
      false,
    );
  }

  function handleDuplicateRow(row: AdminBannerRow) {
    if (working) return;
    void runAction("duplicate the banner", () => duplicateBanner(row.id), false);
  }

  function handleDeleteRow(row: AdminBannerRow) {
    if (working) return;
    if (!window.confirm(`Move "${row.heading || "this banner"}" to trash?`)) return;
    void runAction("move the banner to trash", () => softDeleteBanners([row.id]), true);
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeEnd = Math.min(total, (page - 1) * perPage + orderedRows.length);
  const hasFilters = Boolean(search || status || placement);
  const currentSort = SORT_OPTIONS.some((o) => o.value === sort) ? sort : "position";
  const currentPlacement = BANNER_PLACEMENTS.some((p) => p === placement) ? placement : "";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchValue}
              onChange={handleSearchChange}
              placeholder="Search heading…"
              aria-label="Search banners"
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

          <label htmlFor="placement-filter" className="sr-only">
            Filter by placement
          </label>
          <select
            id="placement-filter"
            value={currentPlacement}
            onChange={handlePlacementChange}
            className="h-9 max-w-[14rem] rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All placements</option>
            {BANNER_PLACEMENTS.map((value) => (
              <option key={value} value={value}>
                {BANNER_PLACEMENT_LABEL[value]}
              </option>
            ))}
          </select>

          <label htmlFor="sort-select" className="sr-only">
            Sort banners
          </label>
          <select
            id="sort-select"
            value={currentSort}
            onChange={handleSortChange}
            className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select>
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

      {!canReorder ? (
        <p className="text-xs text-muted-foreground">
          Sort by <span className="font-medium text-foreground">Position</span> to reorder
          banners.
        </p>
      ) : null}

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
              onClick={() =>
                handleBulk("enable the banners", () => setBannersActive(selectedIds, true))
              }
              disabled={working}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              Enable
            </button>
            <button
              type="button"
              onClick={() =>
                handleBulk("disable the banners", () => setBannersActive(selectedIds, false))
              }
              disabled={working}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              Disable
            </button>
            <button
              type="button"
              onClick={() =>
                handleBulk("publish the banners", () => setBannersStatus(selectedIds, "published"))
              }
              disabled={working}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              Publish
            </button>
            <button
              type="button"
              onClick={() =>
                handleBulk("draft the banners", () => setBannersStatus(selectedIds, "draft"))
              }
              disabled={working}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              Draft
            </button>
            <button
              type="button"
              onClick={() =>
                handleBulk(
                  "move the banners to trash",
                  () => softDeleteBanners(selectedIds),
                  `Move ${selectedIds.length} banner(s) to trash?`,
                )
              }
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
                {canReorder ? (
                  <th scope="col" className="w-10 px-3 py-2.5">
                    <span className="sr-only">Reorder</span>
                  </th>
                ) : null}
                <th scope="col" className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleSelectAll}
                    disabled={orderedRows.length === 0}
                    className="size-4 cursor-pointer rounded border-border bg-card accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </th>
                <th scope="col" className="w-20 px-3 py-2.5 text-left font-medium">
                  Image
                </th>
                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                  Banner
                </th>
                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                  Badge
                </th>
                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-2.5 text-center font-medium">
                  Enabled
                </th>
                <th scope="col" className="w-px px-3 py-2.5 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {orderedRows.length === 0 ? (
                <tr>
                  <td colSpan={canReorder ? 8 : 7} className="px-4 py-16">
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <span className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
                        <Images className="size-6" />
                      </span>
                      <div>
                        <p className="font-medium">
                          {hasFilters ? "No banners match your filters" : "No banners yet"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {hasFilters
                            ? "Try adjusting or clearing your search and filters."
                            : "Create a promo banner to feature it on the storefront."}
                        </p>
                      </div>
                      <Link
                        href="/admin/banners/new"
                        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Add banner
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                orderedRows.map((row, index) => {
                  const isSelected = selected.has(row.id);
                  const badgeStyle = row.badge ? BANNER_BADGE_STYLE[row.badge] : undefined;
                  return (
                    <tr
                      key={row.id}
                      draggable={canReorder && !working}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(event) => handleDragOver(event, index)}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "border-b border-border last:border-b-0 hover:bg-secondary/50",
                        isSelected && "bg-secondary/40",
                        dragIndex === index && "opacity-60",
                      )}
                    >
                      {canReorder ? (
                        <td className="px-3 py-2.5 align-middle">
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              aria-hidden
                              className={cn(
                                "grid size-6 place-items-center rounded text-muted-foreground",
                                working ? "cursor-not-allowed opacity-50" : "cursor-grab",
                              )}
                              title="Drag to reorder"
                            >
                              <GripVertical className="size-4" />
                            </span>
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => moveRow(index, -1)}
                                disabled={working || index === 0}
                                aria-label={`Move ${row.heading || "banner"} up`}
                                title="Move up"
                                className="grid size-4 place-items-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
                              >
                                <ArrowUp className="size-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveRow(index, 1)}
                                disabled={working || index === orderedRows.length - 1}
                                aria-label={`Move ${row.heading || "banner"} down`}
                                title="Move down"
                                className="grid size-4 place-items-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
                              >
                                <ArrowDown className="size-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                      ) : null}
                      <td className="px-3 py-2.5 align-middle">
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.heading || "banner"}`}
                          checked={isSelected}
                          onChange={() => toggleRow(row.id)}
                          className="size-4 cursor-pointer rounded border-border bg-card accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <span className="relative grid h-10 w-16 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-secondary text-muted-foreground">
                          {row.image_url ? (
                            <img
                              src={row.image_url}
                              alt=""
                              loading="lazy"
                              className="size-full object-cover"
                            />
                          ) : (
                            <ImageOff className="size-4" />
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="min-w-0">
                          <Link
                            href={`/admin/banners/${row.id}`}
                            className="line-clamp-1 font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {row.heading || "(untitled)"}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                "rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                                MUTED_BADGE,
                              )}
                            >
                              {sizeLabel(row.size)}
                            </span>
                            <span
                              className={cn(
                                "rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                                MUTED_BADGE,
                              )}
                            >
                              {placementLabel(row.placement)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        {row.badge ? (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              badgeStyle ?? "bg-secondary text-muted-foreground",
                            )}
                          >
                            {row.badge}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-3 py-2.5 align-middle text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(row)}
                          disabled={working}
                          aria-pressed={row.is_active}
                          title={row.is_active ? "Disable" : "Enable"}
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                            row.is_active ? PUBLISHED_BADGE : MUTED_BADGE,
                          )}
                        >
                          {row.is_active ? "On" : "Off"}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/banners/${row.id}`}
                            aria-label={`Edit ${row.heading || "banner"}`}
                            title="Edit"
                            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Pencil className="size-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(row)}
                            disabled={working}
                            aria-label={`Duplicate ${row.heading || "banner"}`}
                            title="Duplicate"
                            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                          >
                            <Copy className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row)}
                            disabled={working}
                            aria-label={`Move ${row.heading || "banner"} to trash`}
                            title="Move to trash"
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
      {orderedRows.length > 0 ? (
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
