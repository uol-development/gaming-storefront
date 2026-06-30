import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · NEXUS Admin" },
  robots: { index: false, follow: false },
};

// Admin is always rendered per-request (auth, cookies) — never statically cached.
export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
