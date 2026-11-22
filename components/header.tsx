"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "./account-provider";
import { useCart } from "./cart-provider";
import { Logo } from "./logo";
import { HoverLabel, navIconClass } from "./nav-icon";
import { ThemeToggle } from "./theme-toggle";

const nav = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
];

export function Header() {
  const pathname = usePathname();
  const { count, ready } = useCart();
  const { wishlistIds } = useAccount();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" aria-label="Nova home" className="shrink-0 transition-opacity hover:opacity-80">
            <Logo size={30} />
          </Link>

          {/* Page tabs: one segmented control, so the active page is obvious. */}
          <nav aria-label="Main" className="flex items-center rounded-full border border-line bg-surface p-1 text-sm">
            {nav.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3.5 py-1.5 transition-colors ${item.href === "/" ? "hidden sm:block" : ""} ${
                    active ? "bg-card font-medium text-foreground shadow-sm" : "text-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <ThemeToggle />
          <IconLink href="/wishlist" label={`Wishlist, ${wishlistIds.size} items`} badge={wishlistIds.size} active={pathname.startsWith("/wishlist")}>
            <path d="M12 20s-7-4.4-9.2-8.8C1.4 8.3 3 5 6.3 5c2 0 3.2 1.1 3.9 2.1.4.6 1.2.6 1.6 0C12.5 6.1 13.7 5 15.7 5 19 5 20.6 8.3 19.2 11.2 17 15.6 12 20 12 20Z" />
          </IconLink>
          <AccountMenu />
          <IconLink href="/cart" label={`Cart, ${count} items`} badge={ready ? count : 0} solid>
            <path d="M6 7h12l-1 13H7L6 7Z" />
            <path d="M9 7a3 3 0 0 1 6 0" />
          </IconLink>
        </div>
      </div>
    </header>
  );
}

const ghost = "text-muted hover:bg-surface hover:text-foreground";

/** Signed out: a link to sign in. Signed in: a menu with orders, wishlist and sign out. */
function AccountMenu() {
  const pathname = usePathname();
  const { user, ready, signOut } = useAccount();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on navigation, outside click and Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const icon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );

  if (!ready) return <span className="h-10 w-10 shrink-0" aria-hidden />;

  if (!user) {
    return (
      <Link href="/login" aria-label="Sign in" className={`${navIconClass} ${ghost}`}>
        {icon}
        <HoverLabel>Sign in</HoverLabel>
      </Link>
    );
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || "?";
  const item = "flex w-full items-center rounded-lg px-3 py-2 text-left hover:bg-surface";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.name}`}
        className={`${navIconClass} pl-1.5 pr-1.5 hover:pr-3 focus-visible:pr-3 ${ghost} ${open ? "bg-surface text-foreground" : ""}`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">{initial}</span>
        <HoverLabel>{user.name.trim().split(" ")[0]}</HoverLabel>
      </button>
      {open && (
        <div role="menu" className="panel absolute right-0 top-12 w-60 p-1.5 text-sm">
          <div className="border-b border-line px-3 pb-2.5 pt-1.5">
            <p className="truncate font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="pt-1.5">
            <Link role="menuitem" href="/orders" className={item}>
              My orders
            </Link>
            <Link role="menuitem" href="/wishlist" className={item}>
              Wishlist
            </Link>
            <button role="menuitem" onClick={signOut} className={`${item} text-muted hover:text-foreground`}>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function IconLink({
  href,
  label,
  badge,
  solid = false,
  active = false,
  children,
}: {
  href: string;
  label: string;
  badge: number;
  solid?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`${navIconClass} ${solid ? "bg-foreground text-background hover:opacity-90" : `${ghost} ${active ? "bg-surface text-foreground" : ""}`}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
      <HoverLabel>{label.split(",")[0]}</HoverLabel>
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}
