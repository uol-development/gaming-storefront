"use server";

import type { Product } from "@/lib/data/products";
import {
  getStoreProductById,
  getStoreProductsByIds,
  searchStoreProducts,
} from "@/lib/data/store";

/** Search the live catalog (for the global search overlay). */
export async function searchStoreProductsAction(query: string, limit = 8): Promise<Product[]> {
  return searchStoreProducts(query, limit);
}

/** Resolve a single live product by id (for quick view). */
export async function getStoreProductByIdAction(id: string): Promise<Product | null> {
  return getStoreProductById(id);
}

/** Resolve many live products by id (for cart drawer / order summary line items). */
export async function getStoreProductsByIdsAction(ids: string[]): Promise<Product[]> {
  return getStoreProductsByIds(ids);
}
