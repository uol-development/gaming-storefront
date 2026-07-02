"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, can, type AdminProfile } from "@/lib/auth/server";
import { logAudit } from "@/lib/admin/audit";
import { settingsInputSchema, type SettingsInput } from "@/lib/admin/settings-schema";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireManageSettings(): Promise<AdminProfile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");
  if (!can.manageSettings(profile.role)) {
    throw new Error("You don't have permission to manage settings");
  }
  if (profile.is_suspended) {
    throw new Error("Your account is suspended");
  }
  return profile;
}

export async function saveSettings(input: SettingsInput): Promise<ActionResult> {
  await requireManageSettings();

  const parsed = settingsInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings." };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("store_settings")
    .upsert({ id: "default", data: parsed.data }, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };

  await logAudit({
    action: "update",
    entity: "settings",
    entityId: "default",
    summary: "Updated store settings",
  });

  // Settings drive site-wide chrome (footer, maintenance banner) and the money
  // path (checkout), so revalidate everything.
  revalidatePath("/", "layout");
  return { ok: true };
}
