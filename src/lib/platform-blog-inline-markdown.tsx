import Link from "next/link";
import type { ReactNode } from "react";

type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "link"; label: string; href: string };

const INLINE_PATTERN = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

export function tokenizeInlineMarkdown(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;

  for (const match of text.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      tokens.push({ kind: "text", text: text.slice(cursor, index) });
    }

    if (match[1]) {
      tokens.push({ kind: "bold", text: match[1] });
    } else if (match[2] && match[3]) {
      tokens.push({ kind: "link", label: match[2], href: match[3] });
    }

    cursor = index + match[0].length;
  }

  if (cursor < text.length) {
    tokens.push({ kind: "text", text: text.slice(cursor) });
  }

  return tokens.length > 0 ? tokens : [{ kind: "text", text }];
}

export function renderInlineMarkdown(text: string): ReactNode[] {
  return tokenizeInlineMarkdown(text).map((token, index) => {
    if (token.kind === "bold") {
      return (
        <strong className="font-black text-white" key={`bold-${index}`}>
          {token.text}
        </strong>
      );
    }

    if (token.kind === "link") {
      return (
        <Link
          className="font-black text-[#d6ff58] underline underline-offset-4 transition hover:text-white"
          href={token.href}
          key={`link-${index}`}
          target="_blank"
        >
          {token.label}
        </Link>
      );
    }

    return <span key={`text-${index}`}>{token.text}</span>;
  });
}
