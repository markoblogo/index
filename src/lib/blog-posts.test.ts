import { describe, expect, it } from "vitest";

import { getSortedBlogPosts, getBlogPost } from "@/lib/blog-posts";

describe("spike blog editorial contract", () => {
  it("orders newest published article first", () => {
    const ordered = getSortedBlogPosts();
    expect(ordered[0]?.slug).toBe(
      "from-ukrainian-grain-markets-to-a-ukrainian-farming-game",
    );
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
    expect(post?.subtitle).toContain("everyday realities of running a small Ukrainian farm");
  });
});
