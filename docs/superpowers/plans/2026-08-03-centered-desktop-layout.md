# Centered Desktop Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Center every Blocksmith view in a consistent desktop content column beside the fixed sidebar.

**Architecture:** Add a small `ContentShell` layout component around the active renderer view. CSS owns the fixed sidebar, centered 850px content column, vertically centered welcome state, and desktop-only sizing.

**Tech Stack:** React 19, TypeScript, Vite, CSS, Node test runner

---

### Task 1: Add a desktop layout regression test

**Files:**
- Create: `tests/renderer-layout.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

test("renderer uses a centered desktop content shell", async () => {
  const assets = await readdir("dist/renderer/assets");
  const stylesheet = assets.find((file) => file.endsWith(".css"));
  assert.ok(stylesheet, "Vite should emit a renderer stylesheet");
  const css = await readFile(`dist/renderer/assets/${stylesheet}`, "utf8");

  assert.match(css, /\.content-shell\{[^}]*max-width:850px/);
  assert.match(css, /\.content-shell\{[^}]*margin:0 auto/);
  assert.match(css, /aside\{[^}]*flex:0 0 280px/);
  assert.doesNotMatch(css, /@media/);
});
```

- [ ] **Step 2: Make the renderer test command discover all renderer tests**

Change `package.json` to:

```json
"test:renderer": "vite build && node --test tests/renderer-*.test.mjs"
```

- [ ] **Step 3: Run the test and verify it fails**

Run: `npm run test:renderer`

Expected: the existing asset test passes and `renderer uses a centered desktop content shell` fails because `.content-shell` does not exist.

### Task 2: Add the shared centered content shell

**Files:**
- Create: `src/renderer/components/ContentShell.tsx`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Create the layout component**

```tsx
import type { ReactNode } from "react";

export function ContentShell({
  centerVertically = false,
  children,
}: {
  centerVertically?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`content-shell${centerVertically ? " centered" : ""}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Wrap the active view in `App.tsx`**

Add the import alongside the existing component imports:

```tsx
import { ContentShell } from "./components/ContentShell";
```

Insert this opening tag immediately after the existing `<main>` tag:

```tsx
<ContentShell centerVertically={view === "welcome"}>
```

Insert this closing tag immediately before the existing `</main>` tag:

```tsx
</ContentShell>
```

Do not change the existing view props or callbacks.

- [ ] **Step 3: Implement the desktop layout CSS**

Apply these layout rules while retaining the existing visual declarations:

```css
body { height: 100vh; overflow: hidden; }
aside { flex: 0 0 280px; height: 100vh; }
main { flex: 1; height: 100vh; padding: 52px clamp(35px, 7vw, 100px); overflow: auto; }
.content-shell { width: 100%; max-width: 850px; min-height: 100%; margin: 0 auto; }
.content-shell.centered { display: grid; place-items: center; }
.empty { width: 100%; max-width: 570px; margin: 0; text-align: center; }
.card { width: 100%; }
```

Delete the existing `@media(max-width:750px)` block.

- [ ] **Step 4: Run tests and build**

Run: `npm run test:renderer`

Expected: 2 tests pass, 0 fail.

Run: `npm run build`

Expected: TypeScript compilation and Vite production build succeed.

- [ ] **Step 5: Launch the production Electron entry point**

Run: `npm start`

Expected: the sidebar remains fixed at 280px, the welcome view is centered in the remaining workspace, and create/server views share an 850px centered column.

- [ ] **Step 6: Commit the implementation**

```powershell
git add package.json tests/renderer-layout.test.mjs src/renderer/App.tsx src/renderer/components/ContentShell.tsx src/renderer/styles.css
git commit -m "Center desktop renderer layout"
```
