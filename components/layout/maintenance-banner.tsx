import { Wrench } from "lucide-react";
import { getStoreSettings } from "@/lib/data/settings-read";

/**
 * Storefront-wide maintenance notice. Async server component that reads store
 * settings and renders nothing unless maintenance mode is enabled — so it costs
 * nothing when off. Rendered inside the storefront chrome (hidden on /admin).
 */
export async function MaintenanceBanner() {
  const { maintenance } = await getStoreSettings();
  if (!maintenance.enabled) return null;

  const message =
    maintenance.message.trim().length > 0
      ? maintenance.message
      : "We're doing a bit of maintenance. Some features may be temporarily unavailable.";

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-2 text-center text-sm font-medium text-amber-600 dark:text-amber-400"
    >
      <Wrench className="size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
