"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { categories, products, type Category } from "@/lib/products";

const sorts = {
  featured: "Featured",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Top rated",
} as const;
type Sort = keyof typeof sorts;

export function ShopGrid() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get("category");
  const category = categories.includes(raw as Category) ? (raw as Category) : null;
  const [sort, setSort] = useState<Sort>("featured");
  const [query, setQuery] = useState("");

  const setCategory = (c: Category | null) => {
    router.replace(c ? `${pathname}?category=${c}` : pathname, { scroll: false });
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = products.filter(
      (p) =>
        (!category || p.category === category) &&
        (!q || p.name.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q)),
    );
    switch (sort) {
      case "price-asc":
        return [...filtered].sort((a, b) => a.price - b.price);
      case "price-desc":
        return [...filtered].sort((a, b) => b.price - a.price);
      case "rating":
        return [...filtered].sort((a, b) => b.rating - a.rating);
      default:
        return filtered;
    }
  }, [category, sort, query]);

  return (
    <>
      <div className="mt-8 flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {[null, ...categories].map((c) => (
            <button
              key={c ?? "all"}
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
                category === c
                  ? "border-foreground bg-foreground text-background"
                  : "border-line hover:border-foreground"
              }`}
            >
              {c ?? "All"}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products"
            aria-label="Search products"
            className="input min-w-0 flex-1 lg:w-56"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Sort products"
            className="input w-auto"
          >
            {Object.entries(sorts).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-6 text-sm text-muted">
        {list.length} {list.length === 1 ? "product" : "products"}
      </p>

      {list.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-surface p-12 text-center">
          <p className="font-medium">No products match “{query}”.</p>
          <button onClick={() => setQuery("")} className="mt-3 text-sm text-muted underline">
            Clear search
          </button>
        </div>
      )}
    </>
  );
}
