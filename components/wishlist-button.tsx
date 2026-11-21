"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount } from "./account-provider";

export function WishlistButton({ productId, variant = "icon" }: { productId: string; variant?: "icon" | "full" }) {
  const { user, wishlistIds, toggleWishlist } = useAccount();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = wishlistIds.has(productId);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault(); // cards wrap this button in a link
    e.stopPropagation();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await toggleWishlist(productId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const heart = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 20s-7-4.4-9.2-8.8C1.4 8.3 3 5 6.3 5c2 0 3.2 1.1 3.9 2.1.4.6 1.2.6 1.6 0C12.5 6.1 13.7 5 15.7 5 19 5 20.6 8.3 19.2 11.2 17 15.6 12 20 12 20Z" strokeLinejoin="round" />
    </svg>
  );

  if (variant === "full") {
    return (
      <div>
        <button onClick={onClick} disabled={busy} aria-pressed={active} className={`btn-secondary gap-2 ${active ? "text-accent" : ""}`}>
          {heart}
          {active ? "Saved to wishlist" : "Add to wishlist"}
        </button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      title={error ?? undefined}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-background/90 shadow-sm backdrop-blur transition-transform hover:scale-110 disabled:opacity-60 ${
        active ? "text-accent" : "text-foreground"
      }`}
    >
      {heart}
    </button>
  );
}
