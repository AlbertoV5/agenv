// src/lib/synthesis/config.ts
import { existsSync, readFileSync } from "fs";
import { join } from "path";
function getSynthesisConfigPath(repoRoot) {
  return join(repoRoot, "work", "synthesis.json");
}
function getDefaultSynthesisConfig() {
  return {
    enabled: false
  };
}
function loadSynthesisConfig(repoRoot) {
  const configPath = getSynthesisConfigPath(repoRoot);
  const defaults = getDefaultSynthesisConfig();
  if (!existsSync(configPath)) {
    return defaults;
  }
  try {
    const content = readFileSync(configPath, "utf-8");
    const loaded = JSON.parse(content);
    return {
      enabled: loaded.enabled ?? defaults.enabled,
      agent: loaded.agent,
      output: loaded.output ? {
        store_in_threads: loaded.output.store_in_threads
      } : undefined
    };
  } catch (error) {
    console.warn(`[synthesis] Warning: Failed to parse ${configPath}, using defaults. Error: ${error instanceof Error ? error.message : String(error)}`);
    return defaults;
  }
}
function isSynthesisEnabled(repoRoot) {
  const config = loadSynthesisConfig(repoRoot);
  return config.enabled;
}
function getSynthesisAgentOverride(repoRoot) {
  const config = loadSynthesisConfig(repoRoot);
  return config.agent;
}
export {
  loadSynthesisConfig,
  isSynthesisEnabled,
  getSynthesisConfigPath,
  getSynthesisAgentOverride,
  getDefaultSynthesisConfig
};
