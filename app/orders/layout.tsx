import type { Metadata } from "next";

export const metadata: Metadata = { title: "My orders" };

export default function OrdersLayout({ children }: LayoutProps<"/orders">) {
  return children;
}
