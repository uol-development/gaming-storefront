import { requireStaff } from "@/lib/auth/server";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();
  return <AdminShell profile={profile}>{children}</AdminShell>;
}
