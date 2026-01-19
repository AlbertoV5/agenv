/**
 * Approval gate logic for workstreams
 *
 * Implements the Human-In-The-Loop (HITL) approval workflow:
 * - Plans must be approved before tasks can be created
 * - Approval includes a hash of PLAN.md for modification detection
 * - If PLAN.md changes after approval, the approval is auto-revoked
 */

import { createHash } from "crypto"
import { existsSync, readFileSync } from "fs"
import { join } from "path"
import type { ApprovalStatus, ApprovalMetadata, StreamMetadata, WorkIndex } from "./types.ts"
import { loadIndex, saveIndex, getStream } from "./index.ts"
import { getWorkDir } from "./repo.ts"

/**
 * Get the path to PLAN.md for a workstream
 */
export function getPlanMdPath(repoRoot: string, streamId: string): string {
  const workDir = getWorkDir(repoRoot)
  return join(workDir, streamId, "PLAN.md")
}

/**
 * Compute SHA-256 hash of PLAN.md content for modification detection
 */
export function computePlanHash(repoRoot: string, streamId: string): string | null {
  const planPath = getPlanMdPath(repoRoot, streamId)

  if (!existsSync(planPath)) {
    return null
  }

  const content = readFileSync(planPath, "utf-8")
  return createHash("sha256").update(content).digest("hex")
}

/**
 * Get approval status (defaults to "draft" if not set)
 */
export function getApprovalStatus(stream: StreamMetadata): ApprovalStatus {
  return stream.approval?.status ?? "draft"
}

/**
 * Check if workstream is approved
 */
export function isApproved(stream: StreamMetadata): boolean {
  return getApprovalStatus(stream) === "approved"
}

/**
 * Check if plan was modified since approval
 */
export function isPlanModified(repoRoot: string, stream: StreamMetadata): boolean {
  if (!stream.approval?.plan_hash) {
    return false // No hash to compare against
  }

  const currentHash = computePlanHash(repoRoot, stream.id)
  if (!currentHash) {
    return true // PLAN.md was deleted
  }

  return currentHash !== stream.approval.plan_hash
}

/**
 * Check if tasks can be created (plan must be approved)
 * Returns { allowed: boolean; reason?: string }
 */
export function canCreateTasks(stream: StreamMetadata): {
  allowed: boolean
  reason?: string
} {
  const status = getApprovalStatus(stream)

  switch (status) {
    case "approved":
      return { allowed: true }
    case "draft":
      return {
        allowed: false,
        reason: "Plan has not been approved. Run 'work approve' to approve it.",
      }
    case "revoked":
      return {
        allowed: false,
        reason: `Plan approval was revoked${stream.approval?.revoked_reason ? `: ${stream.approval.revoked_reason}` : ""}. Run 'work approve' to re-approve.`,
      }
    default:
      return {
        allowed: false,
        reason: `Unknown approval status: ${status}`,
      }
  }
}

/**
 * Approve a workstream
 * Stores the current PLAN.md hash to detect future modifications
 */
export function approveStream(
  repoRoot: string,
  streamIdOrName: string,
  approvedBy?: string
): StreamMetadata {
  const index = loadIndex(repoRoot)
  const streamIndex = index.streams.findIndex(
    (s) => s.id === streamIdOrName || s.name === streamIdOrName
  )

  if (streamIndex === -1) {
    throw new Error(`Workstream "${streamIdOrName}" not found`)
  }

  const stream = index.streams[streamIndex]!
  const planHash = computePlanHash(repoRoot, stream.id)

  if (!planHash) {
    throw new Error(`PLAN.md not found for workstream "${stream.id}"`)
  }

  // Set approval metadata
  stream.approval = {
    status: "approved",
    approved_at: new Date().toISOString(),
    approved_by: approvedBy,
    plan_hash: planHash,
  }

  stream.updated_at = new Date().toISOString()
  saveIndex(repoRoot, index)

  return stream
}

/**
 * Revoke approval for a workstream
 */
export function revokeApproval(
  repoRoot: string,
  streamIdOrName: string,
  reason?: string
): StreamMetadata {
  const index = loadIndex(repoRoot)
  const streamIndex = index.streams.findIndex(
    (s) => s.id === streamIdOrName || s.name === streamIdOrName
  )

  if (streamIndex === -1) {
    throw new Error(`Workstream "${streamIdOrName}" not found`)
  }

  const stream = index.streams[streamIndex]!

  // Preserve existing approval info but update status
  stream.approval = {
    ...stream.approval,
    status: "revoked",
    revoked_at: new Date().toISOString(),
    revoked_reason: reason,
  }

  stream.updated_at = new Date().toISOString()
  saveIndex(repoRoot, index)

  return stream
}

/**
 * Check if plan was modified since approval and auto-revoke if so
 * Returns { revoked: boolean; stream: StreamMetadata }
 */
export function checkAndRevokeIfModified(
  repoRoot: string,
  stream: StreamMetadata
): { revoked: boolean; stream: StreamMetadata } {
  if (!isApproved(stream)) {
    return { revoked: false, stream }
  }

  if (!isPlanModified(repoRoot, stream)) {
    return { revoked: false, stream }
  }

  // Auto-revoke due to modification
  const updatedStream = revokeApproval(
    repoRoot,
    stream.id,
    "PLAN.md was modified after approval"
  )

  return { revoked: true, stream: updatedStream }
}

/**
 * Format approval status for display
 */
export function formatApprovalStatus(stream: StreamMetadata): string {
  const status = getApprovalStatus(stream)

  switch (status) {
    case "draft":
      return "[D] draft (not approved)"
    case "approved":
      return "[A] approved"
    case "revoked":
      const reason = stream.approval?.revoked_reason
      return `[R] revoked${reason ? ` (${reason})` : ""}`
    default:
      return `[?] ${status}`
  }
}

/**
 * Get approval status icon for compact display
 */
export function getApprovalIcon(stream: StreamMetadata): string {
  const status = getApprovalStatus(stream)

  switch (status) {
    case "draft":
      return "📝"
    case "approved":
      return "✅"
    case "revoked":
      return "⚠️"
    default:
      return "❓"
  }
}
