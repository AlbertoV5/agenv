import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { findOpenQuestions, extractInputFileReferences, findMissingInputFiles } from "../src/lib/analysis"

describe("Analysis Logic", () => {

    describe("findOpenQuestions", () => {
        test("finds unchecked items with line numbers", () => {
            const content = `
# Plan
- [ ] Task 1
- [x] Task 2
- [ ] Task 3
`
            const result = findOpenQuestions(content)
            expect(result).toHaveLength(2)
            expect(result[0]).toEqual({ line: 3, question: "Task 1", stage: undefined })
            expect(result[1]).toEqual({ line: 5, question: "Task 3", stage: undefined })
        })

        test("identifies stage context", () => {
            const content = `
### Stage 1: Planning
- [ ] Question 1

### Stage 2: Execution
- [ ] Question 2
`
            const result = findOpenQuestions(content)
            expect(result).toHaveLength(2)
            expect(result[0]?.question).toBe("Question 1")
            expect(result[0]?.stage).toBe(1)
            expect(result[1]?.question).toBe("Question 2")
            expect(result[1]?.stage).toBe(2)
        })
    })

    describe("extractInputFileReferences", () => {
        test("extracts inputs from Inputs section", () => {
            const content = `
## Stage 1
**Inputs:**
- \`input1.txt\`
- [input2.md](file://input2.md)
- input3.json
`
            const result = extractInputFileReferences(content)
            expect(result).toContain("input1.txt")
            expect(result).toContain("input2.md")
            expect(result).toContain("input3.json")
            expect(result).toHaveLength(3)
        })

        test("ignores files outside Inputs section", () => {
            const content = `
Check \`other.txt\`
**Inputs:**
- \`input.txt\`
`
            const result = extractInputFileReferences(content)
            expect(result).toEqual(["input.txt"])
        })
    })

    describe("findMissingInputFiles", () => {
        let tempDir: string

        beforeEach(async () => {
            tempDir = await mkdtemp(join(tmpdir(), "workstreams-test-"))
        })

        afterEach(async () => {
            await rm(tempDir, { recursive: true, force: true })
        })

        test("reports missing files", () => {
            const missing = findMissingInputFiles(tempDir, join(tempDir, "PLAN.md"), ["missing.txt"])
            expect(missing).toEqual(["missing.txt"])
        })

        test("does not report existing files", async () => {
            await writeFile(join(tempDir, "exists.txt"), "content")
            const missing = findMissingInputFiles(tempDir, join(tempDir, "PLAN.md"), ["exists.txt"])
            expect(missing).toHaveLength(0)
        })

        test("checks relative paths", async () => {
            await mkdir(join(tempDir, "files"))
            await writeFile(join(tempDir, "files/exists.txt"), "content")
            const missing = findMissingInputFiles(tempDir, join(tempDir, "work/PLAN.md"), ["files/exists.txt"])
            // Note: findMissingInputFiles checks relative to Plan or Repo. 
            // If PLAN.md is deep, relative resolution might fail if not careful, but relative to repoRoot (tempDir) should work.
            // implementation: check [planDir/file, repoRoot/file, file]
            expect(missing).toHaveLength(0)
        })
    })
})
