import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listCategoryOptions } from "@/lib/admin/categories-queries";
import { CategoryForm } from "@/components/admin/categories/category-form";

export const metadata = { title: "New category" };
export const dynamic = "force-dynamic";

export default async function NewCategoryPage() {
  const parents = await listCategoryOptions();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/categories"
          className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          Back to categories
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">New category</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Group products under a category. Inactive categories stay hidden from the storefront.
        </p>
      </div>

      <CategoryForm mode="create" parents={parents} />
    </div>
  );
}
