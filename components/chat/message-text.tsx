import Link from "next/link";
import { Fragment } from "react";

/**
 * Renders the small Markdown subset the assistant is told to use: paragraphs, "- " lists,
 * **bold** and [links](/path). Built from React elements (no HTML injection).
 * Only same-site links become links; anything else is shown as plain text.
 */
export function MessageText({ text, onNavigate }: { text: string; onNavigate?: () => void }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*([-*]|\d+\.)\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-4">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*([-*]|\d+\.)\s+/, ""), onNavigate)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l, onNavigate)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function inline(text: string, onNavigate?: () => void) {
  const parts = text.split(/(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const [, label, href] = link;
      return href.startsWith("/") && !href.startsWith("//") ? (
        <Link key={i} href={href} onClick={onNavigate} className="font-medium text-accent underline underline-offset-2">
          {label}
        </Link>
      ) : (
        <span key={i}>{label}</span>
      );
    }
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}
