import { existsSync } from "fs" // Use node:fs or fs? using fs to match existing file, but typically node:fs is better. existing file used "fs".
import { join, dirname } from "path"

export interface OpenQuestion {
    line: number
    question: string
    stage?: number
}

/**
 * Find open questions (unchecked checkboxes) with line numbers and context
 */
export function findOpenQuestions(content: string): OpenQuestion[] {
    const lines = content.split("\n")
    const questions: OpenQuestion[] = []
    let currentStage: number | undefined

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!

        // Track current stage
        const stageMatch = line.match(/^###\s+Stage\s+(\d+):/i)
        if (stageMatch) {
            currentStage = parseInt(stageMatch[1]!, 10)
        }

        // Find unchecked items
        const checkboxMatch = line.match(/\[\s\]\s*(.*)$/)
        if (checkboxMatch) {
            questions.push({
                line: i + 1,
                question: checkboxMatch[1]!.trim(),
                stage: currentStage
            })
        }
    }

    return questions
}

/**
 * Extract file paths referenced in Constitution "Inputs:" sections
 */
export function extractInputFileReferences(content: string): string[] {
    const files: string[] = []
    const lines = content.split("\n")
    let inInputsSection = false

    for (const line of lines) {
        // Detect Inputs section start
        if (/\*\*Inputs:\*\*/i.test(line) || /^Inputs:/i.test(line.trim())) {
            inInputsSection = true
            continue
        }

        // End of Inputs section (new bold header or H4/H5)
        if (inInputsSection && (/^\*\*[^*]+\*\*/.test(line.trim()) || /^#{4,5}\s/.test(line))) {
            inInputsSection = false
        }

        // Extract file paths from list items in Inputs section
        if (inInputsSection && line.trim().startsWith("-")) {
            // Look for file path patterns
            const filePatterns = [
                /`([^`]+\.[a-z]+)`/gi, // `file.ext`
                /\[([^\]]+)\]\(file:\/\/([^)]+)\)/gi, // [name](file://path)
                /(?:^|\s)([\w./-]+\.[a-z]{1,4})(?:\s|$)/gi // plain file.ext
            ]

            for (const pattern of filePatterns) {
                let match
                while ((match = pattern.exec(line)) !== null) {
                    const file = match[2] || match[1]
                    if (file && !file.includes("*")) {
                        files.push(file)
                    }
                }
            }
        }
    }

    return [...new Set(files)] // dedupe
}

/**
 * Check which referenced files don't exist
 */
export function findMissingInputFiles(repoRoot: string, planMdPath: string, files: string[]): string[] {
    const planDir = dirname(planMdPath)
    const missing: string[] = []

    for (const file of files) {
        // Try multiple locations: relative to plan, relative to repo, absolute
        const candidates = [
            join(planDir, file),
            join(repoRoot, file),
            file
        ]

        const exists = candidates.some(p => existsSync(p))
        if (!exists) {
            missing.push(file)
        }
    }

    return missing
}
