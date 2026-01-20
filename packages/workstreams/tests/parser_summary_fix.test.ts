
import { expect, test, describe } from "bun:test";
import { parseStreamDocument } from "../src/lib/stream-parser";

describe("Stream Parser Summary Fix", () => {
    test("should extract summary when text is on the same line as the header", () => {
        const content = `
# Plan: Test Stream

## Summary
Test summary

## Stages

### Stage 1: Setup

#### Stage Batches

##### Batch 01: Core

###### Thread 01: Test Thread

**Summary:** This summary is on the same line as the header.

**Details:**
Some details.
`;

        const errors: any[] = [];
        const doc = parseStreamDocument(content, errors);

        expect(errors).toHaveLength(0);
        expect(doc).not.toBeNull();
        if (doc && doc.stages[0] && doc.stages[0].batches[0] && doc.stages[0].batches[0].threads[0]) {
            const thread = doc.stages[0].batches[0].threads[0];
            expect(thread.summary).toBe("This summary is on the same line as the header.");
        } else {
            throw new Error("Structure not parsed correctly");
        }
    });

    test("should extract summary when text is on the newline", () => {
        const content = `
# Plan: Test Stream

## Summary
Test summary

## Stages

### Stage 1: Setup

#### Stage Batches

##### Batch 01: Core

###### Thread 01: Test Thread

**Summary:**
This summary is on a new line.

**Details:**
Some details.
`;
        const errors: any[] = [];
        const doc = parseStreamDocument(content, errors);
        expect(doc?.stages[0]?.batches[0]?.threads[0]?.summary).toBe("This summary is on a new line.");
    });
});
