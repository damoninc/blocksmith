# Modrinth Plugin Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe Modrinth project links, explicit catalog sorting, and debounced search to the Paper plugin browser.

**Architecture:** Extend the existing Modrinth service with a validated sort type and safe project-page URL builder. Carry those capabilities through the Electron IPC/preload boundary, then update `PluginsTab` to debounce query changes, expose sort choices, and open details externally without coupling that action to installation.

**Tech Stack:** TypeScript, React 19, Electron IPC and `shell.openExternal`, Modrinth v2 API, Node test runner, Vitest, Testing Library.

---

## File structure

- `src/electron/modrinth-plugins.ts`: validate catalog sorts, build search URLs, and construct allowlisted Modrinth project-page URLs.
- `src/electron/main.ts`: map server-aware searches and safe external page opens to IPC handlers.
- `src/electron/preload.ts`: expose typed search-sort and project-page operations to the renderer.
- `src/renderer/types.ts`: share the allowed Modrinth sort union with renderer code.
- `src/renderer/vite-env.d.ts`: define the updated preload bridge contract.
- `src/renderer/components/server/PluginsTab.tsx`: own debounce, sort, immediate search, stale-request protection, and details-link interactions.
- `src/renderer/styles.css`: lay out the search/sort controls and visible details link.
- `tests/electron-server-plugins.test.mjs`: cover sort validation and safe project URLs.
- `tests/plugins-tab.test.tsx`: cover debounce, sort changes, immediate searches, and independent details/install actions.

### Task 1: Modrinth sorting contract

**Files:**
- Modify: `src/electron/modrinth-plugins.ts`
- Modify: `src/electron/main.ts`
- Modify: `src/electron/preload.ts`
- Modify: `src/renderer/types.ts`
- Modify: `src/renderer/vite-env.d.ts`
- Test: `tests/electron-server-plugins.test.mjs`

- [x] **Step 1: Write failing service tests**

Add tests that call `searchModrinthPlugins("1.21.8", "claims", "downloads", request)`, assert `index=downloads`, repeat for `relevance` and `updated`, and reject an unsupported value before `request` runs.

```js
for (const sort of ["downloads", "relevance", "updated"]) {
  let requestedUrl = "";
  await searchModrinthPlugins("1.21.8", "claims", sort, async (url) => {
    requestedUrl = String(url);
    return new Response(JSON.stringify({ hits: [] }));
  });
  assert.equal(new URL(requestedUrl).searchParams.get("index"), sort);
}

await assert.rejects(
  searchModrinthPlugins("1.21.8", "", "newest", async () => {
    throw new Error("request should not run");
  }),
  /invalid Modrinth sort/i,
);
```

- [x] **Step 2: Run the Electron plugin tests and verify failure**

Run: `npm run build:main && node --test tests/electron-server-plugins.test.mjs`

Expected: FAIL because the helper does not accept or validate the sort argument.

- [x] **Step 3: Implement the sort type and IPC propagation**

Define and validate the type, then use the validated value directly:

```ts
export type ModrinthSort = "downloads" | "relevance" | "updated";

function validateModrinthSort(sort: string): ModrinthSort {
  if (sort !== "downloads" && sort !== "relevance" && sort !== "updated") {
    throw new Error("Invalid Modrinth sort.");
  }
  return sort;
}

export async function searchModrinthPlugins(
  gameVersion: string,
  query: string,
  sort: ModrinthSort,
  request: typeof fetch = fetch,
): Promise<ModrinthPlugin[]> {
  const index = validateModrinthSort(sort);
  // preserve existing facets and mapping
  const params = new URLSearchParams({ query: query.trim(), facets: JSON.stringify(facets), index, limit: "20" });
}
```

Update IPC and preload signatures to accept `sort`; import the renderer-side `ModrinthSort` union into `vite-env.d.ts`.

- [x] **Step 4: Run tests and commit**

Run: `npm run build:main && node --test tests/electron-server-plugins.test.mjs`

Expected: all Electron plugin tests pass.

Commit:

```powershell
git add src/electron/modrinth-plugins.ts src/electron/main.ts src/electron/preload.ts src/renderer/types.ts src/renderer/vite-env.d.ts tests/electron-server-plugins.test.mjs
git commit -m "feat: add Modrinth catalog sorting"
```

### Task 2: Safe external Modrinth project links

**Files:**
- Modify: `src/electron/modrinth-plugins.ts`
- Modify: `src/electron/main.ts`
- Modify: `src/electron/preload.ts`
- Modify: `src/renderer/vite-env.d.ts`
- Test: `tests/electron-server-plugins.test.mjs`

- [x] **Step 1: Write failing URL-construction tests**

```js
assert.equal(
  modrinthPluginPageUrl("worldedit"),
  "https://modrinth.com/plugin/worldedit",
);
assert.throws(() => modrinthPluginPageUrl("../account"), /invalid Modrinth project/i);
```

- [x] **Step 2: Run the Electron plugin tests and verify failure**

Run: `npm run build:main && node --test tests/electron-server-plugins.test.mjs`

Expected: FAIL because `modrinthPluginPageUrl` is not exported.

