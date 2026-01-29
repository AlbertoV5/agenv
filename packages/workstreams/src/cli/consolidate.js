import { createRequire } from "node:module";
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// src/cli/consolidate.ts
function main(_argv = process.argv) {
  console.error("Error: 'work consolidate' has been removed.");
  console.error("");
  console.error("Use instead:");
  console.error("  work validate plan   - Validate PLAN.md structure");
  console.error("  work check plan      - Find unchecked items with line numbers");
  console.error("  work review plan     - Output full PLAN.md content");
  process.exit(1);
}
if (__require.main == __require.module) {
  main();
}
export {
  main
};
