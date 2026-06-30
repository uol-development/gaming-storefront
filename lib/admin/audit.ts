import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/server";

export interface AuditEntry {
  action: string; // create | update | delete | restore | publish | duplicate ...
  entity: string; // product | category | ...
  entityId?: string | null;
  summary?: string;
  diff?: unknown;
}

/** Append an entry to the audit log, attributed to the current admin. */
export async function logAudit(entry: AuditEntry): Promise<void> {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  await supabase.from("audit_logs").insert({
    actor_id: profile?.id ?? null,
    actor_email: profile?.email ?? null,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    summary: entry.summary ?? null,
    diff: entry.diff ?? null,
  });
}
