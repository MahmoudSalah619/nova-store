"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getProduct, type Product } from "@/lib/products";

export type CartLine = { slug: string; color: string; quantity: number };
export type CartItem = CartLine & { product: Product; lineTotal: number };

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  ready: boolean;
  add: (slug: string, color: string, quantity?: number) => void;
  setQuantity: (slug: string, color: string, quantity: number) => void;
  remove: (slug: string, color: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "nova-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  // Load the saved cart once on the client.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setLines(JSON.parse(saved));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, ready]);

  const add = useCallback((slug: string, color: string, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.slug === slug && l.color === color);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, quantity: Math.min(l.quantity + quantity, 10) } : l));
      }
      return [...prev, { slug, color, quantity }];
    });
  }, []);

  const setQuantity = useCallback((slug: string, color: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => !(l.slug === slug && l.color === color))
        : prev.map((l) => (l.slug === slug && l.color === color ? { ...l, quantity: Math.min(quantity, 10) } : l)),
    );
  }, []);

  const remove = useCallback((slug: string, color: string) => {
    setLines((prev) => prev.filter((l) => !(l.slug === slug && l.color === color)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const items: CartItem[] = lines.flatMap((line) => {
      const product = getProduct(line.slug);
      return product ? [{ ...line, product, lineTotal: product.price * line.quantity }] : [];
    });
    return {
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((n, i) => n + i.lineTotal, 0),
      ready,
      add,
      setQuantity,
      remove,
      clear,
    };
  }, [lines, ready, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
