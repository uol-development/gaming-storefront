"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Shows the storefront chrome (header + footer) on shop routes, and hides it on
 * /admin so the admin renders its own shell. A Client Component so it can read
 * the pathname without forcing the whole app into dynamic rendering — the
 * storefront stays statically generated.
 */
export function ConditionalChrome({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  if (isAdmin) return <>{children}</>;

  return (
    <>
      {header}
      <main id="main">{children}</main>
      {footer}
    </>
  );
}
