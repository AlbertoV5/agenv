import { describe, expect, test, afterEach } from "bun:test"
import { execSync } from "child_process"
import {
    createSession,
    createGridLayout,
    killSession,
    listPaneIds,
} from "../src/lib/tmux"

/**
 * Tests for tmux grid layout functionality
 * 
 * These tests verify the createGridLayout function produces correct
 * 2x2 grid arrangements for various pane counts.
 */
describe("tmux grid layout", () => {
    const testSessions: string[] = []

    // Helper to get a unique session name
    const getTestSessionName = () => {
        const name = `test-grid-${Math.random().toString(36).substring(7)}`
        testSessions.push(name)
        return name
    }

    // Cleanup after each test
    afterEach(() => {
        testSessions.forEach(name => {
            try {
                execSync(`tmux kill-session -t "${name}" 2>/dev/null`)
            } catch {}
        })
        testSessions.length = 0
    })

    /**
     * Get pane positions from tmux
     * Returns array of { paneId, top, left } for each pane
     */
    function getPanePositions(sessionWindow: string): Array<{
        paneId: string
        top: number
        left: number
    }> {
        try {
            const output = execSync(
                `tmux list-panes -t "${sessionWindow}" -F "#{pane_id}|#{pane_top}|#{pane_left}"`,
                { encoding: "utf-8", stdio: "pipe" }
            )
            return output.trim().split("\n").map(line => {
                const [paneId, top, left] = line.split("|")
                return {
                    paneId: paneId || "",
                    top: parseInt(top || "0", 10),
                    left: parseInt(left || "0", 10),
                }
            })
        } catch {
            return []
        }
    }

    /**
     * Verify a 2x2 grid layout is correct
     * Should have exactly one pane in each quadrant:
     * - TL (top=0, left=0)
     * - TR (top=0, left>0)
     * - BL (top>0, left=0)
     * - BR (top>0, left>0)
     */
    function verify2x2Grid(sessionWindow: string): {
        valid: boolean
        positions: { TL: number; TR: number; BL: number; BR: number }
    } {
        const positions = getPanePositions(sessionWindow)
        
        const TL = positions.filter(p => p.top === 0 && p.left === 0).length
        const TR = positions.filter(p => p.top === 0 && p.left > 0).length
        const BL = positions.filter(p => p.top > 0 && p.left === 0).length
        const BR = positions.filter(p => p.top > 0 && p.left > 0).length

        return {
            valid: TL === 1 && TR === 1 && BL === 1 && BR === 1,
            positions: { TL, TR, BL, BR },
        }
    }

    describe("createGridLayout", () => {
        test("1 pane: returns single pane", () => {
            const sessionName = getTestSessionName()
            createSession(sessionName, "grid", "sleep 30")

            const target = `${sessionName}:grid`
            const commands = ["sleep 30"]
            
            const paneIds = createGridLayout(target, commands)
            
            expect(paneIds).toHaveLength(1)
            expect(listPaneIds(target)).toHaveLength(1)
        })

        test("2 panes: left/right horizontal split", () => {
            const sessionName = getTestSessionName()
            createSession(sessionName, "grid", "sleep 30")

            const target = `${sessionName}:grid`
            const commands = ["sleep 30", "sleep 30"]
            
            const paneIds = createGridLayout(target, commands)
            
            expect(paneIds).toHaveLength(2)
            
            const positions = getPanePositions(target)
            expect(positions).toHaveLength(2)
            
            // Both at top (same row)
            const topPanes = positions.filter(p => p.top === 0)
            expect(topPanes).toHaveLength(2)
            
            // One on left, one on right
            const leftPane = positions.filter(p => p.left === 0)
            const rightPane = positions.filter(p => p.left > 0)
            expect(leftPane).toHaveLength(1)
            expect(rightPane).toHaveLength(1)
        })

        test("3 panes: TL, BL, and full-height right", () => {
            const sessionName = getTestSessionName()
            createSession(sessionName, "grid", "sleep 30")

            const target = `${sessionName}:grid`
            const commands = ["sleep 30", "sleep 30", "sleep 30"]
            
            const paneIds = createGridLayout(target, commands)
            
            expect(paneIds).toHaveLength(3)
            
            const positions = getPanePositions(target)
            expect(positions).toHaveLength(3)
            
            // Left column: 2 panes (top and bottom)
            const leftPanes = positions.filter(p => p.left === 0)
            expect(leftPanes).toHaveLength(2)
            
            // Right column: 1 pane (full height)
            const rightPanes = positions.filter(p => p.left > 0)
            expect(rightPanes).toHaveLength(1)
            expect(rightPanes[0]?.top).toBe(0) // Starts at top
        })

        test("4 panes: correct 2x2 grid layout", () => {
            const sessionName = getTestSessionName()
            createSession(sessionName, "grid", "sleep 30")

            const target = `${sessionName}:grid`
            const commands = ["sleep 30", "sleep 30", "sleep 30", "sleep 30"]
            
            const paneIds = createGridLayout(target, commands)
            
            expect(paneIds).toHaveLength(4)
            
            // Verify 2x2 grid structure
            const result = verify2x2Grid(target)
            
            expect(result.valid).toBe(true)
            expect(result.positions).toEqual({
                TL: 1,
                TR: 1,
                BL: 1,
                BR: 1,
            })
        })

        test("4 panes: grid layout NOT 1+3 stacked", () => {
            const sessionName = getTestSessionName()
            createSession(sessionName, "grid", "sleep 30")

            const target = `${sessionName}:grid`
            const commands = ["sleep 30", "sleep 30", "sleep 30", "sleep 30"]
            
            createGridLayout(target, commands)
            
            const positions = getPanePositions(target)
            
            // The bug was 3 panes stacked on left (all left=0), 1 on right
            // Verify this is NOT the case
            const leftPanes = positions.filter(p => p.left === 0)
            const rightPanes = positions.filter(p => p.left > 0)
            
            // Should be 2 on each side, NOT 3+1
            expect(leftPanes.length).toBe(2)
            expect(rightPanes.length).toBe(2)
        })

        test("throws error for empty commands array", () => {
            const sessionName = getTestSessionName()
            createSession(sessionName, "grid", "sleep 30")

            const target = `${sessionName}:grid`
            
            expect(() => createGridLayout(target, [])).toThrow(
                "createGridLayout requires at least 1 command"
            )
        })

        test("returns all pane IDs in consistent order", () => {
            const sessionName = getTestSessionName()
            createSession(sessionName, "grid", "sleep 30")

            const target = `${sessionName}:grid`
            const commands = ["sleep 30", "sleep 30", "sleep 30", "sleep 30"]
            
            const paneIds = createGridLayout(target, commands)
            const currentPanes = listPaneIds(target)
            
            // All returned IDs should be valid pane IDs
            paneIds.forEach(id => {
                expect(id).toStartWith("%")
                expect(currentPanes).toContain(id)
            })
        })
    })
})
