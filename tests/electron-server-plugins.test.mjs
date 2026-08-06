import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  addPluginFiles,
  listPlugins,
  pluginFilename,
} from "../dist/main/server-plugins.js";
import {
  resolveModrinthPluginDownload,
  searchModrinthPlugins,
} from "../dist/main/modrinth-plugins.js";

async function fixture(type = "paper") {
  const root = await mkdtemp(join(tmpdir(), "blocksmith-plugins-"));
  const directory = join(root, "my-server");
  await mkdir(directory);
  await writeFile(
    join(directory, ".blocksmith.json"),
    JSON.stringify({
      id: "my-server",
      name: "My Server",
      type,
      version: "1.21.8",
      createdAt: "today",
      jar: "server.jar",
    }),
  );
  return { root, directory };
}

test("Paper plugin files are validated, installed, and listed", async () => {
  const { root, directory } = await fixture();
  try {
    const installed = await addPluginFiles(root, "my-server", [
      { name: "WorldEdit.jar", data: new Uint8Array([80, 75, 3, 4]) },
      { name: "essentials.JAR", data: new Uint8Array([1, 2, 3]) },
    ]);

    assert.deepEqual(installed, ["essentials.JAR", "WorldEdit.jar"]);
    assert.deepEqual(await listPlugins(root, "my-server"), installed);
    assert.deepEqual(
      [...(await readFile(join(directory, "plugins", "WorldEdit.jar")))],
      [80, 75, 3, 4],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("plugins can only be added to Paper servers", async () => {
  const { root } = await fixture("fabric");
  try {
    await assert.rejects(
      addPluginFiles(root, "my-server", [
        { name: "plugin.jar", data: new Uint8Array([1]) },
      ]),
      /Paper servers/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("plugin filenames cannot escape the plugins folder", () => {
  assert.throws(() => pluginFilename("../plugin.jar"), /valid filename/);
  assert.throws(() => pluginFilename("plugin.zip"), /.jar files/);
});

test("plugin uploads are bounded to a safe batch size", async () => {
  const { root } = await fixture();
  try {
    await assert.rejects(
      addPluginFiles(
        root,
        "my-server",
        Array.from({ length: 21 }, (_, index) => ({
          name: `plugin-${index}.jar`,
          data: new Uint8Array([1]),
        })),
      ),
      /no more than 20 plugins/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("plugin folder junctions cannot redirect writes outside the server", async () => {
  const { root, directory } = await fixture();
  const outside = await mkdtemp(join(tmpdir(), "blocksmith-plugins-outside-"));
  try {
    await symlink(outside, join(directory, "plugins"), "junction");
    await assert.rejects(
      addPluginFiles(root, "my-server", [
        { name: "plugin.jar", data: new Uint8Array([1]) },
      ]),
      /symbolic link|reparse|outside/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("Modrinth search is constrained to compatible Paper plugins", async () => {
  let requestedUrl = "";
  const request = async (url) => {
    requestedUrl = String(url);
    return new Response(
      JSON.stringify({
        hits: [
          {
            project_id: "abc123",
            slug: "a-plugin",
            title: "A Plugin",
            description: "Does a thing",
            author: "author",
            icon_url: null,
            downloads: 42,
          },
        ],
      }),
    );
  };

  const plugins = await searchModrinthPlugins("1.21.8", "claims", request);

  const url = new URL(requestedUrl);
  assert.equal(url.pathname, "/v2/search");
  assert.equal(url.searchParams.get("query"), "claims");
  const facets = JSON.parse(url.searchParams.get("facets"));
  assert.deepEqual(facets, [
    ["all_project_types:plugin"],
    ["categories:paper"],
    ["versions:1.21.8"],
    ["server_side:required", "server_side:optional"],
  ]);
  assert.deepEqual(plugins, [
    {
      projectId: "abc123",
      slug: "a-plugin",
      title: "A Plugin",
      description: "Does a thing",
      author: "author",
      iconUrl: null,
      downloads: 42,
    },
  ]);
});

test("Modrinth install selects the primary JAR from a compatible release", async () => {
  const request = async () =>
    new Response(
      JSON.stringify([
        {
          version_type: "release",
          files: [
            {
              url: "https://cdn.modrinth.com/data/abc/version/sources.jar",
              filename: "sources.jar",
              primary: false,
              file_type: "sources-jar",
            },
            {
              url: "https://cdn.modrinth.com/data/abc/version/plugin.jar",
              filename: "plugin.jar",
              primary: true,
              file_type: null,
            },
          ],
        },
      ]),
    );

  assert.deepEqual(
    await resolveModrinthPluginDownload("abc123", "1.21.8", request),
    {
      url: "https://cdn.modrinth.com/data/abc/version/plugin.jar",
      filename: "plugin.jar",
    },
  );
});

test("Modrinth install rejects download URLs outside its CDN", async () => {
  const request = async () =>
    new Response(
      JSON.stringify([
        {
          version_type: "release",
          files: [
            {
              url: "https://example.com/plugin.jar",
              filename: "plugin.jar",
              primary: true,
              file_type: null,
            },
          ],
        },
      ]),
    );

  await assert.rejects(
    resolveModrinthPluginDownload("abc123", "1.21.8", request),
    /unsafe plugin download URL/,
  );
});
