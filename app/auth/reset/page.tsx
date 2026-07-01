"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Password reset landing. The recovery email link routes through /auth/callback
 * which exchanges the code for a session and forwards here, so an authenticated
 * session should already exist — we let the user set a new password with
 * `updateUser`. If there's no session the link is invalid/expired.
 */
export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => {
      setHasSession(Boolean(data.user));
      setReady(true);
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setError("");
    setStatus("saving");
    const { error: updateError } = await createSupabaseBrowserClient().auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setStatus("idle");
      return;
    }
    setStatus("done");
  }

  return (
    <main className="container mx-auto flex min-h-[60vh] w-full max-w-md items-center px-4 py-12 sm:px-6">
      <div className="w-full rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
          Set a new password
        </h1>

        {!ready ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Checking your link…
          </div>
        ) : status === "done" ? (
          <div className="mt-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="size-10 text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Your password has been updated. You can now use it to sign in.
            </p>
            <Link
              href="/account"
              className="mt-1 inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Go to my account
            </Link>
          </div>
        ) : !hasSession ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              This reset link is invalid or has expired. Request a new one from the sign-in window.
            </p>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Back to store
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>
            <div>
              <label htmlFor="new-password" className="sr-only">
                New password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="New password"
                  className={cn(
                    "h-11 w-full rounded-md border border-border bg-background px-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    error && "ring-2 ring-destructive",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p role="alert" className="mt-1 min-h-4 text-xs text-destructive">
                {error}
              </p>
            </div>
            <button
              type="submit"
              disabled={status === "saving"}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              {status === "saving" ? <Loader2 className="size-4 animate-spin" /> : null}
              Update password
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
