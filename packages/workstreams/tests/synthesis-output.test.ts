import { describe, expect, test, afterEach } from "bun:test";
import { parseSynthesisJsonl, parseSynthesisOutputFile } from "../src/lib/synthesis/output.js";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Synthesis Output Parsing", () => {
  describe("parseSynthesisJsonl", () => {
    test("parses valid JSONL with single text event", () => {
      const input = JSON.stringify({ type: "text", part: { text: "Hello world" } }) + "\n";
      const result = parseSynthesisJsonl(input);
      expect(result.success).toBe(true);
      expect(result.text).toBe("Hello world");
    });

    test("parses valid JSONL with multiple text events (concatenates)", () => {
      const input = 
        JSON.stringify({ type: "text", part: { text: "Hello " } }) + "\n" +
        JSON.stringify({ type: "step_start" }) + "\n" +
        JSON.stringify({ type: "text", part: { text: "world" } }) + "\n";
      
      const result = parseSynthesisJsonl(input);
      expect(result.success).toBe(true);
      expect(result.text).toBe("Hello world");
    });

    test("returns empty string for JSONL with no text events", () => {
      const input = 
        JSON.stringify({ type: "step_start" }) + "\n" +
        JSON.stringify({ type: "step_finish" }) + "\n";
      
      const result = parseSynthesisJsonl(input);
      expect(result.success).toBe(true);
      expect(result.text).toBe("");
    });

    test("handles malformed lines (skips bad lines, logs warning, returns partial success=false)", () => {
      // The implementation sets success=false if any line fails parsing, 
      // but still extracts what it can.
      const input = 
        JSON.stringify({ type: "text", part: { text: "Good part" } }) + "\n" +
        "Wait this is not JSON\n" + 
        JSON.stringify({ type: "text", part: { text: "Another good part" } }) + "\n";
      
      const result = parseSynthesisJsonl(input);
      expect(result.success).toBe(false); // Because of the error
      expect(result.text).toBe("Good partAnother good part");
      expect(result.logs.some(log => log.includes("JSON parse error"))).toBe(true);
    });

    test("handles empty input", () => {
      const result = parseSynthesisJsonl("");
      expect(result.success).toBe(true);
      expect(result.text).toBe("");
    });
  });

  describe("parseSynthesisOutputFile", () => {
    const tempFilePath = join(tmpdir(), `synthesis-test-${Date.now()}.jsonl`);

    afterEach(() => {
      if (existsSync(tempFilePath)) {
        unlinkSync(tempFilePath);
      }
    });

    test("handles file not found", () => {
      const result = parseSynthesisOutputFile("/non/existent/path/to/file.jsonl");
      expect(result.success).toBe(false);
      expect(result.text).toBe("");
      expect(result.logs.some(log => log.includes("File not found"))).toBe(true);
    });

    test("handles empty file", () => {
      writeFileSync(tempFilePath, "");
      const result = parseSynthesisOutputFile(tempFilePath);
      expect(result.success).toBe(true);
      expect(result.text).toBe("");
    });

    test("parses valid file content", () => {
      const content = JSON.stringify({ type: "text", part: { text: "File content" } }) + "\n";
      writeFileSync(tempFilePath, content);
      
      const result = parseSynthesisOutputFile(tempFilePath);
      expect(result.success).toBe(true);
      expect(result.text).toBe("File content");
    });
  });
});
