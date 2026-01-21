import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { 
  getGitHubConfigPath, 
  loadGitHubConfig, 
  saveGitHubConfig, 
  isGitHubEnabled, 
  enableGitHub, 
  disableGitHub, 
  detectRepository 
} from "../src/lib/github/config";

const execAsync = promisify(exec);
const TEST_DIR = join(process.cwd(), "tests", "temp-github-config");

describe("GitHub Config", () => {
  beforeAll(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    // Init git repo to test detection
    await execAsync("git init", { cwd: TEST_DIR });
    await execAsync("git remote add origin https://github.com/test-owner/test-repo.git", { cwd: TEST_DIR });
  });

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("should get config path", () => {
    const path = getGitHubConfigPath(TEST_DIR);
    expect(path).toBe(join(TEST_DIR, "work", "github.json"));
  });

  it("should load default config when missing", async () => {
    const config = await loadGitHubConfig(TEST_DIR);
    expect(config.enabled).toBe(false);
  });

  it("should detect repository", async () => {
    const repo = await detectRepository(TEST_DIR);
    expect(repo).toEqual({ owner: "test-owner", repo: "test-repo" });
  });

  it("should enable GitHub integration", async () => {
    await enableGitHub(TEST_DIR);
    const config = await loadGitHubConfig(TEST_DIR);
    expect(config.enabled).toBe(true);
    expect(config.owner).toBe("test-owner");
    expect(config.repo).toBe("test-repo");
  });

  it("should check if enabled", async () => {
    const enabled = await isGitHubEnabled(TEST_DIR);
    expect(enabled).toBe(true);
  });

  it("should disable GitHub integration", async () => {
    await disableGitHub(TEST_DIR);
    const enabled = await isGitHubEnabled(TEST_DIR);
    expect(enabled).toBe(false);
    
    const config = await loadGitHubConfig(TEST_DIR);
    expect(config.enabled).toBe(false);
    // owner/repo should remain
    expect(config.owner).toBe("test-owner");
  });
});
