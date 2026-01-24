import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import {
  existsSync,
  rmSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  mkdtempSync,
} from "fs"
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
    expect(existsSync(join(workDir, "agents.yaml"))).toBe(true)
    expect(existsSync(join(workDir, "notifications.json"))).toBe(true)

    const indexContent = JSON.parse(
      readFileSync(join(workDir, "index.json"), "utf-8"),
    )
    expect(indexContent.version).toBe("1.0.0")
    expect(indexContent.streams).toEqual([])

    const agentsContent = readFileSync(join(workDir, "agents.yaml"), "utf-8")
    expect(agentsContent).toContain("agents:")
    expect(agentsContent).toContain("name: default")

    const notificationsContent = JSON.parse(
      readFileSync(join(workDir, "notifications.json"), "utf-8"),
    )
    expect(notificationsContent.enabled).toBe(true)
    expect(notificationsContent.providers.sound.enabled).toBe(true)
  })

  it("should not overwrite existing files without --force", async () => {
    mkdirSync(workDir, { recursive: true })
    const customContent = "custom content"
    const customNotifications = { enabled: false }
    writeFileSync(join(workDir, "agents.yaml"), customContent)
    writeFileSync(
      join(workDir, "notifications.json"),
      JSON.stringify(customNotifications),
    )

    await initMain(["bun", "work", "init", "--repo-root", tempDir])

    const agentsContent = readFileSync(join(workDir, "agents.yaml"), "utf-8")
    expect(agentsContent).toBe(customContent)

    const notificationsContent = JSON.parse(
      readFileSync(join(workDir, "notifications.json"), "utf-8"),
    )
    expect(notificationsContent.enabled).toBe(false)
  })

  it("should overwrite existing files with --force", async () => {
    mkdirSync(workDir, { recursive: true })
    const customContent = "custom content"
    writeFileSync(join(workDir, "agents.yaml"), customContent)

    await initMain(["bun", "work", "init", "--repo-root", tempDir, "--force"])

    const agentsContent = readFileSync(join(workDir, "agents.yaml"), "utf-8")
    expect(agentsContent).not.toBe(customContent)
    expect(agentsContent).toContain("agents:")
    
    const notificationsContent = JSON.parse(
      readFileSync(join(workDir, "notifications.json"), "utf-8"),
    )
    expect(notificationsContent.enabled).toBe(true)
  })
})

