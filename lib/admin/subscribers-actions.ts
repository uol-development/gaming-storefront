"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, can } from "@/lib/auth/server";
import { logAudit } from "@/lib/admin/audit";
import type { AdminSubscriberRow } from "@/lib/admin/subscribers-queries";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireManage(): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");
  if (!can.manageSubscribers(profile.role))
    throw new Error("You don't have permission to manage subscribers");
}

export async function deleteSubscribers(ids: string[]): Promise<ActionResult> {
  await requireManage();
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("newsletter_subscribers").delete().in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({
    action: "delete",
    entity: "subscriber",
    summary: `Removed ${ids.length} subscriber${ids.length === 1 ? "" : "s"}`,
  });
  revalidatePath("/admin/subscribers");
  return { ok: true };
}

/** Full subscriber list for CSV export (email + source + date). */
export async function exportSubscribers(): Promise<AdminSubscriberRow[]> {
  await requireManage();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("newsletter_subscribers")
    .select("id,email,source,status,created_at")
    .order("created_at", { ascending: false })
    .limit(10000);
  return ((data ?? []) as Record<string, unknown>[]).map((raw) => ({
    id: String(raw.id ?? ""),
    email: String(raw.email ?? ""),
    source: typeof raw.source === "string" ? raw.source : null,
    status: String(raw.status ?? "subscribed"),
    created_at: String(raw.created_at ?? ""),
  }));
}
