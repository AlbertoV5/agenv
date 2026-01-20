import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtemp, rm, mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  parseAgentsMd,
  generateAgentsMd,
  getAgentsConfig,
  saveAgentsConfig,
  addAgent,
  removeAgent,
  getAgent,
  listAgents,
} from "../../src/lib/agents"
import type { AgentsConfig, AgentDefinition } from "../../src/lib/types"

describe("parseAgentsMd", () => {
  test("parses valid AGENTS.md with agent definitions", () => {
    const content = `# Agents

## Agent Definitions

### backend-orm-expert
**Description:** Specializes in database schema design, ORM configuration, migrations, and query optimization.
**Best for:** Database setup, migration scripts, complex queries, performance tuning.
**Model:** claude-opus

### frontend-styling
**Description:** Focuses on CSS architecture, component styling, design system implementation.
**Best for:** UI polish, style refactors, design system tokens.
**Model:** claude-sonnet
`

    const { config, errors } = parseAgentsMd(content)

    expect(errors).toHaveLength(0)
    expect(config).not.toBeNull()
    expect(config!.agents).toHaveLength(2)
    expect(config!.agents[0]).toEqual({
      name: "backend-orm-expert",
      description: "Specializes in database schema design, ORM configuration, migrations, and query optimization.",
      bestFor: "Database setup, migration scripts, complex queries, performance tuning.",
      model: "claude-opus",
    })
    expect(config!.agents[1]).toEqual({
      name: "frontend-styling",
      description: "Focuses on CSS architecture, component styling, design system implementation.",
      bestFor: "UI polish, style refactors, design system tokens.",
      model: "claude-sonnet",
    })
  })

  test("parses AGENTS.md with no agents", () => {
    const content = `# Agents

## Agent Definitions
`

    const { config, errors } = parseAgentsMd(content)

    expect(errors).toHaveLength(0)
    expect(config!.agents).toHaveLength(0)
  })

  test("handles missing fields gracefully (agent not added)", () => {
    const content = `# Agents

## Agent Definitions

### incomplete-agent
**Description:** This agent is incomplete
`

    const { config, errors } = parseAgentsMd(content)

    expect(errors).toHaveLength(0)
    // Agent should not be added because it's missing required fields
    expect(config!.agents).toHaveLength(0)
  })
})

describe("generateAgentsMd", () => {
  test("generates valid AGENTS.md from config", () => {
    const config: AgentsConfig = {
      agents: [
        {
          name: "backend-orm-expert",
          description: "Specializes in database schema design",
          bestFor: "Database setup, migrations",
          model: "claude-opus",
        },
      ],
    }

    const content = generateAgentsMd(config)

    expect(content).toContain("# Agents")
    expect(content).toContain("## Agent Definitions")
    expect(content).toContain("### backend-orm-expert")
    expect(content).toContain("**Description:** Specializes in database schema design")
    expect(content).toContain("**Best for:** Database setup, migrations")
    expect(content).toContain("**Model:** claude-opus")
  })

  test("roundtrip: parse -> generate -> parse produces same result", () => {
    const original: AgentsConfig = {
      agents: [
        {
          name: "backend-orm-expert",
          description: "Specializes in database schema design, ORM configuration",
          bestFor: "Database setup, migration scripts",
          model: "claude-opus",
        },
        {
          name: "frontend-styling",
          description: "Focuses on CSS architecture, component styling",
          bestFor: "UI polish, style refactors",
          model: "claude-sonnet",
        },
      ],
    }

    const generated = generateAgentsMd(original)
    const { config: parsed, errors } = parseAgentsMd(generated)

    expect(errors).toHaveLength(0)
    expect(parsed!.agents).toHaveLength(2)
    expect(parsed!.agents[0]!.name).toBe("backend-orm-expert")
    expect(parsed!.agents[0]!.model).toBe("claude-opus")
    expect(parsed!.agents[1]!.name).toBe("frontend-styling")
    expect(parsed!.agents[1]!.model).toBe("claude-sonnet")
  })
})

