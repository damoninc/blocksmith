import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("Paper creation uses the current v3 stable download contract", async () => {
  const source = await readFile("src/electron/main.ts", "utf8");

  assert.doesNotMatch(source, /api\.papermc\.io\/v2/);
  assert.match(source, /fill\.papermc\.io\/v3/);
  assert.match(source, /"User-Agent"/);
  assert.match(source, /channel === "STABLE"/);
  assert.match(source, /downloads\["server:default"\]\.url/);
});

test("Forge IPC uses the metadata helper without the legacy HTML scraper", async () => {
  const source = await readFile("src/electron/main.ts", "utf8");

  assert.match(
    source,
    /import \{ fetchForgeBuildsForMinecraft \} from "\.\/forge-builds";/,
  );
  assert.match(source, /ipcMain\.handle\("forge:list",[\s\S]*fetchForgeBuildsForMinecraft\(version\)/);
  assert.doesNotMatch(source, /index_\$\{version\}\.html/);
  assert.doesNotMatch(source, /matchAll\(\/\(\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+\)/);
});

test("create form shows and locks its asynchronous creation state", async () => {
  const source = await readFile(
    "src/renderer/views/CreateServerView.tsx",
    "utf8",
  );

  assert.match(source, /const \[creating, setCreating\] = useState\(false\)/);
  assert.match(source, /await onCreate\(/);
  const primaryButtonStart = source.indexOf('className="primary"');
  const primaryButton = source.slice(
    primaryButtonStart,
    source.indexOf("</button>", primaryButtonStart),
  );
  assert.match(primaryButton, /disabled=\{[\s\S]*creating/);
  assert.match(source, /creating \? "Creating server…"/);
});

test("start IPC waits for the child process to spawn successfully", async () => {
  const source = await readFile("src/electron/main.ts", "utf8");

  assert.match(source, /child\.once\("spawn", resolve\)/);
  assert.match(source, /await started/);
});

test("rename and delete are protected by main-process IPC", async () => {
  const [main, preload] = await Promise.all([
    readFile("src/electron/main.ts", "utf8"),
    readFile("src/electron/preload.ts", "utf8"),
  ]);

  assert.match(main, /ipcMain\.handle\("server:rename"/);
  assert.match(main, /renameServer\(serverRoot, id, name\)/);
  assert.match(main, /ipcMain\.handle\("server:delete"/);
  assert.match(main, /deleteServer\(serverRoot, id, confirmation, processes\.has\(id\)\)/);
  assert.match(preload, /rename: \(id: string, name: string\)/);
  assert.match(preload, /delete: \(id: string, confirmation: string\)/);
});

test("start and delete reserve a server before asynchronous work", async () => {
  const source = await readFile("src/electron/main.ts", "utf8");

  assert.match(source, /const startingServers = new Set<string>\(\)/);
  assert.match(source, /const deletingServers = new Set<string>\(\)/);
  assert.match(source, /startingServers\.has\(id\)/);
  assert.match(source, /deletingServers\.has\(id\)/);
  assert.match(source, /startingServers\.add\(id\)[\s\S]*await metadata\(id\)/);
  assert.match(source, /deletingServers\.add\(id\)[\s\S]*await deleteServer/);
});
