import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { listCategories } from "@/lib/admin/categories-queries";
import { CategoriesTrashTable } from "@/components/admin/categories/categories-trash-table";

export const metadata = { title: "Categories recycle bin" };
export const dynamic = "force-dynamic";

export default async function CategoriesTrashPage() {
  const result = await listCategories({ trash: true, perPage: 100 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/admin/categories"
            className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" />
            Back to categories
          </Link>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
            <Trash2 className="size-6 text-muted-foreground" />
            Recycle bin
          </h1>
          <p className="text-sm text-muted-foreground">
            Categories you move to trash live here. Restore one to bring it back, or permanently
            remove it. Permanent deletion cannot be undone.
          </p>
        </div>
      </div>

      <CategoriesTrashTable rows={result.rows} />
    </div>
  );
}
