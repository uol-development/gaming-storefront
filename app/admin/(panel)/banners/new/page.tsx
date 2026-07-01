import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BannerForm } from "@/components/admin/banners/banner-form";

export const metadata = { title: "Add banner" };
export const dynamic = "force-dynamic";

export default function NewBannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/banners"
          className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          Back to banners
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">Add a banner</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a promotional banner for the homepage mosaic (or another placement).
        </p>
      </div>

      <BannerForm mode="create" />
    </div>
  );
}
