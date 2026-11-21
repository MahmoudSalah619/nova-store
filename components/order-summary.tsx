import { formatPrice } from "@/lib/format";

/**
 * Shows only what we know for sure: the item total. The store API decides any
 * shipping or tax when the order is placed, and the confirmation shows its final amount.
 */
export function OrderSummary({ subtotal, children }: { subtotal: number; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface p-6">
      <h2 className="text-lg font-semibold">Order summary</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Items</dt>
          <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Shipping & tax</dt>
          <dd className="text-right text-muted">Set by the store at order</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
        </div>
      </dl>
      {children}
    </div>
  );
}
