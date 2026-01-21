import { describe, expect, test } from "bun:test"
import {
    getWorkSessionName,
    buildCreateSessionCommand,
    buildAddWindowCommand,
    buildAttachCommand
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
})
