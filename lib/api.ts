import { cacheLife, cacheTag } from "next/cache";

import { getAllPages, getJSON } from "./store-api";
import { API_BASE, type Brand, type Category, type ListResponse, type Product, type Subcategory } from "./types";

export type { Brand, Category, Product, Review, Subcategory } from "./types";

export async function getProducts(): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  return getAllPages<Product>("/products");
}

export async function getBrands(): Promise<Brand[]> {
  "use cache";
  cacheLife("days");
  cacheTag("brands");
  return getAllPages<Brand>("/brands");
}

export async function getSubcategories(): Promise<Subcategory[]> {
  "use cache";
  cacheLife("days");
  cacheTag("subcategories");
  return getAllPages<Subcategory>("/subcategories");
}

/** One product with its reviews, or null if the id doesn't exist. */
export async function getProduct(id: string): Promise<Product | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("products", `product-${id}`);

  const res = await fetch(`${API_BASE}/products/${encodeURIComponent(id)}`);
  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status} for product ${id}`);
  const json: { data: Product | null } = await res.json();
  return json.data ?? null;
}

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("days");
  cacheTag("categories");

  const json = await getJSON<ListResponse<Category>>("/categories");
  return json.data;
}
