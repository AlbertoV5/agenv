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
  deleteStream,
  findStream,
  getStream,
  getNextOrderNumber,
  formatOrderNumber,
} from "../../src/lib/index"
import type { WorkIndex, StreamMetadata } from "../../src/lib/types"

describe("index operations", () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenv-test-"))
    // Create the work directory structure
    await mkdir(join(tempDir, "work"), { recursive: true })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe("getOrCreateIndex", () => {
    test("creates new index when none exists", () => {
      const index = getOrCreateIndex(tempDir)
      expect(index.version).toBe("1.0.0")
      expect(index.streams).toEqual([])
      expect(index.last_updated).toBeDefined()
    })

    test("loads existing index", async () => {
      const existingIndex: WorkIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01T00:00:00.000Z",
        streams: [],
      }
      await writeFile(
        join(tempDir, "work", "index.json"),
        JSON.stringify(existingIndex),
      )

      const index = getOrCreateIndex(tempDir)
      expect(index.last_updated).toBe("2024-01-01T00:00:00.000Z")
    })
  })

  describe("loadIndex", () => {
    test("throws when index does not exist", () => {
      expect(() => loadIndex(tempDir)).toThrow("No workstreams index found")
    })

    test("loads existing index", async () => {
      const existingIndex: WorkIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01T00:00:00.000Z",
        streams: [],
      }
      await writeFile(
        join(tempDir, "work", "index.json"),
        JSON.stringify(existingIndex),
      )

      const index = loadIndex(tempDir)
      expect(index.version).toBe("1.0.0")
    })

    test("throws on invalid JSON", async () => {
      await writeFile(
        join(tempDir, "work", "index.json"),
        "not valid json",
      )

      expect(() => loadIndex(tempDir)).toThrow("Failed to parse index.json")
    })
  })

  describe("saveIndex", () => {
    test("saves index to file", async () => {
      const index: WorkIndex = {
        version: "1.0.0",
        last_updated: "",
        streams: [],
      }

      // Create the index file first (saveIndex expects it to exist or creates atomically)
      await writeFile(
        join(tempDir, "work", "index.json"),
        JSON.stringify(index),
      )

      saveIndex(tempDir, index)

      const loaded = loadIndex(tempDir)
      expect(loaded.version).toBe("1.0.0")
      // last_updated should be updated
      expect(loaded.last_updated).not.toBe("")
    })

    test("updates last_updated timestamp", async () => {
      const index: WorkIndex = {
        version: "1.0.0",
        last_updated: "old-date",
        streams: [],
      }

      await writeFile(
        join(tempDir, "work", "index.json"),
        JSON.stringify(index),
      )

      saveIndex(tempDir, index)

      const loaded = loadIndex(tempDir)
      expect(loaded.last_updated).not.toBe("old-date")
      expect(loaded.last_updated).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })
})

