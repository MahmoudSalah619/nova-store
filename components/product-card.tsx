import Link from "next/link";
import { formatPrice, type Product } from "@/lib/products";
import { ProductArt } from "./product-art";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative">
        <ProductArt product={product} className="aspect-square rounded-2xl transition-transform duration-300 group-hover:scale-[1.02]" />
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-background px-2.5 py-1 text-xs font-medium shadow-sm">
            {product.badge}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{product.name}</h3>
          <p className="text-sm text-muted">{product.category}</p>
        </div>
        <p className="font-medium">{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
}
