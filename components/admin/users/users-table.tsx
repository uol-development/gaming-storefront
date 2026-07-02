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
  ArrowDown,
  ArrowUp,
  Ban,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminUserRow } from "@/lib/admin/users-queries";
import {
  setUsersRole,
  setUsersSuspended,
  type ActionResult,
} from "@/lib/admin/users-actions";
import {
  PROFILE_ROLES,
  ROLE_LABEL,
  ROLE_BADGE,
  canActorTouchRole,
  isProfileRole,
} from "@/lib/admin/users-schema";

export interface UsersTableProps {
  rows: AdminUserRow[];
  total: number;
  page: number;
  perPage: number;
  search: string;
  role: string;
  status: string;
  sort: string;
  dir: "asc" | "desc";
  counts: Record<string, number>;
  currentUserId: string;
  actorRole: string;
}

type SortableColumn = "name" | "email" | "role" | "created_at";

const SORTABLE: ReadonlySet<string> = new Set<SortableColumn>([
  "name",
  "email",
  "role",
  "created_at",
]);

// Columns that default to descending on first click; name/email/role default ascending.
const DEFAULT_DESC: ReadonlySet<string> = new Set<SortableColumn>(["created_at"]);

const STATUS_FILTER_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function initials(fullName: string, email: string): string {
  const trimmed = fullName.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const first = parts[0]?.charAt(0) ?? "";
    const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
    const combined = (first + last).trim();
    if (combined) return combined.toUpperCase();
  }
  const fallback = email.trim().charAt(0);
  return fallback ? fallback.toUpperCase() : "?";
}

function StatusBadge({ suspended }: { suspended: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        suspended
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      )}
    >
      {suspended ? "Suspended" : "Active"}
    </span>
  );
}

function YouPill() {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      You
    </span>
  );
}

