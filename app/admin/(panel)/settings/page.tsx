import { getStoreSettings } from "@/lib/data/settings-read";
import { SettingsForm } from "@/components/admin/settings/settings-form";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getStoreSettings();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Store Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Store identity, social links, delivery rates, payment methods, and maintenance mode.
          Changes apply across the storefront immediately.
        </p>
      </header>

      <SettingsForm initial={settings} />
    </div>
  );
}
