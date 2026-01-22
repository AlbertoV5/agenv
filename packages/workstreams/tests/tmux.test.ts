import { describe, expect, test } from "bun:test"
import {
    getWorkSessionName,
    buildCreateSessionCommand,
    buildAddWindowCommand,
    buildAttachCommand,
    getSessionPaneStatuses,
    getPaneStatus,
    isPaneAlive,
    getPaneExitCode,
    getExitedPanes,
    getAlivePanes,
    type PaneStatus,
} from "../src/lib/tmux"

describe("tmux lib", () => {
    describe("getWorkSessionName", () => {
        test("truncates long names", () => {
            const longId = "001-very-long-stream-name-that-is-too-long"
            const name = getWorkSessionName(longId)
            expect(name).toBe("work-001-very-long-stream")
            expect(name.length).toBeLessThanOrEqual(25) // work- prefix + 20 chars
        })

        test("keeps short names", () => {
            const shortId = "001-test"
            expect(getWorkSessionName(shortId)).toBe("work-001-test")
        })
    })

    describe("build commands", () => {
        test("buildCreateSessionCommand quotes arguments", () => {
            const cmd = buildCreateSessionCommand("session", "win", "echo 'hello'")
            expect(cmd).toBe('tmux new-session -d -s "session" -n "win" "echo \'hello\'"')
        })

        test("buildAddWindowCommand quotes arguments", () => {
            const cmd = buildAddWindowCommand("session", "win2", "ls -la")
            expect(cmd).toBe('tmux new-window -t "session" -n "win2" "ls -la"')
        })

        test("buildAttachCommand quotes session name", () => {
            const cmd = buildAttachCommand("session-name")
            expect(cmd).toBe('tmux attach -t "session-name"')
        })
    })

    describe("pane status functions", () => {
        // Note: These functions interact with tmux, so we can only test 
        // their behavior when tmux is not available (graceful fallbacks)

        test("getSessionPaneStatuses returns empty array for non-existent session", () => {
            const statuses = getSessionPaneStatuses("non-existent-session-12345")
            expect(statuses).toEqual([])
        })

        test("getPaneStatus returns null for non-existent pane", () => {
            const status = getPaneStatus("non-existent-session:0.0")
            expect(status).toBeNull()
        })

        test("isPaneAlive returns false for non-existent pane", () => {
            const alive = isPaneAlive("non-existent-session:0.0")
            expect(alive).toBe(false)
        })

        test("getPaneExitCode returns null for non-existent pane", () => {
            const exitCode = getPaneExitCode("non-existent-session:0.0")
            expect(exitCode).toBeNull()
        })

        test("getExitedPanes returns empty array for non-existent session", () => {
            const exited = getExitedPanes("non-existent-session-12345")
            expect(exited).toEqual([])
        })

        test("getAlivePanes returns empty array for non-existent session", () => {
            const alive = getAlivePanes("non-existent-session-12345")
            expect(alive).toEqual([])
        })
    })
})
