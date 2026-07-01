import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getBannerById } from "@/lib/admin/banners-queries";
import { BannerForm } from "@/components/admin/banners/banner-form";

export const metadata = { title: "Edit banner" };
export const dynamic = "force-dynamic";

export default async function EditBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const banner = await getBannerById(id);
  if (!banner) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/admin/banners"
          className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          Back to banners
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {String(banner.heading || "Edit banner")}
        </h1>
      </div>

      <BannerForm mode="edit" bannerId={id} initial={banner} />
    </div>
  );
}
