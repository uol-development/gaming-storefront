import { WishlistClient } from "@/components/wishlist/wishlist-client";

export const metadata = { title: "Wishlist" };

/**
 * Wishlist page. Server Component shell — a static heading block followed by
 * <WishlistClient />, which is a Client Component that reads the shared wishlist
 * store and renders the staggered product grid. Completes the header heart flow.
 */
export default function WishlistPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Saved for later
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Your wishlist
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Everything you have saved, in one place. Move items to your cart when
          you are ready to check out.
        </p>
      </div>

      <WishlistClient />
    </div>
  );
}
