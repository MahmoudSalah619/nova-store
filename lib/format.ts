import type { Product } from "./api";

export function formatPrice(value: number) {
  return new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(value);
}

/** The price a customer actually pays. */
export function salePrice(p: Pick<Product, "price" | "priceAfterDiscount">) {
  return p.priceAfterDiscount && p.priceAfterDiscount < p.price ? p.priceAfterDiscount : p.price;
}

export function discountPercent(p: Pick<Product, "price" | "priceAfterDiscount">) {
  const sale = salePrice(p);
  return sale < p.price ? Math.round((1 - sale / p.price) * 100) : 0;
}
