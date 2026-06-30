"use client";

import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { scaleIn, shake } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { imageUrl, SECTION_IMAGE_IDS } from "@/lib/data/images";
import { cn } from "@/lib/utils";

/**
 * Email-capture panel. Network is simulated locally — a valid submit flips to a
 * success block; an invalid submit replays a horizontal shake (re-keyed each
 * attempt) and pins a static destructive ring so the feedback survives when the
 * user prefers reduced motion (the shake's x-transform is stripped to instant).
 *
 * Only `transform`/`opacity` animate. The message slot reserves a fixed
 * min-height so validation text never shifts the layout (CLS ~ 0).
 */

type Status = "idle" | "submitting" | "success" | "error";

// Pragmatic email shape: local-part @ domain . tld — no whitespace.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MESSAGE_ID = "newsletter-status";
const INPUT_ID = "newsletter-email";

export function Newsletter() {
  const { variants } = useReducedMotion();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [errorKey, setErrorKey] = useState(0);

  const isError = status === "error";
  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || isSuccess) return;

    if (!EMAIL_RE.test(email.trim())) {
      setStatus("error");
      setMessage("Enter a valid email");
      // Re-key the shake wrapper so the keyframe replays on repeat invalid tries.
      setErrorKey((key) => key + 1);
      return;
    }

    // Simulated local "request": flip straight through to success.
    setStatus("submitting");
    setMessage("");
    setStatus("success");
    setMessage("You're in. Check your inbox.");
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 to-accent/10 p-8 text-center">
        {/* Atmospheric backdrop. Absolutely positioned (no CLS); the panel
            gradient stays as the frame background so a slow/failed load is
            graceful. A strong overlay keeps the form/text high-contrast. */}
        <img
          src={imageUrl(SECTION_IMAGE_IDS.flatlay, 1200)}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.07]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background/85 via-background/75 to-background/85"
        />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Join the squad
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Drop in. Gear up.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Early access to drops and members-only prices.
          </p>

          <div className="mt-6">
          {isSuccess ? (
            <motion.div
              variants={variants(scaleIn)}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center justify-center gap-2 py-2"
            >
              <CheckCircle2 className="size-8 text-primary" aria-hidden />
              <p
                id={MESSAGE_ID}
                role="status"
                aria-live="polite"
                className="text-sm font-medium text-foreground sm:text-base"
              >
                You&apos;re in. Check your inbox.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <motion.div
                  key={errorKey}
                  variants={variants(shake)}
                  animate={isError ? "error" : "idle"}
                  className="flex-1"
                >
                  <label htmlFor={INPUT_ID} className="sr-only">
                    Email address
                  </label>
                  <input
                    id={INPUT_ID}
                    type="email"
                    name="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (isError) {
                        setStatus("idle");
                        setMessage("");
                      }
                    }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                    aria-invalid={isError}
                    aria-describedby={MESSAGE_ID}
                    className={cn(
                      "w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      // Static feedback that survives reduced motion.
                      isError && "border-destructive ring-2 ring-destructive",
                    )}
                  />
                </motion.div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "shrink-0 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground",
                    "transition-colors hover:bg-primary/90",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                >
                  {isSubmitting ? "Joining..." : "Sign up"}
                </button>
              </div>

              {/* Reserve the message row so layout never jumps (CLS ~ 0). */}
              <p
                id={MESSAGE_ID}
                role="status"
                aria-live="polite"
                className={cn(
                  "min-h-5 text-left text-sm",
                  isError ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {message}
              </p>
            </form>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}
