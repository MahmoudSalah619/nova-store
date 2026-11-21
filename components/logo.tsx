import { useId } from "react";

/**
 * Nova's mark: a four-point star bursting from a warm gradient tile.
 * A "nova" is a star that suddenly flares brighter, so the star sits slightly off-center with a small spark beside it.
 */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-bg`} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff8a4c" />
          <stop offset="0.55" stopColor="#ff5a36" />
          <stop offset="1" stopColor="#e8335a" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id}-bg)`} />
      <path
        d="M14.5 6.5C15.2 12.4 17.6 14.8 23.5 15.5C17.6 16.2 15.2 18.6 14.5 24.5C13.8 18.6 11.4 16.2 5.5 15.5C11.4 14.8 13.8 12.4 14.5 6.5Z"
        fill="#fff"
      />
      <circle cx="23" cy="8.5" r="1.9" fill="#fff" fillOpacity="0.9" />
      <circle cx="24.5" cy="23.5" r="1.1" fill="#fff" fillOpacity="0.6" />
    </svg>
  );
}

/** Mark + wordmark. The wordmark uses currentColor, so it follows light and dark mode. */
export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <span className="font-semibold tracking-[-0.04em]" style={{ fontSize: size * 0.78, lineHeight: 1 }}>
        nova
      </span>
    </span>
  );
}
