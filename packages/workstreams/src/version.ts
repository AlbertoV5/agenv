import { readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

/**
 * Package version - read from package.json
 * Fails if package.json cannot be found (no silent fallback)
 */
function getVersion(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  
  // Check multiple possible locations (dev vs dist)
  const paths = [
    join(__dirname, "..", "package.json"),      // from src/
    join(__dirname, "..", "..", "package.json"), // from dist/
  ]
  
  for (const p of paths) {
    try {
      const pkg = JSON.parse(readFileSync(p, "utf-8"))
      if (pkg.version) return pkg.version
    } catch {
      continue
    }
  }
  
  throw new Error(`Could not find package.json in: ${paths.join(", ")}`)
}

export const VERSION = getVersion()
