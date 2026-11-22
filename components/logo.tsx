/**
 * Nova's identity: the word "nova" with its "o" drawn as a ring and a four-point spark.
 * A nova is a star that suddenly flares, so a spark sits just above the o. It is kept clearly apart from
 * the ring so the pair reads as a sparkle, not as an arrow or symbol.
 */

/** The spark, a four-point star centred on (cx, cy). */
function sparkPath(cx: number, cy: number, r: number) {
  const a = r * 0.12;
  const b = r * 0.3;
  return `M${cx} ${cy - r}C${cx + a} ${cy - b} ${cx + b} ${cy - a} ${cx + r} ${cy}C${cx + b} ${cy + a} ${cx + a} ${cy + b} ${cx} ${cy + r}C${cx - a} ${cy + b} ${cx - b} ${cy + a} ${cx - r} ${cy}C${cx - b} ${cy - a} ${cx - a} ${cy - b} ${cx} ${cy - r}Z`;
}

/** The ring and spark on their own, in currentColor. Used as the "o" in the wordmark. */
export function SparkO({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 32 32" className={className} style={style} aria-hidden>
      <circle cx="14" cy="19" r="8.5" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d={sparkPath(26, 6, 5)} fill="currentColor" />
    </svg>
  );
}

/** App-icon version: the white mark on a coral tile. Used for the chat header and the favicon. */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#ff5a36" />
      <circle cx="13.5" cy="19" r="6.5" fill="none" stroke="#fff" strokeWidth="3.4" />
      <path d={sparkPath(23.5, 8.5, 4.5)} fill="#fff" />
    </svg>
  );
}

/**
 * The wordmark. Text follows light/dark mode through currentColor; the "o" is always coral.
 * `size` is roughly the height of the old icon-plus-text logo, so call sites didn't need to change.
 */
export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label="Nova"
      className={`inline-flex items-center font-semibold tracking-[-0.045em] ${className}`}
      style={{ fontSize: size * 0.95, lineHeight: 1 }}
    >
      <span aria-hidden>n</span>
      <SparkO className="text-accent" style={{ width: "0.94em", height: "0.94em", margin: "0.07em 0.01em 0" }} />
      <span aria-hidden>va</span>
    </span>
  );
}
