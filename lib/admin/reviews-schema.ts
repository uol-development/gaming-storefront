import { z } from "zod";

export const REVIEW_STATUSES = ["pending", "approved", "rejected", "spam"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  spam: "Spam",
};

export const REVIEW_STATUS_BADGE: Record<ReviewStatus, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  rejected: "border-border bg-secondary text-muted-foreground",
  spam: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function isReviewStatus(value: string): value is ReviewStatus {
  return (REVIEW_STATUSES as readonly string[]).includes(value);
}

/** Public review submission (from the storefront PDP form). */
export const reviewInputSchema = z.object({
  product_id: z.string().uuid(),
  author_name: z.string().trim().min(1, "Enter your name").max(120),
  author_email: z.string().trim().email("Enter a valid email"),
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5),
  title: z.string().trim().max(160).optional().or(z.literal("")),
  body: z.string().trim().min(5, "Write a few words").max(4000),
});

export type ReviewInput = z.input<typeof reviewInputSchema>;
export type ReviewParsed = z.output<typeof reviewInputSchema>;
