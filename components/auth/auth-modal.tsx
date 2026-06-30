"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Eye, EyeOff, X } from "lucide-react";
import { backdrop, modalPanel, scaleIn, shake } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { useUiStore, type AuthMode } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

/**
 * Global auth modal (sign in / create account). A single instance is mounted near
 * the root; the header opens it via the UI store. Mirrors the overlay pattern from
 * mobile-nav + quick-view: a tracked `motion.div` wraps a fading backdrop and a
 * scaling panel, body scroll is locked while open, Escape and the backdrop dismiss,
 * and focus moves to the first field on open.
 *
 * Submission is simulated (no network). Validation runs on submit only; invalid
 * fields get `ring-2 ring-destructive` so the error state survives reduced motion,
 * and the form replays a horizontal `shake` (keyed by an error counter). The active
 * tab is marked by a sliding `layoutId` indicator (dropped under reduced motion).
 */

type Status = "idle" | "error" | "success";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthModal() {
  const open = useUiStore((s) => s.isAuthOpen);
  const mode = useUiStore((s) => s.authMode);
  const setMode = useUiStore((s) => s.setAuthMode);
  const close = useUiStore((s) => s.closeAuth);

  const { prefersReduced, variants } = useReducedMotion();

  const titleId = useId();
  const nameErrId = useId();
  const emailErrId = useId();
  const passwordErrId = useId();
  const confirmErrId = useId();

  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorKey, setErrorKey] = useState(0);

  const isRegister = mode === "register";

  // Reset all fields/errors/status whenever the mode changes or the modal closes,
  // so a re-open never shows a stale success block or leftover validation.
  useEffect(() => {
    setName("");
    setEmail("");
    setPassword("");
    setConfirm("");
    setShowPassword(false);
    setErrors({});
    setStatus("idle");
  }, [mode, open]);

  // Lock body scroll + wire Escape while open; focus the first field once mounted.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);

    firstFieldRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  function selectMode(next: AuthMode): void {
    if (next !== mode) setMode(next);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (status === "success") return;

    const nextErrors: FieldErrors = {};

    if (isRegister && name.trim().length === 0) {
      nextErrors.name = "Enter your name.";
    }
    if (!EMAIL_RE.test(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }
    if (isRegister && confirm !== password) {
      nextErrors.confirm = "Passwords do not match.";
    }

    const hasError = Object.keys(nextErrors).length > 0;
    setErrors(nextErrors);

    if (hasError) {
      setStatus("error");
      setErrorKey((k) => k + 1);
      return;
    }

    setStatus("success");
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div key="auth" className="fixed inset-0 z-[70] grid place-items-center p-4">
          {/* Backdrop — opacity only; clicking it dismisses. */}
          <motion.div
            aria-hidden
            variants={variants(backdrop)}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={close}
            className="absolute inset-0 bg-black/60"
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            variants={variants(modalPanel)}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-md rounded-2xl border border-border bg-popover p-6 shadow-2xl"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-5" aria-hidden />
            </button>

            {/* Tabs */}
            <div
              role="tablist"
              aria-label="Authentication mode"
              className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-secondary/60 p-1"
            >
              <TabButton
                active={!isRegister}
                onClick={() => selectMode("login")}
                prefersReduced={prefersReduced}
              >
                Sign in
              </TabButton>
              <TabButton
                active={isRegister}
                onClick={() => selectMode("register")}
                prefersReduced={prefersReduced}
              >
                Create account
              </TabButton>
            </div>

            <h2
              id={titleId}
              className="mb-1 font-display text-xl font-bold tracking-tight text-foreground"
            >
              {isRegister ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              {isRegister
                ? "Join NEXUS to track orders and save your builds."
                : "Sign in to continue to your NEXUS account."}
            </p>

            {status === "success" ? (
              <motion.div
                variants={variants(scaleIn)}
                initial="hidden"
                animate="visible"
                className="flex flex-col items-center py-6 text-center"
              >
                <CheckCircle2 className="size-12 text-primary" aria-hidden />
                <p className="mt-3 font-display text-lg font-semibold text-foreground">
                  You&apos;re in.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isRegister
                    ? "Your account is ready to go."
                    : "Signed in successfully."}
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
                >
                  Done
                </button>
              </motion.div>
            ) : (
              <>
                <motion.form
                  key={errorKey}
                  onSubmit={handleSubmit}
                  noValidate
                  variants={variants(shake)}
                  animate={status === "error" ? "error" : "idle"}
                  className="space-y-4"
                >
                  {isRegister ? (
                    <Field
                      id="auth-name"
                      label="Name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={setName}
                      error={errors.name}
                      errorId={nameErrId}
                      inputRef={firstFieldRef}
                      placeholder="Your name"
                    />
                  ) : null}

                  <Field
                    id="auth-email"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={setEmail}
                    error={errors.email}
                    errorId={emailErrId}
                    inputRef={isRegister ? undefined : firstFieldRef}
                    placeholder="you@example.com"
                  />

                  <div>
                    <label htmlFor="auth-password" className="sr-only">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={isRegister ? "new-password" : "current-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        aria-invalid={errors.password ? true : undefined}
                        aria-describedby={errors.password ? passwordErrId : undefined}
                        placeholder="Password"
                        className={cn(
                          "h-11 w-full rounded-md border border-border bg-background px-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          errors.password && "ring-2 ring-destructive",
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" aria-hidden />
                        ) : (
                          <Eye className="size-4" aria-hidden />
                        )}
                      </button>
                    </div>
                    <ErrorText id={passwordErrId} message={errors.password} />
                  </div>

                  {isRegister ? (
                    <Field
                      id="auth-confirm"
                      label="Confirm password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={setConfirm}
                      error={errors.confirm}
                      errorId={confirmErrId}
                      placeholder="Confirm password"
                    />
                  ) : null}

                  {!isRegister ? (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="rounded text-xs font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Forgot password?
                      </button>
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
                  >
                    {isRegister ? "Create account" : "Sign in"}
                  </button>
                </motion.form>

                <p className="mt-5 text-center text-sm text-muted-foreground">
                  {isRegister ? "Have an account? " : "New here? "}
                  <button
                    type="button"
                    onClick={() => selectMode(isRegister ? "login" : "register")}
                    className="rounded font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {isRegister ? "Sign in" : "Create an account"}
                  </button>
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function TabButton({
  active,
  onClick,
  prefersReduced,
  children,
}: {
  active: boolean;
  onClick: () => void;
  prefersReduced: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative h-9 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {active ? (
        <motion.span
          layoutId={prefersReduced ? undefined : "auth-tab"}
          aria-hidden
          className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm"
        />
      ) : null}
      {children}
    </button>
  );
}

function Field({
  id,
  label,
  type,
  autoComplete,
  value,
  onChange,
  error,
  errorId,
  inputRef,
  placeholder,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  error: string | undefined;
  errorId: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  placeholder: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        placeholder={placeholder}
        className={cn(
          "h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          error && "ring-2 ring-destructive",
        )}
      />
      <ErrorText id={errorId} message={error} />
    </div>
  );
}

/** Reserves a fixed line of space so showing/hiding an error never shifts layout. */
function ErrorText({ id, message }: { id: string; message: string | undefined }) {
  return (
    <p id={id} role="alert" className="mt-1 min-h-4 text-xs text-destructive">
      {message ?? ""}
    </p>
  );
}
