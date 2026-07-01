"use server";

import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Public newsletter sign-up. Persists the subscriber with the service-role
 * client (anonymous visitors can't satisfy the staff-only RLS). Best-effort on
 * infrastructure errors: it never surfaces a scary failure for a low-stakes
 * email capture and stays a no-op if the table hasn't been created yet.
 */

const schema = z.object({
  email: z.string().trim().email(),
  source: z.string().trim().max(40).optional(),
});

export interface SubscribeResult {
  ok: boolean;
  error?: string;
  already?: boolean;
}

export async function subscribeToNewsletter(
  email: string,
  source = "home",
): Promise<SubscribeResult> {
  const parsed = schema.safeParse({ email, source });
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("newsletter_subscribers").insert({
      email: parsed.data.email.toLowerCase(),
      source: parsed.data.source ?? "home",
    });
    if (error) {
      // Already subscribed — treat as a friendly success.
      if (error.code === "23505") return { ok: true, already: true };
      // Any other DB/infra error (e.g. table not created yet): don't block the
      // visitor. Log for diagnostics and report success.
      console.error("[newsletter] subscribe failed:", error.message);
      return { ok: true };
    }
    return { ok: true };
  } catch (err) {
    console.error("[newsletter] subscribe threw:", err);
    return { ok: true };
  }
}
