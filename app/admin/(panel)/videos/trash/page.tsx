import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { listVideos } from "@/lib/admin/videos-queries";
import { VideosTrashTable } from "@/components/admin/videos/videos-trash-table";

export const metadata = { title: "Videos recycle bin" };
export const dynamic = "force-dynamic";

export default async function VideosTrashPage() {
  const result = await listVideos({ trash: true, perPage: 100 });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/admin/videos"
          className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          Back to videos
        </Link>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
          <Trash2 className="size-6 text-muted-foreground" />
          Recycle bin
        </h1>
        <p className="text-sm text-muted-foreground">
          Videos you remove live here. Restore one to bring it back, or delete it permanently.
        </p>
      </div>

      <VideosTrashTable rows={result.rows} />
    </div>
  );
}
