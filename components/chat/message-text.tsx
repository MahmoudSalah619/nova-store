import Link from "next/link";
import { Fragment } from "react";
import { type Inline, parseMarkdown } from "./markdown";

/**
 * Renders an assistant reply from the Markdown tree in markdown.ts. Built from React elements only
 * (no HTML injection), and only same-site links become links.
 */
export function MessageText({ text, onNavigate }: { text: string; onNavigate?: () => void }) {
  const inline = (nodes: Inline[]) => <Inlines nodes={nodes} onNavigate={onNavigate} />;

  return (
    <div className="space-y-2">
      {parseMarkdown(text).map((block, i) => {
        switch (block.type) {
          case "heading":
            return (
              <p key={i} className="pt-1 font-semibold">
                {inline(block.children)}
              </p>
            );
          case "list": {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List key={i} className={`space-y-1 pl-4 ${block.ordered ? "list-decimal" : "list-disc"}`}>
                {block.items.map((item, j) => (
                  <li key={j}>{inline(item)}</li>
                ))}
              </List>
            );
          }
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface">
                    <tr>
                      {block.header.map((cell, j) => (
                        <th key={j} className="px-2 py-1.5 font-semibold">
                          {inline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {block.rows.map((row, j) => (
                      <tr key={j}>
                        {row.map((cell, k) => (
                          <td key={k} className="px-2 py-1.5 align-top">
                            {inline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return (
              <p key={i}>
                {block.lines.map((line, j) => (
                  <Fragment key={j}>
                    {j > 0 && <br />}
                    {inline(line)}
                  </Fragment>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}

function Inlines({ nodes, onNavigate }: { nodes: Inline[]; onNavigate?: () => void }) {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return <Fragment key={i}>{node.text}</Fragment>;
      case "code":
        return (
          <code key={i} className="rounded bg-surface px-1 py-0.5 text-[0.9em]">
            {node.text}
          </code>
        );
      case "bold":
        return (
          <strong key={i} className="font-semibold">
            <Inlines nodes={node.children} onNavigate={onNavigate} />
          </strong>
        );
      case "italic":
        return (
          <em key={i}>
            <Inlines nodes={node.children} onNavigate={onNavigate} />
          </em>
        );
      case "link":
        return node.href ? (
          <Link key={i} href={node.href} onClick={onNavigate} className="font-medium text-accent underline underline-offset-2">
            <Inlines nodes={node.children} onNavigate={onNavigate} />
          </Link>
        ) : (
          <span key={i}>
            <Inlines nodes={node.children} onNavigate={onNavigate} />
          </span>
        );
    }
  });
}
