"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { OrderSummary } from "@/components/order-summary";
import { QuantityStepper } from "@/components/quantity-stepper";
import { formatPrice } from "@/lib/format";

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
            <ul className="panel mt-4 divide-y divide-line px-5">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4 py-5">
                  <Link href={`/product/${item.id}`} className="tile relative h-28 w-24 shrink-0 overflow-hidden rounded-xl sm:h-32 sm:w-28">
                    <Image src={item.image} alt={item.title} fill sizes="112px" className="object-cover" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                    <div className="flex justify-between gap-4">
                      <div className="min-w-0">
                        <Link href={`/product/${item.id}`} className="line-clamp-2 font-medium hover:underline">
                          {item.title}
                        </Link>
                        <p className="text-sm text-muted">{item.brand ?? item.category}</p>
                        <p className="text-sm text-muted">{formatPrice(item.price)} each</p>
                      </div>
                      <p className="font-medium tabular-nums">{formatPrice(item.lineTotal)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <QuantityStepper
                        size="sm"
                        value={item.quantity}
                        max={Math.min(10, item.stock || 10)}
                        onChange={(q) => setQuantity(item.id, q)}
                      />
                      <button onClick={() => remove(item.id)} className="text-sm text-muted hover:text-foreground">
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
