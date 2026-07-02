import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  PROFILE_ROLES,
  isProfileRole,
  toProfileRole,
  type ProfileRole,
} from "@/lib/admin/users-schema";

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string;
  role: ProfileRole;
  is_suspended: boolean;
  avatar_url: string | null;
  created_at: string;
}

export type UserSort = "created_at" | "name" | "email" | "role";

export interface ListUsersParams {
  page?: number;
  perPage?: number;
  search?: string;
  role?: string;
  status?: string; // "" | "active" | "suspended"
  sort?: UserSort;
  dir?: "asc" | "desc";
}

export interface ListUsersResult {
  rows: AdminUserRow[];
  total: number;
  page: number;
  perPage: number;
}

const sanitize = (value: string) => value.replace(/[,()%*]/g, "").trim();
const str = (v: unknown): string => (typeof v === "string" ? v : "");

const SORT_COLUMN: Record<UserSort, string> = {
  created_at: "created_at",
  name: "full_name",
  email: "email",
  role: "role",
};

export async function listUsers(params: ListUsersParams = {}): Promise<ListUsersResult> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 20));
  const sort = params.sort ?? "role";
  const ascending = params.dir
    ? params.dir === "asc"
    : sort === "name" || sort === "email" || sort === "role";
  const supabase = await createSupabaseServerClient();

  // "profiles self read" lets staff read every profile — no RLS trouble here.
  let q = supabase
    .from("profiles")
    .select("id,email,full_name,role,is_suspended,avatar_url,created_at", { count: "exact" });

  const search = sanitize(params.search ?? "");
  if (search.length > 0) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  if (params.role && isProfileRole(params.role)) q = q.eq("role", params.role);
  if (params.status === "active") q = q.eq("is_suspended", false);
  else if (params.status === "suspended") q = q.eq("is_suspended", true);

  const column = SORT_COLUMN[sort];
  q = q
    .order(column, { ascending, nullsFirst: false })
    .order("email", { ascending: true, nullsFirst: false });

  const from = (page - 1) * perPage;
  q = q.range(from, from + perPage - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);

  const rows: AdminUserRow[] = ((data ?? []) as Record<string, unknown>[]).map((p) => ({
    id: str(p.id),
    email: str(p.email),
    full_name: str(p.full_name),
    role: toProfileRole(p.role),
    is_suspended: p.is_suspended === true,
    avatar_url: typeof p.avatar_url === "string" ? p.avatar_url : null,
    created_at: str(p.created_at),
  }));

  return { rows, total: count ?? rows.length, page, perPage };
}

/** Count of profiles per role, for filter labels and the page header. */
export async function userRoleCounts(): Promise<Record<ProfileRole, number>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("role");
  const counts = Object.fromEntries(PROFILE_ROLES.map((r) => [r, 0])) as Record<ProfileRole, number>;
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const role = str(row.role);
    if (isProfileRole(role)) counts[role] += 1;
  }
  return counts;
}
