import Link from "next/link";
import { ProductArt } from "@/components/product-art";
import { ProductCard } from "@/components/product-card";
import { categories, products } from "@/lib/products";

export default function HomePage() {
  const hero = products[0];
  const featured = products.filter((p) => p.badge).concat(products.filter((p) => !p.badge)).slice(0, 4);

  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 md:grid-cols-2 md:pt-16">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-accent">New season</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Everyday things,
            <br />
            made beautifully.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted">
            Headphones, lamps, watches and more — designed to be used every day and kept for years.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn-primary">
              Shop all products
            </Link>
            <Link href={`/product/${hero.slug}`} className="btn-secondary">
              Meet {hero.name}
            </Link>
          </div>
        </div>
        <Link href={`/product/${hero.slug}`} className="group">
          <ProductArt product={hero} className="aspect-[4/3.4] rounded-3xl transition-transform duration-500 group-hover:scale-[1.01]" />
        </Link>
      </section>

      {/* Perks */}
      <section className="border-y border-line bg-surface/60">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 text-sm sm:grid-cols-3 sm:px-6">
          {[
            ["Free shipping", "On every order over $150"],
            ["30-day returns", "No questions asked"],
            ["2-year warranty", "On all Nova products"],
          ].map(([title, body]) => (
            <div key={title}>
              <p className="font-medium">{title}</p>
              <p className="text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Featured</h2>
          <Link href="/shop" className="text-sm text-muted hover:text-foreground">
            View all →
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Shop by category</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((c) => {
            const sample = products.find((p) => p.category === c)!;
            const count = products.filter((p) => p.category === c).length;
            return (
              <Link key={c} href={`/shop?category=${c}`} className="group relative overflow-hidden rounded-2xl">
                <ProductArt product={sample} className="aspect-[4/5] transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-4 text-white">
                  <p className="font-medium">{c}</p>
                  <p className="text-xs opacity-80">{count} products</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
