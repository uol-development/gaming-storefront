import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { listProducts } from "@/lib/admin/products-queries";
import { ProductsTrashTable } from "@/components/admin/products/products-trash-table";

export const metadata = { title: "Recycle bin" };
export const dynamic = "force-dynamic";

export default async function ProductsTrashPage() {
  const result = await listProducts({ trash: true, perPage: 100 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <ArrowLeft className="size-4" />
            Back to products
          </Link>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
            <Trash2 className="size-6 text-muted-foreground" />
            Recycle bin
          </h1>
          <p className="text-sm text-muted-foreground">
            Items here have been moved to trash. Restore a product to bring it back (this un-sets its
            deletion), or permanently remove it. Permanent deletion cannot be undone.
          </p>
        </div>
      </div>

      <ProductsTrashTable rows={result.rows} />
    </div>
  );
}
