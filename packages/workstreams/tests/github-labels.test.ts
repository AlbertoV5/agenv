import { describe, it, expect } from "bun:test";
import { formatLabel, getThreadLabels, sanitizeLabelName } from "../src/lib/github/labels";
import { DEFAULT_GITHUB_CONFIG } from "../src/lib/github/types";

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

  it("should get thread labels with default config", () => {
    const labels = getThreadLabels(
      DEFAULT_GITHUB_CONFIG,
      "my-stream",
      "01", "Core",
      "01.01", "Setup"
    );
    
    expect(labels).toHaveLength(3);
    expect(labels[0]).toBe("stream:my-stream");
    expect(labels[1]).toBe("stage:01-Core");
    expect(labels[2]).toBe("batch:01.01-Setup");
  });

  it("should respect custom config prefixes", () => {
    const config = JSON.parse(JSON.stringify(DEFAULT_GITHUB_CONFIG));
    config.label_config.workstream.prefix = "ws-";
    config.label_config.stage.prefix = "stg-";
    config.label_config.batch.prefix = "btc-";

    const labels = getThreadLabels(
      config,
      "my-stream",
      "01", "Core",
      "01.01", "Setup"
    );
    
    expect(labels).toHaveLength(3);
    expect(labels[0]).toBe("ws-my-stream");
    expect(labels[1]).toBe("stg-01-Core");
    expect(labels[2]).toBe("btc-01.01-Setup");
  });
});
