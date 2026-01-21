import { describe, it, expect } from "bun:test";
import { formatLabel, getThreadLabels } from "../src/lib/github/labels";
import { DEFAULT_GITHUB_CONFIG } from "../src/lib/github/types";

describe("GitHub Labels", () => {
  it("should format labels", () => {
    expect(formatLabel("prefix:", "value")).toBe("prefix:value");
    expect(formatLabel("", "value")).toBe("value");
    expect(formatLabel("p:", "")).toBe("p:");
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
