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

test("renderer selects the first available server and exposes server file state", async () => {
  const [app, sidebar, overview] = await Promise.all([
    readFile("src/renderer/App.tsx", "utf8"),
    readFile("src/renderer/components/Sidebar.tsx", "utf8"),
    readFile("src/renderer/components/server/OverviewTab.tsx", "utf8"),
  ]);

  assert.match(app, /found\.find\([^)]*selectedId\.current[^)]*\)\s*\?\?\s*found\[0\]/);
  assert.match(sidebar, /server\.address\s*&&/);
  assert.match(overview, /eulaAccepted/);
  assert.match(overview, /Accepted/);
});

test("properties UI exposes common settings and an advanced editor", async () => {
  const source = await readFile(
    "src/renderer/components/server/PropertiesTab.tsx",
    "utf8",
  );

  for (const label of [
    "MOTD",
    "Server IP",
    "Server port",
    "Maximum players",
    "Game mode",
    "Difficulty",
    "Online mode",
    "PvP",
    "Allow flight",
    "Whitelist",
    "View distance",
    "Simulation distance",
    "Spawn protection",
    "Advanced properties",
  ]) {
    assert.match(source, new RegExp(label));
  }
});

test("starting a server switches to Console before invoking Electron", async () => {
  const source = await readFile("src/renderer/App.tsx", "utf8");
  const consoleIndex = source.indexOf('setTab("console")');
  const startIndex = source.indexOf("await window.blocksmith.start");

  assert.ok(consoleIndex >= 0 && consoleIndex < startIndex);
  assert.match(source, /setRunningServers/);
  assert.match(source, /setServerLogs/);
});

test("async server updates are guarded and file errors stay visible", async () => {
  const [app, overview, properties] = await Promise.all([
    readFile("src/renderer/App.tsx", "utf8"),
    readFile("src/renderer/components/server/OverviewTab.tsx", "utf8"),
    readFile("src/renderer/components/server/PropertiesTab.tsx", "utf8"),
  ]);

  assert.match(app, /selectedId\.current === server\.id/);
  assert.match(overview, /catch \(error\)/);
  assert.match(overview, /Could not accept the EULA/);
  assert.match(properties, /trim\(\)\.toLowerCase\(\) === "true"/);
});
