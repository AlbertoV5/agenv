import { describe, test, expect } from "bun:test"
import { parseStreamDocument } from "../src/lib/stream-parser"

describe("parser debug", () => {
  test("parses batches correctly in sequence", () => {
    // First call (like in appendFixStage)
    const content1 = `
# Plan: Test Stream
## Summary
Summary text.
## Stages
### Stage 01: Initial
`
    const errors1: any[] = []
    parseStreamDocument(content1, errors1)

    // Second call (like in appendFixBatch)
    const content2 = `# Plan: Test Stream
## Summary
Summary text.

## Stages

### Stage 01: Initial

#### Batches

##### Batch 01: Setup

###### Thread 01: Init

### Stage 2: Next
`
    const errors2: any[] = []

    const doc = parseStreamDocument(content2, errors2)
    console.log("Doc:", JSON.stringify(doc, null, 2))

    expect(doc?.stages[0]?.batches.length).toBe(1)
  })
})
