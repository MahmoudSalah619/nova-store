"use client";

/**
 * An inline script that runs during HTML parsing, before the first paint.
 * On the client it's rendered as text/plain so React doesn't warn about (or re-run) it.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
