import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { listBanners } from "@/lib/admin/banners-queries";
import { BannersTrashTable } from "@/components/admin/banners/banners-trash-table";

export const metadata = { title: "Archived banners" };
export const dynamic = "force-dynamic";

export default async function BannersTrashPage() {
  const result = await listBanners({ trash: true, perPage: 100 });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/admin/banners"
          className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          Back to banners
        </Link>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
          <Trash2 className="size-6 text-muted-foreground" />
          Archived banners
        </h1>
        <p className="text-sm text-muted-foreground">
          Archived banners are hidden from the storefront. Restore one to bring it back, or delete
          it permanently.
        </p>
      </div>

      <BannersTrashTable rows={result.rows} />
    </div>
  );
}
