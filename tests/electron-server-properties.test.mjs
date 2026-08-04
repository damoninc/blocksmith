import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { readServerDetails } from "../dist/main/server-details.js";
import {
  formatServerAddress,
  mergeServerProperties,
  parseEula,
  parseServerProperties,
} from "../dist/main/server-properties.js";

test("parses common properties and keeps uncommon settings advanced", () => {
  const parsed = parseServerProperties(
    "# generated\nmotd=My Server\nserver-ip=192.168.0.5\nserver-port=25570\nresource-pack=https://example.test/pack.zip\n",
  );

  assert.equal(parsed.common.motd, "My Server");
  assert.equal(parsed.common["server-port"], "25570");
  assert.equal(parsed.advanced, "resource-pack=https://example.test/pack.zip");
});

test("uses Minecraft-friendly defaults for missing common properties", () => {
  const parsed = parseServerProperties("");

  assert.equal(parsed.common["server-port"], "25565");
  assert.equal(parsed.common["max-players"], "20");
  assert.equal(parsed.common["online-mode"], "true");
  assert.equal(parsed.common.gamemode, "survival");
});

test("merges form and advanced values while preserving comments", () => {
  const original = "# keep this\nmotd=Old\nresource-pack=old\nunknown-line\n";
  const parsed = parseServerProperties(original);
  const merged = mergeServerProperties(
    original,
    { ...parsed.common, motd: "New", "server-port": "25566" },
    "resource-pack=new\nallow-nether=false",
  );

  assert.match(merged, /^# keep this$/m);
  assert.match(merged, /^unknown-line$/m);
  assert.match(merged, /^motd=New$/m);
  assert.match(merged, /^server-port=25566$/m);
  assert.match(merged, /^resource-pack=new$/m);
  assert.match(merged, /^allow-nether=false$/m);
  assert.equal((merged.match(/^resource-pack=/gm) ?? []).length, 1);
});

test("formats an address only when server-ip is set", () => {
  assert.equal(
    formatServerAddress({ "server-ip": "192.168.0.5", "server-port": "25570" }),
    "192.168.0.5:25570",
  );
  assert.equal(formatServerAddress({ "server-ip": "", "server-port": "25565" }), "");
});

test("reads EULA acceptance from its key", () => {
  assert.equal(parseEula("# comment\neula=true\n"), true);
  assert.equal(parseEula("eula=false\n"), false);
  assert.equal(parseEula("not-eula=true\n"), false);
});

test("loads unified details from Minecraft files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "blocksmith-details-"));
  try {
    await writeFile(
      join(directory, ".blocksmith.json"),
      JSON.stringify({ id: "home", name: "Home", type: "paper", version: "1.21.8", createdAt: "today", jar: "server.jar" }),
    );
    await writeFile(join(directory, "server.properties"), "server-ip=10.0.0.2\nserver-port=25566\nmotd=Home\nresource-pack=pack\n");
    await writeFile(join(directory, "eula.txt"), "eula=true\n");

    const details = await readServerDetails(directory);

    assert.equal(details.address, "10.0.0.2:25566");
    assert.equal(details.eulaAccepted, true);
    assert.equal(details.properties.motd, "Home");
    assert.equal(details.advancedProperties, "resource-pack=pack");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("uses safe property and EULA defaults when their files are missing", async () => {
  const directory = await mkdtemp(join(tmpdir(), "blocksmith-details-"));
  try {
    await writeFile(
      join(directory, ".blocksmith.json"),
      JSON.stringify({ id: "fresh", name: "Fresh", type: "vanilla", version: "1.21.8", createdAt: "today", jar: "server.jar" }),
    );

    const details = await readServerDetails(directory);

    assert.equal(details.address, "");
    assert.equal(details.eulaAccepted, false);
    assert.equal(details.properties["server-port"], "25565");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
