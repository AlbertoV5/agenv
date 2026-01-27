/**
 * Types and configuration for GitHub integration
 */

// ============================================
// CONFIGURATION TYPES
// ============================================

export interface LabelConfig {
  prefix: string // Prefix for all labels (e.g., "stream:", "thread:")
  color: string // Default color for labels
}

export interface GitHubConfig {
  enabled: boolean
  owner: string
  repo: string
  branch_prefix: string // Prefix for feature branches (e.g., "workstream/")
  auto_create_issues: boolean // Auto-create issues for stages on approval
  auto_commit_on_approval: boolean // Auto-commit staged changes on stage approval
  default_pr_target?: string // Default target branch for PRs (e.g., "main")
  label_config: {
    workstream: LabelConfig
    thread: LabelConfig
    batch: LabelConfig
    stage: LabelConfig
  }
}

// ============================================
// METADATA TYPES
// ============================================

export interface WorkstreamGitHubMeta {
  issue_number?: number
  issue_url?: string
  milestone_number?: number
  milestone_url?: string
  branch_name?: string
  pr_number?: number
  pr_url?: string
}

// ============================================
// AUTHENTICATION TYPES
// ============================================

export type GitHubAuth = {
  type: "pat"
  token: string
}

// ============================================
// API RESULT TYPES
// ============================================

export interface GitHubResult<T> {
  success: boolean
  data?: T
  error?: string
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface GitHubLabel {
  id: number
  node_id: string
  url: string
  name: string
  color: string
  default: boolean
  description: string | null
}

export interface GitHubIssue {
  id: number
  node_id: string
  url: string
  repository_url: string
  labels_url: string
  comments_url: string
  events_url: string
  html_url: string
  number: number
  state: "open" | "closed"
  title: string
  body: string | null
  user: {
    login: string
    id: number
    node_id: string
    avatar_url: string
    gravatar_id: string
    url: string
    html_url: string
    followers_url: string
    following_url: string
    gists_url: string
    starred_url: string
    subscriptions_url: string
    organizations_url: string
    repos_url: string
    events_url: string
    received_events_url: string
    type: string
    site_admin: boolean
  }
  labels: GitHubLabel[]
  state_reason?: "completed" | "reopened" | "not_planned" | null
  assignee: null
  assignees: any[]
  milestone: null
  comments: number
  created_at: string
  updated_at: string
  closed_at: string | null
  author_association: string
  active_lock_reason: null
  draft?: boolean
  pull_request?: {
    url: string
    html_url: string
    diff_url: string
    patch_url: string
    merged_at: string | null
  }
}

export interface GitHubBranch {
  name: string
  commit: {
    sha: string
    url: string
  }
  protected: boolean
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_GITHUB_CONFIG: GitHubConfig = {
  enabled: false,
  owner: "",
  repo: "",
  branch_prefix: "workstream/",
  auto_create_issues: true, // Create issues automatically on approval
  auto_commit_on_approval: true, // Auto-commit staged changes on stage approval
  label_config: {
    workstream: { prefix: "stream:", color: "5319e7" }, // Purple
    thread: { prefix: "thread:", color: "0e8a16" },     // Green
    batch: { prefix: "batch:", color: "0e8a16" },       // Green
    stage: { prefix: "stage:", color: "1d76db" },       // Blue
  },
}
