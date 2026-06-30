import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Check, ChevronRight, Star } from "lucide-react";
import {
  getAllProductSlugs,
  getProductBySlug,
  getRelatedProducts,
  productBlurb,
  productSpecGroups,
} from "@/lib/data/catalog";
import { formatCompact, stockStatus } from "@/lib/format";
import { ProductGallery } from "@/components/product/product-gallery";
import { SpecAccordion } from "@/components/product/spec-accordion";
import { StickyBuyPanel } from "@/components/product/sticky-buy-panel";
import { ProductCard } from "@/components/product/product-card";

export function generateStaticParams(): { slug: string }[] {
  return getAllProductSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: productBlurb(product),
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const specGroups = productSpecGroups(product);
  const related = getRelatedProducts(product);
  const availability = stockStatus(product.stock);
  const availabilityDotClass =
    availability.tone === "in"
      ? "bg-emerald-400"
      : availability.tone === "low"
        ? "bg-amber-400"
        : "bg-muted-foreground";
  const availabilityTextClass =
    availability.tone === "in"
      ? "text-emerald-400"
      : availability.tone === "low"
        ? "text-amber-400"
        : "text-muted-foreground";

  return (
    <main className="container mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <li>
            <Link
              href="/"
              className="rounded-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Home
            </Link>
          </li>
          <li aria-hidden className="flex items-center">
            <ChevronRight className="size-4" aria-hidden />
          </li>
          <li>
            <Link
              href={`/products?category=${encodeURIComponent(product.category)}`}
              className="rounded-md capitalize transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {product.category}
            </Link>
          </li>
          <li aria-hidden className="flex items-center">
            <ChevronRight className="size-4" aria-hidden />
          </li>
          <li aria-current="page" className="truncate font-medium text-foreground">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Main grid */}
      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
        {/* LEFT — gallery, blurb, highlights, spec accordion */}
        <div className="flex flex-col gap-8">
          <ProductGallery product={product} />

          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {product.description}
          </p>

          {product.specs.length > 0 ? (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
                Highlights
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {product.specs.map((spec) => (
                  <li
                    key={spec}
                    className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span>{spec}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <SpecAccordion groups={specGroups} />
        </div>

        {/* RIGHT — header + sticky buy panel */}
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{product.brand}</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {product.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
                <span className="font-medium text-foreground">{product.rating}</span>
                <span>({formatCompact(product.reviews)} reviews)</span>
              </div>
              <div className={`flex items-center gap-1.5 font-medium ${availabilityTextClass}`}>
                <span
                  className={`size-2 shrink-0 rounded-full ${availabilityDotClass}`}
                  aria-hidden
                />
                <span>{availability.label}</span>
              </div>
            </div>
          </div>

          <StickyBuyPanel product={product} />
        </div>
      </div>

      {/* Related */}
      {related.length > 0 ? (
        <section className="mt-16">
          <h2 className="mb-6 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            You might also like
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
