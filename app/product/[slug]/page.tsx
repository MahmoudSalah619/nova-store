import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductArt } from "@/components/product-art";
import { ProductCard } from "@/components/product-card";
import { formatPrice, getProduct, products } from "@/lib/products";
import { AddToCart } from "./add-to-cart";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  return product ? { title: product.name, description: product.tagline } : {};
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const related = products.filter((p) => p.category === product.category && p.slug !== product.slug);
  const more = related.length ? related : products.filter((p) => p.slug !== product.slug).slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <nav className="text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/shop" className="hover:text-foreground">Shop</Link>
        <span className="mx-2">/</span>
        <Link href={`/shop?category=${product.category}`} className="hover:text-foreground">
          {product.category}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-14">
        <div className="space-y-4">
          <ProductArt product={product} className="aspect-square rounded-3xl" />
          <div className="grid grid-cols-3 gap-4">
            {[0.6, 0.8, 1].map((o) => (
              <div key={o} style={{ opacity: o }}>
                <ProductArt product={product} className="aspect-square rounded-xl" />
              </div>
            ))}
          </div>
        </div>

        <div className="md:sticky md:top-24 md:self-start">
          {product.badge && (
            <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              {product.badge}
            </span>
          )}
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-2 text-lg text-muted">{product.tagline}</p>

          <div className="mt-4 flex items-center gap-2 text-sm">
            <Stars rating={product.rating} />
            <span className="font-medium">{product.rating}</span>
            <span className="text-muted">({product.reviews.toLocaleString("en-US")} reviews)</span>
          </div>

          <p className="mt-6 text-3xl font-semibold">{formatPrice(product.price)}</p>

          <AddToCart slug={product.slug} colors={product.colors} />

          <p className="mt-8 leading-relaxed text-muted">{product.description}</p>

          <ul className="mt-6 grid grid-cols-2 gap-3 text-sm">
            {product.features.map((f) => (
              <li key={f} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-8 divide-y divide-line border-y border-line text-sm">
            <details className="group py-4">
              <summary className="cursor-pointer list-none font-medium">Shipping & returns</summary>
              <p className="mt-2 text-muted">Free shipping over $150. Ships in 1–2 business days. Return within 30 days for a full refund.</p>
            </details>
            <details className="group py-4">
              <summary className="cursor-pointer list-none font-medium">Warranty</summary>
              <p className="mt-2 text-muted">Covered by the Nova 2-year limited warranty.</p>
            </details>
          </div>
        </div>
      </div>

      <section className="mt-24">
        <h2 className="text-2xl font-semibold tracking-tight">You might also like</h2>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
          {more.slice(0, 4).map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex text-accent" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" aria-hidden fill={rating >= i - 0.25 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
          <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z" />
        </svg>
      ))}
    </span>
  );
}
