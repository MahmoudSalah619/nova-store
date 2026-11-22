import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getCategories, getProducts } from "@/lib/api";
import { discountPercent } from "@/lib/format";

export default async function HomePage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  const bestSellers = [...products].sort((a, b) => b.sold - a.sold);
  const onSale = products.filter((p) => discountPercent(p) > 0).sort((a, b) => discountPercent(b) - discountPercent(a));
  const counts = new Map<string, number>();
  for (const p of products) counts.set(p.category._id, (counts.get(p.category._id) ?? 0) + 1);
  // Categories that have products first.
  const sortedCategories = [...categories].sort((a, b) => (counts.get(b._id) ?? 0) - (counts.get(a._id) ?? 0));
  // Top seller from each category first, so the hero shows variety, then fill to four.
  const topPerCategory = new Map<string, (typeof products)[number]>();
  for (const p of bestSellers) if (!topPerCategory.has(p.category._id)) topPerCategory.set(p.category._id, p);
  const picked = new Set(topPerCategory.values());
  const heroPicks = [...picked, ...bestSellers.filter((p) => !picked.has(p))].slice(0, 4);

  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 md:grid-cols-2 md:pt-16">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-accent">{products.length} products in stock</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Style and tech,
            <br />
            all in one place.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted">
            Fashion and electronics from {new Set(products.map((p) => p.brand?.name).filter(Boolean)).size} brands you
            already love, delivered to your door.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn-primary">
              Shop all products
            </Link>
            {onSale.length > 0 && (
              <Link href="/shop?sort=discount" className="btn-secondary">
                {onSale.length} items on sale
              </Link>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {heroPicks.map((p, i) => (
            <Link
              key={p._id}
              href={`/product/${p._id}`}
              className={`tile group relative overflow-hidden rounded-2xl ${i % 2 ? "translate-y-6" : ""} aspect-[4/5]`}
            >
              <Image
                src={p.imageCover}
                alt={p.title}
                fill
                priority
                sizes="(min-width: 768px) 25vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* Perks */}
      <section className="border-y border-line bg-surface/60">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 text-sm sm:grid-cols-3 sm:px-6">
          {[
            ["Cash on delivery", "Pay when your order arrives"],
            ["30-day returns", "No questions asked"],
            ["Genuine brands", "Sourced directly from makers"],
          ].map(([title, body]) => (
            <div key={title}>
              <p className="font-medium">{title}</p>
              <p className="text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Best sellers */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Best sellers</h2>
          <Link href="/shop?sort=popular" className="text-sm text-muted hover:text-foreground">
            View all →
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
          {bestSellers.slice(0, 8).map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Shop by category</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-5">
          {sortedCategories.map((c) => {
            const count = counts.get(c._id) ?? 0;
            const inner = (
              <>
                <Image
                  src={c.image}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 20vw, 50vw"
                  className={`object-cover transition-transform duration-500 ${count ? "group-hover:scale-105" : "grayscale"}`}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10 text-white">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs opacity-80">{count ? `${count} products` : "Coming soon"}</p>
                </div>
              </>
            );
            return count ? (
              <Link key={c._id} href={`/shop?category=${c._id}`} className="tile group relative aspect-[4/5] overflow-hidden rounded-2xl">
                {inner}
              </Link>
            ) : (
              <div key={c._id} className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface opacity-70">
                {inner}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
