"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Mail,
  Megaphone,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Star,
  Tag,
  Ticket,
  Users,
  Video,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AdminProfile } from "@/lib/auth/server";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  ready?: boolean;
}

const NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard, ready: true }],
  },
  {
    heading: "Catalog",
    items: [
      { label: "Products", href: "/admin/products", icon: Package, ready: true },
      { label: "Categories", href: "/admin/categories", icon: Tag, ready: true },
      { label: "Inventory", href: "/admin/inventory", icon: Boxes, ready: true },
      { label: "Reviews", href: "/admin/reviews", icon: Star },
    ],
  },
  {
    heading: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", icon: ShoppingCart, ready: true },
      { label: "Customers", href: "/admin/customers", icon: Users, ready: true },
      { label: "Coupons", href: "/admin/coupons", icon: Ticket },
    ],
  },
  {
    heading: "Content",
    items: [
      { label: "Featured Videos", href: "/admin/videos", icon: Video, ready: true },
      { label: "Subscribers", href: "/admin/subscribers", icon: Mail, ready: true },
      { label: "Pages & CMS", href: "/admin/cms", icon: FileText },
      { label: "Media", href: "/admin/media", icon: ImageIcon },
      { label: "Marketing", href: "/admin/marketing", icon: Megaphone },
    ],
  },
  {
    heading: "System",
    items: [
      { label: "Reports", href: "/admin/reports", icon: BarChart3 },
      { label: "Users & Roles", href: "/admin/users", icon: Users },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrator",
  manager: "Manager",
  staff: "Staff",
  editor: "Editor",
  support: "Support",
};

export function AdminShell({
  profile,
  children,
}: {
  profile: AdminProfile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  const initials = (profile.full_name ?? profile.email ?? "?")
    .split(" ")
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Sidebar (desktop) */}
      <Sidebar pathname={pathname} className="hidden lg:flex" />

      {/* Sidebar (mobile drawer) */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <Sidebar
            pathname={pathname}
            className="absolute left-0 top-0 flex h-dvh"
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      ) : null}

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="grid size-9 place-items-center rounded-md text-foreground/70 hover:bg-secondary lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <button
            type="button"
            className="flex h-9 flex-1 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-muted-foreground hover:text-foreground sm:max-w-md"
            aria-label="Search (coming soon)"
          >
            <Search className="size-4" />
            <span className="truncate">Search products, orders, customers…</span>
            <kbd className="ml-auto hidden rounded border border-border bg-secondary px-1.5 text-[10px] sm:inline">
              ⌘K
            </kbd>
          </button>

          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-md p-1 pr-2 hover:bg-secondary"
            >
              <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {initials}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight">
                  {profile.full_name ?? profile.email}
                </span>
                <span className="block text-xs leading-tight text-muted-foreground">
                  {ROLE_LABEL[profile.role] ?? profile.role}
                </span>
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-popover p-1 shadow-xl">
                <button
                  type="button"
                  onClick={signOut}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-secondary"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function Sidebar({
  pathname,
  className,
  onNavigate,
}: {
  pathname: string;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <aside
      className={cn(
        "z-50 w-64 flex-col border-r border-border bg-card",
        "fixed inset-y-0 left-0 flex",
        className,
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <Link href="/admin" className="flex items-center gap-2 font-display font-bold tracking-tight">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            N
          </span>
          NEXUS <span className="text-xs font-normal text-muted-foreground">Admin</span>
        </Link>
        {onNavigate ? (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close menu"
            className="grid size-8 place-items-center rounded-md text-foreground/70 hover:bg-secondary lg:hidden"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {NAV.map((group) => (
          <div key={group.heading}>
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.heading}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                const Icon = item.icon;
                if (!item.ready) {
                  return (
                    <li key={item.href}>
                      <span
                        className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
                        title="Coming soon"
                      >
                        <Icon className="size-4" />
                        {item.label}
                        <span className="ml-auto rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          Soon
                        </span>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/80 hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          ← Back to store
        </Link>
      </div>
    </aside>
  );
}