- [x] **Step 3: Implement the safe builder and external-open IPC**

```ts
const PROJECT_SLUG = /^[\w!@$().+,"'-]{3,64}$/;

export function modrinthPluginPageUrl(slug: string): string {
  if (!PROJECT_SLUG.test(slug)) throw new Error("Invalid Modrinth project.");
  return `https://modrinth.com/plugin/${encodeURIComponent(slug)}`;
}
```

Import `shell` from Electron and add:

```ts
ipcMain.handle("plugins:openModrinth", async (_, slug: string) => {
  await shell.openExternal(modrinthPluginPageUrl(slug));
});
```

Expose `openModrinthPlugin(slug: string): Promise<void>` through preload and `vite-env.d.ts`.

- [x] **Step 4: Run tests and commit**

Run: `npm run build:main && node --test tests/electron-server-plugins.test.mjs`

Expected: all Electron plugin tests pass.

Commit:

```powershell
git add src/electron/modrinth-plugins.ts src/electron/main.ts src/electron/preload.ts src/renderer/vite-env.d.ts tests/electron-server-plugins.test.mjs
git commit -m "feat: link Modrinth plugin details"
```

### Task 3: Debounced and sortable catalog UI

**Files:**
- Modify: `src/renderer/components/server/PluginsTab.tsx`
- Modify: `src/renderer/styles.css`
- Modify: `tests/plugins-tab.test.tsx`

- [x] **Step 1: Write failing renderer tests with fake timers**

Use `vi.useFakeTimers()` and verify no search runs before 350 ms, one search runs at 350 ms with the current query and `downloads`, changing sort runs with `updated`, and submitting the form clears the timer and runs immediately. Add an external-link test:

```tsx
fireEvent.change(screen.getByRole("searchbox"), { target: { value: "claims" } });
await vi.advanceTimersByTimeAsync(349);
expect(searchModrinthPlugins).not.toHaveBeenCalled();
await vi.advanceTimersByTimeAsync(1);
expect(searchModrinthPlugins).toHaveBeenCalledWith("paper-server", "claims", "downloads");

fireEvent.click(await screen.findByRole("button", { name: "View WorldEdit on Modrinth" }));
expect(openModrinthPlugin).toHaveBeenCalledWith("worldedit");
expect(installModrinthPlugin).not.toHaveBeenCalled();
```

- [x] **Step 2: Run the renderer component tests and verify failure**

Run: `npm run test:renderer:component`

Expected: FAIL because sorting, debounce, and the external-link action are absent.

- [x] **Step 3: Implement debounce, immediate search, sort, and details link**

Add `sort` state defaulting to `downloads`. Schedule search in an effect and clear its timer on dependency changes:

```ts
const [sort, setSort] = useState<ModrinthSort>("downloads");
const debounceTimer = useRef<number | null>(null);

useEffect(() => {
  debounceTimer.current = window.setTimeout(() => {
    debounceTimer.current = null;
    void search(query, sort);
  }, 350);
  return () => {
    if (debounceTimer.current !== null) window.clearTimeout(debounceTimer.current);
  };
}, [query, sort, search]);
```

The form submit handler clears `debounceTimer.current` and calls `search(query, sort)` immediately. Render a labeled sort `<select>` with `downloads`, `relevance`, and `updated`. Render a button styled as a text link with accessible name `View <title> on Modrinth`; catch bridge errors into `catalogError`.

- [x] **Step 4: Run renderer tests and commit**

Run: `npm run test:renderer:component`

Expected: all component tests pass.

Commit:

```powershell
git add src/renderer/components/server/PluginsTab.tsx src/renderer/styles.css tests/plugins-tab.test.tsx
git commit -m "feat: debounce Modrinth plugin search"
```

### Task 4: Full verification and PR refresh

**Files:**
- Modify: `.gitignore`
- Modify: `docs/superpowers/plans/2026-08-05-modrinth-plugin-discovery.md`

- [x] **Step 1: Ignore visual-companion session data**

Append `.superpowers/` to `.gitignore` so local brainstorm state cannot enter the PR.

- [x] **Step 2: Run complete local verification**

Run: `npm test`

Expected: all Electron, renderer, server-creation, and release tests pass.

Run: `npm run package:win`

Expected: a portable `dist/Blocksmith 1.0.0.exe` is produced successfully.

- [x] **Step 3: Visually verify the catalog**

Open the local renderer with a Paper-server preview and verify the search debounce, sort layout, Modrinth link, result cards, and Install action at the supported desktop viewport.

- [x] **Step 4: Mark this plan complete and commit documentation**

Change completed task checkboxes in this plan to `[x]`, then commit:

```powershell
git add .gitignore docs/superpowers/plans/2026-08-05-modrinth-plugin-discovery.md
git commit -m "docs: record Modrinth discovery implementation"
```

- [x] **Step 5: Update and verify the pull request**

Fetch `origin/main`; if it moved, rebase and rerun affected checks. Push `codex/paper-plugin-management`, update PR #4, and wait until Conventional Commits and Windows Build both pass with `mergeable=MERGEABLE` and `mergeStateStatus=CLEAN`.
