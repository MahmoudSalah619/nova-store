"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartProduct } from "@/lib/cart";

export type { CartProduct };

export type CartItem = CartProduct & { quantity: number; lineTotal: number };

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  ready: boolean;
  add: (product: CartProduct, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "nova-cart-v2";
const MAX_QTY = 10;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<(CartProduct & { quantity: number })[]>([]);
  const [ready, setReady] = useState(false);

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

  const cap = (p: CartProduct, q: number) => Math.max(0, Math.min(q, MAX_QTY, p.stock || MAX_QTY));

  const add = useCallback((product: CartProduct, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.id === product.id);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...product, quantity: cap(product, l.quantity + quantity) } : l));
      }
      return [...prev, { ...product, quantity: cap(product, quantity) }];
    });
  }, []);

  const setQuantity = useCallback((id: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, quantity: cap(l, quantity) } : l)),
    );
  }, []);

  const remove = useCallback((id: string) => setLines((prev) => prev.filter((l) => l.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const items = lines.map((l) => ({ ...l, lineTotal: l.price * l.quantity }));
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
