import type { StreamMetadata, ApprovalStatus } from "./types.ts"
import { loadIndex, saveIndex } from "./index.ts"

/**
 * Get approval status for a specific stage
 */
export function getStageApprovalStatus(
    stream: StreamMetadata,
    stageNumber: number
): ApprovalStatus {
    if (!stream.approval?.stages) {
        return "draft"
    }
    return stream.approval.stages[stageNumber]?.status ?? "draft"
}

/**
 * Approve a specific stage
 */
export function approveStage(
    repoRoot: string,
    streamIdOrName: string,
    stageNumber: number,
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

    // Initialize approval object if it doesn't exist
    if (!stream.approval) {
        stream.approval = {
            status: "draft"
        }
    }

    // Initialize stages map if it doesn't exist
    if (!stream.approval.stages) {
        stream.approval.stages = {}
    }

    // Set stage approval
    stream.approval.stages[stageNumber] = {
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: approvedBy,
    }

    stream.updated_at = new Date().toISOString()
    saveIndex(repoRoot, index)

    return stream
}

/**
 * Revoke approval for a specific stage
 */
export function revokeStageApproval(
    repoRoot: string,
    streamIdOrName: string,
    stageNumber: number,
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

    if (!stream.approval?.stages?.[stageNumber]) {
        throw new Error(`Stage ${stageNumber} is not approved, nothing to revoke`)
    }

    // Update status to revoked
    stream.approval.stages[stageNumber] = {
        ...stream.approval.stages[stageNumber],
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
    }

    stream.updated_at = new Date().toISOString()
    saveIndex(repoRoot, index)

    return stream
}
