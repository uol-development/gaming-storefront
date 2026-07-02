import { getCurrentProfile } from "@/lib/auth/server";
import { listUsers, userRoleCounts, type UserSort } from "@/lib/admin/users-queries";
import { STAFF_ROLES } from "@/lib/admin/users-schema";
import { UsersTable } from "@/components/admin/users/users-table";

export const metadata = { title: "Users & Roles" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const SORTS: readonly UserSort[] = ["role", "name", "email", "created_at"];

function asSort(value: string): UserSort {
  return (SORTS as readonly string[]).includes(value) ? (value as UserSort) : "role";
}

function asDir(value: string): "asc" | "desc" {
  return value === "desc" ? "desc" : "asc";
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const pageRaw = Number.parseInt(firstParam(params.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const search = firstParam(params.search);
  const role = firstParam(params.role);
  const status = firstParam(params.status);
  const sort = firstParam(params.sort) || "role";
  const dir = firstParam(params.dir) || "asc";

  const [profile, result, counts] = await Promise.all([
    getCurrentProfile(),
    listUsers({ page, search, role, status, sort: asSort(sort), dir: asDir(dir) }),
    userRoleCounts(),
  ]);

  const staffTotal = STAFF_ROLES.reduce((sum, r) => sum + (counts[r] ?? 0), 0);
  const customerTotal = counts.customer ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Users &amp; Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {staffTotal.toLocaleString("en-US")} staff · {customerTotal.toLocaleString("en-US")}{" "}
          {customerTotal === 1 ? "customer" : "customers"} · manage access &amp; permissions
        </p>
      </header>

      <UsersTable
        rows={result.rows}
        total={result.total}
        page={result.page}
        perPage={result.perPage}
        search={search}
        role={role}
        status={status}
        sort={sort}
        dir={asDir(dir)}
        counts={counts}
        currentUserId={profile?.id ?? ""}
        actorRole={profile?.role ?? "admin"}
      />
    </div>
  );
}
