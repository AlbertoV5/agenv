/**
 * @agenv/workstreams - Workstream management library for AI agents
 *
 * This package provides tools for creating, tracking, and completing
 * implementation workstreams within git repositories.
 */

// Types
export * from "./lib/types.ts"

// Repository utilities
export {
  findRepoRoot,
  getRepoRoot,
  getWorkDir,
  getIndexPath,
} from "./lib/repo.ts"

// Index operations
export {
  getOrCreateIndex,
  loadIndex,
  saveIndex,
  saveIndexSafe,
  modifyIndex,
  findStream,
  getStream,
  getNextOrderNumber,
  formatOrderNumber,
  deleteStream,
  atomicWriteFile,
  // Current stream operations
  getCurrentStreamId,
  getCurrentStream,
  setCurrentStream,
  clearCurrentStream,
  resolveStreamId,
  getResolvedStream,
  // Stream status
  setStreamStatus,
  type DeleteStreamOptions,
  type DeleteStreamResult,
} from "./lib/index.ts"

// Utility functions
export {
  toTitleCase,
  getDateString,
  validateStreamName,
  parsePositiveInt,
  statusToCheckbox,
  parseTaskStatus,
  parseStageStatus,
  setNestedField,
  getNestedField,
  parseValue,
} from "./lib/utils.ts"

// Stream generation
export {
  generateStream,
  createGenerateArgs,
  type GenerateStreamArgs,
  type GenerateStreamResult,
} from "./lib/generate.ts"

// Status and progress
export {
  getStreamProgress,
  formatProgress,
  computeStreamStatus,
  getStreamStatus,
  formatStreamStatusIcon,
} from "./lib/status.ts"

// Task updates
export {
  parseTaskId,
  updateTask,
  type UpdateTaskArgs,
  type UpdateTaskResult,
} from "./lib/update.ts"

// Stream completion
export {
  completeStream,
  updateIndexField,
  formatStreamInfo,
  type CompleteStreamArgs,
  type CompleteStreamResult,
  type UpdateIndexFieldArgs,
  type UpdateIndexFieldResult,
} from "./lib/complete.ts"

// ============================================
// EXPORTS FOR PLAN.md + tasks.json SYSTEM
// ============================================

// Task operations (tasks.json)
export {
  getTasksFilePath,
  createEmptyTasksFile,
  readTasksFile,
  writeTasksFile,
  getTaskById,
  getTasks,
  updateTaskStatus,
  addTasks,
  getTaskCounts,
  groupTasksByStageAndThread,
  formatTaskId,
  deleteTask,
  deleteTasksByStage,
  deleteTasksByThread,
} from "./lib/tasks.ts"

// PLAN.md parsing
export {
  parseStreamDocument,
  getStreamPreview,
} from "./lib/stream-parser.ts"

// Consolidation (PLAN.md → tasks.json)
export {
  getStreamPlanMdPath,
  consolidateStream,
  formatConsolidateResult,
} from "./lib/consolidate.ts"

// Metrics and evaluation
export {
  evaluateStream,
  evaluateAllStreams,
  filterTasks,
  filterTasksByStatus,
  analyzeBlockers,
  formatMetricsOutput,
  formatBlockerAnalysis,
  aggregateMetrics,
} from "./lib/metrics.ts"

// Document generation and export
export {
  generateReport,
  formatReportMarkdown,
  generateChangelog,
  formatChangelogMarkdown,
  exportStreamAsCSV,
  exportStreamAsJSON,
  exportStreamAsMarkdown,
  exportStream,
  generateSummary,
} from "./lib/document.ts"

// Prompt generation
export {
  generateAllPrompts,
  getPromptContext,
  generateThreadPrompt,
  generateThreadPromptJson,
  parseThreadId,
  formatThreadId,
  type GeneratePromptsResult,
  type PromptContext,
  type ThreadId,
  type GeneratePromptOptions,
} from "./lib/prompts.ts"
