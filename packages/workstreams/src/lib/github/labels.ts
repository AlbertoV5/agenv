import { exec } from "node:child_process";
import { promisify } from "node:util";
import { type GitHubConfig } from "./types";
import { loadGitHubConfig, isGitHubEnabled } from "./config";
import { loadIndex, getStream } from "../index";
import { readTasksFile, parseTaskId } from "../tasks";

const execAsync = promisify(exec);

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
 * Helper to create or update a GitHub label.
 */
async function ensureLabel(name: string, color: string, description: string): Promise<void> {
  const safeName = name.replace(/"/g, '\\"');
  const safeDesc = description.replace(/"/g, '\\"');
  
  try {
    // gh label create --force updates the label if it exists
    await execAsync(`gh label create "${safeName}" --color "${color}" --description "${safeDesc}" --force`);
  } catch (error) {
    // If it fails, we assume it's a real error (e.g. auth, network) and propagate it
    // unless we want to suppress it. For now, let's propagate to surface issues.
    throw error;
  }
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
  const index = loadIndex(repoRoot);
  const stream = getStream(index, streamId);
  
  // 1. Create Workstream Label
  const streamLabel = formatLabel(config.label_config.workstream.prefix, stream.name);
  await ensureLabel(streamLabel, config.label_config.workstream.color, `Workstream: ${stream.name}`);
  
  // 2. Load Tasks to find Stages and Batches
  const tasksFile = readTasksFile(repoRoot, streamId);
  if (!tasksFile) return;
  
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
  
  // 3. Create Stage Labels
  for (const {id, name} of stages.values()) {
    const labelName = formatLabel(config.label_config.stage.prefix, `${id}-${name}`);
    await ensureLabel(labelName, config.label_config.stage.color, `Stage ${id}: ${name}`);
  }
  
  // 4. Create Batch Labels
  for (const {id, name} of batches.values()) {
    const labelName = formatLabel(config.label_config.batch.prefix, `${id}-${name}`);
    await ensureLabel(labelName, config.label_config.batch.color, `Batch ${id}: ${name}`);
  }
}
