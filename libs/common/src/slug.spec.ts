import { createSlug } from "./slug";

describe("createSlug", () => {
  it("normalizes titles into URL-safe slugs", () => {
    expect(createSlug("The Global Book Platform: 2026 Edition")).toBe("the-global-book-platform-2026-edition");
  });
});
