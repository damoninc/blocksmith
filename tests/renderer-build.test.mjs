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
  assert.match(overview, /className="form-error"/);
  assert.match(properties, /trim\(\)\.toLowerCase\(\) === "true"/);
});

test("server management uses guarded rename and delete dialogs", async () => {
  const [view, dialogs] = await Promise.all([
    readFile("src/renderer/views/ServerView.tsx", "utf8"),
    readFile(
      "src/renderer/components/server/ServerManagementDialogs.tsx",
      "utf8",
    ),
  ]);

  assert.match(view, />Rename</);
  assert.match(view, />Delete</);
  assert.match(view, /\{managementMode && \(/);
  assert.match(view, /key=\{`\$\{server\.id\}-\$\{managementMode\}`\}/);
  assert.match(dialogs, /useState\(server\.name\)/);
  assert.match(dialogs, /Type <strong>\{server\.name\}<\/strong>/);
  assert.match(dialogs, /confirmation !== server\.name/);
  assert.match(dialogs, /className="form-error"/);
  assert.match(dialogs, /window\.blocksmith\.rename/);
  assert.match(dialogs, /window\.blocksmith\.delete/);
});

test("rename re-sorts the sidebar and delete reloads selection", async () => {
  const source = await readFile("src/renderer/App.tsx", "utf8");
  const replaceServer = source.slice(
    source.indexOf("const replaceServer"),
    source.indexOf("const chooseServer"),
  );

  assert.match(
    replaceServer,
    /\.map\([\s\S]*item\.id === server\.id[\s\S]*\.sort\([\s\S]*name\.localeCompare/,
  );
  assert.match(source, /handleServerDeleted/);
  assert.match(source, /delete next\[id\]/);
  assert.match(source, /await reload\(\)/);
  assert.match(source, /onServerDeleted=\{handleServerDeleted\}/);
});

test("Forge creation handles unavailable builds and stale requests", async () => {
  const source = await readFile(
    "src/renderer/views/CreateServerView.tsx",
    "utf8",
  );

  assert.match(
    source,
    /type ForgeDiscovery = \{[\s\S]*version: string;[\s\S]*builds: string\[\];[\s\S]*loading: boolean;[\s\S]*error: string;/,
  );
  assert.match(
    source,
    /const \[forgeDiscovery, setForgeDiscovery\] =\s*useState<ForgeDiscovery>/,
  );
  assert.match(
    source,
    /forgeDiscovery\.version === version[\s\S]*forgeDiscovery\.builds/,
  );
  assert.match(source, /const forgeReady =/);

  const forgeEffectStart = source.indexOf('if (type !== "forge" || !version)');
  const forgeEffect = source.slice(
    forgeEffectStart,
    source.indexOf("}, [type, version]);", forgeEffectStart),
  );
  assert.match(forgeEffect, /let active = true/);
  assert.match(
    forgeEffect,
    /if \(type !== "forge" \|\| !version\) \{[\s\S]*setForgeDiscovery/,
  );
  assert.ok(
    forgeEffect.indexOf("setForgeDiscovery({") <
      forgeEffect.indexOf(".listForge(version)"),
    "stale Forge builds must be cleared before requesting new ones",
  );
  assert.match(forgeEffect, /if \(active\)[\s\S]*setForgeDiscovery/);
  assert.match(
    forgeEffect,
    /\.catch\(\(error: unknown\)[\s\S]*error instanceof Error[\s\S]*error\.message/,
  );
  assert.match(forgeEffect, /return \(\) => \{[\s\S]*active = false/);
  assert.match(source, /No Forge builds are available for Minecraft \$\{version\}\./);
  assert.match(source, /role="alert"[\s\S]*\{forgeError\}/);
  assert.match(source, /role="status"[\s\S]*aria-live="polite"/);
  assert.match(source, /aria-busy=\{loadingForge\}/);
  assert.match(source, /if \(type === "forge" && !forgeReady\) return/);
  assert.match(source, /disabled=\{creating \|\| !forgeReady\}/);
});
