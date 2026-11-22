import { cacheLife, cacheTag } from "next/cache";

import { API_BASE, type Brand, type Category, type ListResponse, type Product, type Subcategory } from "./types";

export type { Brand, Category, Product, Review, Subcategory } from "./types";

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return res.json();
}

/** Every item of a paginated list. The API caps a page at 50, so walk all pages. */
async function getAllPages<T>(path: string): Promise<T[]> {
  const sep = path.includes("?") ? "&" : "?";
  const first = await getJSON<ListResponse<T>>(`${path}${sep}limit=50&page=1`);
  const rest = await Promise.all(
    Array.from({ length: first.metadata.numberOfPages - 1 }, (_, i) =>
      getJSON<ListResponse<T>>(`${path}${sep}limit=50&page=${i + 2}`),
    ),
  );
  return [first, ...rest].flatMap((r) => r.data);
}

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
