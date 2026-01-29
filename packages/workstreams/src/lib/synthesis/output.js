// src/lib/synthesis/output.ts
import { readFileSync, appendFileSync, existsSync } from "node:fs";
function parseSynthesisJsonl(content) {
  const logs = [];
  const textParts = [];
  let success = true;
  logs.push(`Starting JSONL parse (${content.length} bytes)`);
  const lines = content.split(`
`).filter((line) => line.trim() !== "");
  logs.push(`Found ${lines.length} non-empty lines`);
  for (let i = 0;i < lines.length; i++) {
    const line = lines[i];
    if (!line)
      continue;
    try {
      const event = JSON.parse(line);
      if (event.type === "text") {
        const textEvent = event;
        if (textEvent.part?.text) {
          textParts.push(textEvent.part.text);
          logs.push(`Line ${i + 1}: Extracted text (${textEvent.part.text.length} chars)`);
        } else {
          logs.push(`Line ${i + 1}: Text event missing part.text field`);
        }
      } else {
        logs.push(`Line ${i + 1}: Skipped event type "${event.type}"`);
      }
    } catch (error) {
      logs.push(`Line ${i + 1}: JSON parse error - ${error instanceof Error ? error.message : String(error)}`);
      success = false;
    }
  }
  const text = textParts.join("");
  logs.push(`Parsing complete: ${textParts.length} text parts, ${text.length} total chars`);
  return {
    text,
    logs,
    success
  };
}
function parseSynthesisOutputFile(filePath, logPath) {
  const logs = [];
  try {
    if (!existsSync(filePath)) {
      logs.push(`ERROR: File not found: ${filePath}`);
      return {
        text: "",
        logs,
        success: false
      };
    }
    logs.push(`Reading file: ${filePath}`);
    const content = readFileSync(filePath, "utf-8");
    logs.push(`Read ${content.length} bytes`);
    const result = parseSynthesisJsonl(content);
    const allLogs = [...logs, ...result.logs];
    if (logPath) {
      try {
        const logContent = allLogs.join(`
`) + `
`;
        appendFileSync(logPath, logContent);
        allLogs.push(`Debug logs written to: ${logPath}`);
      } catch (error) {
        allLogs.push(`WARNING: Failed to write logs to ${logPath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return {
      text: result.text,
      logs: allLogs,
      success: result.success
    };
  } catch (error) {
    logs.push(`ERROR: Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
    return {
      text: "",
      logs,
      success: false
    };
  }
}
export {
  parseSynthesisOutputFile,
  parseSynthesisJsonl
};
