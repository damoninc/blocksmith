import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import {
  readServerDetails,
  type ServerDetails,
  type ServerMetadata,
  type ServerType,
} from "./server-details";
import {
  mergeServerProperties,
  type CommonServerProperties,
} from "./server-properties";
import {
  commonJavaRoots,
  findCommonJavaExecutables,
  javaCandidates,
  validateJava,
} from "./java-resolver";
import { deleteServer, renameServer } from "./server-management";

type CreateInput = {
  name: string;
  type: ServerType;
  version: string;
  forgeVersion?: string;
};
let window: BrowserWindow;
let serverRoot = "";
const processes = new Map<string, ChildProcessWithoutNullStreams>();
const startingServers = new Set<string>();
const deletingServers = new Set<string>();
type Settings = { serverRoot?: string; javaPath?: string };

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
    return JSON.parse(await fs.readFile(settingsPath(), "utf8")) as Settings;
  } catch {
    return {};
  }
}
async function saveSettings(update: Partial<Settings>) {
  const next = { ...(await settings()), ...update };
  await fs.mkdir(path.dirname(settingsPath()), { recursive: true });
  await fs.writeFile(settingsPath(), JSON.stringify(next, null, 2));
  return next;
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
  ) as ServerMetadata;
}
async function resolveJavaExecutable(): Promise<string> {
  const current = await settings();
  const common = await findCommonJavaExecutables(commonJavaRoots(process.env));
  const candidates = javaCandidates(
    current.javaPath,
    process.env.Path ?? process.env.PATH,
    common,
  );
  for (const candidate of candidates) {
    if (await validateJava(candidate)) {
      if (candidate !== current.javaPath) await saveSettings({ javaPath: candidate });
      return candidate;
    }
  }

  const result = await dialog.showOpenDialog(window, {
    title: "Choose your Java executable",
    properties: ["openFile"],
    filters: [{ name: "Java executable", extensions: ["exe"] }],
  });
  if (result.canceled || !result.filePaths[0]) {
    throw new Error("Java was not found. Install Java 21 or choose java.exe to start this server.");
  }
  const selected = result.filePaths[0];
  if (!(await validateJava(selected))) {
    throw new Error(`The selected Java executable is not valid: ${selected}`);
  }
  await saveSettings({ javaPath: selected });
  return selected;
}

async function runJava(executable: string, args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, { cwd, windowsHide: true });
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

async function listServers(): Promise<ServerDetails[]> {
  if (!serverRoot) return [];
  try {
    const entries = await fs.readdir(serverRoot, { withFileTypes: true });
    const found = await Promise.all(
      entries
        .filter((e) => e.isDirectory())
        .map(async (e) => {
          try {
            return await readServerDetails(folder(e.name));
          } catch {
            return null;
          }
        }),
    );
    return found
      .filter((s): s is ServerDetails => s !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
async function createServer(input: CreateInput): Promise<ServerDetails> {
  if (!serverRoot) throw new Error("Choose a server location first.");
  const id = cleanName(input.name);
  if (!id) throw new Error("Give the server a name.");
  const dir = folder(id);
  await fs.mkdir(dir, { recursive: false });
  const server: ServerMetadata = {
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
      const java = await resolveJavaExecutable();
      await runJava(java, ["-jar", installer, "--installServer"], dir);
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
    return readServerDetails(dir);
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
    await saveSettings({ serverRoot });
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
ipcMain.handle("server:rename", (_, id: string, name: string) => {
  if (deletingServers.has(id)) throw new Error("This server is being deleted.");
  return renameServer(serverRoot, id, name);
});
ipcMain.handle("server:delete", async (_, id: string, confirmation: string) => {
  if (processes.has(id) || startingServers.has(id)) {
    throw new Error("Stop the running server before deleting it.");
  }
  if (deletingServers.has(id)) throw new Error("This server is already being deleted.");
  deletingServers.add(id);
  try {
    await deleteServer(serverRoot, id, confirmation, processes.has(id));
  } finally {
    deletingServers.delete(id);
  }
});
ipcMain.handle(
  "server:saveProperties",
  async (
    _,
    id: string,
    common: CommonServerProperties,
    advanced: string,
  ) => {
    const file = path.join(folder(id), "server.properties");
    let original = "";
    try {
      original = await fs.readFile(file, "utf8");
    } catch {
      // A missing file is recreated from the submitted values.
    }
    await fs.writeFile(file, mergeServerProperties(original, common, advanced));
    return readServerDetails(folder(id));
  },
);
ipcMain.handle("server:eula", async (_, id: string, accepted: boolean) => {
  await fs.writeFile(path.join(folder(id), "eula.txt"), `eula=${accepted}\n`);
  return readServerDetails(folder(id));
});
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
  if (deletingServers.has(id)) throw new Error("This server is being deleted.");
  if (processes.has(id) || startingServers.has(id)) return;
  startingServers.add(id);
  try {
  const server = await metadata(id);
  const java = server.type === "forge" ? "" : await resolveJavaExecutable();
  const command = server.type === "forge" ? "cmd.exe" : java;
  const args =
    server.type === "forge"
      ? ["/d", "/s", "/c", "run.bat"]
      : ["-Xms1G", "-Xmx2G", "-jar", server.jar!, "nogui"];
  const child = spawn(command, args, { cwd: folder(id), windowsHide: true });
  processes.set(id, child);
  child.stdout.on("data", (data) =>
    window.webContents.send("server:log", id, data.toString()),
  );
  child.stderr.on("data", (data) =>
    window.webContents.send("server:log", id, data.toString()),
  );
  let stopped = false;
  const reportStopped = (code: number | null) => {
    if (stopped) return;
    stopped = true;
    processes.delete(id);
    window.webContents.send("server:stopped", id, code);
  };
  child.once("close", reportStopped);
  const started = new Promise<void>((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", (error) => {
      const message = `Could not start ${command}: ${error.message}`;
      window.webContents.send("server:log", id, `${message}\n`);
      reportStopped(null);
      reject(new Error(message));
    });
  });
  await started;
  } finally {
    startingServers.delete(id);
  }
});
ipcMain.handle("server:stop", (_, id: string) =>
  processes.get(id)?.stdin.write("stop\n"),
);
