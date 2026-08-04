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

test("create form shows and locks its asynchronous creation state", async () => {
  const source = await readFile(
    "src/renderer/views/CreateServerView.tsx",
    "utf8",
  );

  assert.match(source, /const \[creating, setCreating\] = useState\(false\)/);
  assert.match(source, /await onCreate\(/);
  assert.match(source, /disabled=\{creating\}/);
  assert.match(source, /creating \? "Creating server…"/);
});
