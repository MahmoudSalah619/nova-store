"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { QuantityStepper } from "@/components/quantity-stepper";

export function AddToCart({ slug, colors }: { slug: string; colors: { name: string; hex: string }[] }) {
  const { add } = useCart();
  const [color, setColor] = useState(colors[0].name);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div className="mt-8 space-y-6">
      <div>
        <p className="text-sm">
          Color: <span className="font-medium">{color}</span>
        </p>
        <div className="mt-3 flex gap-3">
          {colors.map((c) => (
            <button
              key={c.name}
              onClick={() => setColor(c.name)}
              aria-label={c.name}
              aria-pressed={color === c.name}
              className={`h-9 w-9 rounded-full border-2 p-0.5 transition-colors ${
                color === c.name ? "border-foreground" : "border-transparent"
              }`}
            >
              <span className="block h-full w-full rounded-full ring-1 ring-black/10" style={{ background: c.hex }} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <QuantityStepper value={quantity} onChange={setQuantity} />
        <button
          className="btn-primary flex-1"
          onClick={() => {
            add(slug, color, quantity);
            setAdded(true);
          }}
        >
          Add to cart
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
