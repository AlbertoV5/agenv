/**
 * CLI: Serve Web Visualization
 *
 * Launches the web visualization server for browsing workstreams.
 */

import { startServer, DEFAULT_PORT, DEFAULT_HOST } from "../web/server.ts"

interface ServeCliArgs {
  port: number
  host: string
  open: boolean
}

function printHelp(): void {
  console.log(`
work serve - Launch the web visualization server

Usage:
  work serve [options]

Options:
  --port, -p     Port number (default: ${DEFAULT_PORT})
  --host         Host to bind (default: ${DEFAULT_HOST})
  --open, -o     Open browser automatically
  --help, -h     Show this help message

Examples:
  # Start server on default port
  work serve

  # Start on custom port
  work serve --port 8080

  # Start and open browser automatically
  work serve --open

  # Bind to specific host
  work serve --host 0.0.0.0
`)
}

function parseCliArgs(argv: string[]): ServeCliArgs | null {
  const args = argv.slice(2)
  const parsed: ServeCliArgs = {
    port: DEFAULT_PORT,
    host: DEFAULT_HOST,
    open: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case "--port":
      case "-p":
        if (!next) {
          console.error("Error: --port requires a value")
          return null
        }
        const port = parseInt(next, 10)
        if (isNaN(port) || port < 1 || port > 65535) {
          console.error("Error: Invalid port number. Must be between 1 and 65535")
          return null
        }
        parsed.port = port
        i++
        break

      case "--host":
        if (!next) {
          console.error("Error: --host requires a value")
          return null
        }
        parsed.host = next
        i++
        break

      case "--open":
      case "-o":
        parsed.open = true
        break

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)

      default:
        console.error(`Error: Unknown option "${arg}"`)
        return null
    }
  }

  return parsed
}

async function openBrowser(url: string): Promise<void> {
  const { exec } = require("child_process")
  const platform = process.platform

  let command: string

  switch (platform) {
    case "darwin":
      command = `open "${url}"`
      break
    case "win32":
      command = `start "${url}"`
      break
    default:
      // Linux and others
      command = `xdg-open "${url}"`
      break
  }

  exec(command, (error: Error | null) => {
    if (error) {
      console.error(`Failed to open browser: ${error.message}`)
    }
  })
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const cliArgs = parseCliArgs(argv)
  if (!cliArgs) {
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  try {
    const { server } = await startServer({
      port: cliArgs.port,
      host: cliArgs.host,
    })

    const url = `http://${cliArgs.host}:${cliArgs.port}`

    console.log(`
🚀 Workstream Visualization Server

Server running at: ${url}
Press Ctrl+C to stop
`)

    // Open browser if requested
    if (cliArgs.open) {
      await openBrowser(url)
    }

    // Keep the process alive
    await new Promise(() => {})
  } catch (e) {
    const error = e as Error
    console.error(`Error starting server: ${error.message}`)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
