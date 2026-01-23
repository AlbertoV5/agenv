/**
 * agents.yaml parser and manager
 *
 * Handles the agents.yaml configuration file at work/agents.yaml
 * which defines available agents with their descriptions and models.
 *
 * Supports multiple models per agent with optional variants for retry logic.
 * Agent-to-task assignments are stored in tasks.json (Task.assigned_agent).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { parse as parseYaml, stringify as stringifyYaml } from "yaml"
import type {
    AgentsConfigYaml,
    AgentDefinitionYaml,
    SynthesisAgentDefinitionYaml,
    ModelSpec,
    NormalizedModelSpec,
} from "./types.ts"
import { getWorkDir } from "./repo.ts"
import { isValidModelFormat } from "./agents.ts"

/**
 * Get the agents.yaml file path
 */
export function getAgentsYamlPath(repoRoot: string): string {
    return join(getWorkDir(repoRoot), "agents.yaml")
}

/**
 * Normalize a ModelSpec to always have object form
 */
export function normalizeModelSpec(spec: ModelSpec): NormalizedModelSpec {
    if (typeof spec === "string") {
        return { model: spec }
    }
    return { model: spec.model, variant: spec.variant }
}

/**
 * Parse agents.yaml content to extract AgentsConfigYaml
 */
export function parseAgentsYaml(content: string): {
    config: AgentsConfigYaml | null
    errors: string[]
} {
    const errors: string[] = []

    try {
        const parsed = parseYaml(content)

        if (!parsed || typeof parsed !== "object") {
            errors.push("Invalid YAML: expected object at root")
            return { config: null, errors }
        }

        if (!Array.isArray(parsed.agents)) {
            errors.push("Invalid YAML: expected 'agents' array at root")
            return { config: null, errors }
        }

        const agents: AgentDefinitionYaml[] = []

        for (let i = 0; i < parsed.agents.length; i++) {
            const agent = parsed.agents[i]
            const prefix = `Agent ${i + 1}`

            if (!agent || typeof agent !== "object") {
                errors.push(`${prefix}: expected object`)
                continue
            }

            if (!agent.name || typeof agent.name !== "string") {
                errors.push(`${prefix}: missing or invalid 'name'`)
                continue
            }

            if (!agent.description || typeof agent.description !== "string") {
                errors.push(`Agent "${agent.name}": missing or invalid 'description'`)
                continue
            }

            if (!agent.best_for || typeof agent.best_for !== "string") {
                errors.push(`Agent "${agent.name}": missing or invalid 'best_for'`)
                continue
            }

            if (!Array.isArray(agent.models) || agent.models.length === 0) {
                errors.push(`Agent "${agent.name}": 'models' must be a non-empty array`)
                continue
            }

            // Validate each model
            const validModels: ModelSpec[] = []
            for (let j = 0; j < agent.models.length; j++) {
                const model = agent.models[j]
                let modelStr: string

                if (typeof model === "string") {
                    modelStr = model
                    validModels.push(model)
                } else if (model && typeof model === "object" && model.model) {
                    modelStr = model.model
                    validModels.push({ model: model.model, variant: model.variant })
                } else {
                    errors.push(
                        `Agent "${agent.name}": model ${j + 1} must be a string or object with 'model' field`
                    )
                    continue
                }

                if (!isValidModelFormat(modelStr)) {
                    errors.push(
                        `Agent "${agent.name}": model "${modelStr}" is not in provider/model format`
                    )
                }
            }

            if (validModels.length === 0) {
                errors.push(`Agent "${agent.name}": no valid models found`)
                continue
            }

            agents.push({
                name: agent.name,
                description: agent.description,
                best_for: agent.best_for,
                models: validModels,
            })
        }

        // Parse synthesis_agents if present
        const synthesisAgents: SynthesisAgentDefinitionYaml[] = []

        if (parsed.synthesis_agents !== undefined) {
            if (!Array.isArray(parsed.synthesis_agents)) {
                errors.push("Invalid YAML: 'synthesis_agents' must be an array if present")
            } else {
                for (let i = 0; i < parsed.synthesis_agents.length; i++) {
                    const agent = parsed.synthesis_agents[i]
                    const prefix = `Synthesis agent ${i + 1}`

                    if (!agent || typeof agent !== "object") {
                        errors.push(`${prefix}: expected object`)
                        continue
                    }

                    if (!agent.name || typeof agent.name !== "string") {
                        errors.push(`${prefix}: missing or invalid 'name'`)
                        continue
                    }

                    if (!agent.description || typeof agent.description !== "string") {
                        errors.push(`Synthesis agent "${agent.name}": missing or invalid 'description'`)
                        continue
                    }

                    if (!agent.best_for || typeof agent.best_for !== "string") {
                        errors.push(`Synthesis agent "${agent.name}": missing or invalid 'best_for'`)
                        continue
                    }

                    if (!Array.isArray(agent.models) || agent.models.length === 0) {
                        errors.push(`Synthesis agent "${agent.name}": 'models' must be a non-empty array`)
                        continue
                    }

                    // Validate each model (same logic as regular agents)
                    const validModels: ModelSpec[] = []
                    for (let j = 0; j < agent.models.length; j++) {
                        const model = agent.models[j]
                        let modelStr: string

                        if (typeof model === "string") {
                            modelStr = model
                            validModels.push(model)
                        } else if (model && typeof model === "object" && model.model) {
                            modelStr = model.model
                            validModels.push({ model: model.model, variant: model.variant })
                        } else {
                            errors.push(
                                `Synthesis agent "${agent.name}": model ${j + 1} must be a string or object with 'model' field`
                            )
                            continue
                        }

                        if (!isValidModelFormat(modelStr)) {
                            errors.push(
                                `Synthesis agent "${agent.name}": model "${modelStr}" is not in provider/model format`
                            )
                        }
                    }

                    if (validModels.length === 0) {
                        errors.push(`Synthesis agent "${agent.name}": no valid models found`)
                        continue
                    }

                    synthesisAgents.push({
                        name: agent.name,
                        description: agent.description,
                        best_for: agent.best_for,
                        models: validModels,
                    })
                }
            }
        }

        const config: AgentsConfigYaml = { agents }
        if (synthesisAgents.length > 0) {
            config.synthesis_agents = synthesisAgents
        }

        return { config, errors }
    } catch (e) {
        errors.push(`YAML parse error: ${e instanceof Error ? e.message : String(e)}`)
        return { config: null, errors }
    }
}

