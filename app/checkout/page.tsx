"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { OrderSummary } from "@/components/order-summary";
import { ProductArt } from "@/components/product-art";
import { formatPrice, orderTotals } from "@/lib/products";

type Fields = {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
};

const empty: Fields = {
  email: "",
  firstName: "",
  lastName: "",
  address: "",
  city: "",
  zip: "",
  country: "United States",
  cardName: "",
  cardNumber: "",
  expiry: "",
  cvc: "",
};

function validate(f: Fields) {
  const e: Partial<Record<keyof Fields, string>> = {};
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email";
  if (!f.firstName.trim()) e.firstName = "Required";
  if (!f.lastName.trim()) e.lastName = "Required";
  if (!f.address.trim()) e.address = "Required";
  if (!f.city.trim()) e.city = "Required";
  if (!f.zip.trim()) e.zip = "Required";
  if (!f.cardName.trim()) e.cardName = "Required";
  if (f.cardNumber.replace(/\s/g, "").length < 12) e.cardNumber = "Enter a card number";
  if (!/^\d{2}\s?\/\s?\d{2}$/.test(f.expiry)) e.expiry = "MM / YY";
  if (!/^\d{3,4}$/.test(f.cvc)) e.cvc = "3–4 digits";
  return e;
}

export default function CheckoutPage() {
  const { items, subtotal, ready, clear } = useCart();
  const [fields, setFields] = useState<Fields>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<{ id: string; email: string; total: number } | null>(null);

  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    if (key === "cardNumber") value = value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
    if (key === "expiry") {
      const d = value.replace(/\D/g, "").slice(0, 4);
      value = d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
    }
    if (key === "cvc") value = value.replace(/\D/g, "").slice(0, 4);
    setFields((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(fields);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900)); // simulate payment processing
    setOrder({
      id: `NV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      email: fields.email,
      total: orderTotals(subtotal).total,
    });
    clear();
    setSubmitting(false);
    window.scrollTo({ top: 0 });
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
          Order <span className="font-medium text-foreground">{order.id}</span> is confirmed. A receipt for{" "}
          {formatPrice(order.total)} will be sent to {order.email}.
        </p>
        <Link href="/shop" className="btn-primary mt-8">
          Keep shopping
        </Link>
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

  const field = (key: keyof Fields, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="mb-1.5 block text-sm">{label}</span>
      <input
        className="input"
        value={fields[key]}
        onChange={set(key)}
        aria-invalid={!!errors[key]}
        {...props}
      />
      {errors[key] && <span className="mt-1 block text-xs text-red-600">{errors[key]}</span>}
    </label>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <Link href="/cart" className="text-sm text-muted hover:text-foreground">
        ← Back to cart
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Checkout</h1>

      <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <fieldset className="space-y-4">
            <legend className="mb-4 text-lg font-semibold">Contact</legend>
            {field("email", "Email", { type: "email", autoComplete: "email", placeholder: "you@example.com" })}
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-4 text-lg font-semibold">Shipping address</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("firstName", "First name", { autoComplete: "given-name" })}
              {field("lastName", "Last name", { autoComplete: "family-name" })}
            </div>
            {field("address", "Address", { autoComplete: "street-address" })}
            <div className="grid gap-4 sm:grid-cols-3">
              {field("city", "City", { autoComplete: "address-level2" })}
              {field("zip", "ZIP / Postal code", { autoComplete: "postal-code" })}
              <label className="block">
                <span className="mb-1.5 block text-sm">Country</span>
                <select className="input" value={fields.country} onChange={set("country")} autoComplete="country-name">
                  {["United States", "Canada", "United Kingdom", "Germany", "Egypt", "Australia"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-1 text-lg font-semibold">Payment</legend>
            <p className="text-sm text-muted">Demo store — no payment is processed and nothing is stored.</p>
            {field("cardName", "Name on card", { autoComplete: "cc-name" })}
            {field("cardNumber", "Card number", { inputMode: "numeric", placeholder: "1234 1234 1234 1234" })}
            <div className="grid grid-cols-2 gap-4">
              {field("expiry", "Expiry", { inputMode: "numeric", placeholder: "MM / YY" })}
              {field("cvc", "CVC", { inputMode: "numeric", placeholder: "123" })}
            </div>
          </fieldset>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary subtotal={subtotal}>
            <ul className="mt-6 space-y-3 border-t border-line pt-6">
              {items.map((item) => (
                <li key={`${item.slug}-${item.color}`} className="flex items-center gap-3 text-sm">
                  <div className="relative">
                    <ProductArt product={item.product} className="h-14 w-14 rounded-lg" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[11px] text-background">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.product.name}</p>
                    <p className="text-muted">{item.color}</p>
                  </div>
                  <p className="tabular-nums">{formatPrice(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <button type="submit" disabled={submitting || !ready} className="btn-primary mt-6 w-full">
              {submitting ? "Placing order…" : `Pay ${formatPrice(orderTotals(subtotal).total)}`}
            </button>
          </OrderSummary>
        </div>
      </form>
    </div>
  );
}
