"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
  UserPlus,
  X,
} from "lucide-react";
import { addUser } from "@/lib/admin/users-actions";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABEL,
  ROLE_DESCRIPTION,
  canActorTouchRole,
  type ProfileRole,
} from "@/lib/admin/users-schema";
import { cn } from "@/lib/utils";

/**
 * "Add user" dialog for the admin users page. A primary trigger button opens a
 * modal overlay (backdrop + centered card) that mirrors the app's modal idiom
 * (fixed inset overlay, bg-black/60 backdrop, rounded-2xl bordered card, X +
 * backdrop + Escape dismissal). Open state is managed locally; focus moves to
 * the first field on open and is restored to the trigger on close.
 *
 * The form creates a staff account via the `addUser` server action with an
 * admin-set temporary password. On success the body swaps to a panel that shows
 * the created email + temporary password (each copyable) so the admin can share
 * it before closing — the password is never cleared until the admin dismisses.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Charset groups for generated passwords — one guaranteed pick from each so
// every generated secret satisfies upper/lower/digit/symbol requirements.
const CHARSET_GROUPS = [
  "ABCDEFGHJKLMNPQRSTUVWXYZ",
  "abcdefghijkmnopqrstuvwxyz",
  "23456789",
  "!@#$%^&*",
] as const;
const ALL_CHARS = CHARSET_GROUPS.join("");

/** Draw `count` uniformly-random bytes, preferring crypto with a Math.random fallback. */
function randomInts(count: number): number[] {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const buf = new Uint32Array(count);
    window.crypto.getRandomValues(buf);
    return Array.from(buf);
  }
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(Math.floor(Math.random() * 0xffffffff));
  }
  return out;
}

/** Pick a character from `chars` using the supplied random integer. */
function pick(chars: string, rand: number): string {
  return chars.charAt(rand % chars.length) || chars.charAt(0);
}

/**
 * Build a strong random password of `length` (>= number of groups) that
 * guarantees at least one character from each charset group, then shuffles so
 * the guaranteed characters aren't always in a fixed position.
 */
function generatePassword(length = 12): string {
  const size = Math.max(length, CHARSET_GROUPS.length);
  const rand = randomInts(size * 2);
  const chars: string[] = [];

  // One guaranteed character per group.
  CHARSET_GROUPS.forEach((group, i) => {
    chars.push(pick(group, rand[i] ?? Math.floor(Math.random() * group.length)));
  });
  // Fill the remainder from the full charset.
  for (let i = CHARSET_GROUPS.length; i < size; i += 1) {
    chars.push(pick(ALL_CHARS, rand[i] ?? Math.floor(Math.random() * ALL_CHARS.length)));
  }
  // Fisher–Yates shuffle using the second half of the random pool.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = (rand[size + i] ?? Math.floor(Math.random() * (i + 1))) % (i + 1);
    const a = chars[i];
    const b = chars[j];
    if (a !== undefined && b !== undefined) {
      chars[i] = b;
      chars[j] = a;
    }
  }
  return chars.join("");
}

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

const inputClass =
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";

