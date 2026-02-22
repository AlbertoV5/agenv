/**
 * Approve CLI - Tasks Approval Handler (deprecated compatibility)
 */

import { getResolvedStream } from "../../lib/index.ts"
import { migrateTasksToThreads } from "../../lib/threads.ts"
import { approveTasksCompatibility } from "../../lib/approval.ts"

import type { ApproveCliArgs } from "./utils.ts"

export function handleTasksApproval(
  repoRoot: string,
  stream: ReturnType<typeof getResolvedStream>,
  cliArgs: ApproveCliArgs,
): void {
  if (cliArgs.revoke) {
    console.error("Error: 'work approve tasks --revoke' is no longer supported.")
    console.error("Tasks approval is deprecated in the thread-first workflow.")
    process.exit(1)
  }

  const migration = migrateTasksToThreads(repoRoot, stream.id)
  const updatedStream = approveTasksCompatibility(repoRoot, stream.id, migration.taskCount)

  if (cliArgs.json) {
    console.log(
      JSON.stringify(
        {
          action: "deprecated",
          target: "tasks",
          streamId: updatedStream.id,
          streamName: updatedStream.name,
          message: "Tasks approval is deprecated. Use plan approval + thread assignment.",
          migration,
        },
        null,
        2,
      ),
    )
    return
  }

  console.log("'work approve tasks' is deprecated and kept only for compatibility.")
  console.log("Use this workflow instead:")
  console.log("  1. work validate plan")
  console.log("  2. work approve plan")
  console.log("  3. work assign --thread \"01.01.01\" --agent \"agent-name\"")
  console.log("Optional migration command: work migrate tasks-to-threads")
  if (migration.tasksJsonFound) {
    console.log(
      `Migrated legacy tasks.json -> threads.json (${migration.taskCount} tasks, ${migration.threadsTouched} threads).`,
    )
  }
}
