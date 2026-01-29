// src/lib/github/client.ts
class GitHubClient {
  token;
  repository;
  baseUrl = "https://api.github.com";
  constructor(token, repository) {
    this.token = token;
    this.repository = repository;
  }
  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json"
    };
    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch {
        errorBody = "(unable to read error body)";
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }
    if (response.status === 204) {
      return {};
    }
    return response.json();
  }
  async createIssue(title, body, labels = []) {
    return this.request(`/repos/${this.repository.owner}/${this.repository.repo}/issues`, {
      method: "POST",
      body: { title, body, labels }
    });
  }
  async updateIssue(issueNumber, updates) {
    return this.request(`/repos/${this.repository.owner}/${this.repository.repo}/issues/${issueNumber}`, {
      method: "PATCH",
      body: updates
    });
  }
  async closeIssue(issueNumber) {
    return this.updateIssue(issueNumber, { state: "closed" });
  }
  async reopenIssue(issueNumber) {
    return this.updateIssue(issueNumber, { state: "open" });
  }
  async getIssue(issueNumber) {
    return this.request(`/repos/${this.repository.owner}/${this.repository.repo}/issues/${issueNumber}`);
  }
  async searchIssues(query) {
    const queryParts = [
      `repo:${this.repository.owner}/${this.repository.repo}`,
      "is:issue"
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
      queryParts.push(`"${query.title.replace(/"/g, "\\\"")}" in:title`);
    }
    const searchQuery = queryParts.join(" ");
    const encodedQuery = encodeURIComponent(searchQuery);
    const response = await this.request(`/search/issues?q=${encodedQuery}&per_page=100`);
    return response.items || [];
  }
  async createLabel(name, color, description) {
    return this.request(`/repos/${this.repository.owner}/${this.repository.repo}/labels`, {
      method: "POST",
      body: { name, color, description }
    });
  }
  async ensureLabels(labels) {
    const existingLabels = await this.request(`/repos/${this.repository.owner}/${this.repository.repo}/labels?per_page=100`);
    const existingNames = new Set(existingLabels.map((l) => l.name));
    for (const label of labels) {
      if (!existingNames.has(label.name)) {
        await this.createLabel(label.name, label.color, label.description);
      }
    }
  }
  async getBranch(branch) {
    return this.request(`/repos/${this.repository.owner}/${this.repository.repo}/branches/${branch}`);
  }
  async createBranch(name, fromBranch) {
    const base = await this.getBranch(fromBranch);
    return this.request(`/repos/${this.repository.owner}/${this.repository.repo}/git/refs`, {
      method: "POST",
      body: {
        ref: `refs/heads/${name}`,
        sha: base.commit.sha
      }
    });
  }
  async createPullRequest(title, body, head, base, draft = false) {
    return this.request(`/repos/${this.repository.owner}/${this.repository.repo}/pulls`, {
      method: "POST",
      body: { title, body, head, base, draft }
    });
  }
}
var createGitHubClient = (token, owner, repo) => {
  return new GitHubClient(token, { owner, repo });
};
export {
  createGitHubClient,
  GitHubClient
};
