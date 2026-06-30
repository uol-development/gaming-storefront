"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { AlertCircle, Bell, CheckCircle2, Info, X } from "lucide-react";
import { toast as toastVariant } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { useToastStore, type Toast, type ToastVariant } from "@/lib/store/toast-store";

/**
 * Global toast viewport. A single instance is mounted near the root; toasts are
 * pushed through `useToastStore` (typically via `useToast()`). Each item owns its
 * own auto-dismiss timer so the timer is reset/cleared correctly on unmount, and
 * enter/exit animation is opacity + transform only (no layout thrash, no CLS).
 */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  const { variants } = useReducedMotion();

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[min(92vw,22rem)] flex-col gap-2"
    >
      {/* The <ul> is unstyled so the fixed flex container above owns layout. */}
      <ul className="contents">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              dismiss={dismiss}
              toastVariants={variants(toastVariant)}
            />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Single toast
 * ------------------------------------------------------------------ */

interface ToastItemProps {
  toast: Toast;
  dismiss: (id: number) => void;
  toastVariants: Variants;
}

function ToastItem({ toast, dismiss, toastVariants }: ToastItemProps) {
  const { id, title, description, variant, duration } = toast;
  const isError = variant === "error";

  // One auto-dismiss timer per toast, cleared on unmount or if the toast changes.
  useEffect(() => {
    const timer = setTimeout(() => dismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, dismiss]);

  return (
    <motion.li
      layout
      variants={toastVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
      className="pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-popover p-3 shadow-lg"
    >
      <span className="mt-0.5 shrink-0">
        <ToastIcon variant={variant} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="mt-0.5 break-words text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => dismiss(id)}
        aria-label="Dismiss"
        className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" aria-hidden />
      </button>
    </motion.li>
  );
}

/* ------------------------------------------------------------------ *
 * Leading variant icon
 * ------------------------------------------------------------------ */

function ToastIcon({ variant }: { variant: ToastVariant }) {
  switch (variant) {
    case "success":
      return <CheckCircle2 className="size-5 text-success" aria-hidden />;
    case "error":
      return <AlertCircle className="size-5 text-destructive" aria-hidden />;
    case "info":
      return <Info className="size-5 text-primary" aria-hidden />;
    case "default":
    default:
      return <Bell className="size-5 text-muted-foreground" aria-hidden />;
  }
}
