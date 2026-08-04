import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

type ServerType = "vanilla" | "paper" | "fabric" | "forge";
type Server = {
  id: string;
  name: string;
  type: ServerType;
  version: string;
  createdAt: string;
  jar: string | null;
  build?: number;
  loader?: string;
  forgeVersion?: string;
};
type CreateInput = {
  name: string;
  type: ServerType;
  version: string;
  forgeVersion?: string;
};
let window: BrowserWindow;
let serverRoot = "";
const processes = new Map<string, ChildProcessWithoutNullStreams>();

const settingsPath = () => path.join(app.getPath("userData"), "settings.json");
const folder = (id: string) => path.join(serverRoot, id);
const cleanName = (name: string) => name.trim().replace(/[<>:"/\\|?*]/g, "-");
const paperRequest = {
  headers: {
    "User-Agent": "Blocksmith/1.0.0 (https://github.com/damoninc/blocksmith)",
  },
};
async function settings() {
  try {
    return JSON.parse(await fs.readFile(settingsPath(), "utf8")) as {
      serverRoot?: string;
    };
  } catch {
    return {};
  }
}
async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Request failed (${response.status}).`);
  return response.json() as Promise<T>;
}
async function download(url: string, to: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Download failed (${response.status}).`);
  await fs.writeFile(to, Buffer.from(await response.arrayBuffer()));
}
async function metadata(id: string) {
  return JSON.parse(
    await fs.readFile(path.join(folder(id), ".blocksmith.json"), "utf8"),
  ) as Server;
}
async function runJava(args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("java", args, { cwd, windowsHide: true });
    let output = "";
    child.stdout.on("data", (data) => (output += data));
    child.stderr.on("data", (data) => (output += data));
    child.once("error", reject);
    child.once("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Java exited with ${code}: ${output.slice(-500)}`)),
    );
  });
}

