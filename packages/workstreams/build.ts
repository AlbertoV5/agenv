#!/usr/bin/env bun
/**
 * Build script for @agenv/workstreams
 * 
 * This script:
 * 1. Transpiles TypeScript to JavaScript using Bun's transpiler
 * 2. Generates TypeScript declaration files  
 * 3. Handles Bun-style .ts imports by rewriting them to .js
 * 4. Preserves directory structure
 */

import { $ } from "bun"
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises"
import { join, relative, dirname } from "node:path"

console.log("🔨 Building @agenv/workstreams...")

async function* walk(dir: string): AsyncGenerator<string> {
  const files = await readdir(dir, { withFileTypes: true })
  for (const file of files) {
    const path = join(dir, file.name)
    if (file.isDirectory()) {
      yield* walk(path)
    } else {
      yield path
    }
  }
}

async function transpileFile(srcPath: string, outPath: string) {
  // Read the TypeScript source
  const code = await readFile(srcPath, "utf-8")
  
  // For bin files, replace import.meta.main with true (always execute)
  const isBinFile = srcPath.startsWith("bin/")
  
  // Use Bun's transpiler directly (not bundler)
  const transpiler = new Bun.Transpiler({
    loader: "ts",
    target: "bun", // Use bun target to avoid CommonJS conversions
  })
  
  // Transpile TypeScript to JavaScript
  let jsCode = transpiler.transformSync(code)
  
  // Handle import.meta.main for bin vs library files
  if (isBinFile) {
    // For bin files, replace with true to always execute
    jsCode = jsCode.replace(/if\s*\(\s*import\.meta\.main\s*\)/g, 'if (true)')
  } else {
    // For library files, remove the import.meta.main check entirely
    jsCode = jsCode.replace(/if\s*\(\s*import\.meta\.main\s*\)\s*\{[^}]*\}/gs, '')
  }
  
  // Rewrite .ts extensions to .js in imports, and add .js where missing for relative imports
  jsCode = jsCode.replace(/from\s+["'](.+?)\.ts["']/g, 'from "$1.js"')
  jsCode = jsCode.replace(/import\s+["'](.+?)\.ts["']/g, 'import "$1.js"')
  jsCode = jsCode.replace(/export\s+\*\s+from\s+["'](.+?)\.ts["']/g, 'export * from "$1.js"')
  
  // Add .js extension to relative imports that don't have an extension
  jsCode = jsCode.replace(/from\s+["'](\.\.?\/[^"']+?)["']/g, (match, path) => {
    if (!path.endsWith('.js') && !path.endsWith('.json') && !path.includes('.js#')) {
      return `from "${path}.js"`
    }
    return match
  })
  jsCode = jsCode.replace(/import\s+["'](\.\.?\/[^"']+?)["']/g, (match, path) => {
    if (!path.endsWith('.js') && !path.endsWith('.json') && !path.includes('.js#')) {
      return `import "${path}.js"`
    }
    return match
  })
  jsCode = jsCode.replace(/export\s+\*\s+from\s+["'](\.\.?\/[^"']+?)["']/g, (match, path) => {
    if (!path.endsWith('.js') && !path.endsWith('.json') && !path.includes('.js#')) {
      return `export * from "${path}.js"`
    }
    return match
  })
  
  // Ensure output directory exists
  await mkdir(dirname(outPath), { recursive: true })
  
  // Write the JavaScript file
  await writeFile(outPath, jsCode)
  
  // Generate a simple source map
  const mapPath = `${outPath}.map`
  const relSource = relative(dirname(outPath), srcPath)
  await writeFile(mapPath, JSON.stringify({
    version: 3,
    file: outPath,
    sourceRoot: "",
    sources: [relSource],
    names: [],
    mappings: ""
  }))
  
  // Add source map comment to JS file
  await writeFile(outPath, jsCode + `\n//# sourceMappingURL=${outPath.split('/').pop()}.map\n`)
}

try {
  // Step 1: Transpile all TypeScript files
  console.log("\n📦 Transpiling TypeScript files...")
  
  let fileCount = 0
  for await (const file of walk("src")) {
    if (file.endsWith(".ts") && !file.endsWith(".test.ts") && !file.endsWith(".spec.ts")) {
      const outPath = file.replace(/^src/, "dist/src").replace(/\.ts$/, ".js")
      await transpileFile(file, outPath)
      fileCount++
    }
  }
  
  for await (const file of walk("bin")) {
    if (file.endsWith(".ts")) {
      const outPath = file.replace(/^bin/, "dist/bin").replace(/\.ts$/, ".js")
      await transpileFile(file, outPath)
      fileCount++
    }
  }
  
  console.log(`✅ Transpiled ${fileCount} files`)

  // Step 2: Generate declaration files
  console.log("\n📝 Generating TypeScript declarations...")
  
  await $`tsc --project tsconfig.build.json --emitDeclarationOnly --declaration --declarationMap`
  
  console.log("✅ Declaration files generated")

  console.log("\n✨ Build complete!")
  console.log("📁 Output directory: ./dist")
  console.log(`📊 Total files: ${fileCount}`)

} catch (error) {
  console.error("❌ Build error:", error)
  process.exit(1)
}
