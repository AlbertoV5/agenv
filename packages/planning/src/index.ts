/**
 * @agenv/planning - Plan management library for AI agents
 *
 * This package provides tools for creating, tracking, and completing
 * implementation plans within git repositories.
 */

// Types
export * from "./lib/types.ts"

// Repository utilities
export {
  findRepoRoot,
  getRepoRoot,
  getPlansDir,
  getIndexPath,
} from "./lib/repo.ts"

// Index operations
export {
  getOrCreateIndex,
  loadIndex,
  saveIndex,
  findPlan,
  getPlan,
  getNextOrderNumber,
  formatOrderNumber,
} from "./lib/index.ts"

// Utility functions
export {
  toTitleCase,
  getDateString,
  validatePlanName,
  parsePositiveInt,
  statusToCheckbox,
  parseTaskStatus,
  parseStageStatus,
  setNestedField,
  getNestedField,
  parseValue,
} from "./lib/utils.ts"

// Plan generation
export {
  generatePlan,
  createGenerateArgs,
  type GeneratePlanArgs,
  type GeneratePlanResult,
} from "./lib/generate.ts"

// Status and progress
export {
  parseTasksFromContent,
  parseShortPlan,
  parseMediumPlan,
  parseLongPlan,
  getPlanProgress,
  formatProgress,
} from "./lib/status.ts"

// Task updates
export {
  parseTaskId,
  updateTask,
  type UpdateTaskArgs,
  type UpdateTaskResult,
} from "./lib/update.ts"

// Plan completion
export {
  completePlan,
  updateIndexField,
  formatPlanInfo,
  type CompletePlanArgs,
  type CompletePlanResult,
  type UpdateIndexFieldArgs,
  type UpdateIndexFieldResult,
} from "./lib/complete.ts"
