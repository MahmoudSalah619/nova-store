"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Category, Product } from "@/lib/api";
import { discountPercent, salePrice } from "@/lib/format";

const sorts = {
  popular: "Most popular",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Top rated",
  discount: "Biggest discount",
} as const;
type Sort = keyof typeof sorts;

export function ShopGrid({ products, categories }: { products: Product[]; categories: Category[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rawCategory = params.get("category");
  const category = categories.some((c) => c._id === rawCategory) ? rawCategory : null;
  const rawSort = params.get("sort");
  const sort: Sort = rawSort && rawSort in sorts ? (rawSort as Sort) : "popular";
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");

  const update = (key: "category" | "sort", value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const brands = useMemo(
    () =>
      [...new Set(products.filter((p) => !category || p.category._id === category).map((p) => p.brand?.name).filter(Boolean))].sort() as string[],
    [products, category],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = products.filter(
      (p) =>
        (!category || p.category._id === category) &&
        (!brand || p.brand?.name === brand) &&
        (!q || p.title.toLowerCase().includes(q) || p.brand?.name.toLowerCase().includes(q)),
    );
    const by: Record<Sort, (a: Product, b: Product) => number> = {
      popular: (a, b) => b.sold - a.sold,
      "price-asc": (a, b) => salePrice(a) - salePrice(b),
      "price-desc": (a, b) => salePrice(b) - salePrice(a),
      rating: (a, b) => b.ratingsAverage - a.ratingsAverage,
      discount: (a, b) => discountPercent(b) - discountPercent(a),
    };
    return filtered.sort(by[sort]);
  }, [products, category, brand, sort, query]);

  return (
    <>
      <div className="mt-8 flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {[null, ...categories].map((c) => {
            const id = c?._id ?? null;
            return (
              <button
                key={id ?? "all"}
                onClick={() => {
                  setBrand("");
                  update("category", id);
                }}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
                  category === id ? "border-foreground bg-foreground text-background" : "border-line hover:border-foreground"
                }`}
              >
                {c?.name ?? "All"}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products"
            aria-label="Search products"
            className="input col-span-2 sm:w-52"
          />
          <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Filter by brand" className="input sm:w-40">
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => update("sort", e.target.value)} aria-label="Sort products" className="input sm:w-48">
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
          {list.map((p, i) => (
            <ProductCard key={p._id} product={p} priority={i < 4} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-surface p-12 text-center">
          <p className="font-medium">No products match your filters.</p>
          <button
            onClick={() => {
              setQuery("");
              setBrand("");
            }}
            className="mt-3 text-sm text-muted underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
