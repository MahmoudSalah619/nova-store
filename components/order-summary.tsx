import { formatPrice, orderTotals, SHIPPING_FREE_OVER } from "@/lib/products";

export function OrderSummary({ subtotal, children }: { subtotal: number; children?: React.ReactNode }) {
  const { shipping, tax, total } = orderTotals(subtotal);
  const remaining = SHIPPING_FREE_OVER - subtotal;

  return (
    <div className="rounded-2xl bg-surface p-6">
      <h2 className="text-lg font-semibold">Order summary</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <Row label="Subtotal" value={formatPrice(subtotal)} />
        <Row label="Shipping" value={shipping === 0 ? "Free" : formatPrice(shipping)} />
        <Row label="Estimated tax" value={formatPrice(tax)} />
        <div className="border-t border-line pt-3">
          <Row label="Total" value={formatPrice(total)} strong />
        </div>
      </dl>
      {subtotal > 0 && remaining > 0 && (
        <p className="mt-4 rounded-lg bg-background px-3 py-2 text-xs text-muted">
          Add {formatPrice(remaining)} more for free shipping.
        </p>
      )}
      {children}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-base font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
