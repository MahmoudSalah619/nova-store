// Shared by server and client code: no server-only imports here.

export const API_BASE = "https://ecommerce.routemisr.com/api/v1";

export type Category = {
  _id: string;
  name: string;
  slug: string;
  image: string;
};

export type Brand = {
  _id: string;
  name: string;
  slug: string;
  image: string;
};

export type Review = {
  _id: string;
  review: string;
  rating: number;
  user: { _id: string; name: string };
  createdAt: string;
};

export type Product = {
  _id: string;
  id: string;
  title: string;
  slug: string;
  description: string;
  quantity: number;
  sold: number;
  price: number;
  priceAfterDiscount?: number;
  imageCover: string;
  images: string[];
  category: Category;
  brand?: Brand;
  subcategory: { _id: string; name: string }[];
  ratingsAverage: number;
  ratingsQuantity: number;
  reviews?: Review[];
};

export type ListResponse<T> = {
  results: number;
  metadata: { currentPage: number; numberOfPages: number; limit: number };
  data: T[];
};

export type ShippingAddress = { details: string; phone: string; city: string };

export type Order = {
  _id: string;
  /** Human-friendly order number. */
  id: number;
  createdAt: string;
  totalOrderPrice: number;
  taxPrice: number;
  shippingPrice: number;
  paymentMethodType: "cash" | "card";
  isPaid: boolean;
  isDelivered: boolean;
  paidAt?: string;
  deliveredAt?: string;
  shippingAddress?: ShippingAddress;
  cartItems: {
    _id: string;
    count: number;
    price: number;
    product: Pick<Product, "_id" | "title" | "imageCover"> & { brand?: { name: string }; category?: { name: string } };
  }[];
};
