import { tool } from "@opencode-ai/plugin"

/**
 * Link the current session to a workstream as its planning session.
 * 
 * Usage: After creating a workstream with `work create`, use this tool
 * to link the current opencode session as the planning session.
 */
export const link_planning_session = tool({
  description: "Link the current opencode session to a workstream as its planning session. Use this after creating a workstream to enable resuming this conversation later with 'work plan'.",
  args: {
    streamId: tool.schema.string().describe("The workstream ID or name (e.g., '012-my-feature' or 'my-feature'). If omitted, uses the current workstream.").optional(),
  },
  async execute(args, context) {
    const sessionId = context.sessionID
    
    if (!sessionId) {
      return "Error: Could not determine current session ID"
    }

    // Build the command
    const cmdArgs = ["plan", "--set", sessionId]
    if (args.streamId) {
      cmdArgs.push("--stream", args.streamId)
    }

    try {
      const result = await Bun.$`work ${cmdArgs}`.text()
      return result.trim()
    } catch (error: any) {
      return `Error linking session: ${error.message || error}`
    }
  },
})

/**
 * Get information about the current workstream.
 */
export const current_workstream = tool({
  description: "Get information about the current workstream, including its ID, name, and planning session status.",
  args: {},
  async execute() {
    try {
      const result = await Bun.$`work current`.text()
      return result.trim()
    } catch (error: any) {
      return `Error getting current workstream: ${error.message || error}`
    }
  },
})
