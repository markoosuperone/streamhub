import { describe, it, expect } from "vitest";
import { toContainsPattern } from "@/shared/utility/likePattern.ts";

describe("toContainsPattern", () => {
  it("should wrap an ordinary term in wildcards", () => {
    expect(toContainsPattern("song")).toBe("%song%");
  });

  it("should escape a percent sign so it matches literally", () => {
    expect(toContainsPattern("100%")).toBe("%100\\%%");
  });

  it("should escape an underscore so it does not match any character", () => {
    expect(toContainsPattern("a_b")).toBe("%a\\_b%");
  });

  // The backslash is LIKE's own escape character, so leaving it unescaped would
  // let a term ending in one escape the wildcard the pattern appends.
  it("should escape a backslash", () => {
    expect(toContainsPattern("a\\b")).toBe("%a\\\\b%");
  });

  it("should escape every special character in a term", () => {
    expect(toContainsPattern("%_\\")).toBe("%\\%\\_\\\\%");
  });

  it("should leave an empty term as a bare pair of wildcards", () => {
    expect(toContainsPattern("")).toBe("%%");
  });
});
