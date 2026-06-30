import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProductById } from "@/lib/admin/products-queries";
import { ProductForm } from "@/components/admin/products/product-form";

export const metadata = { title: "Edit product" };
export const dynamic = "force-dynamic";

interface CategoryOption {
  id: string;
  name: string;
}

async function fetchCategories(): Promise<CategoryOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("id,name")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  return (data as CategoryOption[] | null) ?? [];
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories] = await Promise.all([getProductById(id), fetchCategories()]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <ArrowLeft className="size-4" />
          Back to products
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {String(product.name)}
        </h1>
      </div>

      <ProductForm mode="edit" productId={id} initial={product} categories={categories} />
    </div>
  );
}
