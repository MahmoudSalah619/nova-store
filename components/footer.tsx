import Link from "next/link";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm sm:grid-cols-3 sm:px-6">
        <div>
          <Logo size={26} />
          <p className="mt-2 max-w-xs text-muted">Fashion and electronics from the brands you love.</p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-semibold">Shop</p>
          <Link href="/shop" className="text-muted hover:text-foreground">All products</Link>
          <Link href="/wishlist" className="text-muted hover:text-foreground">Wishlist</Link>
          <Link href="/cart" className="text-muted hover:text-foreground">Cart</Link>
          <Link href="/orders" className="text-muted hover:text-foreground">My orders</Link>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-semibold">Good to know</p>
          <p className="text-muted">Cash on delivery</p>
          <p className="text-muted">30-day returns</p>
          <p className="text-muted">Secure checkout</p>
        </div>
      </div>
      <p className="pb-8 text-center text-xs text-muted">Products, accounts and orders are powered by the Route e-commerce API.</p>
    </footer>
  );
}
