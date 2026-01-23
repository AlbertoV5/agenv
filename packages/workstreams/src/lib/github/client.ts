export interface GitHubRepository {
  owner: string;
  repo: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: string;
  html_url: string;
  labels: GitHubLabel[];
}

export interface GitHubLabel {
  id?: number;
  name: string;
  color: string;
  description?: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubRef {
  ref: string;
  node_id: string;
  url: string;
  object: {
    type: string;
    sha: string;
    url: string;
  };
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  html_url: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  draft: boolean;
  merged: boolean;
  mergeable: boolean | null;
}

export class GitHubClient {
  private token: string;
  private repository: GitHubRepository;
  private baseUrl = "https://api.github.com";

  constructor(token: string, repository: GitHubRepository) {
    this.token = token;
    this.repository = repository;
  }

  private async request<T>(
    path: string,
    options: { method?: string; body?: any } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    };

    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch {
        errorBody = "(unable to read error body)";
      }
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }

    // specific handling for 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  async createIssue(
    title: string,
    body: string,
    labels: string[] = []
  ): Promise<GitHubIssue> {
    return this.request<GitHubIssue>(
      `/repos/${this.repository.owner}/${this.repository.repo}/issues`,
      {
        method: "POST",
        body: { title, body, labels },
      }
    );
  }

  async updateIssue(
    issueNumber: number,
    updates: {
      title?: string;
      body?: string;
      state?: "open" | "closed";
      labels?: string[];
    }
  ): Promise<GitHubIssue> {
    return this.request<GitHubIssue>(
      `/repos/${this.repository.owner}/${this.repository.repo}/issues/${issueNumber}`,
      {
        method: "PATCH",
        body: updates,
      }
    );
  }

  async closeIssue(issueNumber: number): Promise<GitHubIssue> {
    return this.updateIssue(issueNumber, { state: "closed" });
  }

  async reopenIssue(issueNumber: number): Promise<GitHubIssue> {
    return this.updateIssue(issueNumber, { state: "open" });
  }

  async getIssue(issueNumber: number): Promise<GitHubIssue> {
    return this.request<GitHubIssue>(
      `/repos/${this.repository.owner}/${this.repository.repo}/issues/${issueNumber}`
    );
  }

  /**
   * Search for issues matching the given criteria.
   * Uses GitHub's search API to find issues by labels and state.
   * 
   * @param query Search criteria
   * @returns Array of matching issues
   */
  async searchIssues(query: {
    labels?: string[];
    state?: "open" | "closed" | "all";
    title?: string;
  }): Promise<GitHubIssue[]> {
    // Build the search query string
    const queryParts: string[] = [
      `repo:${this.repository.owner}/${this.repository.repo}`,
      "is:issue",
    ];

    if (query.state && query.state !== "all") {
      queryParts.push(`state:${query.state}`);
    }

    if (query.labels && query.labels.length > 0) {
      for (const label of query.labels) {
        queryParts.push(`label:"${label}"`);
      }
    }

    if (query.title) {
      // Escape quotes in title for search
      queryParts.push(`"${query.title.replace(/"/g, '\\"')}" in:title`);
    }

    const searchQuery = queryParts.join(" ");
    const encodedQuery = encodeURIComponent(searchQuery);

    const response = await this.request<{ items: GitHubIssue[] }>(
      `/search/issues?q=${encodedQuery}&per_page=100`
    );

    return response.items || [];
  }

  async createLabel(
    name: string,
    color: string,
    description?: string
  ): Promise<GitHubLabel> {
    return this.request<GitHubLabel>(
      `/repos/${this.repository.owner}/${this.repository.repo}/labels`,
      {
        method: "POST",
        body: { name, color, description },
      }
    );
  }

  async ensureLabels(labels: { name: string; color: string; description?: string }[]): Promise<void> {
    const existingLabels = await this.request<GitHubLabel[]>(
      `/repos/${this.repository.owner}/${this.repository.repo}/labels?per_page=100`
    );

    const existingNames = new Set(existingLabels.map((l) => l.name));

    for (const label of labels) {
      if (!existingNames.has(label.name)) {
        await this.createLabel(label.name, label.color, label.description);
      }
    }
  }

  async getBranch(branch: string): Promise<GitHubBranch> {
    return this.request<GitHubBranch>(
      `/repos/${this.repository.owner}/${this.repository.repo}/branches/${branch}`
    );
  }

  async createBranch(name: string, fromBranch: string): Promise<GitHubRef> {
    const base = await this.getBranch(fromBranch);
    return this.request<GitHubRef>(
      `/repos/${this.repository.owner}/${this.repository.repo}/git/refs`,
      {
        method: "POST",
        body: {
          ref: `refs/heads/${name}`,
          sha: base.commit.sha,
        },
      }
    );
  }

  async createPullRequest(
    title: string,
    body: string,
    head: string,
    base: string,
    draft: boolean = false
  ): Promise<GitHubPullRequest> {
    return this.request<GitHubPullRequest>(
      `/repos/${this.repository.owner}/${this.repository.repo}/pulls`,
      {
        method: "POST",
        body: { title, body, head, base, draft },
      }
    );
  }
}

export const createGitHubClient = (
  token: string,
  owner: string,
  repo: string
): GitHubClient => {
  return new GitHubClient(token, { owner, repo });
};

