"use client";

import { UserRound } from "lucide-react";
import { useUiStore } from "@/lib/store/ui-store";

/** Shown on /account when no one is signed in — opens the global auth modal. */
export function AccountSignInPrompt() {
  const openAuth = useUiStore((s) => s.openAuth);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-2xl border border-border bg-card px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground">
        <UserRound className="size-7" aria-hidden />
      </span>
      <div className="space-y-1.5">
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
          Sign in to your account
        </h2>
        <p className="text-sm text-muted-foreground">
          Track your orders and check out faster. New to NEXUS? Create an account in seconds.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => openAuth("login")}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => openAuth("register")}
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Create account
        </button>
      </div>
    </div>
  );
}