describe("file operations", () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenv-agents-test-"))
    await mkdir(join(tempDir, "work"), { recursive: true })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  test("getAgentsConfig returns null when file doesn't exist", () => {
    const config = getAgentsConfig(tempDir)
    expect(config).toBeNull()
  })

  test("saveAgentsConfig creates file and getAgentsConfig reads it", async () => {
    const config: AgentsConfig = {
      agents: [
        {
          name: "test-agent",
          description: "Testing agent",
          bestFor: "Testing",
          model: "claude-sonnet",
        },
      ],
    }

    saveAgentsConfig(tempDir, config)

    const loaded = getAgentsConfig(tempDir)
    expect(loaded).not.toBeNull()
    expect(loaded!.agents).toHaveLength(1)
    expect(loaded!.agents[0]!.name).toBe("test-agent")
  })

  test("addAgent creates new agent", async () => {
    const agent: AgentDefinition = {
      name: "new-agent",
      description: "New agent description",
      bestFor: "New use cases",
      model: "claude-opus",
    }

    addAgent(tempDir, agent)

    const config = getAgentsConfig(tempDir)
    expect(config!.agents).toHaveLength(1)
    expect(config!.agents[0]!.name).toBe("new-agent")
    expect(config!.agents[0]!.model).toBe("claude-opus")
  })

  test("addAgent updates existing agent", async () => {
    addAgent(tempDir, {
      name: "agent",
      description: "Old description",
      bestFor: "Old use cases",
      model: "claude-sonnet",
    })
    addAgent(tempDir, {
      name: "agent",
      description: "New description",
      bestFor: "New use cases",
      model: "claude-opus",
    })

    const config = getAgentsConfig(tempDir)
    expect(config!.agents).toHaveLength(1)
    expect(config!.agents[0]!.description).toBe("New description")
    expect(config!.agents[0]!.model).toBe("claude-opus")
  })

  test("removeAgent removes agent", async () => {
    const config: AgentsConfig = {
      agents: [
        { name: "agent1", description: "Desc1", bestFor: "Use1", model: "claude-opus" },
        { name: "agent2", description: "Desc2", bestFor: "Use2", model: "claude-sonnet" },
      ],
    }
    saveAgentsConfig(tempDir, config)

    const removed = removeAgent(tempDir, "agent1")

    expect(removed).toBe(true)
    const loaded = getAgentsConfig(tempDir)
    expect(loaded!.agents).toHaveLength(1)
    expect(loaded!.agents[0]!.name).toBe("agent2")
  })

  test("removeAgent returns false for non-existent agent", async () => {
    const removed = removeAgent(tempDir, "non-existent")
    expect(removed).toBe(false)
  })
})

describe("lookup operations", () => {
  test("getAgent finds agent by name", () => {
    const config: AgentsConfig = {
      agents: [
        { name: "backend-expert", description: "Backend", bestFor: "Backend tasks", model: "claude-opus" },
        { name: "frontend-expert", description: "Frontend", bestFor: "Frontend tasks", model: "claude-sonnet" },
      ],
    }

    const agent = getAgent(config, "backend-expert")
    expect(agent).not.toBeNull()
    expect(agent!.name).toBe("backend-expert")
    expect(agent!.model).toBe("claude-opus")
  })

  test("getAgent returns null when not found", () => {
    const config: AgentsConfig = {
      agents: [
        { name: "backend-expert", description: "Backend", bestFor: "Backend tasks", model: "claude-opus" },
      ],
    }

    const agent = getAgent(config, "non-existent")
    expect(agent).toBeNull()
  })

  test("listAgents returns all agents", () => {
    const config: AgentsConfig = {
      agents: [
        { name: "agent1", description: "Desc1", bestFor: "Use1", model: "claude-opus" },
        { name: "agent2", description: "Desc2", bestFor: "Use2", model: "claude-sonnet" },
      ],
    }

    const agents = listAgents(config)
    expect(agents).toHaveLength(2)
    expect(agents[0]!.name).toBe("agent1")
    expect(agents[1]!.name).toBe("agent2")
  })
})
