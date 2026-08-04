# Forge Server Creation Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Forge server creation discover valid Forge builds from official Maven metadata and prevent submission when no compatible build is available.

**Architecture:** Add a focused Electron-side metadata parser whose output is consumed by the existing Forge IPC handler. Keep artifact download and installer execution unchanged. Track Forge build loading failures in the React creation form so users see the failure and cannot submit invalid input.

**Tech Stack:** Electron, TypeScript, React, Node test runner, Forge Maven metadata

---

### Task 1: Parse Forge Maven metadata

**Files:**
- Create: `src/electron/forge-metadata.ts`
- Create: `tests/electron-forge-metadata.test.mjs`

- [ ] **Step 1: Write failing parser tests**

Create tests importing `forgeBuildsForMinecraft` from `dist/main/forge-metadata.js`. Assert that metadata containing `1.21-51.0.33`, `1.21.1-52.1.16`, a duplicate `1.21.1-52.1.16`, and `1.21.1-52.1.0` returns `["52.1.16", "52.1.0"]` for `1.21.1` and `["51.0.33"]` for `1.21`.

- [ ] **Step 2: Run the focused test and verify RED**

Run `npm run build:main; node --test tests/electron-forge-metadata.test.mjs` and expect failure because `forge-metadata.js` does not exist.

- [ ] **Step 3: Implement the parser**

Create `src/electron/forge-metadata.ts` with an exported function that matches `<version>...</version>`, decodes only the text needed for Maven version strings, filters by the exact `${minecraftVersion}-` prefix, strips it, and de-duplicates while preserving source order.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run `npm run build:main; node --test tests/electron-forge-metadata.test.mjs` and expect both exact-version tests to pass.

- [ ] **Step 5: Commit**

Commit the parser and its tests with message `Parse Forge builds from Maven metadata`.

### Task 2: Use Maven metadata in Forge IPC

**Files:**
- Modify: `src/electron/main.ts`
- Modify: `tests/server-creation.test.mjs`

- [ ] **Step 1: Write a failing IPC regression test**

Assert that `main.ts` fetches `maven-metadata.xml`, calls `forgeBuildsForMinecraft(text, version)`, rejects when the resulting list is empty, and no longer references `index_${version}.html` or the old broad HTML regex.

- [ ] **Step 2: Run the focused test and verify RED**

Run `node --test tests/server-creation.test.mjs` and expect the new Forge assertion to fail against the HTML scraper.

- [ ] **Step 3: Replace the scraper**

Import `forgeBuildsForMinecraft`, fetch the official Maven metadata with an HTTP-status check, parse it, throw `No Forge builds are available for Minecraft ${version}.` when empty, and return the builds.

- [ ] **Step 4: Run server-creation and parser tests and verify GREEN**

Run `npm run build:main; node --test tests/electron-forge-metadata.test.mjs tests/server-creation.test.mjs` and expect all focused tests to pass.

- [ ] **Step 5: Commit**

Commit the IPC integration and regression test with message `Use Maven metadata for Forge builds`.

### Task 3: Show Forge discovery state in the creation form

**Files:**
- Modify: `src/renderer/views/CreateServerView.tsx`
- Modify: `tests/renderer-build.test.mjs`

- [ ] **Step 1: Write a failing renderer regression test**

Assert that the creation view stores a Forge error, displays it with `role="alert"`, clears stale builds before loading, and disables the submit button when Forge is selected without an available build.

- [ ] **Step 2: Run the focused test and verify RED**

Run `node --test tests/renderer-build.test.mjs` and expect the new Forge-state assertion to fail.

- [ ] **Step 3: Implement loading and error handling**

Add `forgeError` and `loadingForge` state. Clear stale builds on software/version changes, load builds, select the first build naturally through the existing `<select>`, display either loading text or the caught error, and disable creation when `creating`, Forge metadata is loading, or Forge has no builds.

- [ ] **Step 4: Run renderer tests and verify GREEN**

Run `npm run test:renderer` and expect all renderer regressions and the Vite build to pass.

- [ ] **Step 5: Commit**

Commit the renderer state and regression test with message `Handle unavailable Forge builds`.

### Task 4: Verify and integrate

**Files:**
- No source changes expected

- [ ] **Step 1: Run complete verification**

Run `npm test`, `npx tsc --noEmit -p tsconfig.json`, `npm run build`, an Electron launch smoke test, and `npm run package:win`. Expect zero test/type/build/package failures and a loaded Electron renderer.

- [ ] **Step 2: Review the final diff**

Run `git diff --check da1922d..HEAD` and inspect `git diff --stat da1922d..HEAD`. Expect no whitespace errors and changes limited to Forge discovery, creation UI state, tests, and this plan.

- [ ] **Step 3: Merge locally**

Fast-forward `fix/forge-server-creation` into local `main`, rerun `npm test` and `npm run build` from the main worktree, then remove the exact verified worktree and delete the merged feature branch.
