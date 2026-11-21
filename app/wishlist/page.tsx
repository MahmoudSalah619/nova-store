"use client";

import Link from "next/link";
import { useAccount } from "@/components/account-provider";
import { ProductCard, ProductGridSkeleton } from "@/components/product-card";

export default function WishlistPage() {
  const { user, ready, wishlist, wishlistIds, wishlistLoading } = useAccount();
  // Hide items the moment they're un-hearted, before the API confirms.
  const items = wishlist.filter((p) => wishlistIds.has(p._id));

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Wishlist</h1>

      {!ready || (user && wishlistLoading && wishlist.length === 0) ? (
        <div className="mt-8">
          <ProductGridSkeleton count={4} />
        </div>
      ) : !user ? (
        <div className="mt-8 rounded-2xl bg-surface px-6 py-16 text-center">
          <p className="text-lg font-medium">Sign in to see your wishlist.</p>
          <p className="mt-1 text-muted">Your saved products are kept on your account.</p>
          <Link href="/login?next=/wishlist" className="btn-primary mt-6">
            Sign in
          </Link>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-surface px-6 py-16 text-center">
          <p className="text-lg font-medium">Your wishlist is empty.</p>
          <p className="mt-1 text-muted">Tap the heart on any product to save it here.</p>
          <Link href="/shop" className="btn-primary mt-6">
            Browse products
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-muted">
            {items.length} saved {items.length === 1 ? "item" : "items"}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
