"use client";

import { useMemo } from "react";
import { useToastStore, type ToastVariant } from "@/lib/store/toast-store";

interface ToastOptions {
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

/**
 * Fire toasts from anywhere: `const toast = useToast(); toast("Saved", { variant: "success" })`.
 * Convenience variants are attached: `toast.success(...)`, `toast.error(...)`, `toast.info(...)`.
 */
export function useToast() {
  const add = useToastStore((state) => state.add);

  return useMemo(() => {
    const base = (title: string, options?: ToastOptions) =>
      add({
        title,
        description: options?.description,
        variant: options?.variant ?? "default",
        duration: options?.duration ?? 4000,
      });
    return Object.assign(base, {
      success: (title: string, options?: Omit<ToastOptions, "variant">) =>
        base(title, { ...options, variant: "success" }),
      error: (title: string, options?: Omit<ToastOptions, "variant">) =>
        base(title, { ...options, variant: "error" }),
      info: (title: string, options?: Omit<ToastOptions, "variant">) =>
        base(title, { ...options, variant: "info" }),
    });
  }, [add]);
}
