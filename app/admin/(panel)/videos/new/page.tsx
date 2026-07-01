import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listProductChoices } from "@/lib/admin/videos-queries";
import { VideoForm } from "@/components/admin/videos/video-form";

export const metadata = { title: "Add video" };
export const dynamic = "force-dynamic";

export default async function NewVideoPage() {
  const products = await listProductChoices();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/videos"
          className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          Back to videos
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">Add a video</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a YouTube video or Shorts link, link it to a product, and it appears in the
          storefront carousel.
        </p>
      </div>

      <VideoForm mode="create" products={products} />
    </div>
  );
}
