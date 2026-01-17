import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  getOrCreateIndex,
  loadIndex,
  saveIndex,
  saveIndexSafe,
  modifyIndex,
  deletePlan,
  findPlan,
  getPlan,
  getNextOrderNumber,
  formatOrderNumber,
} from "../../src/lib/index"
import type { PlansIndex, PlanMetadata } from "../../src/lib/types"

describe("index operations", () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenv-test-"))
    // Create the plans directory structure
    await mkdir(join(tempDir, "docs", "plans"), { recursive: true })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe("getOrCreateIndex", () => {
    test("creates new index when none exists", () => {
      const index = getOrCreateIndex(tempDir)
      expect(index.version).toBe("1.0.0")
      expect(index.plans).toEqual([])
      expect(index.last_updated).toBeDefined()
    })

    test("loads existing index", async () => {
      const existingIndex: PlansIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01T00:00:00.000Z",
        plans: [],
      }
      await writeFile(
        join(tempDir, "docs", "plans", "index.json"),
        JSON.stringify(existingIndex),
      )

      const index = getOrCreateIndex(tempDir)
      expect(index.last_updated).toBe("2024-01-01T00:00:00.000Z")
    })
  })

  describe("loadIndex", () => {
    test("throws when index does not exist", () => {
      expect(() => loadIndex(tempDir)).toThrow("No plans index found")
    })

    test("loads existing index", async () => {
      const existingIndex: PlansIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01T00:00:00.000Z",
        plans: [],
      }
      await writeFile(
        join(tempDir, "docs", "plans", "index.json"),
        JSON.stringify(existingIndex),
      )

      const index = loadIndex(tempDir)
      expect(index.version).toBe("1.0.0")
    })

    test("throws on invalid JSON", async () => {
      await writeFile(
        join(tempDir, "docs", "plans", "index.json"),
        "not valid json",
      )

      expect(() => loadIndex(tempDir)).toThrow("Failed to parse index.json")
    })
  })

  describe("saveIndex", () => {
    test("saves index to file", async () => {
      const index: PlansIndex = {
        version: "1.0.0",
        last_updated: "",
        plans: [],
      }

      // Create the index file first (saveIndex expects it to exist or creates atomically)
      await writeFile(
        join(tempDir, "docs", "plans", "index.json"),
        JSON.stringify(index),
      )

      saveIndex(tempDir, index)

      const loaded = loadIndex(tempDir)
      expect(loaded.version).toBe("1.0.0")
      // last_updated should be updated
      expect(loaded.last_updated).not.toBe("")
    })

    test("updates last_updated timestamp", async () => {
      const index: PlansIndex = {
        version: "1.0.0",
        last_updated: "old-date",
        plans: [],
      }

      await writeFile(
        join(tempDir, "docs", "plans", "index.json"),
        JSON.stringify(index),
      )

      saveIndex(tempDir, index)

      const loaded = loadIndex(tempDir)
      expect(loaded.last_updated).not.toBe("old-date")
      expect(loaded.last_updated).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })
})

describe("plan lookup functions", () => {
  const mockPlan: PlanMetadata = {
    id: "001-test-plan",
    name: "test-plan",
    order: 1,
    size: "medium",
    session: {
      length: 4,
      unit: "session",
      session_minutes: [30, 45],
      session_iterations: [4, 8],
    },
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    synthesis: { synthesized: false },
    path: "docs/plans/001-test-plan",
    generated_by: { cli: "0.1.0", planning: "0.1.0" },
  }

  const mockIndex: PlansIndex = {
    version: "1.0.0",
    last_updated: "2024-01-01",
    plans: [mockPlan],
  }

  describe("findPlan", () => {
    test("finds plan by ID", () => {
      const result = findPlan(mockIndex, "001-test-plan")
      expect(result).toEqual(mockPlan)
    })

    test("finds plan by name", () => {
      const result = findPlan(mockIndex, "test-plan")
      expect(result).toEqual(mockPlan)
    })

    test("returns undefined when not found", () => {
      const result = findPlan(mockIndex, "nonexistent")
      expect(result).toBeUndefined()
    })
  })

  describe("getPlan", () => {
    test("returns plan when found", () => {
      const result = getPlan(mockIndex, "001-test-plan")
      expect(result).toEqual(mockPlan)
    })

    test("throws when not found", () => {
      expect(() => getPlan(mockIndex, "nonexistent")).toThrow(
        'Plan "nonexistent" not found',
      )
    })
  })

  describe("getNextOrderNumber", () => {
    test("returns 0 for empty index", () => {
      const emptyIndex: PlansIndex = {
        version: "1.0.0",
        last_updated: "",
        plans: [],
      }
      expect(getNextOrderNumber(emptyIndex)).toBe(0)
    })

    test("returns max + 1 for existing plans", () => {
      const index: PlansIndex = {
        version: "1.0.0",
        last_updated: "",
        plans: [
          { ...mockPlan, order: 1 },
          { ...mockPlan, id: "002-another", order: 5 },
          { ...mockPlan, id: "003-third", order: 3 },
        ],
      }
      expect(getNextOrderNumber(index)).toBe(6)
    })
  })

  describe("formatOrderNumber", () => {
    test.each([
      [0, "000"],
      [1, "001"],
      [12, "012"],
      [123, "123"],
      [1234, "1234"],
    ])("formatOrderNumber(%d) returns %s", (input, expected) => {
      expect(formatOrderNumber(input)).toBe(expected)
    })
  })
})

