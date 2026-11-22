/**
 * Navbar icon buttons grow into a pill and reveal their label on hover or keyboard focus.
 * Touch screens have no hover, so phones keep the compact icons.
 */

/** Base classes for the button/link. Add colours per use. Height 40px; 11px padding centres an 18px icon. */
export const navIconClass =
  "group relative flex h-10 items-center rounded-full px-[11px] transition-colors duration-500 outline-none focus-visible:ring-2 focus-visible:ring-foreground/30";

/** The label that slides out next to the icon. */
export function HoverLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-[max-width,margin,opacity] duration-700 ease-in-out group-hover:ml-2 group-hover:max-w-24 group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-24 group-focus-visible:opacity-100 motion-reduce:transition-none"
    >
      {children}
    </span>
  );
}
