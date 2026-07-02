"use client";

import { useState, useTransition, type FormEvent } from "react";
import { motion } from "motion/react";
import { Loader2, Star } from "lucide-react";
import { fadeUp } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/lib/format";
import { submitReview } from "@/lib/data/reviews-actions";
import type { StoreReview, ReviewSummary } from "@/lib/data/reviews";

/**
 * Storefront PDP reviews section.
 *
 * Reads are server-rendered (approved reviews only) and passed in as props; this
 * client component owns the interactive review form and its optimistic UI.
 * Reviews are moderated, so a successful submission shows a "pending approval"
 * note rather than injecting the review into the list. All motion is
 * transform/opacity-only and layout height is reserved by content (no CLS).
 */

const STARS = [1, 2, 3, 4, 5] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const dateFmt = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFmt.format(d);
}

/** Row of 5 stars filled up to `value` (rounded). Presentational only. */
function StarRow({
  value,
  className,
  size = "size-4",
}: {
  value: number;
  className?: string;
  size?: string;
}) {
  const filled = Math.round(value);
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-hidden>
      {STARS.map((s) => (
        <Star
          key={s}
          className={cn(
            size,
            s <= filled ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}

interface FieldErrors {
  rating?: string;
  name?: string;
  email?: string;
  body?: string;
}

export function ProductReviews({
  productId,
  productName,
  summary,
  reviews,
}: {
  productId: string;
  productName: string;
  summary: ReviewSummary;
  reviews: StoreReview[];
}) {
  const { variants } = useReducedMotion();
  const [formOpen, setFormOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Star picker state.
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shownRating = hovered || rating;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setBanner(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const authorName = String(data.get("author_name") ?? "").trim();
    const authorEmail = String(data.get("author_email") ?? "").trim();
    const title = String(data.get("title") ?? "").trim();
    const body = String(data.get("body") ?? "").trim();

    const nextErrors: FieldErrors = {};
    if (rating < 1) nextErrors.rating = "Pick a star rating";
    if (authorName.length === 0) nextErrors.name = "Enter your name";
    if (!EMAIL_RE.test(authorEmail)) nextErrors.email = "Enter a valid email";
    if (body.length < 5) nextErrors.body = "Write at least a few words";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    startTransition(async () => {
      const result = await submitReview({
        product_id: productId,
        author_name: authorName,
        author_email: authorEmail,
        rating,
        title,
        body,
      });
      if (result.ok) {
        setSubmitted(true);
      } else {
        setBanner(result.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  const hasReviews = summary.count > 0;

  return (
    <section id="reviews" className="mt-16 scroll-mt-24">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Customer reviews</h2>

      {/* Summary */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        {hasReviews ? (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
            <div className="flex flex-col items-center gap-1 sm:items-start">
              <div className="text-5xl font-bold tabular-nums text-foreground">
                {summary.average.toFixed(1)}
              </div>
              <StarRow value={summary.average} size="size-5" />
              <div className="text-sm text-muted-foreground tabular-nums">
                {formatCompact(summary.count)} review{summary.count === 1 ? "" : "s"}
              </div>
            </div>

            <div className="flex-1 space-y-1.5" aria-hidden>
              {[5, 4, 3, 2, 1].map((star) => {
                const c = summary.distribution[star - 1] ?? 0;
                const pct = summary.count > 0 ? (c / summary.count) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-sm">
                    <span className="w-3 tabular-nums text-muted-foreground">{star}</span>
                    <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <motion.span
                        className="block h-full rounded-full bg-amber-400"
                        initial={{ transform: "scaleX(0)" }}
                        whileInView={{ transform: `scaleX(${pct / 100})` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        style={{ width: "100%", transformOrigin: "left" }}
                      />
                    </span>
                    <span className="w-8 text-right tabular-nums text-muted-foreground">{c}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No reviews yet — be the first to review the {productName}.
          </p>
        )}
      </div>

      {/* Write a review toggle + form */}
      <div className="mt-6">
        {!formOpen ? (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Write a review
          </button>
        ) : (
          <motion.div
            variants={variants(fadeUp)}
            initial="hidden"
            animate="visible"
            className="rounded-xl border border-border bg-card p-6"
          >
            {submitted ? (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 text-sm font-medium text-emerald-400"
              >
                Thanks! Your review is pending approval.
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div>
                  <span className="mb-2 block text-sm font-medium text-foreground">
                    Your rating
                  </span>
                  <div
                    className="inline-flex items-center gap-1"
                    onMouseLeave={() => setHovered(0)}
                  >
                    {STARS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-label={`Rate ${s} star${s === 1 ? "" : "s"}`}
                        aria-pressed={rating === s}
                        onClick={() => {
                          setRating(s);
                          setErrors((e) => ({ ...e, rating: undefined }));
                        }}
                        onMouseEnter={() => setHovered(s)}
                        onFocus={() => setHovered(s)}
                        onBlur={() => setHovered(0)}
                        className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Star
                          className={cn(
                            "size-7",
                            s <= shownRating
                              ? "fill-amber-400 text-amber-400"
                              : "fill-none text-muted-foreground/40",
                          )}
                          aria-hidden
                        />
                      </button>
                    ))}
                  </div>
                  <div aria-live="polite" className="min-h-[1.25rem]">
                    {errors.rating ? (
                      <p className="mt-1 text-xs text-destructive">{errors.rating}</p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="review-name"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      Name
                    </label>
                    <input
                      id="review-name"
                      name="author_name"
                      type="text"
                      required
                      autoComplete="name"
                      aria-invalid={Boolean(errors.name)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <div aria-live="polite" className="min-h-[1.25rem]">
                      {errors.name ? (
                        <p className="mt-1 text-xs text-destructive">{errors.name}</p>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="review-email"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      Email
                    </label>
                    <input
                      id="review-email"
                      name="author_email"
                      type="email"
                      required
                      autoComplete="email"
                      aria-invalid={Boolean(errors.email)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <div aria-live="polite" className="min-h-[1.25rem]">
                      {errors.email ? (
                        <p className="mt-1 text-xs text-destructive">{errors.email}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="review-title"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    Title <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    id="review-title"
                    name="title"
                    type="text"
                    maxLength={160}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div>
                  <label
                    htmlFor="review-body"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    Review
                  </label>
                  <textarea
                    id="review-body"
                    name="body"
                    required
                    rows={4}
                    maxLength={4000}
                    aria-invalid={Boolean(errors.body)}
                    className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <div aria-live="polite" className="min-h-[1.25rem]">
                    {errors.body ? (
                      <p className="mt-1 text-xs text-destructive">{errors.body}</p>
                    ) : null}
                  </div>
                </div>

                <div aria-live="assertive">
                  {banner ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {banner}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {pending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Submitting…
                      </>
                    ) : (
                      "Submit review"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    disabled={pending}
                    className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </div>

      {/* Reviews list */}
      {reviews.length > 0 ? (
        <ul className="mt-8 space-y-4">
          {reviews.map((review) => (
            <li key={review.id}>
              <article className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{review.authorName}</span>
                    {review.isVerified ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                        Verified purchase
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <StarRow value={review.rating} size="size-3.5" />
                    {review.createdAt ? (
                      <time dateTime={review.createdAt} className="tabular-nums">
                        {formatDate(review.createdAt)}
                      </time>
                    ) : null}
                  </div>
                </div>
                {review.title ? (
                  <h3 className="mt-2 font-semibold text-foreground">{review.title}</h3>
                ) : null}
                {review.body ? (
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                    {review.body}
                  </p>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
