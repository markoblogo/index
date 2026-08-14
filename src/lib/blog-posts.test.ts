import { describe, expect, it } from "vitest";

import { getSortedBlogPosts, getBlogPost } from "@/lib/blog-posts";

describe("spike blog editorial contract", () => {
  it("orders published articles newest-first by publishedAt date", () => {
    const ordered = getSortedBlogPosts();

    expect(ordered.length).toBeGreaterThan(0);
    expect(ordered[0]?.publishedAt).toBe(
      [...ordered]
        .map((post) => post.publishedAt)
        .sort((a, b) => b.localeCompare(a))[0],
    );

    for (let index = 1; index < ordered.length; index += 1) {
      expect(ordered[index - 1]!.publishedAt >= ordered[index]!.publishedAt).toBe(
        true,
      );
    }
  });

  it("preserves public editorial resources on the Headlands article", () => {
    const post = getBlogPost(
      "from-ukrainian-grain-markets-to-a-ukrainian-farming-game",
    );

    expect(post?.resourceLinks).toEqual([
      {
        href: "https://store.steampowered.com/app/4301110/The_Headlands/",
        label: "Steam",
      },
      {
        href: "https://youtu.be/66bVMxlkREc?si=uIewZqricSiuFjAD",
        label: "Trailer",
      },
    ]);
    expect(post?.videoUrl).toBe(
      "https://youtu.be/66bVMxlkREc?si=uIewZqricSiuFjAD",
    );
    expect(post?.videoAfterParagraph).toBe(3);
    expect(post?.subtitle).toContain(
      "everyday realities of running a small Ukrainian farm",
    );
  });
});
