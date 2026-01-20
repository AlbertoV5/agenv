import { describe, test, expect } from "bun:test"
import { parseStreamDocument } from "../src/lib/stream-parser"

describe("parseStreamDocument - Constitution", () => {
    test("parses free-form constitution text", () => {
        const content = `# Plan: Test Stream

## Summary
Test summary

## References
- ref1

## Stages

### Stage 01: Setup

#### Stage Definition
Defines the stage

#### Stage Constitution
This is a free-form constitution.
It has multiple lines.

- It might even have a list
- But it's all just text string now

#### Stage Questions
- [ ] Question 1

#### Stage Batches
##### Batch 01: Implementation
`

        const errors: any[] = []
        const doc = parseStreamDocument(content, errors)

        expect(doc).not.toBeNull()
        expect(errors).toHaveLength(0)
        expect(doc?.stages[0]?.constitution).toContain("This is a free-form constitution.")
        expect(doc?.stages[0]?.constitution).toContain("It has multiple lines.")
        expect(doc?.stages[0]?.constitution).toContain("- It might even have a list")
    })
})
