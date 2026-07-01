export const MOVEMENT_REASONS = [
  "restock",
  "correction",
  "damaged",
  "returned",
  "recount",
  "sale",
] as const;

export type MovementReason = (typeof MOVEMENT_REASONS)[number];

export const MOVEMENT_REASON_LABEL: Record<MovementReason, string> = {
  restock: "Restock",
  correction: "Correction",
  damaged: "Damaged / loss",
  returned: "Customer return",
  recount: "Recount",
  sale: "Sale / fulfillment",
};

export type AdjustMode = "add" | "remove" | "set";

export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";

export const INVENTORY_STATUS_LABEL: Record<InventoryStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

export const INVENTORY_STATUS_BADGE: Record<InventoryStatus, string> = {
  in_stock: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  low_stock: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  out_of_stock: "border-destructive/40 bg-destructive/10 text-destructive",
};

/** Stock health from a quantity + its reorder threshold. */
export function deriveInventoryStatus(quantity: number, threshold: number): InventoryStatus {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= threshold) return "low_stock";
  return "in_stock";
}

export function isMovementReason(value: string): value is MovementReason {
  return (MOVEMENT_REASONS as readonly string[]).includes(value);
}

export function isAdjustMode(value: string): value is AdjustMode {
  return value === "add" || value === "remove" || value === "set";
}
