import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FileEdit,
  Package,
  PackageX,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/server";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const headCount = (result: { count: number | null }) => result.count ?? 0;

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const live = () =>
    supabase.from("products").select("*", { count: "exact", head: true }).is("deleted_at", null);

  const [products, published, drafts, lowStock, outOfStock, categories] = await Promise.all([
    live(),
    live().eq("status", "published"),
    live().eq("status", "draft"),
    live().eq("inventory_status", "low_stock"),
    live().eq("inventory_status", "out_of_stock"),
    supabase.from("categories").select("*", { count: "exact", head: true }).is("deleted_at", null),
  ]);

  const stats: { label: string; value: number; icon: LucideIcon; tone: string }[] = [
    { label: "Total products", value: headCount(products), icon: Package, tone: "text-primary" },
    { label: "Published", value: headCount(published), icon: CheckCircle2, tone: "text-emerald-400" },
    { label: "Drafts", value: headCount(drafts), icon: FileEdit, tone: "text-amber-400" },
    { label: "Low stock", value: headCount(lowStock), icon: AlertTriangle, tone: "text-amber-400" },
    { label: "Out of stock", value: headCount(outOfStock), icon: PackageX, tone: "text-destructive" },
    { label: "Categories", value: headCount(categories), icon: Tag, tone: "text-accent" },
  ];

  const firstName = (profile?.full_name ?? profile?.email ?? "there").split(" ")[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Welcome back, {firstName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live overview of your store. Orders, customers & revenue arrive with their modules.
        </p>
      </div>

      {/* Live KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <Icon className={`size-5 ${stat.tone}`} />
              <p className="mt-3 font-display text-3xl font-bold tabular-nums">{stat.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Coming-with-modules KPIs (honest placeholders) */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Arriving with upcoming modules
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {["Total revenue", "Orders", "Customers", "Avg. order value"].map((label) => (
            <div
              key={label}
              className="rounded-xl border border-dashed border-border bg-card/40 p-4"
            >
              <p className="font-display text-2xl font-bold text-muted-foreground/50">—</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display font-semibold">Quick actions</h2>
          <div className="mt-3 space-y-2 text-sm">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-secondary"
            >
              View live store <ArrowUpRight className="size-4 text-muted-foreground" />
            </Link>
            <span className="flex cursor-not-allowed items-center justify-between rounded-md border border-dashed border-border px-3 py-2 text-muted-foreground">
              Add product
              <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">ships next</span>
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="font-display font-semibold">Recent activity</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            No activity yet. Every create, edit, publish, and delete will appear here from the audit
            log once you start managing the catalog.
          </p>
        </div>
      </div>
    </div>
  );
}
