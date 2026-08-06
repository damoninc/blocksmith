import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const readRepoFile = (path) => readFileSync(join(repoRoot, path), "utf8");

test("semantic-release versions and publishes the Windows executable", () => {
  const configPath = join(repoRoot, "release.config.cjs");
  assert.ok(existsSync(configPath), "release.config.cjs should exist");

  const releaseConfig = require(configPath);
  const plugin = (name) =>
    releaseConfig.plugins.find(
      (entry) => Array.isArray(entry) && entry[0] === name,
    );

  assert.deepEqual(releaseConfig.branches, ["main"]);
  assert.equal(releaseConfig.tagFormat, "v${version}");
  assert.equal(plugin("@semantic-release/commit-analyzer")[1].preset, "conventionalcommits");
  assert.equal(plugin("@semantic-release/release-notes-generator")[1].preset, "conventionalcommits");
  assert.equal(plugin("@semantic-release/npm")[1].npmPublish, false);
  assert.equal(plugin("@semantic-release/exec")[1].prepareCmd, "npm run package:win");
  assert.deepEqual(plugin("@semantic-release/github")[1].assets, [
    {
      path: "dist/*.exe",
      label: "Blocksmith ${nextRelease.version} for Windows",
    },
  ]);

  const packageJson = JSON.parse(readRepoFile("package.json"));
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.scripts.release, "semantic-release");
});

test("pull-request CI enforces Conventional Commits and packages Windows", () => {
  const workflow = readRepoFile(".github/workflows/build.yml");

  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /pull_request\.title/);
  assert.match(workflow, /pull_request\.base\.sha/);
  assert.match(workflow, /pull_request\.head\.sha/);
  assert.match(workflow, /commitlint/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run package:win/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.doesNotMatch(workflow, /^\s{0,2}push:/m);
});

test("main releases run serially after the full test suite", () => {
  const workflowPath = join(repoRoot, ".github/workflows/release.yml");
  assert.ok(existsSync(workflowPath), ".github/workflows/release.yml should exist");

  const workflow = readFileSync(workflowPath, "utf8");
  assert.match(workflow, /push:/);
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /contents: write/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /runs-on: windows-latest/);
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run release/);
  assert.match(workflow, /GITHUB_TOKEN/);
});
