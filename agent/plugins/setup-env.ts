// OpenCode plugin to set up environment variables for agents
// Sources bin/source_env.sh if present, falls back to gh auth token

import { existsSync } from "fs"
import { join } from "path"

// Source a shell script and capture env changes
async function sourceEnvScript($: any, directory: string): Promise<boolean> {
  const scriptPath = join(directory, "bin/source_env.sh")
  if (!existsSync(scriptPath)) return false

  try {
    // Run the script and capture resulting environment
    const result = await $`bash -c 'source ${scriptPath} > /dev/null 2>&1 && env'`.quiet()
    const output = result.stdout.toString()

    // Parse and apply environment variables
    for (const line of output.split("\n")) {
      const eqIndex = line.indexOf("=")
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex)
        const value = line.substring(eqIndex + 1)
        // Only set if different from current
        if (process.env[key] !== value) {
          process.env[key] = value
        }
      }
    }
    return true
  } catch {
    return false
  }
}

// Fallback: get GitHub token from gh CLI
async function getGitHubToken($: any): Promise<string | undefined> {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN

  try {
    const result = await $`gh auth token`.quiet()
    const token = result.stdout.toString().trim()
    if (token) return token
  } catch {
    // gh not available or not logged in
  }

  return undefined
}

export const SetupEnv = async ({ $, project, directory }: { $: any; project: any; directory: string }) => {
  // Try to source bin/source_env.sh first
  const sourced = await sourceEnvScript($, directory)

  // Fallback to gh auth token if no script or no token set
  if (!sourced || (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN)) {
    const token = await getGitHubToken($)
    if (token) {
      process.env.GH_TOKEN = token
      process.env.GITHUB_TOKEN = token
    }
  }

  // Add agenv bin to PATH
  const agenvBin = `${process.env.HOME}/agenv/bin`
  if (!process.env.PATH?.includes(agenvBin)) {
    process.env.PATH = `${agenvBin}:${process.env.PATH}`
  }

  return {
    "session.created": async () => {
      // Re-source on new session
      const resourced = await sourceEnvScript($, directory)
      if (!resourced || (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN)) {
        const token = await getGitHubToken($)
        if (token) {
          process.env.GH_TOKEN = token
          process.env.GITHUB_TOKEN = token
        }
      }
    }
  }
}
