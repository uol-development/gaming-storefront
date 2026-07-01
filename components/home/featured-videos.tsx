"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Play, Star, X } from "lucide-react";
import { backdrop } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";
import { formatCompact, formatPrice } from "@/lib/format";
import { youTubeEmbedUrl } from "@/lib/data/youtube";
import type { FeaturedVideo } from "@/lib/data/videos";
import { useCartStore } from "@/lib/store/cart-store";
import { useAddToCart } from "@/lib/hooks/use-add-to-cart";
import { useToast } from "@/lib/hooks/use-toast";

/**
 * Storefront "Featured in Videos" section — a horizontally-scrolling carousel of
 * vertical (Shorts-style) video cards, each tied to a product, with a lazy
 * YouTube modal player. Used on the homepage and on product pages.
 *
 * The iframe is mounted ONLY while the modal is open (state-gated), so the
 * player initializes on the first click and never before. All motion is
 * transform/opacity only and the carousel/cards reserve height (CLS ~ 0).
 */
export function FeaturedVideos({
  videos,
  title = "Featured in Videos",
  subtitle = "See what creators are sharing",
  container = true,
}: {
  videos: FeaturedVideo[];
  title?: string;
  subtitle?: string;
  container?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState<FeaturedVideo | null>(null);

  // Approximate card width (incl. gap) for the prev/next scroll step. Kept in
  // one place so it stays in sync with the card's fixed width below.
  const scrollByCard = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.firstElementChild;
    const cardWidth =
      firstCard instanceof HTMLElement ? firstCard.offsetWidth + 16 : 260 + 16;
    track.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
  }, []);

  if (videos.length === 0) return null;

  return (
    <section
      className={cn(
        container && "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20",
      )}
      aria-labelledby="featured-videos-heading"
    >
      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4 sm:mb-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            {subtitle}
          </p>
          <h2
            id="featured-videos-heading"
            className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {title}
          </h2>
        </div>

        {/* Desktop carousel controls — top-right of the header. */}
        <div className="hidden shrink-0 gap-2 sm:flex">
          <CarouselButton
            direction="prev"
            onClick={() => scrollByCard(-1)}
          />
          <CarouselButton
            direction="next"
            onClick={() => scrollByCard(1)}
          />
        </div>
      </div>

      {/* Carousel track — native touch swipe + scroll-snap. Hidden scrollbar. */}
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} onPlay={setActive} />
        ))}
      </div>

      <VideoModal video={active} onClose={() => setActive(null)} />
    </section>
  );
}

function CarouselButton({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  const isPrev = direction === "prev";
  const Icon = isPrev ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPrev ? "Previous videos" : "Next videos"}
      className="grid size-10 place-items-center rounded-md border border-border bg-card text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}

function VideoCard({
  video,
  onPlay,
}: {
  video: FeaturedVideo;
  onPlay: (video: FeaturedVideo) => void;
}) {
  const router = useRouter();
  const addToCart = useAddToCart();
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();

  const { product } = video;
  const { compareAtPrice } = product;
  const kindLabel = video.kind === "short" ? "Short" : "Video";

  function handleAddToCart(): void {
    addToCart(product.id);
    toast.success("Added to cart", { description: product.name });
  }

  function handleBuyNow(): void {
    addItem(product.id);
    router.push("/checkout");
  }

  return (
    <article className="flex w-[230px] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-border bg-card sm:w-[260px]">
      {/* MEDIA — vertical thumbnail; whole area opens the player. */}
      <button
        type="button"
        onClick={() => onPlay(video)}
        aria-label={`Play ${video.title}`}
        className="group relative block aspect-[9/16] w-full overflow-hidden bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <img
          src={video.thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Bottom gradient for legibility of title/channel. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
        />

        {/* Kind pill. */}
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          {kindLabel}
        </span>

        {/* Centered play affordance. */}
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-transform duration-300 group-hover:scale-110"
        >
          <Play className="size-6 translate-x-0.5 fill-white" aria-hidden />
        </span>

        {/* Title + channel over the gradient. */}
        <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3 text-white">
          <span className="line-clamp-2 text-sm font-semibold leading-snug">
            {video.title}
          </span>
          <span className="text-xs text-white/70">@{video.channelName}</span>
        </span>
      </button>

      {/* PRODUCT BLOCK */}
      <div className="flex flex-1 flex-col space-y-2 p-3">
        <div className="flex items-start gap-2">
          {product.image ? (
            <img
              src={product.image}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-10 shrink-0 rounded-md border border-border object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="size-10 shrink-0 rounded-md border border-border bg-secondary"
            />
          )}
          <Link
            href={`/products/${product.slug}`}
            className="line-clamp-2 text-sm font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            {product.name}
          </Link>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-base font-semibold text-foreground">
            {formatPrice(product.price)}
          </span>
          {compareAtPrice !== undefined ? (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(compareAtPrice)}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
          <span className="font-medium text-foreground">{product.rating}</span>
          <span>({formatCompact(product.reviews)})</span>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleAddToCart}
            aria-label={`Add ${product.name} to cart`}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-border bg-secondary px-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            Add to Cart
          </button>
          <button
            type="button"
            onClick={handleBuyNow}
            aria-label={`Buy ${product.name} now`}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-md bg-primary px-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            Buy Now
          </button>
        </div>
      </div>
    </article>
  );
}

function VideoModal({
  video,
  onClose,
}: {
  video: FeaturedVideo | null;
  onClose: () => void;
}) {
  const { variants } = useReducedMotion();
  const open = video !== null;

  // Lock body scroll + wire Escape while the modal is open; restore on cleanup.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {video ? (
        <motion.div
          key="video-modal"
          variants={variants(backdrop)}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
          className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={video.title}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "relative overflow-hidden rounded-xl border border-border bg-black shadow-2xl",
              video.kind === "short"
                ? "aspect-[9/16] max-h-[85vh] w-auto"
                : "aspect-video w-full max-w-3xl",
            )}
          >
            <iframe
              src={youTubeEmbedUrl(video.videoId, true)}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title={video.title}
              className="h-full w-full"
            />

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-2 top-2 z-10 grid size-9 place-items-center rounded-md bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
