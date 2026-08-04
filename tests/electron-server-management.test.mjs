import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  deleteServer,
  renameServer,
  serverDirectory,
} from "../dist/main/server-management.js";

async function fixture(name = "My Server") {
  const root = await mkdtemp(join(tmpdir(), "blocksmith-management-"));
  const directory = join(root, "my-server");
  await mkdir(directory);
  await writeFile(
    join(directory, ".blocksmith.json"),
    JSON.stringify({
      id: "my-server",
      name,
      type: "paper",
      version: "1.21.8",
      createdAt: "today",
      jar: "server.jar",
    }),
  );
  await writeFile(join(directory, "world.dat"), "world");
  return { root, directory };
}

test("rename trims and persists only the display name", async () => {
  const { root, directory } = await fixture();
  try {
    const details = await renameServer(root, "my-server", "  New Name  ");
    const metadata = JSON.parse(await readFile(join(directory, ".blocksmith.json"), "utf8"));

    assert.equal(details.name, "New Name");
    assert.equal(details.id, "my-server");
    assert.equal(metadata.name, "New Name");
    assert.equal(metadata.id, "my-server");
    await access(directory);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rename rejects an empty display name", async () => {
  const { root } = await fixture();
  try {
    await assert.rejects(renameServer(root, "my-server", "   "), /name/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("delete requires the exact case-sensitive server name", async () => {
  const { root, directory } = await fixture("My Server");
  try {
    await assert.rejects(
      deleteServer(root, "my-server", "my server", false),
      /exact server name/i,
    );
    await access(directory);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("delete rejects a running server", async () => {
  const { root, directory } = await fixture();
  try {
    await assert.rejects(
      deleteServer(root, "my-server", "My Server", true),
      /running/i,
    );
    await access(directory);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("server paths cannot escape or select the server root", async () => {
  const root = await mkdtemp(join(tmpdir(), "blocksmith-management-"));
  try {
    assert.throws(() => serverDirectory(root, ".."), /invalid server/i);
    assert.throws(() => serverDirectory(root, "."), /invalid server/i);
    assert.throws(() => serverDirectory(root, join("nested", "server")), /invalid server/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("valid deletion removes the complete server folder", async () => {
  const { root, directory } = await fixture();
  try {
    await deleteServer(root, "my-server", "My Server", false);
    await assert.rejects(access(directory));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
