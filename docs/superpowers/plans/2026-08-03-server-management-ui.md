# Server Management UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Blocksmith automatically select a server, expose friendly property controls, reflect EULA/address state from disk, and reliably locate Java before starting a server in the Console tab.

**Architecture:** Electron remains the filesystem/process authority and returns enriched `ServerDetails` objects to the renderer. Pure Electron utilities parse and merge Minecraft files and discover Java candidates; React renders typed server state and sends structured edits back through the preload bridge. Minecraft's files remain authoritative.

**Tech Stack:** Electron 39, React 19, TypeScript 5, Vite 7, Node's built-in test runner.

---

## Task 1: Add property, EULA, and address utilities

**Files:**
- Create: `src/electron/server-properties.ts`
- Create: `tests/electron-server-properties.test.mjs`
- Modify: `package.json`

- [ ] Add a failing Node test that imports `dist/main/server-properties.js` and covers parsing comments/unknown keys, default values, merging common and advanced values, `server-ip:server-port` formatting, blank-IP formatting, and `eula=true` parsing.
- [ ] Add `test:electron` as `npm run build:main && node --test tests/electron-*.test.mjs`, and include it in `npm test`.
- [ ] Run `npm run test:electron` and confirm the missing-module failure.
- [ ] Implement exported `COMMON_PROPERTY_KEYS`, `CommonServerProperties`, `parseServerProperties(text)`, `mergeServerProperties(original, common, advanced)`, `formatServerAddress(values)`, and `parseEula(text)`.
- [ ] Preserve comments and unknown lines from the original document; update existing common keys in place; append missing common keys once; treat the Advanced text as the source for non-common key/value entries.
- [ ] Run `npm run test:electron` and confirm it passes.

## Task 2: Expose unified server details through Electron

**Files:**
- Modify: `src/electron/main.ts`
- Modify: `src/electron/preload.ts`
- Modify: `src/renderer/types.ts`
- Modify: `src/renderer/vite-env.d.ts`
- Modify: `tests/electron-server-properties.test.mjs`

- [ ] Extend the failing tests with malformed/missing-value fallback cases used by the details loader.
- [ ] Define renderer types `CommonServerProperties` and `ServerDetails`, where details extend metadata with `properties`, `advancedProperties`, `eulaAccepted`, and `address`.
- [ ] Add an Electron `details(id)` loader that reads `.blocksmith.json`, `server.properties`, and `eula.txt`; missing property/EULA files use safe defaults.
- [ ] Make `servers:list`, `server:create`, `server:saveProperties`, and `server:eula` return refreshed `ServerDetails` data. Change property saving to accept structured common and advanced values and merge them into the existing file.
- [ ] Remove the old raw-only `server:properties` bridge operation and update preload/window typings to the structured API.
- [ ] Run `npm run test:electron` and `npm run build`.

## Task 3: Auto-select servers and reflect address/EULA state

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/Sidebar.tsx`
- Modify: `src/renderer/views/ServerView.tsx`
- Modify: `src/renderer/components/server/OverviewTab.tsx`
- Modify: `src/renderer/styles.css`
- Modify: `tests/renderer-build.test.mjs`

- [ ] Add failing renderer artifact assertions for first-server selection logic, the optional address row, and the accepted EULA label/state.
- [ ] Refactor `reload` to retain a valid selection, otherwise choose the first sorted result and load its mods. When no servers remain, clear selection and show the appropriate welcome/create view.
- [ ] Render `server.address` only when non-empty in the sidebar.
- [ ] Pass `eulaAccepted` into the Overview tab. Accepting EULA replaces the current server in both selected state and the server list with the refreshed details.
- [ ] Render a disabled green `Accepted` control with a checkmark when accepted and the normal action otherwise.
- [ ] Run `npm run test:renderer`.

## Task 4: Replace the raw properties editor with a typed form

**Files:**
- Modify: `src/renderer/components/server/PropertiesTab.tsx`
- Modify: `src/renderer/views/ServerView.tsx`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/styles.css`
- Modify: `tests/renderer-build.test.mjs`

- [ ] Add failing renderer assertions for all approved common controls and the Advanced properties section.
- [ ] Render inputs for MOTD, server IP, port, max players, game mode, difficulty, online mode, PvP, allow flight, whitelist, view distance, simulation distance, and spawn protection.
- [ ] Use constrained number inputs and block save with a field-specific validation message for invalid values.
- [ ] Keep uncommon settings in a collapsible Advanced textarea.
- [ ] On save, call the structured preload operation and replace the selected/list entry with the returned `ServerDetails` so the sidebar address updates immediately.
- [ ] Run `npm run test:renderer` and `npm run build`.

## Task 5: Resolve Java and move startup to Console

**Files:**
- Create: `src/electron/java-resolver.ts`
- Create: `tests/electron-java-resolver.test.mjs`
- Modify: `src/electron/main.ts`
- Modify: `src/renderer/App.tsx`
- Modify: `tests/renderer-build.test.mjs`

- [ ] Add failing unit tests for PATH candidate ordering, saved-path precedence, duplicate removal, and common Windows Java directory candidate generation.
- [ ] Implement `javaCandidates(savedPath, envPath, commonPaths)` and validation helpers. Search saved settings, PATH, and bounded common Windows install folders before opening a native `java.exe` picker.
- [ ] Expand settings to `{ serverRoot?: string; javaPath?: string }` and merge writes so choosing a root never erases Java and choosing Java never erases the root.
- [ ] Validate Java with `-version`, persist a valid selected executable, and include the attempted command in clear startup errors. Keep Forge using `run.bat`.
- [ ] In React, set the Console tab and `Starting server...` log before awaiting `start`. Catch rejected starts, append the message to Console, and leave the server offline.
- [ ] Ensure process `error` removes stale process state and emits a stopped event after the readable log message.
- [ ] Run `npm run test:electron`, `npm run test:renderer`, and `npm run build`.

## Task 6: Verify, commit, and merge

**Files:**
- Verify all modified files

- [ ] Inspect `git diff --check` and the complete diff for accidental artifacts or encoding damage.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Launch `npm run start`, confirm the Electron window loads without renderer/main-process errors, and close it after the smoke check.
- [ ] Commit the implementation on `feature/server-management-ui` with a focused message.
- [ ] Merge the feature branch into local `main`, rerun `npm test` and `npm run build`, then delete the merged feature branch.
