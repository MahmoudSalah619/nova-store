"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "@/components/account-provider";
import { formatPrice } from "@/lib/format";
import { API_BASE, type Order } from "@/lib/types";

export default function OrdersPage() {
  const { user, ready } = useAccount();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setOrders(null);
    setError(null);
    fetch(`${API_BASE}/orders/user/${user.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Couldn't load your orders (${res.status})`);
        const data: Order[] = await res.json();
        if (!cancelled) setOrders([...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">My orders</h1>

      {!ready || (user && !orders && !error) ? (
        <div className="mt-8 space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : !user ? (
        <Empty title="Sign in to see your orders." body="Your order history is kept on your account.">
          <Link href="/login?next=/orders" className="btn-primary mt-6">
            Sign in
          </Link>
        </Empty>
      ) : error ? (
        <Empty title="Something went wrong." body={error}>
          <button onClick={() => location.reload()} className="btn-primary mt-6">
            Try again
          </button>
        </Empty>
      ) : orders!.length === 0 ? (
        <Empty title="No orders yet." body="When you place an order, it shows up here.">
          <Link href="/shop" className="btn-primary mt-6">
            Start shopping
          </Link>
        </Empty>
      ) : (
        <ul className="mt-8 space-y-6">
          {orders!.map((o) => (
            <OrderCard key={o._id} order={o} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const date = new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const items = order.cartItems.reduce((n, i) => n + i.count, 0);

  return (
    <li className="overflow-hidden rounded-2xl border border-line">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface px-5 py-4 text-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <p>
            <span className="text-muted">Order </span>
            <span className="font-medium">#{order.id}</span>
          </p>
          <p className="text-muted">{date}</p>
          <p className="text-muted">
            {items} {items === 1 ? "item" : "items"}
          </p>
        </div>
        <div className="flex gap-2">
          <Status ok={order.isPaid} yes="Paid" no={order.paymentMethodType === "cash" ? "Pay on delivery" : "Unpaid"} />
          <Status ok={order.isDelivered} yes="Delivered" no="Processing" />
        </div>
      </div>

      <ul className="divide-y divide-line">
        {order.cartItems.map((item) => (
          <li key={item._id} className="flex items-center gap-4 px-5 py-4">
            <Link href={`/product/${item.product._id}`} className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-surface">
              <Image src={item.product.imageCover} alt={item.product.title} fill sizes="56px" className="object-cover" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/product/${item.product._id}`} className="line-clamp-1 font-medium hover:underline">
                {item.product.title}
              </Link>
              <p className="text-sm text-muted">
                {item.count} × {formatPrice(item.price)}
              </p>
            </div>
            <p className="text-sm font-medium tabular-nums">{formatPrice(item.count * item.price)}</p>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line px-5 py-4 text-sm">
        {order.shippingAddress ? (
          <p className="text-muted">
            Ship to {order.shippingAddress.details}, {order.shippingAddress.city}
          </p>
        ) : (
          <span />
        )}
        <p>
          <span className="text-muted">Total </span>
          <span className="text-base font-semibold">{formatPrice(order.totalOrderPrice)}</span>
        </p>
      </div>
    </li>
  );
}

function Status({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        ok ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"
      }`}
    >
      {ok ? yes : no}
    </span>
  );
}

function Empty({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-2xl bg-surface px-6 py-16 text-center">
      <p className="text-lg font-medium">{title}</p>
      <p className="mt-1 text-muted">{body}</p>
      {children}
    </div>
  );
}
