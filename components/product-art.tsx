import type { Product } from "@/lib/products";

/** Illustrated product visual, so the store works without external images. */
export function ProductArt({ product, className = "" }: { product: Product; className?: string }) {
  const [from, to] = product.palette;
  const id = `g-${product.slug}`;
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${from}33, ${to}55)` }}
    >
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="168" rx="52" ry="7" fill="#000" opacity="0.08" />
        <Shape shape={product.shape} fill={`url(#${id})`} />
      </svg>
    </div>
  );
}

function Shape({ shape, fill }: { shape: Product["shape"]; fill: string }) {
  switch (shape) {
    case "circle":
      return (
        <>
          <circle cx="100" cy="95" r="55" fill={fill} />
          <circle cx="82" cy="76" r="14" fill="#fff" opacity="0.35" />
        </>
      );
    case "ring":
      return (
        <>
          <circle cx="100" cy="95" r="52" fill="none" stroke={fill} strokeWidth="22" />
          <circle cx="100" cy="95" r="52" fill="none" stroke="#fff" strokeWidth="3" opacity="0.4" strokeDasharray="30 300" />
        </>
      );
    case "pill":
      return (
        <>
          <rect x="58" y="55" width="36" height="90" rx="18" fill={fill} transform="rotate(-12 76 100)" />
          <rect x="106" y="55" width="36" height="90" rx="18" fill={fill} transform="rotate(12 124 100)" />
        </>
      );
    case "square":
      return (
        <>
          <rect x="50" y="45" width="100" height="100" rx="24" fill={fill} />
          <rect x="66" y="61" width="68" height="68" rx="34" fill="#fff" opacity="0.3" />
        </>
      );
    case "arch":
      return (
        <>
          <path d="M50 150 V95 a50 50 0 0 1 100 0 V150 Z" fill={fill} />
          <path d="M75 70 a28 28 0 0 1 50 0" fill="none" stroke="#fff" strokeWidth="6" opacity="0.45" strokeLinecap="round" />
        </>
      );
    case "drop":
      return (
        <>
          <path d="M100 35 C100 35 150 95 150 118 a50 50 0 0 1 -100 0 C50 95 100 35 100 35 Z" fill={fill} />
          <circle cx="82" cy="112" r="10" fill="#fff" opacity="0.35" />
        </>
      );
  }
}
