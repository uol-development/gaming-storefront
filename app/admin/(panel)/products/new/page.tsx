import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/products/product-form";

export const metadata = { title: "New product" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("id,name")
    .is("deleted_at", null)
    .order("name");
  const categories = (data ?? []) as { id: string; name: string }[];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          Back to products
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">New product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a new product to your catalog. You can save it as a draft and publish it later.
        </p>
      </div>

      <ProductForm mode="create" categories={categories} />
    </div>
  );
}
