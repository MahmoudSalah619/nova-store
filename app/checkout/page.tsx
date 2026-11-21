"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useAccount } from "@/components/account-provider";
import { useCart } from "@/components/cart-provider";
import { OrderSummary } from "@/components/order-summary";
import { formatPrice } from "@/lib/format";
import type { Order, ShippingAddress } from "@/lib/types";

const CITIES = ["Cairo", "Giza", "Alexandria", "Mansoura", "Tanta", "Asyut", "Luxor", "Aswan", "Port Said", "Suez", "Hurghada"];

type Errors = Partial<Record<keyof ShippingAddress, string>>;

function validate(f: ShippingAddress): Errors {
  const e: Errors = {};
  if (f.details.trim().length < 5) e.details = "Enter your street address";
  if (!f.city.trim()) e.city = "Choose a city";
  if (!/^01[0125]\d{8}$/.test(f.phone)) e.phone = "An Egyptian mobile number, e.g. 01012345678";
  return e;
}

export default function CheckoutPage() {
  const { items, subtotal, ready, clear } = useCart();
  const { user, ready: accountReady, api } = useAccount();
  const [fields, setFields] = useState<ShippingAddress>({ details: "", phone: "", city: "Cairo" });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const set = (key: keyof ShippingAddress) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = key === "phone" ? e.target.value.replace(/\D/g, "").slice(0, 11) : e.target.value;
    setFields((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  /** The order API works from the server-side cart, so mirror the local cart there first. */
  async function placeOrder() {
    setStatus("Preparing your cart…");
    await api("/cart", { method: "DELETE" }).catch(() => {}); // start clean; fails harmlessly if already empty
    let cartId = "";
    for (const item of items) {
      const res = await api<{ cartId: string }>("/cart", { method: "POST", body: JSON.stringify({ productId: item.id }) });
      cartId = res.cartId;
      if (item.quantity > 1) {
        await api(`/cart/${item.id}`, { method: "PUT", body: JSON.stringify({ count: String(item.quantity) }) });
      }
    }
    setStatus("Placing your order…");
    const res = await api<{ data: Order }>(`/orders/${cartId}`, {
      method: "POST",
      body: JSON.stringify({ shippingAddress: fields }),
    });
    return res.data;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(fields);
    setErrors(found);
    if (Object.keys(found).length) return;
    setError(null);
    try {
      const placed = await placeOrder();
      setOrder(placed);
      clear();
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't place your order. Please try again.");
    } finally {
      setStatus(null);
    }
  }

  if (order) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16 text-center sm:px-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Thank you for your order!</h1>
        <p className="mt-3 text-muted">
          Order <span className="font-medium text-foreground">#{order.id}</span> is confirmed. Pay{" "}
          <span className="font-medium text-foreground">{formatPrice(order.totalOrderPrice)}</span> in cash when it arrives in{" "}
          {order.shippingAddress?.city ?? fields.city}.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/orders" className="btn-primary">
            View my orders
          </Link>
          <Link href="/shop" className="btn-secondary">
            Keep shopping
          </Link>
        </div>
      </div>
    );
  }

  if (ready && items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16 text-center sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Nothing to check out</h1>
        <p className="mt-3 text-muted">Your cart is empty.</p>
        <Link href="/shop" className="btn-primary mt-8">
          Go to shop
        </Link>
      </div>
    );
  }

  const busy = status !== null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <Link href="/cart" className="text-sm text-muted hover:text-foreground">
        ← Back to cart
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Checkout</h1>

      <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-lg font-semibold">Account</h2>
            {!accountReady ? (
              <div className="h-16 animate-pulse rounded-xl bg-surface" />
            ) : user ? (
              <p className="rounded-xl bg-surface px-4 py-3 text-sm">
                Ordering as <span className="font-medium">{user.name}</span> <span className="text-muted">({user.email})</span>
              </p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 text-sm">
                <span>Sign in to place your order and track it later.</span>
                <Link href="/login?next=/checkout" className="btn-primary px-4 py-2 text-sm">
                  Sign in
                </Link>
              </div>
            )}
          </section>

          <fieldset className="space-y-4" disabled={!user || busy}>
            <legend className="mb-4 text-lg font-semibold">Shipping address</legend>
            <Field label="Street address" error={errors.details}>
              <input
                className="input"
                value={fields.details}
                onChange={set("details")}
                aria-invalid={!!errors.details}
                autoComplete="street-address"
                placeholder="Building, street, area"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City" error={errors.city}>
                <select className="input" value={fields.city} onChange={set("city")} autoComplete="address-level2">
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Mobile number" error={errors.phone}>
                <input
                  className="input"
                  type="tel"
                  inputMode="numeric"
                  value={fields.phone}
                  onChange={set("phone")}
                  aria-invalid={!!errors.phone}
                  autoComplete="tel"
                  placeholder="01012345678"
                />
              </Field>
            </div>
          </fieldset>

          <section>
            <h2 className="mb-4 text-lg font-semibold">Payment</h2>
            <div className="flex items-center gap-3 rounded-xl border border-foreground px-4 py-3 text-sm">
              <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
              </span>
              <span className="font-medium">Cash on delivery</span>
              <span className="text-muted">Pay when your order arrives</span>
            </div>
          </section>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary subtotal={subtotal}>
            <ul className="mt-6 space-y-3 border-t border-line pt-6">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 text-sm">
                  <div className="relative">
                    <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-background">
                      <Image src={item.image} alt={item.title} fill sizes="56px" className="object-cover" />
                    </div>
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[11px] text-background">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="text-muted">{item.brand ?? item.category}</p>
                  </div>
                  <p className="tabular-nums">{formatPrice(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy || !ready || !user} className="btn-primary mt-6 w-full">
              {status ?? "Place order"}
            </button>
            <p className="mt-3 text-center text-xs text-muted">Your confirmation shows the final amount to pay on delivery.</p>
          </OrderSummary>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
