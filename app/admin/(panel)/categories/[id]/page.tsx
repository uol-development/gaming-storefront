import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCategoryById, listCategoryOptions } from "@/lib/admin/categories-queries";
import { CategoryForm } from "@/components/admin/categories/category-form";

export const metadata = { title: "Edit category" };
export const dynamic = "force-dynamic";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [category, parents] = await Promise.all([
    getCategoryById(id),
    listCategoryOptions(id),
  ]);
  if (!category) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/admin/categories"
          className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          Back to categories
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-tight">{String(category.name)}</h1>
      </div>

      <CategoryForm mode="edit" categoryId={id} initial={category} parents={parents} />
    </div>
  );
}
