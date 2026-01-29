// src/lib/analysis.ts
import { existsSync } from "fs";
import { join, dirname } from "path";
function findOpenQuestions(content) {
  const lines = content.split(`
`);
  const questions = [];
  let currentStage;
  for (let i = 0;i < lines.length; i++) {
    const line = lines[i];
    const stageMatch = line.match(/^###\s+Stage\s+(\d+):/i);
    if (stageMatch) {
      currentStage = parseInt(stageMatch[1], 10);
    }
    const checkboxMatch = line.match(/\[\s\]\s*(.*)$/);
    if (checkboxMatch) {
      questions.push({
        line: i + 1,
        question: checkboxMatch[1].trim(),
        stage: currentStage
      });
    }
  }
  return questions;
}
function extractInputFileReferences(content) {
  const files = [];
  const lines = content.split(`
`);
  let inInputsSection = false;
  for (const line of lines) {
    if (/\*\*Inputs:\*\*/i.test(line) || /^Inputs:/i.test(line.trim())) {
      inInputsSection = true;
      continue;
    }
    if (inInputsSection && (/^\*\*[^*]+\*\*/.test(line.trim()) || /^#{4,5}\s/.test(line))) {
      inInputsSection = false;
    }
    if (inInputsSection && line.trim().startsWith("-")) {
      const filePatterns = [
        /`([^`]+\.[a-z]+)`/gi,
        /\[([^\]]+)\]\(file:\/\/([^)]+)\)/gi,
        /(?:^|\s)([\w./-]+\.[a-z]{1,4})(?:\s|$)/gi
      ];
      for (const pattern of filePatterns) {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const file = match[2] || match[1];
          if (file && !file.includes("*")) {
            files.push(file);
          }
        }
      }
    }
  }
  return [...new Set(files)];
}
function findMissingInputFiles(repoRoot, planMdPath, files) {
  const planDir = dirname(planMdPath);
  const missing = [];
  for (const file of files) {
    const candidates = [
      join(planDir, file),
      join(repoRoot, file),
      file
    ];
    const exists = candidates.some((p) => existsSync(p));
    if (!exists) {
      missing.push(file);
    }
  }
  return missing;
}
export {
  findOpenQuestions,
  findMissingInputFiles,
  extractInputFileReferences
};
