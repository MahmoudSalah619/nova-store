import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/api";
import { discountPercent, formatPrice, salePrice } from "@/lib/format";
import { WishlistButton } from "./wishlist-button";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const off = discountPercent(product);
  return (
    <Link href={`/product/${product._id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface">
        <Image
          src={product.imageCover}
          alt={product.title}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {off > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-white">−{off}%</span>
        )}
        <div className="absolute right-3 top-3">
          <WishlistButton productId={product._id} />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xs uppercase tracking-wide text-muted">{product.brand?.name ?? product.category.name}</p>
        <h3 className="mt-0.5 line-clamp-1 font-medium">{product.title}</h3>
        <div className="mt-1 flex items-center justify-between gap-2 text-sm">
          <p>
            <span className="font-medium">{formatPrice(salePrice(product))}</span>
            {off > 0 && <span className="ml-2 text-muted line-through">{formatPrice(product.price)}</span>}
          </p>
          <span className="flex items-center gap-1 text-muted">
            <span className="text-accent">★</span>
            {product.ratingsAverage}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid animate-pulse grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className="aspect-[4/5] rounded-2xl bg-surface" />
          <div className="mt-3 h-3 w-1/3 rounded bg-surface" />
          <div className="mt-2 h-4 w-3/4 rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}
