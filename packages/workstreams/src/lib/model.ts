/**
 * Model utilities
 */

/**
 * Validate that model follows provider/model format.
 */
export function isValidModelFormat(model: string): boolean {
  return model.includes("/")
}
