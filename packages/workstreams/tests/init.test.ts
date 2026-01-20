import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { main as initMain } from "../src/cli/init.ts"
import { getRepoRoot } from "../src/lib/repo.ts"

describe("work init", () => {
    const repoRoot = getRepoRoot()
    const workDir = join(repoRoot, "work")

    beforeEach(() => {
        if (existsSync(workDir)) {
            rmSync(workDir, { recursive: true })
        }
    })

    afterEach(() => {
        if (existsSync(workDir)) {
            rmSync(workDir, { recursive: true })
        }
    })

    it("should initialize work/ directory and default files", async () => {
        await initMain(["bun", "work", "init"])

        expect(existsSync(workDir)).toBe(true)
        expect(existsSync(join(workDir, "index.json"))).toBe(true)
        expect(existsSync(join(workDir, "AGENTS.md"))).toBe(true)
        expect(existsSync(join(workDir, "TESTS.md"))).toBe(true)

        const indexContent = JSON.parse(readFileSync(join(workDir, "index.json"), "utf-8"))
        expect(indexContent.version).toBe("1.0.0")
        expect(indexContent.streams).toEqual([])

        const agentsContent = readFileSync(join(workDir, "AGENTS.md"), "utf-8")
        expect(agentsContent).toContain("# Agents")
        expect(agentsContent).toContain("### default")

        const testsContent = readFileSync(join(workDir, "TESTS.md"), "utf-8")
        expect(testsContent).toContain("# Test Requirements")
    })

    it("should not overwrite existing files without --force", async () => {
        mkdirSync(workDir)
        const customContent = "custom content"
        writeFileSync(join(workDir, "AGENTS.md"), customContent)

        await initMain(["bun", "work", "init"])

        const agentsContent = readFileSync(join(workDir, "AGENTS.md"), "utf-8")
        expect(agentsContent).toBe(customContent)
    })

    it("should overwrite existing files with --force", async () => {
        mkdirSync(workDir)
        const customContent = "custom content"
        writeFileSync(join(workDir, "AGENTS.md"), customContent)

        await initMain(["bun", "work", "init", "--force"])

        const agentsContent = readFileSync(join(workDir, "AGENTS.md"), "utf-8")
        expect(agentsContent).not.toBe(customContent)
        expect(agentsContent).toContain("# Agents")
    })
})
