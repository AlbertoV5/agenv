// src/lib/session-export.ts
import { exec } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);
function isTextPart(part) {
  return part.type === "text";
}
function isToolPart(part) {
  return part.type === "tool";
}
async function exportSession(sessionId) {
  if (!sessionId || typeof sessionId !== "string") {
    throw new Error("Invalid session ID: must be a non-empty string");
  }
  const sanitizedId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (sanitizedId !== sessionId) {
    throw new Error("Invalid session ID: contains invalid characters");
  }
  try {
    const { stdout } = await execAsync(`opencode export "${sanitizedId}"`, {
      maxBuffer: 50 * 1024 * 1024
    });
    const exportData = JSON.parse(stdout);
    if (!exportData.info || !Array.isArray(exportData.messages)) {
      throw new Error("Invalid export format: missing info or messages");
    }
    return exportData;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse session export JSON: ${error.message}`);
    }
    if (error instanceof Error) {
      throw new Error(`Failed to export session: ${error.message}`);
    }
    throw new Error("Failed to export session: unknown error");
  }
}
function extractTextMessages(exportData) {
  if (!exportData) {
    return "";
  }
  if (!exportData.messages || !Array.isArray(exportData.messages)) {
    return "";
  }
  const assistantMessages = exportData.messages.filter((msg) => msg?.info?.role === "assistant");
  if (assistantMessages.length === 0) {
    return "";
  }
  const textParts = [];
  for (const message of assistantMessages) {
    if (!message.parts || !Array.isArray(message.parts)) {
      continue;
    }
    const messageTexts = message.parts.filter((part) => isTextPart(part)).map((part) => part.text).filter((text) => text && typeof text === "string" && text.trim() !== "");
    if (messageTexts.length > 0) {
      textParts.push(messageTexts.join(`
`));
    }
  }
  if (textParts.length === 0) {
    return "";
  }
  return textParts.join(`

`);
}
async function exportAndExtractText(sessionId) {
  const exportData = await exportSession(sessionId);
  return extractTextMessages(exportData);
}
export {
  isToolPart,
  isTextPart,
  extractTextMessages,
  exportSession,
  exportAndExtractText
};
