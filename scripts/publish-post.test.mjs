import { describe, expect, it } from "vitest";

import { insertIntoArray, objectLiteral } from "./publish-post.mjs";

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
});
