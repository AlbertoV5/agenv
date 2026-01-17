import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtemp, rm, mkdir, readdir, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { existsSync } from "node:fs"
import { generatePlan, createGenerateArgs } from "../../src/lib/generate"
import { loadIndex } from "../../src/lib/index"

describe("createGenerateArgs", () => {
  test("creates args with short plan defaults", () => {
    const args = createGenerateArgs("my-feature", "short", "/repo")
    expect(args).toEqual({
      name: "my-feature",
      size: "short",
      repoRoot: "/repo",
      stages: 1,
      supertasks: 1,
      subtasks: 3,
      cliVersion: undefined,
    })
  })

  test("creates args with medium plan defaults", () => {
    const args = createGenerateArgs("my-feature", "medium", "/repo")
    expect(args).toEqual({
      name: "my-feature",
      size: "medium",
      repoRoot: "/repo",
      stages: 3,
      supertasks: 2,
      subtasks: 3,
      cliVersion: undefined,
    })
  })

  test("creates args with long plan defaults", () => {
    const args = createGenerateArgs("my-feature", "long", "/repo")
    expect(args).toEqual({
      name: "my-feature",
      size: "long",
      repoRoot: "/repo",
      stages: 4,
      supertasks: 3,
      subtasks: 4,
      cliVersion: undefined,
    })
  })

  test("allows overriding defaults", () => {
    const args = createGenerateArgs("my-feature", "medium", "/repo", {
      stages: 5,
      supertasks: 4,
      subtasks: 6,
      cliVersion: "1.0.0",
    })
    expect(args.stages).toBe(5)
    expect(args.supertasks).toBe(4)
    expect(args.subtasks).toBe(6)
    expect(args.cliVersion).toBe("1.0.0")
  })

  test("allows partial overrides", () => {
    const args = createGenerateArgs("my-feature", "medium", "/repo", {
      stages: 5,
    })
    expect(args.stages).toBe(5)
    expect(args.supertasks).toBe(2) // default for medium
    expect(args.subtasks).toBe(3) // default for medium
  })
})