/**
 * Generate agents.yaml content from AgentsConfigYaml
 */
export function generateAgentsYaml(config: AgentsConfigYaml): string {
    return stringifyYaml(config, {
        indent: 2,
        lineWidth: 120,
    })
}

/**
 * Load AgentsConfigYaml from work/agents.yaml
 * Returns null if the file doesn't exist
 */
export function loadAgentsConfig(repoRoot: string): AgentsConfigYaml | null {
    const path = getAgentsYamlPath(repoRoot)
    if (!existsSync(path)) {
        return null
    }

    const content = readFileSync(path, "utf-8")
    const { config, errors } = parseAgentsYaml(content)

    if (errors.length > 0) {
        console.warn("Warnings parsing agents.yaml:", errors.join(", "))
    }

    return config
}

/**
 * Save AgentsConfigYaml to work/agents.yaml
 */
export function saveAgentsConfigYaml(
    repoRoot: string,
    config: AgentsConfigYaml
): void {
    const path = getAgentsYamlPath(repoRoot)
    const dir = dirname(path)

    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
    }

    const content = generateAgentsYaml(config)
    writeFileSync(path, content, "utf-8")
}

/**
 * List all available agents from YAML config
 */
export function listAgentsYaml(config: AgentsConfigYaml): AgentDefinitionYaml[] {
    return config.agents
}

/**
 * Get an agent by name from YAML config
 */
export function getAgentYaml(
    config: AgentsConfigYaml,
    name: string
): AgentDefinitionYaml | null {
    return config.agents.find((a) => a.name === name) || null
}

/**
 * Get all models for an agent as normalized specs
 */
export function getAgentModels(
    config: AgentsConfigYaml,
    agentName: string
): NormalizedModelSpec[] {
    const agent = getAgentYaml(config, agentName)
    if (!agent) {
        return []
    }
    return agent.models.map(normalizeModelSpec)
}

/**
 * Get the primary (first) model for an agent
 * Returns null if agent not found or has no models
 */
export function getPrimaryModel(
    config: AgentsConfigYaml,
    agentName: string
): NormalizedModelSpec | null {
    const models = getAgentModels(config, agentName)
    return models.length > 0 ? models[0]! : null
}

/**
 * Get a synthesis agent by name from YAML config
 * Returns null if not found
 */
export function getSynthesisAgent(
    config: AgentsConfigYaml,
    name: string
): SynthesisAgentDefinitionYaml | null {
    if (!config.synthesis_agents) {
        return null
    }
    return config.synthesis_agents.find((a) => a.name === name) || null
}

/**
 * Get the default (first) synthesis agent from YAML config
 * Returns null if no synthesis agents are defined
 */
export function getDefaultSynthesisAgent(
    config: AgentsConfigYaml
): SynthesisAgentDefinitionYaml | null {
    if (!config.synthesis_agents || config.synthesis_agents.length === 0) {
        return null
    }
    return config.synthesis_agents[0]!
}

/**
 * List all synthesis agents from YAML config
 */
export function listSynthesisAgents(
    config: AgentsConfigYaml
): SynthesisAgentDefinitionYaml[] {
    return config.synthesis_agents || []
}

/**
 * Get all models for a synthesis agent as normalized specs
 */
export function getSynthesisAgentModels(
    config: AgentsConfigYaml,
    agentName: string
): NormalizedModelSpec[] {
    const agent = getSynthesisAgent(config, agentName)
    if (!agent) {
        return []
    }
    return agent.models.map(normalizeModelSpec)
}
