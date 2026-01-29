// src/lib/utils.ts
function resolveByNameOrIndex(input, items, itemType) {
  const trimmed = input.trim();
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 1) {
    const item = items.find((i) => i.id === num);
    if (item)
      return item;
    throw new Error(`${itemType} ${num} not found. Available: ${items.map((i) => i.id).join(", ")}`);
  }
  const lowerInput = trimmed.toLowerCase();
  const exactMatch = items.find((i) => i.name.toLowerCase() === lowerInput);
  if (exactMatch)
    return exactMatch;
  const partialMatches = items.filter((i) => i.name.toLowerCase().includes(lowerInput));
  if (partialMatches.length === 1) {
    return partialMatches[0];
  }
  if (partialMatches.length > 1) {
    throw new Error(`Ambiguous ${itemType} name "${trimmed}". Matches: ${partialMatches.map((i) => `"${i.name}"`).join(", ")}`);
  }
  const availableNames = items.map((i) => `${i.id}: "${i.name}"`).join(", ");
  throw new Error(`${itemType} "${trimmed}" not found. Available: ${availableNames}`);
}
function parseNameOrIndex(input) {
  const trimmed = input.trim();
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 1 && String(num) === trimmed) {
    return { isNumeric: true, numericValue: num, stringValue: trimmed };
  }
  return { isNumeric: false, stringValue: trimmed };
}
function toTitleCase(kebab) {
  return kebab.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function getDateString() {
  return new Date().toISOString().split("T")[0] ?? "";
}
function validateStreamName(name) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name);
}
function parsePositiveInt(value, name) {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1) {
    throw new Error(`${name} must be a positive integer. Got: "${value}"`);
  }
  return num;
}
function statusToCheckbox(status) {
  switch (status) {
    case "completed":
      return "[x]";
    case "in_progress":
      return "[~]";
    case "blocked":
      return "[!]";
    case "cancelled":
      return "[-]";
    default:
      return "[ ]";
  }
}
function parseTaskStatus(line) {
  if (line.includes("[x]") || line.includes("[X]"))
    return "completed";
  if (line.includes("[~]"))
    return "in_progress";
  if (line.includes("[!]"))
    return "blocked";
  if (line.includes("[-]"))
    return "cancelled";
  return "pending";
}
function parseStageStatus(statusText) {
  const lower = statusText.toLowerCase();
  if (lower.includes("complete") || lower.includes("✅"))
    return "complete";
  if (lower.includes("progress") || lower.includes("\uD83D\uDD04"))
    return "in_progress";
  if (lower.includes("blocked") || lower.includes("⚠️"))
    return "blocked";
  return "pending";
}
function setNestedField(obj, path, value) {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0;i < parts.length - 1; i++) {
    const part = parts[i];
    if (!part)
      continue;
    if (!(part in current) || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part];
  }
  const lastPart = parts[parts.length - 1];
  if (!lastPart)
    return;
  current[lastPart] = value;
}
function getNestedField(obj, path) {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return;
    }
    current = current[part];
  }
  return current;
}
function parseValue(value) {
  if (value === "true")
    return true;
  if (value === "false")
    return false;
  if (/^-?\d+$/.test(value))
    return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value))
    return parseFloat(value);
  if (value.startsWith("{") || value.startsWith("[")) {
    try {
      return JSON.parse(value);
    } catch {}
  }
  return value;
}
export {
  validateStreamName,
  toTitleCase,
  statusToCheckbox,
  setNestedField,
  resolveByNameOrIndex,
  parseValue,
  parseTaskStatus,
  parseStageStatus,
  parsePositiveInt,
  parseNameOrIndex,
  getNestedField,
  getDateString
};
