import { describe, it, expect } from "vitest";
import { normalizeTitle } from "@/shared/utility/normalizeTitle.ts";

describe("normalizeTitle", () => {
  it("should keep an ordinary filename unchanged", () => {
    expect(normalizeTitle("test.mp3")).toBe("test.mp3");
  });

  it("should trim leading and trailing whitespace", () => {
    expect(normalizeTitle("  my song.mp3  ")).toBe("my song.mp3");
  });

  it("should collapse runs of whitespace into a single space", () => {
    expect(normalizeTitle("my    favorite   song.mp3")).toBe(
      "my favorite song.mp3",
    );
  });

  it("should remove control characters", () => {
    expect(normalizeTitle("bad\u0000title.mp3")).toBe("badtitle.mp3");
  });

  it("should truncate the result to 255 characters", () => {
    const longTitle = "a".repeat(300);

    const result = normalizeTitle(longTitle);

    expect(result).toHaveLength(255);
  });

  it("should return an empty string for whitespace-only input", () => {
    expect(normalizeTitle("   ")).toBe("");
  });
});
