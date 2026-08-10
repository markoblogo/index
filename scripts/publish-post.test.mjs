import { describe, expect, it } from "vitest";

import { insertIntoArray, objectLiteral, postObject } from "./publish-post.mjs";

describe("publish-post insertion", () => {
  it("does not emit a duplicate comma when the last entry already has one", () => {
    const source = `export const spikeBlogPosts = [
  {
    slug: "existing",
  },
];
`;

    const inserted = insertIntoArray(
      source,
      "spikeBlogPosts",
      objectLiteral({ slug: "new-post", title: "New post" }),
    );

    expect(inserted).toContain('slug: "existing"');
    expect(inserted).toContain('"slug": "new-post"');
    expect(inserted).not.toContain("},,");
  });

  it("maps SSI editorial fields from the packet payload", () => {
    const post = postObject("ssi", {
      title: "Title",
      slug: "title",
      enrichment: {
        date_published: "2026-08-10",
        meta_description: "meta",
        seo_title: "seo",
        tags: ["one"],
      },
      payload: {
        body_lines: ["Paragraph one.", "Paragraph two."],
        cover_image: "/blog/example.jpg",
        excerpt: "Deck line",
        external_links: [{ label: "Steam", href: "https://example.com" }],
        language: "en",
        subtitle: "Deck line",
        video_label: "Watch the trailer",
        video_url: "https://youtu.be/example",
      },
    });

    expect(post.subtitle).toBe("Deck line");
    expect(post.resourceLinks).toEqual([
      { label: "Steam", href: "https://example.com" },
    ]);
    expect(post.videoLabel).toBe("Watch the trailer");
    expect(post.videoUrl).toBe("https://youtu.be/example");
  });
});
