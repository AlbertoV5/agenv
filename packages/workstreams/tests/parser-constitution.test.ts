import { describe, test, expect } from "bun:test"
import { parseStreamDocument } from "../src/lib/stream-parser"

describe("parseStreamDocument - Constitution", () => {
    test("unknown H4 sections don't capture content as questions", () => {
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
Constitution text

#### Stage Questions
- [x] Question 1 resolved
- [ ] Question 2 open

#### Problem Analysis

**Analysis header:**
1. Numbered item one
2. Numbered item two

- Bullet item A
- Bullet item B

#### Stage Batches
##### Batch 01: Implementation
###### Thread 01: Work
**Summary:** Do work
**Details:** Work details
`

        const errors: any[] = []
        const doc = parseStreamDocument(content, errors)

        expect(doc).not.toBeNull()
        expect(errors).toHaveLength(0)
        
        // Should only have the 2 questions from the "Stage Questions" section
        // NOT the items from "Problem Analysis"
        expect(doc?.stages[0]?.questions).toHaveLength(2)
        expect(doc?.stages[0]?.questions[0]?.question).toBe("Question 1 resolved")
        expect(doc?.stages[0]?.questions[0]?.resolved).toBe(true)
        expect(doc?.stages[0]?.questions[1]?.question).toBe("Question 2 open")
        expect(doc?.stages[0]?.questions[1]?.resolved).toBe(false)
    })

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
