"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Client-side providers. Kept as a leaf wrapper so the root layout stays a
 * Server Component. Zustand needs no provider (module-level stores), so only
 * TanStack Query is wired here.
 *
 * The QueryClient is created in `useState` (not module scope) so each browser
 * session/render gets its own cache and SSR never leaks state between requests.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