describe("workstream lookup functions", () => {
  const mockStream: StreamMetadata = {
    id: "001-test-stream",
    name: "test-stream",
    order: 1,
    size: "medium",
    session_estimated: {
      length: 4,
      unit: "session",
      session_minutes: [30, 45],
      session_iterations: [4, 8],
    },
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    path: "work/001-test-stream",
    generated_by: { workstreams: "0.1.0" },
  }

  const mockIndex: WorkIndex = {
    version: "1.0.0",
    last_updated: "2024-01-01",
    streams: [mockStream],
  }

  describe("findStream", () => {
    test("finds workstream by ID", () => {
      const result = findStream(mockIndex, "001-test-stream")
      expect(result).toEqual(mockStream)
    })

    test("finds workstream by name", () => {
      const result = findStream(mockIndex, "test-stream")
      expect(result).toEqual(mockStream)
    })

    test("returns undefined when not found", () => {
      const result = findStream(mockIndex, "nonexistent")
      expect(result).toBeUndefined()
    })
  })

  describe("getStream", () => {
    test("returns workstream when found", () => {
      const result = getStream(mockIndex, "001-test-stream")
      expect(result).toEqual(mockStream)
    })

    test("throws when not found", () => {
      expect(() => getStream(mockIndex, "nonexistent")).toThrow(
        'Workstream "nonexistent" not found',
      )
    })
  })

  describe("getNextOrderNumber", () => {
    test("returns 0 for empty index", () => {
      const emptyIndex: WorkIndex = {
        version: "1.0.0",
        last_updated: "",
        streams: [],
      }
      expect(getNextOrderNumber(emptyIndex)).toBe(0)
    })

    test("returns max + 1 for existing workstreams", () => {
      const index: WorkIndex = {
        version: "1.0.0",
        last_updated: "",
        streams: [
          { ...mockStream, order: 1 },
          { ...mockStream, id: "002-another", order: 5 },
          { ...mockStream, id: "003-third", order: 3 },
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
    await mkdir(join(tempDir, "work"), { recursive: true })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe("saveIndexSafe", () => {
    test("saves index with locking", async () => {
      const index: WorkIndex = {
        version: "1.0.0",
        last_updated: "old-date",
        streams: [],
      }
      // Create the index file first
      await writeFile(
        join(tempDir, "work", "index.json"),
        JSON.stringify(index),
      )

      await saveIndexSafe(tempDir, index)

      const loaded = loadIndex(tempDir)
      expect(loaded.version).toBe("1.0.0")
      expect(loaded.last_updated).not.toBe("old-date")
    })

    test("updates last_updated timestamp", async () => {
      const index: WorkIndex = {
        version: "1.0.0",
        last_updated: "2020-01-01",
        streams: [],
      }
      await writeFile(
        join(tempDir, "work", "index.json"),
        JSON.stringify(index),
      )

      await saveIndexSafe(tempDir, index)

      const loaded = loadIndex(tempDir)
      expect(loaded.last_updated).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe("modifyIndex", () => {
    test("performs atomic read-modify-write", async () => {
      const initialIndex: WorkIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01",
        streams: [],
      }
      await writeFile(
        join(tempDir, "work", "index.json"),
        JSON.stringify(initialIndex),
      )

      const result = await modifyIndex(tempDir, (index) => {
        index.streams.push({
          id: "001-test",
          name: "test",
          order: 0,
          size: "short",
          session_estimated: {
            length: 1,
            unit: "session",
            session_minutes: [30, 45],
            session_iterations: [4, 8],
          },
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
          path: "work/001-test",
          generated_by: { workstreams: "0.1.0" },
        })
        return index.streams.length
      })

      expect(result).toBe(1)
      const loaded = loadIndex(tempDir)
      expect(loaded.streams).toHaveLength(1)
      expect(loaded.streams[0]?.id).toBe("001-test")
    })

    test("returns value from modifier function", async () => {
      const initialIndex: WorkIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01",
        streams: [],
      }
      await writeFile(
        join(tempDir, "work", "index.json"),
        JSON.stringify(initialIndex),
      )

      const result = await modifyIndex(tempDir, () => "custom-result")

      expect(result).toBe("custom-result")
    })
  })

  describe("deleteStream", () => {
    const mockStream: StreamMetadata = {
      id: "001-test-stream",
      name: "test-stream",
      order: 0,
      size: "short",
      session_estimated: {
        length: 1,
        unit: "session",
        session_minutes: [30, 45],
        session_iterations: [4, 8],
      },
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
      path: "work/001-test-stream",
      generated_by: { workstreams: "0.1.0" },
    }

    test("removes workstream from index by ID", async () => {
      const index: WorkIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01",
        streams: [mockStream],
      }
      await writeFile(
        join(tempDir, "work", "index.json"),
        JSON.stringify(index),
      )

      const result = await deleteStream(tempDir, "001-test-stream")

      expect(result.deleted).toBe(true)
      expect(result.streamId).toBe("001-test-stream")
      const loaded = loadIndex(tempDir)
      expect(loaded.streams).toHaveLength(0)
    })

    test("removes workstream from index by name", async () => {
      const index: WorkIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01",
        streams: [mockStream],
      }
      await writeFile(
        join(tempDir, "work", "index.json"),
        JSON.stringify(index),
      )

      const result = await deleteStream(tempDir, "test-stream")

      expect(result.deleted).toBe(true)
      expect(result.streamId).toBe("001-test-stream")
    })

    test("throws when workstream not found", async () => {
      const index: WorkIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01",
        streams: [],
      }
      await writeFile(
        join(tempDir, "work", "index.json"),
        JSON.stringify(index),
      )

      await expect(deleteStream(tempDir, "nonexistent")).rejects.toThrow(
        'Workstream "nonexistent" not found',
      )
    })

    test("deletes workstream files when deleteFiles option is true", async () => {
      const index: WorkIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01",
        streams: [mockStream],
      }
      await writeFile(
        join(tempDir, "work", "index.json"),
        JSON.stringify(index),
      )
      // Create the workstream directory
      const streamDir = join(tempDir, "work", "001-test-stream")
      await mkdir(streamDir, { recursive: true })
      await writeFile(join(streamDir, "README.md"), "# Test Stream")

      const result = await deleteStream(tempDir, "001-test-stream", {
        deleteFiles: true,
      })

      expect(result.deleted).toBe(true)
      expect(existsSync(streamDir)).toBe(false)
    })

    test("does not delete files when deleteFiles option is false", async () => {
      const index: WorkIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01",
        streams: [mockStream],
      }
      await writeFile(
        join(tempDir, "work", "index.json"),
        JSON.stringify(index),
      )
      const streamDir = join(tempDir, "work", "001-test-stream")
      await mkdir(streamDir, { recursive: true })
      await writeFile(join(streamDir, "README.md"), "# Test Stream")

      await deleteStream(tempDir, "001-test-stream", { deleteFiles: false })

      expect(existsSync(streamDir)).toBe(true)
    })

    test("handles missing workstream directory gracefully when deleteFiles is true", async () => {
      const index: WorkIndex = {
        version: "1.0.0",
        last_updated: "2024-01-01",
        streams: [mockStream],
      }
      await writeFile(
        join(tempDir, "work", "index.json"),
        JSON.stringify(index),
      )
      // Don't create the workstream directory

      const result = await deleteStream(tempDir, "001-test-stream", {
        deleteFiles: true,
      })

      expect(result.deleted).toBe(true)
    })
  })
})
