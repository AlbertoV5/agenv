// src/lib/github/types.ts
var DEFAULT_GITHUB_CONFIG = {
  enabled: false,
  owner: "",
  repo: "",
  branch_prefix: "workstream/",
  auto_create_issues: true,
  auto_commit_on_approval: true,
  label_config: {
    workstream: { prefix: "stream:", color: "5319e7" },
    thread: { prefix: "thread:", color: "0e8a16" },
    batch: { prefix: "batch:", color: "0e8a16" },
    stage: { prefix: "stage:", color: "1d76db" }
  }
};
export {
  DEFAULT_GITHUB_CONFIG
};
