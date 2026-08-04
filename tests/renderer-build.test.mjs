import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("renderer assets use file-compatible relative URLs", async () => {
  const html = await readFile("dist/renderer/index.html", "utf8");

  assert.doesNotMatch(
    html,
    /(?:src|href)="\/assets\//,
    "absolute /assets URLs do not resolve when Electron loads index.html via file://",
  );
  assert.match(html, /(?:src|href)="\.\/assets\//);
});