async function listServers(): Promise<Server[]> {
  if (!serverRoot) return [];
  try {
    const entries = await fs.readdir(serverRoot, { withFileTypes: true });
    const found = await Promise.all(
      entries
        .filter((e) => e.isDirectory())
        .map(async (e) => {
          try {
            return await metadata(e.name);
          } catch {
            return null;
          }
        }),
    );
    return found
      .filter((s): s is Server => s !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
async function createServer(input: CreateInput): Promise<Server> {
  if (!serverRoot) throw new Error("Choose a server location first.");
  const id = cleanName(input.name);
  if (!id) throw new Error("Give the server a name.");
  const dir = folder(id);
  await fs.mkdir(dir, { recursive: false });
  const server: Server = {
    id,
    name: input.name.trim(),
    type: input.type,
    version: input.version,
    createdAt: new Date().toISOString(),
    jar: "server.jar",
  };
  try {
    if (input.type === "vanilla") {
      const manifest = await fetchJson<{
        versions: { id: string; type: string; url: string }[];
      }>("https://launchermeta.mojang.com/mc/game/version_manifest_v2.json");
      const release = manifest.versions.find(
        (v) => v.id === input.version && v.type === "release",
      );
      if (!release) throw new Error("That Minecraft version was not found.");
      const detail = await fetchJson<{
        downloads: { server: { url: string } };
      }>(release.url);
      await download(detail.downloads.server.url, path.join(dir, "server.jar"));
    }
    if (input.type === "paper") {
      const builds = await fetchJson<
        {
          id: number;
          channel: string;
          downloads: { "server:default": { url: string } };
        }[]
      >(
        `https://fill.papermc.io/v3/projects/paper/versions/${input.version}/builds`,
        paperRequest,
      );
      const build = builds.find((candidate) => candidate.channel === "STABLE");
      if (!build)
        throw new Error("Paper does not publish a build for this version.");
      await download(
        build.downloads["server:default"].url,
        path.join(dir, "server.jar"),
        paperRequest,
      );
      server.build = build.id;
    }
    if (input.type === "fabric") {
      const loaders = await fetchJson<
        { loader: { version: string; stable: boolean } }[]
      >(`https://meta.fabricmc.net/v2/versions/loader/${input.version}`);
      const installers = await fetchJson<
        { version: string; stable: boolean }[]
      >("https://meta.fabricmc.net/v2/versions/installer");
      const loader = loaders.find((v) => v.loader.stable);
      const installer = installers.find((v) => v.stable);
      if (!loader || !installer)
        throw new Error(
          "No stable Fabric loader is available for this version.",
        );
      await download(
        `https://meta.fabricmc.net/v2/versions/loader/${input.version}/${loader.loader.version}/${installer.version}/server/jar`,
        path.join(dir, "server.jar"),
      );
      server.loader = loader.loader.version;
    }
    if (input.type === "forge") {
      if (!input.forgeVersion) throw new Error("Choose a Forge version.");
      const base = `${input.version}-${input.forgeVersion}`;
      const installer = path.join(dir, "forge-installer.jar");
      await download(
        `https://maven.minecraftforge.net/net/minecraftforge/forge/${base}/forge-${base}-installer.jar`,
        installer,
      );
      await runJava(["-jar", installer, "--installServer"], dir);
      server.jar = null;
      server.forgeVersion = input.forgeVersion;
    }
    await fs.writeFile(path.join(dir, "eula.txt"), "eula=false\n");
    await fs.writeFile(
      path.join(dir, "server.properties"),
      `motd=${server.name}\nserver-port=25565\nmax-players=20\nonline-mode=true\ngamemode=survival\ndifficulty=easy\n`,
    );
    await fs.writeFile(
      path.join(dir, ".blocksmith.json"),
      JSON.stringify(server, null, 2),
    );
    return server;
  } catch (error) {
    await fs.rm(dir, { recursive: true, force: true });
    throw error;
  }
}

app.whenReady().then(async () => {
  serverRoot = (await settings()).serverRoot || "";
  window = new BrowserWindow({
    width: 1150,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) await window.loadURL(devUrl);
  else await window.loadFile(path.join(__dirname, "../renderer/index.html"));
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
ipcMain.handle("root:get", () => serverRoot);
ipcMain.handle("root:choose", async () => {
  const result = await dialog.showOpenDialog(window, {
    properties: ["openDirectory", "createDirectory"],
    title: "Choose your Minecraft servers folder",
  });
  if (!result.canceled) {
    serverRoot = result.filePaths[0];
    await fs.mkdir(serverRoot, { recursive: true });
    await fs.writeFile(settingsPath(), JSON.stringify({ serverRoot }, null, 2));
  }
  return serverRoot;
});
ipcMain.handle("servers:list", listServers);
ipcMain.handle("versions:list", async () => {
  const m = await fetchJson<{ versions: { id: string; type: string }[] }>(
    "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json",
  );
  return m.versions.filter((v) => v.type === "release").map((v) => v.id);
});
ipcMain.handle("forge:list", async (_, version: string) => {
  const text = await (
    await fetch(
      `https://files.minecraftforge.net/net/minecraftforge/forge/index_${version}.html`,
    )
  ).text();
  return [...text.matchAll(/([0-9]+\.[0-9]+\.[0-9]+)<\/a>/g)]
    .map((m) => m[1])
    .filter((v, i, all) => all.indexOf(v) === i);
});
ipcMain.handle("server:create", (_, input: CreateInput) => createServer(input));
ipcMain.handle("server:properties", (_, id: string) =>
  fs.readFile(path.join(folder(id), "server.properties"), "utf8"),
);
ipcMain.handle("server:saveProperties", (_, id: string, text: string) =>
  fs.writeFile(path.join(folder(id), "server.properties"), text),
);
ipcMain.handle("server:eula", (_, id: string, accepted: boolean) =>
  fs.writeFile(path.join(folder(id), "eula.txt"), `eula=${accepted}\n`),
);
ipcMain.handle("server:mods", async (_, id: string) => {
  try {
    return (await fs.readdir(path.join(folder(id), "mods"))).filter((f) =>
      f.endsWith(".jar"),
    );
  } catch {
    return [];
  }
});
ipcMain.handle("server:addMod", async (_, id: string) => {
  const result = await dialog.showOpenDialog(window, {
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "Minecraft mods", extensions: ["jar"] }],
  });
  if (!result.canceled) {
    const mods = path.join(folder(id), "mods");
    await fs.mkdir(mods, { recursive: true });
    await Promise.all(
      result.filePaths.map((file) =>
        fs.copyFile(file, path.join(mods, path.basename(file))),
      ),
    );
  }
  return result.canceled
    ? []
    : result.filePaths.map((file) => path.basename(file));
});
ipcMain.handle("server:start", async (_, id: string) => {
  if (processes.has(id)) return;
  const server = await metadata(id);
  const child =
    server.type === "forge"
      ? spawn("run.bat", [], { cwd: folder(id), windowsHide: true })
      : spawn("java", ["-Xms1G", "-Xmx2G", "-jar", server.jar!, "nogui"], {
          cwd: folder(id),
          windowsHide: true,
        });
  processes.set(id, child);
  child.stdout.on("data", (data) =>
    window.webContents.send("server:log", id, data.toString()),
  );
  child.stderr.on("data", (data) =>
    window.webContents.send("server:log", id, data.toString()),
  );
  child.once("close", (code) => {
    processes.delete(id);
    window.webContents.send("server:stopped", id, code);
  });
  child.once("error", (error) =>
    window.webContents.send("server:log", id, error.message),
  );
});
ipcMain.handle("server:stop", (_, id: string) =>
  processes.get(id)?.stdin.write("stop\n"),
);
