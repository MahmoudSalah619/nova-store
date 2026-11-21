"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart, type CartProduct } from "@/components/cart-provider";
import { QuantityStepper } from "@/components/quantity-stepper";

export function AddToCart({ product }: { product: CartProduct }) {
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const soldOut = product.stock <= 0;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap gap-3">
        <QuantityStepper value={quantity} onChange={setQuantity} max={Math.min(10, Math.max(product.stock, 1))} />
        <button
          className="btn-primary flex-1"
          disabled={soldOut}
          onClick={() => {
            add(product, quantity);
            setAdded(true);
          }}
        >
          {soldOut ? "Sold out" : "Add to cart"}
        </button>
      </div>

      {added && (
        <div role="status" className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 text-sm">
          <span>Added to your cart.</span>
          <Link href="/cart" className="font-medium underline">
            View cart
          </Link>
        </div>
      )}
    </div>
  );
}
