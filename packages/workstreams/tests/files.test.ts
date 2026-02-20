import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { getFilesRecursively } from "../src/lib/files"

describe("files", () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenv-files-test-"))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  test("returns empty array for non-existent directory", () => {
    const files = getFilesRecursively(join(tempDir, "nonexistent"), tempDir)
    expect(files).toEqual([])
  })

  test("lists files recursively", async () => {
    // Create nested structure
    await mkdir(join(tempDir, "subdir"), { recursive: true })
    await writeFile(join(tempDir, "file1.txt"), "content1")
    await writeFile(join(tempDir, "subdir", "file2.txt"), "content2")

    const files = getFilesRecursively(tempDir, tempDir)

    expect(files).toHaveLength(2)
    expect(files.map(f => f.path).sort()).toEqual(["file1.txt", "subdir/file2.txt"])
  })

  test("skips hidden files", async () => {
    await writeFile(join(tempDir, ".hidden"), "hidden")
    await writeFile(join(tempDir, "visible.txt"), "visible")

    const files = getFilesRecursively(tempDir, tempDir)

    expect(files).toHaveLength(1)
    expect(files[0]?.name).toBe("visible.txt")
  })
})
