import type { Product } from "./api";
import { salePrice } from "./format";

/** What the cart keeps about a product, so it can render without refetching. */
export type CartProduct = {
  id: string;
  title: string;
  image: string;
  category: string;
  brand?: string;
  price: number;
  stock: number;
};

export function toCartProduct(p: Product): CartProduct {
  return {
    id: p._id,
    title: p.title,
    image: p.imageCover,
    category: p.category.name,
    brand: p.brand?.name,
    price: salePrice(p),
    stock: p.quantity,
  };
}