export function AddUserDialog({ actorRole }: { actorRole: string }) {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const titleId = useId();
  const nameId = useId();
  const nameErrId = useId();
  const emailId = useId();
  const emailErrId = useId();
  const roleId = useId();
  const roleHelpId = useId();
  const passwordId = useId();
  const passwordErrId = useId();
  const passwordHintId = useId();
  const formMsgId = useId();

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  // Roles this actor may actually assign (never "customer" here — this dialog
  // creates staff). Guard the default against an empty list.
  const availableRoles = ASSIGNABLE_ROLES.filter(
    (r) => r !== "customer" && canActorTouchRole(actorRole, r),
  );
  const defaultRole: ProfileRole = availableRoles[0] ?? "warehouse";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProfileRole>(defaultRole);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState<"email" | "password" | null>(null);
  const [pending, startTransition] = useTransition();

  function resetForm(): void {
    setFullName("");
    setEmail("");
    setRole(defaultRole);
    setPassword("");
    setShowPassword(false);
    setErrors({});
    setFormError(null);
    setCreated(null);
    setCopied(null);
  }

  function openDialog(): void {
    resetForm();
    setOpen(true);
  }

  function closeDialog(): void {
    setOpen(false);
    resetForm();
    // Restore focus to the trigger on close.
    triggerRef.current?.focus();
  }

  // Lock body scroll + wire Escape while open; focus the first field on open.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") closeDialog();
    }
    window.addEventListener("keydown", onKeyDown);

    firstFieldRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
    // closeDialog is stable enough for this effect's intent; re-run only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleGenerate(): void {
    setPassword(generatePassword(12));
    setShowPassword(true);
    setErrors((prev) => ({ ...prev, password: undefined }));
  }

  async function copyToClipboard(value: string, which: "email" | "password"): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      window.setTimeout(() => {
        setCopied((current) => (current === which ? null : current));
      }, 1600);
    } catch {
      // Clipboard can be unavailable (permissions / insecure context); the value
      // stays visible in the readonly field for manual copy.
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (pending || created) return;

    const nextErrors: FieldErrors = {};
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length === 0) {
      nextErrors.name = "Full name is required.";
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setFormError(null);
      return;
    }

    setErrors({});
    setFormError(null);

    startTransition(async () => {
      try {
        const result = await addUser({
          email: trimmedEmail,
          fullName: trimmedName,
          role,
          password,
        });
        if (!result.ok) {
          setFormError(result.error ?? "Could not create the user.");
          return;
        }
        setCreated({ email: trimmedEmail, password });
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Failed to create the user.");
      }
    });
  }

  function handleDone(): void {
    setOpen(false);
    resetForm();
    triggerRef.current?.focus();
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDialog}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Plus className="size-4" aria-hidden />
        Add user
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          {/* Backdrop — clicking it dismisses. */}
          <div
            aria-hidden
            onClick={closeDialog}
            className="absolute inset-0 bg-black/60"
          />

          {/* Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={closeDialog}
              aria-label="Close"
              className="absolute right-3 top-3 grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-5" aria-hidden />
            </button>

            <div className="mb-5 flex items-center gap-3 pr-9">
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
              >
                <UserPlus className="size-5" />
              </span>
              <div>
                <h2
                  id={titleId}
                  className="font-display text-lg font-bold tracking-tight text-foreground"
                >
                  Add user
                </h2>
                <p className="text-sm text-muted-foreground">
                  {created
                    ? "Account created — share the temporary password."
                    : "Create a staff account with a temporary password."}
                </p>
              </div>
            </div>

            {created ? (
              <div className="space-y-4" aria-live="polite">
                <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <Check className="size-4 shrink-0" aria-hidden />
                  <span>User created successfully.</span>
                </div>

                <CopyField
                  label="Email"
                  value={created.email}
                  copied={copied === "email"}
                  onCopy={() => void copyToClipboard(created.email, "email")}
                />
                <CopyField
                  label="Temporary password"
                  value={created.password}
                  mono
                  copied={copied === "password"}
                  onCopy={() => void copyToClipboard(created.password, "password")}
                />

                <p className="text-xs text-muted-foreground">
                  Share these with the new member. They should change the password after their
                  first sign-in.
                </p>

                <button
                  type="button"
                  onClick={handleDone}
                  className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Full name */}
                <div>
                  <label
                    htmlFor={nameId}
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    Full name
                  </label>
                  <input
                    id={nameId}
                    ref={firstFieldRef}
                    type="text"
                    autoComplete="off"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={pending}
                    required
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={errors.name ? nameErrId : undefined}
                    placeholder="Jane Doe"
                    className={cn(inputClass, errors.name && "ring-2 ring-destructive")}
                  />
                  <ErrorText id={nameErrId} message={errors.name} />
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor={emailId}
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    Email
                  </label>
                  <input
                    id={emailId}
                    type="email"
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={pending}
                    required
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? emailErrId : undefined}
                    placeholder="jane@example.com"
                    className={cn(inputClass, errors.email && "ring-2 ring-destructive")}
                  />
                  <ErrorText id={emailErrId} message={errors.email} />
                </div>

                {/* Role */}
                <div>
                  <label
                    htmlFor={roleId}
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    Role
                  </label>
                  <select
                    id={roleId}
                    value={role}
                    onChange={(e) => setRole(e.target.value as ProfileRole)}
                    disabled={pending || availableRoles.length === 0}
                    aria-describedby={roleHelpId}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {availableRoles.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <p id={roleHelpId} className="mt-1.5 text-xs text-muted-foreground">
                    {ROLE_DESCRIPTION[role]}
                  </p>
                </div>

                {/* Temporary password */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label htmlFor={passwordId} className="text-sm font-medium text-foreground">
                      Temporary password
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={pending}
                      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-secondary px-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCw className="size-3.5" aria-hidden />
                      Generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id={passwordId}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={pending}
                      aria-invalid={errors.password ? true : undefined}
                      aria-describedby={cn(
                        passwordHintId,
                        errors.password ? passwordErrId : undefined,
                      )}
                      placeholder="Set a temporary password"
                      className={cn(inputClass, "pr-11", errors.password && "ring-2 ring-destructive")}
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
                  <p id={passwordHintId} className="text-xs text-muted-foreground">
                    At least 8 characters. Share it with the new member; they can change it after
                    signing in.
                  </p>
                </div>

                {/* Form-level error */}
                <p
                  id={formMsgId}
                  role="alert"
                  aria-live="assertive"
                  className={cn(
                    "min-h-0 text-sm text-destructive",
                    !formError && "sr-only",
                  )}
                >
                  {formError ?? ""}
                </p>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeDialog}
                    disabled={pending}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pending || availableRoles.length === 0}
                    aria-busy={pending}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {pending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Creating…
                      </>
                    ) : (
                      "Create user"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function CopyField({
  label,
  value,
  mono,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="text"
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className={cn(inputClass, "flex-1", mono && "font-mono tracking-tight")}
        />
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copied ? (
            <Check className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
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
