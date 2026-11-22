/**
 * A small, safe Markdown parser for assistant replies. It returns a plain tree that
 * message-text.tsx renders with React elements, so no HTML from the model ever reaches the page.
 *
 * Supported: paragraphs, headings, "-"/"*" and numbered lists, simple tables,
 * **bold**, *italic*, `code` and [links](/path). Inline marks can nest (a link inside bold, bold inside a link).
 */

export type Inline =
  | { type: "text"; text: string }
  | { type: "bold" | "italic"; children: Inline[] }
  | { type: "code"; text: string }
  /** href is null for links that leave the site: they render as plain text. */
  | { type: "link"; href: string | null; children: Inline[] };

export type Block =
  | { type: "p"; lines: Inline[][] }
  | { type: "heading"; children: Inline[] }
  | { type: "list"; ordered: boolean; items: Inline[][] }
  | { type: "table"; header: Inline[][]; rows: Inline[][][] };

const LIST_ITEM = /^\s*(?:[-*•]|(\d+)[.)])\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*?)\s*#*\s*$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;

export function parseMarkdown(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: Inline[][] | null = null;
  let table: { header: Inline[][]; rows: Inline[][][] } | null = null;

  const endParagraph = () => {
    if (paragraph?.length) blocks.push({ type: "p", lines: paragraph });
    paragraph = null;
  };
  const endTable = () => {
    if (table) blocks.push({ type: "table", ...table });
    table = null;
  };

  for (const line of text.replace(/\r\n?/g, "\n").trim().split("\n")) {
    if (!TABLE_ROW.test(line)) endTable();

    if (!line.trim() || RULE.test(line)) {
      endParagraph();
      continue;
    }

    if (TABLE_ROW.test(line)) {
      endParagraph();
      if (TABLE_DIVIDER.test(line)) continue;
      const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => parseInline(c.trim()));
      if (!table) table = { header: cells, rows: [] };
      else table.rows.push(cells);
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      endParagraph();
      blocks.push({ type: "heading", children: parseInline(heading[1]) });
      continue;
    }

    const item = line.match(LIST_ITEM);
    if (item) {
      endParagraph();
      const ordered = item[1] !== undefined;
      const last = blocks[blocks.length - 1];
      if (last?.type === "list" && last.ordered === ordered) last.items.push(parseInline(item[2]));
      else blocks.push({ type: "list", ordered, items: [parseInline(item[2])] });
      continue;
    }

    (paragraph ??= []).push(parseInline(line.trim()));
  }
  endTable();
  endParagraph();
  return blocks;
}

// One pass finds the next mark of any kind. Link labels may contain one level of [brackets].
const INLINE =
  /\[((?:[^[\]]|\[[^[\]]*\])+)\]\(\s*<?([^()\s<>]+)>?\s*\)|\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`|(?<![*\w])\*(?![\s*])(.+?)(?<!\s)\*(?!\*)|(?<!\w)_(?![\s_])(.+?)(?<!\s)_(?!\w)/;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let rest = text;
  while (rest) {
    const m = rest.match(INLINE);
    if (!m || m.index === undefined) {
      out.push({ type: "text", text: rest });
      break;
    }
    if (m.index > 0) out.push({ type: "text", text: rest.slice(0, m.index) });
    const [whole, label, href, bold, boldU, code, italic, italicU] = m;
    if (label !== undefined) out.push({ type: "link", href: isSameSite(href) ? href : null, children: parseInline(label) });
    else if (bold !== undefined || boldU !== undefined) out.push({ type: "bold", children: parseInline(bold ?? boldU) });
    else if (code !== undefined) out.push({ type: "code", text: code });
    else out.push({ type: "italic", children: parseInline(italic ?? italicU) });
    rest = rest.slice(m.index + whole.length);
  }
  return out;
}

/** Only links to pages on this site are clickable. */
function isSameSite(href: string) {
  return href.startsWith("/") && !href.startsWith("//") && !href.includes("\\");
}