describe("async index operations", () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenv-test-"))
    await mkdir(join(tempDir, "docs", "plans"), { recursive: true })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe("saveIndexSafe", () => {
    test("saves index with locking", async () => {
      const index: PlansIndex = {
        version: "1.0.0",
        last_updated: "old-date",
        plans: [],
      }
      // Create the index file first
      await writeFile(
        join(tempDir, "docs", "plans", "index.json"),
        JSON.stringify(index),
      )

      await saveIndexSafe(tempDir, index)

      const loaded = loadIndex(tempDir)
      expect(loaded.version).toBe("1.0.0")
      expect(loaded.last_updated).not.toBe("old-date")
    })

    test("updates last_updated timestamp", async () => {
      const index: PlansIndex = {
        version: "1.0.0",
        last_updated: "2020-01-01",
        plans: [],
      }
      await writeFile(
        join(tempDir, "docs", "plans", "index.json"),
        JSON.stringify(index),
      )

      await saveIndexSafe(tempDir, index)

      const loaded = loadIndex(tempDir)
      expect(loaded.last_updated).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe("modifyIndex", () => {
    test("performs atomic read-modify-write", async () => {
      const initialIndex: PlansIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01",
        plans: [],
      }
      await writeFile(
        join(tempDir, "docs", "plans", "index.json"),
        JSON.stringify(initialIndex),
      )

      const result = await modifyIndex(tempDir, (index) => {
        index.plans.push({
          id: "001-test",
          name: "test",
          order: 0,
          size: "short",
          session: {
            length: 1,
            unit: "session",
            session_minutes: [30, 45],
            session_iterations: [4, 8],
          },
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
          synthesis: { synthesized: false },
          path: "docs/plans/001-test",
          generated_by: { cli: "0.1.0", planning: "0.1.0" },
        })
        return index.plans.length
      })

      expect(result).toBe(1)
      const loaded = loadIndex(tempDir)
      expect(loaded.plans).toHaveLength(1)
      expect(loaded.plans[0]?.id).toBe("001-test")
    })

    test("returns value from modifier function", async () => {
      const initialIndex: PlansIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01",
        plans: [],
      }
      await writeFile(
        join(tempDir, "docs", "plans", "index.json"),
        JSON.stringify(initialIndex),
      )

      const result = await modifyIndex(tempDir, () => "custom-result")

      expect(result).toBe("custom-result")
    })
  })

  describe("deletePlan", () => {
    const mockPlan: PlanMetadata = {
      id: "001-test-plan",
      name: "test-plan",
      order: 0,
      size: "short",
      session: {
        length: 1,
        unit: "session",
        session_minutes: [30, 45],
        session_iterations: [4, 8],
      },
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
      synthesis: { synthesized: false },
      path: "docs/plans/001-test-plan",
      generated_by: { cli: "0.1.0", planning: "0.1.0" },
    }

    test("removes plan from index by ID", async () => {
      const index: PlansIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01",
        plans: [mockPlan],
      }
      await writeFile(
        join(tempDir, "docs", "plans", "index.json"),
        JSON.stringify(index),
      )

      const result = await deletePlan(tempDir, "001-test-plan")

      expect(result.deleted).toBe(true)
      expect(result.planId).toBe("001-test-plan")
      const loaded = loadIndex(tempDir)
      expect(loaded.plans).toHaveLength(0)
    })

    test("removes plan from index by name", async () => {
      const index: PlansIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01",
        plans: [mockPlan],
      }
      await writeFile(
        join(tempDir, "docs", "plans", "index.json"),
        JSON.stringify(index),
      )

      const result = await deletePlan(tempDir, "test-plan")

      expect(result.deleted).toBe(true)
      expect(result.planId).toBe("001-test-plan")
    })

    test("throws when plan not found", async () => {
      const index: PlansIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01",
        plans: [],
      }
      await writeFile(
        join(tempDir, "docs", "plans", "index.json"),
        JSON.stringify(index),
      )

      await expect(deletePlan(tempDir, "nonexistent")).rejects.toThrow(
        'Plan "nonexistent" not found',
      )
    })

    test("deletes plan files when deleteFiles option is true", async () => {
      const index: PlansIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01",
        plans: [mockPlan],
      }
      await writeFile(
        join(tempDir, "docs", "plans", "index.json"),
        JSON.stringify(index),
      )
      // Create the plan directory
      const planDir = join(tempDir, "docs", "plans", "001-test-plan")
      await mkdir(planDir, { recursive: true })
      await writeFile(join(planDir, "README.md"), "# Test Plan")

      const result = await deletePlan(tempDir, "001-test-plan", {
        deleteFiles: true,
      })

      expect(result.deleted).toBe(true)
      expect(existsSync(planDir)).toBe(false)
    })

    test("does not delete files when deleteFiles option is false", async () => {
      const index: PlansIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01",
        plans: [mockPlan],
      }
      await writeFile(
        join(tempDir, "docs", "plans", "index.json"),
        JSON.stringify(index),
      )
      const planDir = join(tempDir, "docs", "plans", "001-test-plan")
      await mkdir(planDir, { recursive: true })
      await writeFile(join(planDir, "README.md"), "# Test Plan")

      await deletePlan(tempDir, "001-test-plan", { deleteFiles: false })

      expect(existsSync(planDir)).toBe(true)
    })

    test("handles missing plan directory gracefully when deleteFiles is true", async () => {
      const index: PlansIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01",
        plans: [mockPlan],
      }
      await writeFile(
        join(tempDir, "docs", "plans", "index.json"),
        JSON.stringify(index),
      )
      // Don't create the plan directory

      const result = await deletePlan(tempDir, "001-test-plan", {
        deleteFiles: true,
      })

      expect(result.deleted).toBe(true)
    })
  })
})
