import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductGridSkeleton } from "@/components/product-card";
import { getCategories, getProducts } from "@/lib/api";
import { ShopGrid } from "./shop-grid";

export const metadata: Metadata = { title: "Shop" };

export default async function ShopPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  // Only offer filters for categories that actually have products.
  const used = new Set(products.map((p) => p.category._id));

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Shop</h1>
      <p className="mt-2 text-muted">{products.length} products across fashion and electronics.</p>
      {/* The grid reads ?category= and ?sort= from the URL, so it renders on the client. */}
      <Suspense
        fallback={
          <div className="mt-8">
            <ProductGridSkeleton />
          </div>
        }
      >
        <ShopGrid products={products} categories={categories.filter((c) => used.has(c._id))} />
      </Suspense>
    </div>
  );
}
