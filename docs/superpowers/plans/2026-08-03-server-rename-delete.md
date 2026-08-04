# Server Rename and Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe in-app rename and confirmed permanent deletion for local Minecraft servers.

**Architecture:** A focused Electron utility owns metadata rename, exact-name confirmation, path containment, and folder deletion. Main-process IPC adds the live-process guard and returns refreshed details; React presents modal dialogs and refreshes the sorted server selection after mutations.

**Tech Stack:** Electron 39, React 19, TypeScript 5, Vite 7, Node test runner.

---

### Task 1: Add tested filesystem operations

**Files:**
- Create: `src/electron/server-management.ts`
- Create: `tests/electron-server-management.test.mjs`

- [ ] Write failing tests using temporary server folders for `renameServer(root, id, name)` and `deleteServer(root, id, confirmation, running)`. Assert rename trims and persists the name without changing `id` or folder, empty names fail, incorrect/case-mismatched confirmation fails, running deletion fails, traversal IDs fail, and valid deletion removes the complete folder.
- [ ] Run `npm run test:electron`; expect module-not-found failure for `dist/main/server-management.js`.
- [ ] Implement `serverDirectory(root, id)` using `path.resolve` and `path.relative`; reject empty roots/IDs, absolute IDs, `..`, and targets outside the resolved root.
- [ ] Implement `renameServer` by loading `.blocksmith.json`, rejecting a blank trimmed name, updating only `name`, writing formatted JSON, and returning `readServerDetails(directory)`.
- [ ] Implement `deleteServer` by checking `running`, loading metadata, requiring `confirmation === metadata.name`, and calling `fs.rm(directory, { recursive: true, force: false })`.
- [ ] Run `npm run test:electron`; expect all filesystem-operation tests to pass.
- [ ] Commit with `git commit -m "Add safe server rename and delete operations"`.

### Task 2: Expose rename and delete IPC

**Files:**
- Modify: `src/electron/main.ts`
- Modify: `src/electron/preload.ts`
- Modify: `src/renderer/vite-env.d.ts`
- Modify: `tests/server-creation.test.mjs`

- [ ] Add failing source regression assertions that `server:rename` delegates to `renameServer`, `server:delete` passes `processes.has(id)`, and preload exposes both operations.
- [ ] Register `server:rename` with `(id, name) => renameServer(serverRoot, id, name)`.
- [ ] Register `server:delete` with `(id, confirmation) => deleteServer(serverRoot, id, confirmation, processes.has(id))`.
- [ ] Expose typed renderer methods `rename(id, name): Promise<ServerDetails>` and `delete(id, confirmation): Promise<void>` through preload and `Window.blocksmith`.
- [ ] Run `npm run test:server-creation`, `npm run test:electron`, and `npx tsc --noEmit -p tsconfig.json`; expect all to pass.
- [ ] Commit with `git commit -m "Expose server management operations"`.

### Task 3: Add management dialogs

**Files:**
- Create: `src/renderer/components/server/ServerManagementDialogs.tsx`
- Modify: `src/renderer/views/ServerView.tsx`
- Modify: `src/renderer/styles.css`
- Modify: `tests/renderer-build.test.mjs`

- [ ] Add failing renderer assertions for Rename/Delete header actions, a prefilled rename input, exact-name delete input, inline `form-error`, and a delete confirmation disabled unless `confirmation === server.name`.
- [ ] Create `ServerManagementDialogs` with mutually exclusive `rename` and `delete` modes, local input/error/busy state, and an accessible modal overlay.
- [ ] Rename submits `window.blocksmith.rename(server.id, renameName)`, reports inline errors, and calls `onRenamed(details)` on success.
- [ ] Delete explains permanence, requires exact case-sensitive text, submits `window.blocksmith.delete(server.id, confirmation)`, reports inline errors, and calls `onDeleted(server.id)` on success.
- [ ] Add Rename and Delete buttons to `ServerView`; disable Delete while `running` and pass that guard into the dialog.
- [ ] Add desktop modal, destructive-button, and management-action styles without adding mobile media rules.
- [ ] Run `npm run test:renderer` and `npx tsc --noEmit -p tsconfig.json`; expect all to pass.
- [ ] Commit with `git commit -m "Add rename and delete dialogs"`.

### Task 4: Refresh sorting and selection after mutations

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/views/ServerView.tsx`
- Modify: `tests/renderer-build.test.mjs`

- [ ] Add failing assertions that renamed server lists are re-sorted and deletion calls the existing `reload` path after clearing deleted per-server state.
- [ ] Update `replaceServer` to sort the replaced list with `name.localeCompare` so renames move immediately in the sidebar.
- [ ] Add `handleServerDeleted(id)` that removes the deleted ID from running/log state, clears its selected reference when necessary, and awaits `reload()` so the first remaining sorted server is selected or Welcome appears.
- [ ] Pass `handleServerDeleted` through `ServerView` to the management dialog.
- [ ] Run `npm run test:renderer`, `npm test`, and `npm run build`; expect zero failures.
- [ ] Commit with `git commit -m "Refresh server state after management changes"`.

### Task 5: Review, verify, and merge

**Files:**
- Verify all changed files

- [ ] Run `git diff --check` and review the full branch diff against `docs/superpowers/specs/2026-08-03-server-rename-delete-design.md`.
- [ ] Request a focused code review and fix all Critical or Important findings with a failing regression test first.
- [ ] Run fresh `npm test`, `npx tsc --noEmit -p tsconfig.json`, `npm run build`, an Electron `npm run start` smoke launch, and `npm run package:win`.
- [ ] Merge the verified feature branch into local `main`.
- [ ] Re-run `npm test` and `npm run build` on merged `main`, then remove the feature worktree and branch.
