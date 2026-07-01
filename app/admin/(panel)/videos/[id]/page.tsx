import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getVideoById, listProductChoices } from "@/lib/admin/videos-queries";
import { VideoForm } from "@/components/admin/videos/video-form";

export const metadata = { title: "Edit video" };
export const dynamic = "force-dynamic";

export default async function EditVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [video, products] = await Promise.all([getVideoById(id), listProductChoices()]);
  if (!video) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/admin/videos"
          className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          Back to videos
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {String(video.title || "Edit video")}
        </h1>
      </div>

      <VideoForm mode="edit" videoId={id} initial={video} products={products} />
    </div>
  );
}
