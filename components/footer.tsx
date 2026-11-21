import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-semibold">Nova</p>
          <p className="mt-2 max-w-xs text-muted">Thoughtful everyday tech and home goods, designed to last.</p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-semibold">Shop</p>
          <Link href="/shop" className="text-muted hover:text-foreground">All products</Link>
          <Link href="/cart" className="text-muted hover:text-foreground">Cart</Link>
          <Link href="/checkout" className="text-muted hover:text-foreground">Checkout</Link>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-semibold">Good to know</p>
          <p className="text-muted">Free shipping over $150</p>
          <p className="text-muted">30-day returns</p>
          <p className="text-muted">2-year warranty</p>
        </div>
      </div>
      <p className="pb-8 text-center text-xs text-muted">Demo store. No real orders are placed.</p>
    </footer>
  );
}
