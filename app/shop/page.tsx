import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopGrid } from "./shop-grid";

export const metadata: Metadata = { title: "Shop" };

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Shop</h1>
      <p className="mt-2 text-muted">Everything we make, in one place.</p>
      {/* The grid reads ?category= from the URL, so it renders on the client. */}
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-2xl bg-surface" />}>
        <ShopGrid />
      </Suspense>
    </div>
  );
}
