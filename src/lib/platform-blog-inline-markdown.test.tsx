import { describe, expect, it } from "vitest";

import { tokenizeInlineMarkdown } from "@/lib/platform-blog-inline-markdown";

describe("tokenizeInlineMarkdown", () => {
  it("extracts external links and bold spans from 1D3X blog paragraphs", () => {
    expect(
      tokenizeInlineMarkdown(
        "We started with the **SPIKE Spot Index** at [spike.1d3x.com](https://spike.1d3x.com/).",
      ),
    ).toEqual([
      { kind: "text", text: "We started with the " },
      { kind: "bold", text: "SPIKE Spot Index" },
      { kind: "text", text: " at " },
      { kind: "link", label: "spike.1d3x.com", href: "https://spike.1d3x.com/" },
      { kind: "text", text: "." },
    ]);
  });
});
