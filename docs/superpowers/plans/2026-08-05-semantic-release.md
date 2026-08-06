# Semantic Release Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release a correctly versioned Blocksmith Windows executable from GitHub whenever releasable Conventional Commits reach `main`.

**Architecture:** Pull requests run a read-only CI workflow that validates the PR title and every branch commit, runs all tests, and proves Windows packaging still succeeds. Pushes to `main` run a separate write-enabled release workflow; semantic-release derives the version, updates the package version only in the runner, builds the Windows executable, creates the `v<version>` tag and GitHub Release, and uploads the executable.

**Tech Stack:** GitHub Actions, Node.js 22, commitlint, semantic-release, electron-builder

---

### Task 1: Encode the pipeline contract as a failing test

**Files:**
- Create: `tests/release-pipeline.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add a release-pipeline test script**

Add `"test:release": "node --test tests/release-pipeline.test.mjs"` and append `npm run test:release` to the main `test` script.

- [ ] **Step 2: Write contract tests**

Create tests that require `release.config.cjs`, read both workflow YAML files, and assert:

```js
assert.deepEqual(releaseConfig.branches, ["main"]);
assert.equal(releaseConfig.tagFormat, "v${version}");
assert.match(releaseWorkflow, /npm run release/);
assert.match(releaseWorkflow, /contents: write/);
assert.match(ciWorkflow, /commitlint/);
assert.match(ciWorkflow, /npm run package:win/);
```

Also assert that the npm plugin disables registry publication, the exec plugin builds the Windows package during `prepare`, and the GitHub plugin uploads `dist/*.exe`.

- [ ] **Step 3: Run the focused test and confirm the red state**

Run: `npm run test:release`

Expected: FAIL because `release.config.cjs` and `.github/workflows/release.yml` do not exist.

- [ ] **Step 4: Commit the red test**

```powershell
git add package.json tests/release-pipeline.test.mjs
git commit -m "test(ci): define semantic release contract"
```

### Task 2: Configure Conventional Commits and semantic-release

**Files:**
- Create: `commitlint.config.cjs`
- Create: `release.config.cjs`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install pinned release tooling**

Run:

```powershell
npm install --save-dev semantic-release @semantic-release/exec conventional-changelog-conventionalcommits @commitlint/cli @commitlint/config-conventional
```

- [ ] **Step 2: Add scripts and prevent npm publication**

Set `"private": true` and add `"release": "semantic-release"` to `package.json`.

- [ ] **Step 3: Configure commitlint**

Create `commitlint.config.cjs`:

```js
module.exports = {
  extends: ["@commitlint/config-conventional"],
};
```

- [ ] **Step 4: Configure semantic-release**

Create `release.config.cjs` with the `main` release branch, `v${version}` tags, the Conventional Commits analyzer and notes generator, npm version preparation with `npmPublish: false`, `npm run package:win` in the exec prepare step, and a GitHub release asset at `dist/*.exe`.

- [ ] **Step 5: Keep the focused test red for workflow-only reasons**

Run: `npm run test:release`

Expected: FAIL only because `.github/workflows/release.yml` is still absent or the workflows do not yet satisfy the contract.

### Task 3: Separate read-only CI from write-enabled releases

**Files:**
- Modify: `.github/workflows/build.yml`
- Create: `.github/workflows/release.yml`
- Modify: `README.md`

- [ ] **Step 1: Make the existing workflow pull-request CI**

Configure `build.yml` for `pull_request` and manual dispatch with `contents: read`. On pull requests, check out the head SHA with full history, validate the PR title and every branch commit with commitlint, then run `npm ci`, `npm test`, `npm run package:win`, and upload the executable as a CI artifact.

- [ ] **Step 2: Add the release workflow**

Configure `release.yml` for pushes to `main` and manual retries, serialize it with a release concurrency group, grant GitHub release permissions, check out full history, install dependencies, run the full test suite, and execute `npm run release` with `GITHUB_TOKEN`.

- [ ] **Step 3: Document contribution and release behavior**

Explain in `README.md` that PR titles and commits must follow Conventional Commits; `fix` releases a patch, `feat` a minor, breaking changes a major, and non-user-facing types do not release. State that successful releasable merges publish a GitHub Release with a Windows executable.

- [ ] **Step 4: Run the focused test and confirm green**

Run: `npm run test:release`

Expected: PASS.

- [ ] **Step 5: Commit the implementation**

```powershell
git add .github commitlint.config.cjs release.config.cjs README.md package.json package-lock.json
git commit -m "feat(ci): automate semantic Windows releases"
```

### Task 4: Verify and publish the live pipeline

**Files:**
- Verify all changed files
- Update GitHub branch protection for `main`

- [ ] **Step 1: Run local verification**

Run `npm test`, `npm run package:win`, `npx semantic-release --dry-run --no-ci`, `git diff --check`, and inspect the complete branch diff.

Expected: all tests pass, a portable `.exe` exists, dry-run calculates the first release without publishing, and Git reports no whitespace errors.

- [ ] **Step 2: Push and open a pull request**

Push `feat/semantic-release`, then open a PR titled `feat(ci): automate semantic Windows releases` against `main`.

- [ ] **Step 3: Verify GitHub CI**

Wait for the Conventional Commits and Windows build jobs to pass. Inspect failing logs and fix the branch if either job fails.

- [ ] **Step 4: Require the validated checks on `main`**

Enable branch protection that requires pull requests and the successful CI job contexts before merging, without allowing force pushes or branch deletion.

- [ ] **Step 5: Merge and verify the release**

Squash-merge the PR with the approved Conventional Commit title. Wait for the Release workflow, then verify the new semantic tag, published GitHub Release notes, and downloadable Windows `.exe` asset.
