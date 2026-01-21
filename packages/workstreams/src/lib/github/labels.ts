import { type GitHubConfig } from "./types";
import { loadGitHubConfig, isGitHubEnabled } from "./config";
import { loadIndex, getStream } from "../index";
import { readTasksFile, parseTaskId } from "../tasks";
import { createGitHubClient } from "./client";
import { ensureGitHubAuth } from "./auth";

/**
 * Formats a label with the given prefix and value.
 * @param prefix The label prefix (e.g., "stream:")
 * @param value The label value
 * @returns The formatted label (e.g., "stream:name")
 */
export function formatLabel(prefix: string, value: string): string {
  return `${prefix}${value}`;
}

/**
 * Generates the list of labels for a thread.
 * @param config The GitHub configuration
 * @param streamName The name of the workstream
 * @param stageId The ID of the stage (e.g., "01")
 * @param stageName The name of the stage
 * @param batchId The ID of the batch (e.g., "01.01")
 * @param batchName The name of the batch
 * @returns An array of formatted labels
 */
export function getThreadLabels(
  config: GitHubConfig,
  streamName: string,
  stageId: string,
  stageName: string,
  batchId: string,
  batchName: string
): string[] {
  const { label_config } = config;
  
  const streamLabel = formatLabel(label_config.workstream.prefix, streamName);
  const stageLabel = formatLabel(label_config.stage.prefix, `${stageId}-${stageName}`);
  const batchLabel = formatLabel(label_config.batch.prefix, `${batchId}-${batchName}`);
  
  return [streamLabel, stageLabel, batchLabel];
}

/**
 * Creates all labels needed for a workstream (workstream, stages, batches).
 * @param repoRoot The root directory of the repository
 * @param streamId The ID of the workstream
 */
export async function ensureWorkstreamLabels(repoRoot: string, streamId: string): Promise<void> {
  if (!(await isGitHubEnabled(repoRoot))) {
    return;
  }

  const config = await loadGitHubConfig(repoRoot);
  // Ensure we have owner/repo
  if (!config.owner || !config.repo) {
      throw new Error("GitHub integration enabled but owner/repo not configured");
  }

  const token = await ensureGitHubAuth();
  const client = createGitHubClient(token, config.owner, config.repo);

  const index = loadIndex(repoRoot);
  const stream = getStream(index, streamId);
  
  const labelsToCreate: { name: string; color: string; description: string }[] = [];

  // 1. Workstream Label
  const streamLabel = formatLabel(config.label_config.workstream.prefix, stream.name);
  labelsToCreate.push({
      name: streamLabel, 
      color: config.label_config.workstream.color, 
      description: `Workstream: ${stream.name}`
  });
  
  // 2. Load Tasks to find Stages and Batches
  const tasksFile = readTasksFile(repoRoot, streamId);
  if (tasksFile) {
    const stages = new Map<string, {id: string, name: string}>();
    const batches = new Map<string, {id: string, name: string}>();
    
    for (const task of tasksFile.tasks) {
      try {
        const { stage, batch } = parseTaskId(task.id);
        const stageId = stage.toString().padStart(2, '0');
        const batchId = `${stageId}.${batch.toString().padStart(2, '0')}`;
        
        // Stage
        if (!stages.has(stageId)) {
          stages.set(stageId, { id: stageId, name: task.stage_name });
        }
        
        // Batch
        if (!batches.has(batchId)) {
          batches.set(batchId, { id: batchId, name: task.batch_name });
        }
      } catch (e) {
        // Ignore invalid task IDs
        continue;
      }
    }
    
    // 3. Stage Labels
    for (const {id, name} of stages.values()) {
      const labelName = formatLabel(config.label_config.stage.prefix, `${id}-${name}`);
      labelsToCreate.push({
          name: labelName, 
          color: config.label_config.stage.color, 
          description: `Stage ${id}: ${name}`
      });
    }
    
    // 4. Batch Labels
    for (const {id, name} of batches.values()) {
      const labelName = formatLabel(config.label_config.batch.prefix, `${id}-${name}`);
      labelsToCreate.push({
          name: labelName, 
          color: config.label_config.batch.color, 
          description: `Batch ${id}: ${name}`
      });
    }
  }

  await client.ensureLabels(labelsToCreate);
}
