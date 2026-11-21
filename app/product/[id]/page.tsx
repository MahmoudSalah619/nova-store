import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { WishlistButton } from "@/components/wishlist-button";
import { toCartProduct } from "@/lib/cart";
import { getProduct, getProducts } from "@/lib/api";
import { discountPercent, formatPrice, salePrice } from "@/lib/format";
import { AddToCart } from "./add-to-cart";
import { Gallery } from "./gallery";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ id: p._id }));
}

export async function generateMetadata({ params }: PageProps<"/product/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  return product ? { title: product.title, description: product.description.slice(0, 160) } : {};
}

export default async function ProductPage({ params }: PageProps<"/product/[id]">) {
  const { id } = await params;
  const [product, all] = await Promise.all([getProduct(id), getProducts()]);
  if (!product) notFound();

  const off = discountPercent(product);
  const related = all
    .filter((p) => p.category._id === product.category._id && p._id !== product._id)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 4);
  // Descriptions come as "Label\tValue" lines; show those as a spec table.
  const lines = product.description.split("\n").map((l) => l.trim()).filter(Boolean);
  const specs = lines.filter((l) => l.includes("\t")).map((l) => l.split("\t") as [string, string]);
  const prose = lines.filter((l) => !l.includes("\t"));
  const reviews = product.reviews ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <nav className="text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/shop" className="hover:text-foreground">Shop</Link>
        <span className="mx-2">/</span>
        <Link href={`/shop?category=${product.category._id}`} className="hover:text-foreground">
          {product.category.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.title}</span>
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-14">
        <Gallery images={product.images.length ? product.images : [product.imageCover]} title={product.title} />

        <div className="md:sticky md:top-24 md:self-start">
          <p className="text-sm uppercase tracking-wide text-muted">
            {product.brand?.name}
            {product.subcategory[0] && ` · ${product.subcategory[0].name}`}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{product.title}</h1>

          <div className="mt-4 flex items-center gap-2 text-sm">
            <Stars rating={product.ratingsAverage} />
            <span className="font-medium">{product.ratingsAverage}</span>
            <span className="text-muted">({product.ratingsQuantity} ratings)</span>
            <span className="text-muted">· {product.sold.toLocaleString("en-US")} sold</span>
          </div>

          <div className="mt-6 flex items-baseline gap-3">
            <p className="text-3xl font-semibold">{formatPrice(salePrice(product))}</p>
            {off > 0 && (
              <>
                <p className="text-lg text-muted line-through">{formatPrice(product.price)}</p>
                <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">Save {off}%</span>
              </>
            )}
          </div>
          <p className={`mt-2 text-sm ${product.quantity > 0 ? "text-emerald-600" : "text-red-600"}`}>
            {product.quantity > 0 ? `In stock (${product.quantity} available)` : "Out of stock"}
          </p>

          <AddToCart product={toCartProduct(product)} />
          <div className="mt-3">
            <WishlistButton productId={product._id} variant="full" />
          </div>

          {(specs.length > 0 || prose.length > 0) && (
            <div className="mt-8">
              <h2 className="font-semibold">Details</h2>
              {prose.map((p, i) => (
                <p key={i} className="mt-2 leading-relaxed text-muted">{p}</p>
              ))}
              {specs.length > 0 && (
                <dl className="mt-3 divide-y divide-line rounded-xl border border-line text-sm">
                  {specs.map(([k, v], i) => (
                    <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-4 py-2.5">
                      <dt className="text-muted">{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}
        </div>
      </div>

      {reviews.length > 0 && (
        <section className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight">Reviews ({reviews.length})</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {reviews.slice(0, 6).map((r) => (
              <li key={r._id} className="rounded-2xl bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{r.user?.name ?? "Customer"}</p>
                  <Stars rating={r.rating} />
                </div>
                <p className="mt-2 text-sm text-muted" dir="auto">{r.review}</p>
                <p className="mt-3 text-xs text-muted">
                  {new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight">More in {product.category.name}</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}
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
