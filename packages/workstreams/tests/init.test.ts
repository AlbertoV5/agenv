import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync, mkdtempSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { main as initMain } from "../src/cli/init.ts"
import { getRepoRoot } from "../src/lib/repo.ts"

describe("work init", () => {
    let tempDir: string
    let workDir: string

    beforeEach(() => {
        tempDir = mkdtempSync(join(tmpdir(), "work-init-test-"))
        mkdirSync(join(tempDir, ".git"))
        workDir = join(tempDir, "work")
    })

    afterEach(() => {
        if (existsSync(tempDir)) {
            rmSync(tempDir, { recursive: true, force: true })
        }
    })

    it("should initialize work/ directory and default files", async () => {
        await initMain(["bun", "work", "init", "--repo-root", tempDir])

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
        mkdirSync(workDir, { recursive: true })
        const customContent = "custom content"
        writeFileSync(join(workDir, "AGENTS.md"), customContent)

        await initMain(["bun", "work", "init", "--repo-root", tempDir])

        const agentsContent = readFileSync(join(workDir, "AGENTS.md"), "utf-8")
        expect(agentsContent).toBe(customContent)
    })

    it("should overwrite existing files with --force", async () => {
        mkdirSync(workDir, { recursive: true })
        const customContent = "custom content"
        writeFileSync(join(workDir, "AGENTS.md"), customContent)

        await initMain(["bun", "work", "init", "--repo-root", tempDir, "--force"])

        const agentsContent = readFileSync(join(workDir, "AGENTS.md"), "utf-8")
        expect(agentsContent).not.toBe(customContent)
        expect(agentsContent).toContain("# Agents")
    })
})