describe("generatePlan", () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenv-test-"))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe("short plan generation", () => {
    test("creates correct directory structure", async () => {
      const args = createGenerateArgs("test-feature", "short", tempDir)
      const result = generatePlan(args)

      expect(result.planId).toBe("000-test-feature")
      expect(result.size).toBe("short")

      const planDir = join(tempDir, "docs", "plans", "000-test-feature")
      expect(existsSync(planDir)).toBe(true)
      expect(existsSync(join(planDir, "checklist"))).toBe(true)
      expect(existsSync(join(planDir, "principle"))).toBe(true)
      expect(existsSync(join(planDir, "reference"))).toBe(true)
    })

    test("creates checklist INDEX.md", async () => {
      const args = createGenerateArgs("test-feature", "short", tempDir)
      generatePlan(args)

      const checklistPath = join(
        tempDir,
        "docs/plans/000-test-feature/checklist/INDEX.md",
      )
      const content = await readFile(checklistPath, "utf-8")

      expect(content).toContain("# Test Feature - Checklist")
      expect(content).toContain("**Plan Size:** short")
      expect(content).toContain("### Task Group 1")
      expect(content).toContain("- [ ] Subtask 1.1")
    })

    test("creates principle INDEX.md", async () => {
      const args = createGenerateArgs("test-feature", "short", tempDir)
      generatePlan(args)

      const principlePath = join(
        tempDir,
        "docs/plans/000-test-feature/principle/INDEX.md",
      )
      const content = await readFile(principlePath, "utf-8")

      expect(content).toContain("# Test Feature - Principle")
      expect(content).toContain("## Goal")
      expect(content).toContain("## Summary")
    })

    test("creates reference INDEX.md", async () => {
      const args = createGenerateArgs("test-feature", "short", tempDir)
      generatePlan(args)

      const referencePath = join(
        tempDir,
        "docs/plans/000-test-feature/reference/INDEX.md",
      )
      const content = await readFile(referencePath, "utf-8")

      expect(content).toContain("# Test Feature - Reference")
      expect(content).toContain("## Summary and Outcomes")
    })

    test("updates index.json", async () => {
      const args = createGenerateArgs("test-feature", "short", tempDir)
      generatePlan(args)

      const index = loadIndex(tempDir)
      expect(index.plans).toHaveLength(1)
      expect(index.plans[0]?.id).toBe("000-test-feature")
      expect(index.plans[0]?.name).toBe("test-feature")
      expect(index.plans[0]?.size).toBe("short")
    })
  })

  describe("medium plan generation", () => {
    test("creates inline stages in checklist", async () => {
      const args = createGenerateArgs("test-feature", "medium", tempDir)
      generatePlan(args)

      const checklistPath = join(
        tempDir,
        "docs/plans/000-test-feature/checklist/INDEX.md",
      )
      const content = await readFile(checklistPath, "utf-8")

      expect(content).toContain("## Stage Overview")
      expect(content).toContain("| Stage | Title | Status |")
      expect(content).toContain("## Stage 1:")
      expect(content).toContain("## Stage 2:")
      expect(content).toContain("## Stage 3:")
    })

    test("creates correct number of task groups per stage", async () => {
      const args = createGenerateArgs("test-feature", "medium", tempDir, {
        supertasks: 2,
        subtasks: 3,
      })
      generatePlan(args)

      const checklistPath = join(
        tempDir,
        "docs/plans/000-test-feature/checklist/INDEX.md",
      )
      const content = await readFile(checklistPath, "utf-8")

      // Each stage should have 2 task groups
      const taskGroupMatches = content.match(/### Stage \d+ - Task Group \d+/g)
      expect(taskGroupMatches?.length).toBe(6) // 3 stages * 2 task groups
    })
  })

  describe("long plan generation", () => {
    test("creates separate stage files", async () => {
      const args = createGenerateArgs("test-feature", "long", tempDir)
      generatePlan(args)

      const checklistDir = join(
        tempDir,
        "docs/plans/000-test-feature/checklist",
      )
      const files = await readdir(checklistDir)

      expect(files).toContain("INDEX.md")
      expect(files).toContain("STAGE_1.md")
      expect(files).toContain("STAGE_2.md")
      expect(files).toContain("STAGE_3.md")
      expect(files).toContain("STAGE_4.md")
    })

    test("creates index with links to stage files", async () => {
      const args = createGenerateArgs("test-feature", "long", tempDir)
      generatePlan(args)

      const indexPath = join(
        tempDir,
        "docs/plans/000-test-feature/checklist/INDEX.md",
      )
      const content = await readFile(indexPath, "utf-8")

      expect(content).toContain("| Stage | File | Title | Status |")
      expect(content).toContain("[STAGE_1.md](./STAGE_1.md)")
      expect(content).toContain("[STAGE_2.md](./STAGE_2.md)")
    })

    test("creates principle stage files", async () => {
      const args = createGenerateArgs("test-feature", "long", tempDir)
      generatePlan(args)

      const principleDir = join(
        tempDir,
        "docs/plans/000-test-feature/principle",
      )
      const files = await readdir(principleDir)

      expect(files).toContain("INDEX.md")
      expect(files).toContain("STAGE_1.md")
      expect(files).toContain("STAGE_2.md")
    })
  })

  describe("plan ordering", () => {
    test("increments order number for subsequent plans", async () => {
      generatePlan(createGenerateArgs("first-plan", "short", tempDir))
      generatePlan(createGenerateArgs("second-plan", "short", tempDir))
      generatePlan(createGenerateArgs("third-plan", "short", tempDir))

      const index = loadIndex(tempDir)
      expect(index.plans[0]?.id).toBe("000-first-plan")
      expect(index.plans[1]?.id).toBe("001-second-plan")
      expect(index.plans[2]?.id).toBe("002-third-plan")
    })
  })

  describe("error handling", () => {
    test("throws on duplicate plan name", () => {
      const args = createGenerateArgs("test-feature", "short", tempDir)
      generatePlan(args)

      expect(() => generatePlan(args)).toThrow(
        'Plan with name "test-feature" already exists',
      )
    })
  })

  describe("version tracking", () => {
    test("includes cli version when provided", async () => {
      const args = createGenerateArgs("test-feature", "short", tempDir, {
        cliVersion: "1.2.3",
      })
      generatePlan(args)

      const checklistPath = join(
        tempDir,
        "docs/plans/000-test-feature/checklist/INDEX.md",
      )
      const content = await readFile(checklistPath, "utf-8")

      expect(content).toContain("@agenv/cli@1.2.3")
      expect(content).toContain("@agenv/planning@")
    })

    test("stores version in index metadata", async () => {
      const args = createGenerateArgs("test-feature", "short", tempDir, {
        cliVersion: "1.2.3",
      })
      generatePlan(args)

      const index = loadIndex(tempDir)
      expect(index.plans[0]?.generated_by.cli).toBe("1.2.3")
    })
  })
})
