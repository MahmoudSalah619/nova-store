"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { OrderSummary } from "@/components/order-summary";
import { ProductArt } from "@/components/product-art";
import { QuantityStepper } from "@/components/quantity-stepper";
import { formatPrice } from "@/lib/products";

export default function CartPage() {
  const { items, subtotal, count, ready, setQuantity, remove } = useCart();

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your cart</h1>

      {!ready ? (
        <div className="mt-8 h-64 animate-pulse rounded-2xl bg-surface" />
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-surface px-6 py-16 text-center">
          <p className="text-lg font-medium">Your cart is empty.</p>
          <p className="mt-1 text-muted">Find something you’ll love.</p>
          <Link href="/shop" className="btn-primary mt-6">
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-sm text-muted">{count} {count === 1 ? "item" : "items"}</p>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {items.map((item) => (
                <li key={`${item.slug}-${item.color}`} className="flex gap-4 py-6">
                  <Link href={`/product/${item.slug}`} className="shrink-0">
                    <ProductArt product={item.product} className="h-24 w-24 rounded-xl sm:h-28 sm:w-28" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                    <div className="flex justify-between gap-4">
                      <div className="min-w-0">
                        <Link href={`/product/${item.slug}`} className="font-medium hover:underline">
                          {item.product.name}
                        </Link>
                        <p className="text-sm text-muted">{item.color}</p>
                        <p className="text-sm text-muted">{formatPrice(item.product.price)} each</p>
                      </div>
                      <p className="font-medium tabular-nums">{formatPrice(item.lineTotal)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <QuantityStepper
                        size="sm"
                        value={item.quantity}
                        onChange={(q) => setQuantity(item.slug, item.color, q)}
                      />
                      <button onClick={() => remove(item.slug, item.color)} className="text-sm text-muted hover:text-foreground">
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/shop" className="mt-6 inline-block text-sm text-muted hover:text-foreground">
              ← Continue shopping
            </Link>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <OrderSummary subtotal={subtotal}>
              <Link href="/checkout" className="btn-primary mt-6 w-full">
                Checkout
              </Link>
            </OrderSummary>
          </div>
        </div>
      )}
    </div>
  );
}
