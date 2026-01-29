// src/lib/git/log.ts
import { execSync } from "node:child_process";
var COMMIT_DELIMITER = "---COMMIT_BOUNDARY---";
var FIELD_DELIMITER = "---FIELD---";
function parseGitLog(repoRoot, branchName, baseBranch) {
  const format = [
    "%H",
    "%h",
    "%an",
    "%ae",
    "%aI",
    "%s",
    "%b"
  ].join(FIELD_DELIMITER);
  let range = "";
  if (baseBranch && branchName) {
    range = `${baseBranch}..${branchName}`;
  } else if (branchName) {
    range = branchName;
  }
  try {
    const logOutput = execSync(`git log ${range} --format="${format}${COMMIT_DELIMITER}" --numstat`, {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024
    }).trim();
    if (!logOutput) {
      return [];
    }
    const rawBlocks = logOutput.split(COMMIT_DELIMITER).filter((block) => block.trim());
    const commits = [];
    for (let i = 0;i < rawBlocks.length; i++) {
      const block = rawBlocks[i];
      const lines = block.split(`
`);
      let metadataStartIndex = 0;
      for (let j = 0;j < lines.length; j++) {
        if (lines[j].includes(FIELD_DELIMITER)) {
          metadataStartIndex = j;
          break;
        }
      }
      const numstatLines = [];
      for (let j = 0;j < metadataStartIndex; j++) {
        const line = lines[j];
        if (line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/)) {
          numstatLines.push(line);
        }
      }
      if (numstatLines.length > 0 && commits.length > 0) {
        const prevCommit = commits[commits.length - 1];
        parseNumstatLines(numstatLines, prevCommit);
      }
      const metadataLines = lines.slice(metadataStartIndex);
      const metadataBlock = metadataLines.join(`
`);
      if (metadataBlock.includes(FIELD_DELIMITER)) {
        const commit = parseCommitBlock(metadataBlock);
        commits.push(commit);
      }
    }
    return commits;
  } catch (error) {
    const errorMessage = error.message || String(error);
    if (errorMessage.includes("unknown revision") || errorMessage.includes("does not have any commits")) {
      return [];
    }
    throw new Error(`Failed to parse git log: ${errorMessage}`);
  }
}
function parseNumstatLines(numstatLines, commit) {
  for (const line of numstatLines) {
    const numstatMatch = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
    if (numstatMatch) {
      const [, addedStr, deletedStr, filename] = numstatMatch;
      const added = addedStr === "-" ? 0 : parseInt(addedStr, 10);
      const deleted = deletedStr === "-" ? 0 : parseInt(deletedStr, 10);
      commit.files.push(filename);
      if (filename.includes(" => ")) {
        commit.fileStats.renamed++;
      } else if (added > 0 && deleted === 0) {
        commit.fileStats.added++;
      } else if (added === 0 && deleted > 0) {
        commit.fileStats.deleted++;
      } else if (added > 0 || deleted > 0) {
        commit.fileStats.modified++;
      }
    }
  }
}
function parseCommitBlock(block) {
  const lines = block.trim().split(`
`);
  const metaLine = lines[0] || "";
  const parts = metaLine.split(FIELD_DELIMITER);
  const [sha, shortSha, author, authorEmail, date, subject, ...bodyParts] = parts;
  const bodyLines = [];
  if (bodyParts.length > 0) {
    bodyLines.push(bodyParts.join(FIELD_DELIMITER));
  }
  for (let i = 1;i < lines.length; i++) {
    const line = lines[i];
    if (line && line.match(/^(\d+|-)\t(\d+|-)\t/)) {
      break;
    }
    bodyLines.push(line || "");
  }
  const body = bodyLines.join(`
`).trim();
  const files = [];
  const fileStats = { added: 0, modified: 0, deleted: 0, renamed: 0 };
  const trailers = extractWorkstreamTrailers(body);
  return {
    sha: sha || "",
    shortSha: shortSha || "",
    author: author || "",
    authorEmail: authorEmail || "",
    date: date || "",
    subject: subject || "",
    body,
    files,
    fileStats,
    trailers
  };
}
function extractWorkstreamTrailers(commitMessage) {
  const trailers = {};
  if (!commitMessage) {
    return trailers;
  }
  const lines = commitMessage.split(`
`);
  for (const line of lines) {
    const trimmed = line.trim();
    const streamIdMatch = trimmed.match(/^Stream-Id:\s*(.+)$/i);
    if (streamIdMatch) {
      trailers.streamId = streamIdMatch[1].trim();
      continue;
    }
    const streamNameMatch = trimmed.match(/^Stream-Name:\s*(.+)$/i);
    if (streamNameMatch) {
      trailers.streamName = streamNameMatch[1].trim();
      continue;
    }
    const stageMatch = trimmed.match(/^Stage:\s*(\d+)$/i);
    if (stageMatch) {
      trailers.stage = parseInt(stageMatch[1], 10);
      continue;
    }
    const stageNameMatch = trimmed.match(/^Stage-Name:\s*(.+)$/i);
    if (stageNameMatch) {
      trailers.stageName = stageNameMatch[1].trim();
      continue;
    }
    const batchMatch = trimmed.match(/^Batch:\s*(\d+\.\d+)$/i);
    if (batchMatch) {
      trailers.batch = batchMatch[1].trim();
      continue;
    }
    const threadMatch = trimmed.match(/^Thread:\s*(\d+\.\d+\.\d+)$/i);
    if (threadMatch) {
      trailers.thread = threadMatch[1].trim();
      continue;
    }
    const taskMatch = trimmed.match(/^Task:\s*(\d+\.\d+\.\d+\.\d+)$/i);
    if (taskMatch) {
      trailers.task = taskMatch[1].trim();
      continue;
    }
  }
  return trailers;
}
function hasWorkstreamTrailers(trailers) {
  return !!(trailers.streamId || trailers.stage !== undefined || trailers.batch || trailers.thread || trailers.task);
}
function groupCommitsByStage(commits, streamId) {
  const workstreamCommits = commits.filter((commit) => commit.trailers.streamId === streamId);
  const stageMap = new Map;
  for (const commit of workstreamCommits) {
    const stageNum = commit.trailers.stage;
    if (stageNum !== undefined) {
      const existing = stageMap.get(stageNum) || { commits: [], stageName: undefined };
      existing.commits.push(commit);
      if (!existing.stageName && commit.trailers.stageName) {
        existing.stageName = commit.trailers.stageName;
      }
      stageMap.set(stageNum, existing);
    }
  }
  const result = [];
  for (const [stageNumber, stageData] of stageMap.entries()) {
    result.push({
      stageNumber,
      stageName: stageData.stageName,
      commits: stageData.commits
    });
  }
  result.sort((a, b) => a.stageNumber - b.stageNumber);
  return result;
}
function identifyHumanCommits(commits) {
  return commits.filter((commit) => !hasWorkstreamTrailers(commit.trailers));
}
function getWorkstreamCommits(commits, streamId) {
  return commits.filter((commit) => commit.trailers.streamId === streamId);
}
function getCurrentBranch(repoRoot) {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
  } catch {
    throw new Error("Failed to get current branch name");
  }
}
function getDefaultBranch(repoRoot) {
  try {
    const remoteBranch = execSync("git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: "/bin/bash"
    }).trim();
    if (remoteBranch) {
      return remoteBranch;
    }
  } catch {}
  try {
    execSync("git rev-parse --verify main", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    return "main";
  } catch {}
  try {
    execSync("git rev-parse --verify master", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    return "master";
  } catch {}
  return "main";
}
export {
  parseGitLog,
  identifyHumanCommits,
  hasWorkstreamTrailers,
  groupCommitsByStage,
  getWorkstreamCommits,
  getDefaultBranch,
  getCurrentBranch,
  extractWorkstreamTrailers
};
