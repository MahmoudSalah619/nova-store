"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "./account-provider";
import { Logo } from "./logo";
import { useCart } from "./cart-provider";

const nav = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
];

export function Header() {
  const pathname = usePathname();
  const { count, ready } = useCart();
  const { user, ready: accountReady, signOut, wishlistIds } = useAccount();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link href="/" aria-label="Nova home" className="shrink-0 transition-opacity hover:opacity-80">
          <Logo size={30} />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {nav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-2 text-sm transition-colors ${item.href === "/" ? "hidden sm:block" : ""} ${
                  active ? "bg-surface font-medium" : "text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {accountReady &&
            (user ? (
              <>
                <Link
                  href="/orders"
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-sm transition-colors ${
                    pathname.startsWith("/orders") ? "bg-surface font-medium" : "text-muted hover:text-foreground"
                  }`}
                >
                  Orders
                </Link>
                <button onClick={signOut} className="hidden whitespace-nowrap rounded-full px-3 py-2 text-sm text-muted hover:text-foreground md:block" title={user.email}>
                  Sign out
                </button>
              </>
            ) : (
              <Link href="/login" className="whitespace-nowrap rounded-full px-3 py-2 text-sm text-muted hover:text-foreground">
                Sign in
              </Link>
            ))}

          <IconLink href="/wishlist" label={`Wishlist, ${wishlistIds.size} items`} badge={wishlistIds.size} variant="ghost">
            <path d="M12 20s-7-4.4-9.2-8.8C1.4 8.3 3 5 6.3 5c2 0 3.2 1.1 3.9 2.1.4.6 1.2.6 1.6 0C12.5 6.1 13.7 5 15.7 5 19 5 20.6 8.3 19.2 11.2 17 15.6 12 20 12 20Z" />
          </IconLink>
          <IconLink href="/cart" label={`Cart, ${count} items`} badge={ready ? count : 0}>
            <path d="M6 7h12l-1 13H7L6 7Z" />
            <path d="M9 7a3 3 0 0 1 6 0" />
          </IconLink>
        </nav>
      </div>
    </header>
  );
}

function IconLink({
  href,
  label,
  badge,
  variant = "solid",
  children,
}: {
  href: string;
  label: string;
  badge: number;
  variant?: "solid" | "ghost";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-105 ${
        variant === "solid" ? "bg-foreground text-background" : "border border-line"
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}
