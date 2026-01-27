import { describe, it, expect } from "bun:test";
import { formatLabel, sanitizeLabelName } from "../src/lib/github/labels";

describe("GitHub Labels", () => {
  describe("sanitizeLabelName", () => {
    it("should remove commas", () => {
      expect(sanitizeLabelName("Parser, Skill, and Session")).toBe("Parser Skill and Session");
    });

    it("should normalize whitespace", () => {
      expect(sanitizeLabelName("foo  bar   baz")).toBe("foo bar baz");
    });

    it("should trim leading and trailing whitespace", () => {
      expect(sanitizeLabelName("  hello world  ")).toBe("hello world");
    });

    it("should handle multiple commas and whitespace together", () => {
      // Commas are removed, then whitespace is normalized
      expect(sanitizeLabelName("a, b,  c, d")).toBe("a b c d");
      expect(sanitizeLabelName("a,b,c")).toBe("abc"); // No spaces to normalize
    });

    it("should return empty string for empty input", () => {
      expect(sanitizeLabelName("")).toBe("");
    });
  });

  it("should format labels and sanitize values", () => {
    expect(formatLabel("prefix:", "value")).toBe("prefix:value");
    expect(formatLabel("", "value")).toBe("value");
    expect(formatLabel("p:", "")).toBe("p:");
    // Should sanitize commas
    expect(formatLabel("batch:", "01.02-Parser, Skill, and Session")).toBe("batch:01.02-Parser Skill and Session");
  });

  it("should truncate labels longer than 50 characters", () => {
    const longValue = "this-is-a-very-long-label-name-that-exceeds-the-fifty-char-limit";
    const result = formatLabel("prefix:", longValue);
    expect(result.length).toBe(50);
    expect(result.startsWith("prefix:")).toBe(true);
  });
});