export function UsersTable({
  rows,
  total,
  page,
  perPage,
  search,
  role,
  status,
  sort,
  dir,
  counts,
  currentUserId,
  actorRole,
}: UsersTableProps) {
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

  function handleRoleFilterChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    pushParams((params) => {
      if (value) params.set("role", value);
      else params.delete("role");
      params.delete("page");
    });
  }

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

  // Only touchable, non-self rows are selectable.
  const selectableRows = useMemo(
    () => rows.filter((row) => row.id !== currentUserId && canActorTouchRole(actorRole, row.role)),
    [rows, currentUserId, actorRole],
  );
  const allVisibleSelected =
    selectableRows.length > 0 && selectableRows.every((row) => selected.has(row.id));
  const someSelected = selected.size > 0 && !allVisibleSelected;

  function toggleSelectAll() {
    setSelected((prev) => {
      if (selectableRows.length > 0 && selectableRows.every((row) => prev.has(row.id))) {
        const next = new Set(prev);
        for (const row of selectableRows) next.delete(row.id);
        return next;
      }
      const next = new Set(prev);
      for (const row of selectableRows) next.add(row.id);
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

  function handleRoleChange(row: AdminUserRow, value: string) {
    if (working) return;
    if (value === row.role || !isProfileRole(value)) return;
    void runAction("update the role", () => setUsersRole([row.id], value), false);
  }

  function handleToggleSuspend(row: AdminUserRow) {
    if (working) return;
    const next = !row.is_suspended;
    if (next && !window.confirm(`Suspend ${row.email}?`)) return;
    void runAction(
      next ? "suspend the user" : "reactivate the user",
      () => setUsersSuspended([row.id], next),
      false,
    );
  }

  function handleBulkSuspend() {
    if (working || selectedIds.length === 0) return;
    if (!window.confirm(`Suspend ${selectedIds.length} user(s)?`)) return;
    void runAction("suspend the users", () => setUsersSuspended(selectedIds, true), true);
  }

  function handleBulkReactivate() {
    if (working || selectedIds.length === 0) return;
    void runAction("reactivate the users", () => setUsersSuspended(selectedIds, false), true);
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeEnd = Math.min(total, (page - 1) * perPage + rows.length);

  const roleFilterValue = isProfileRole(role) ? role : "";

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
              placeholder="Search name, email…"
              aria-label="Search users"
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
            <label htmlFor="role-filter" className="sr-only">
              Filter by role
            </label>
            <select
              id="role-filter"
              value={roleFilterValue}
              onChange={handleRoleFilterChange}
              className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All roles</option>
              {PROFILE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]} ({counts[r] ?? 0})
                </option>
              ))}
            </select>

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
              onClick={handleBulkSuspend}
              disabled={working}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <UserX className="size-3.5" />
              Suspend
            </button>
            <button
              type="button"
              onClick={handleBulkReactivate}
              disabled={working}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <UserCheck className="size-3.5" />
              Reactivate
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
                    disabled={selectableRows.length === 0}
                    className="size-4 cursor-pointer rounded border-border bg-card accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </th>
                <SortHeader
                  column="name"
                  label="User"
                  activeSort={sort}
                  activeDir={dir}
                  onSort={toggleSort}
                  className="text-left"
                />
                <SortHeader
                  column="email"
                  label="Email"
                  activeSort={sort}
                  activeDir={dir}
                  onSort={toggleSort}
                  className="text-left"
                />
                <SortHeader
                  column="role"
                  label="Role"
                  activeSort={sort}
                  activeDir={dir}
                  onSort={toggleSort}
                  className="text-left"
                />
                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                  Status
                </th>
                <SortHeader
                  column="created_at"
                  label="Joined"
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
                        <Users className="size-6" />
                      </span>
                      <div>
                        <p className="font-medium">
                          {search || role || status
                            ? "No users match your filters"
                            : "No users yet"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {search || role || status
                            ? "Try adjusting or clearing your search and filters."
                            : "Users will appear here once they sign up."}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isSelf = row.id === currentUserId;
                  const canTouch = !isSelf && canActorTouchRole(actorRole, row.role);
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
                          disabled={!canTouch}
                          className="size-4 cursor-pointer rounded border-border bg-card accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden
                            className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-medium text-muted-foreground"
                          >
                            {initials(row.full_name, row.email)}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {row.full_name || "—"}
                              </span>
                              {isSelf ? <YouPill /> : null}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-middle text-muted-foreground">
                        <span className="truncate">{row.email}</span>
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <label className="sr-only" htmlFor={`role-${row.id}`}>
                          Role for {row.email}
                        </label>
                        <select
                          id={`role-${row.id}`}
                          value={row.role}
                          onChange={(e) => handleRoleChange(row, e.target.value)}
                          disabled={!canTouch || working}
                          className={cn(
                            "h-8 rounded-md border border-border bg-card px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm",
                            ROLE_BADGE[row.role],
                          )}
                        >
                          {PROFILE_ROLES.map((optionRole) => (
                            <option
                              key={optionRole}
                              value={optionRole}
                              disabled={!canActorTouchRole(actorRole, optionRole)}
                            >
                              {ROLE_LABEL[optionRole]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <StatusBadge suspended={row.is_suspended} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle text-muted-foreground">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center justify-end gap-1">
                          {row.is_suspended ? (
                            <button
                              type="button"
                              onClick={() => handleToggleSuspend(row)}
                              disabled={!canTouch || working}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <UserCheck className="size-3.5" />
                              Reactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleSuspend(row)}
                              disabled={!canTouch || working}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Ban className="size-3.5" />
                              Suspend
                            </button>
                          )}
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
    <th scope="col" aria-sort={ariaSort} className={cn("px-3 py-2.5 font-medium", className)}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 rounded text-xs uppercase tracking-wider hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive ? "text-foreground" : "text-muted-foreground",
          className?.includes("text-right") && "flex-row-reverse",
          className?.includes("text-center") && "mx-auto",
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
