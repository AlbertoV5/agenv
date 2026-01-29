// src/lib/agents.ts
function isValidModelFormat(model) {
  return model.includes("/");
}
function getAgentsConfig(_repoRoot) {
  console.warn("DEPRECATED: getAgentsConfig() is deprecated. Use loadAgentsConfig() from agents-yaml.ts");
  return null;
}
function listAgents(_config) {
  console.warn("DEPRECATED: listAgents() is deprecated. Use listAgentsYaml() from agents-yaml.ts");
  return [];
}
function getAgent(_config, _name) {
  console.warn("DEPRECATED: getAgent() is deprecated. Use getAgentYaml() from agents-yaml.ts");
  return null;
}
export {
  listAgents,
  isValidModelFormat,
  getAgentsConfig,
  getAgent
};
