import type { Metadata } from "next";

export const metadata: Metadata = { title: "Wishlist" };

export default function WishlistLayout({ children }: LayoutProps<"/wishlist">) {
  return children;
}
