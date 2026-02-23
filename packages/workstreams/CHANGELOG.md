# Changelog

All notable changes to `@agenv/workstreams` are documented in this file.

## 0.3.1 - 2026-02-23

- Fixed built CLI runtime import paths so dynamic imports are rewritten from `.ts` to `.js`, resolving module load failures such as `Cannot find module '../lib/repo.ts'` when running commands like `work prompt --stage 6` from the published package.
- Updated prompt and multi-navigator CLI modules to use static imports in key paths, avoiding dist/runtime extension mismatch for dynamically loaded local modules.
- Updated multi-orchestrator grid controller to prefer `dist/bin/work.js` and fall back to `bin/work.ts` only when needed, improving reliability in packaged builds.
- Enhanced `work tasks serialize` to auto-generate prompts after writing `tasks.json`, so prompts are produced in manual serialize flows even when approvals are already in an approved state.
- Added prompt generation result reporting to `work tasks serialize`, including warning output when partial prompt generation failures occur.
