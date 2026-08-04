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
