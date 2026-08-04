const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverRoot = '';
const activeProcesses = new Map();

function configPath() { return path.join(app.getPath('userData'), 'settings.json'); }
async function readSettings() { try { return JSON.parse(await fs.readFile(configPath(), 'utf8')); } catch { return {}; } }
async function saveSettings(settings) { await fs.mkdir(path.dirname(configPath()), { recursive: true }); await fs.writeFile(configPath(), JSON.stringify(settings, null, 2)); }
async function readJson(url) { const response = await fetch(url); if (!response.ok) throw new Error(`${response.status} while requesting ${url}`); return response.json(); }
function cleanName(name) { return name.trim().replace(/[<>:"/\\|?*]/g, '-'); }
function serverPath(id) { return path.join(serverRoot, id); }
async function serverMetadata(id) { return JSON.parse(await fs.readFile(path.join(serverPath(id), '.blocksmith.json'), 'utf8')); }
async function writeMetadata(metadata) { await fs.writeFile(path.join(serverPath(metadata.id), '.blocksmith.json'), JSON.stringify(metadata, null, 2)); }

async function listServers() {
  if (!serverRoot) return [];
  try {
    const entries = await fs.readdir(serverRoot, { withFileTypes: true });
    const servers = [];
    for (const entry of entries.filter(e => e.isDirectory())) {
      try { servers.push(await serverMetadata(entry.name)); } catch { /* Ignore non-Blocksmith folders. */ }
    }
    return servers.sort((a, b) => a.name.localeCompare(b.name));
  } catch { return []; }
}

async function download(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}).`);
  await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

async function runJava(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn('java', args, { cwd, windowsHide: true });
    let output = '';
    child.stdout.on('data', d => { output += d; }); child.stderr.on('data', d => { output += d; });
    child.on('error', reject); child.on('close', code => code === 0 ? resolve(output) : reject(new Error(`Java exited with code ${code}: ${output.slice(-500)}`)));
  });
}

async function createServer(input) {
  if (!serverRoot) throw new Error('Choose a server location first.');
  const id = cleanName(input.name);
  if (!id) throw new Error('Give the server a name.');
  const dir = serverPath(id);
  await fs.mkdir(dir, { recursive: false });
  const metadata = { id, name: input.name.trim(), type: input.type, version: input.version, createdAt: new Date().toISOString(), jar: 'server.jar' };
  try {
    if (input.type === 'vanilla') {
      const manifest = await readJson('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
      const release = manifest.versions.find(v => v.id === input.version);
      if (!release) throw new Error('That Minecraft version was not found.');
      const detail = await readJson(release.url);
      await download(detail.downloads.server.url, path.join(dir, metadata.jar));
    } else if (input.type === 'paper') {
      const builds = await readJson(`https://api.papermc.io/v2/projects/paper/versions/${input.version}/builds`);
      const build = builds.builds.filter(b => b.channel === 'default').at(-1);
      if (!build) throw new Error('Paper does not publish a build for this version.');
      await download(`https://api.papermc.io/v2/projects/paper/versions/${input.version}/builds/${build.build}/downloads/${build.downloads.application.name}`, path.join(dir, metadata.jar));
      metadata.build = build.build;
    } else if (input.type === 'fabric') {
      const loaders = await readJson(`https://meta.fabricmc.net/v2/versions/loader/${input.version}`);
      const loader = loaders.find(v => v.loader.stable);
      const installers = await readJson('https://meta.fabricmc.net/v2/versions/installer');
      const installer = installers.find(v => v.stable);
      if (!loader || !installer) throw new Error('No stable Fabric loader is available for this version.');
      await download(`https://meta.fabricmc.net/v2/versions/loader/${input.version}/${loader.loader.version}/${installer.version}/server/jar`, path.join(dir, metadata.jar));
      metadata.loader = loader.loader.version;
    } else if (input.type === 'forge') {
      if (!input.forgeVersion) throw new Error('Choose a Forge version.');
      const base = `${input.version}-${input.forgeVersion}`;
      const installer = path.join(dir, 'forge-installer.jar');
      await download(`https://maven.minecraftforge.net/net/minecraftforge/forge/${base}/forge-${base}-installer.jar`, installer);
      await runJava(['-jar', installer, '--installServer'], dir);
      metadata.jar = null; metadata.forgeVersion = input.forgeVersion;
    }
    await fs.writeFile(path.join(dir, 'eula.txt'), 'eula=false\n');
    await fs.writeFile(path.join(dir, 'server.properties'), `motd=${input.name.trim()}\nserver-port=25565\nmax-players=20\nonline-mode=true\ngamemode=survival\ndifficulty=easy\n`);
    await writeMetadata(metadata);
    return metadata;
  } catch (error) { await fs.rm(dir, { recursive: true, force: true }); throw error; }
}

function serverCommand(metadata) {
  const dir = serverPath(metadata.id);
  if (metadata.type === 'forge') {
    const script = process.platform === 'win32' ? 'run.bat' : 'run.sh';
    return { command: process.platform === 'win32' ? script : 'sh', args: process.platform === 'win32' ? [] : [script], cwd: dir };
  }
  return { command: 'java', args: ['-Xms1G', '-Xmx2G', '-jar', metadata.jar, 'nogui'], cwd: dir };
}

app.whenReady().then(async () => {
  const settings = await readSettings(); serverRoot = settings.serverRoot || '';
  mainWindow = new BrowserWindow({ width: 1150, height: 760, minWidth: 900, minHeight: 600, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true } });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('root:get', () => serverRoot);
ipcMain.handle('root:choose', async () => { const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'], title: 'Choose your Minecraft servers folder' }); if (!result.canceled) { serverRoot = result.filePaths[0]; await fs.mkdir(serverRoot, { recursive: true }); await saveSettings({ serverRoot }); } return serverRoot; });
ipcMain.handle('servers:list', listServers);
ipcMain.handle('versions:list', async () => { const m = await readJson('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json'); return m.versions.filter(v => v.type === 'release').map(v => v.id); });
ipcMain.handle('forge:list', async (_, version) => { const text = await (await fetch(`https://files.minecraftforge.net/net/minecraftforge/forge/index_${version}.html`)).text(); return [...text.matchAll(/([0-9]+\.[0-9]+\.[0-9]+)<\/a>/g)].map(m => m[1]).filter((v, i, all) => all.indexOf(v) === i); });
ipcMain.handle('server:create', (_, input) => createServer(input));
ipcMain.handle('server:properties', async (_, id) => fs.readFile(path.join(serverPath(id), 'server.properties'), 'utf8'));
ipcMain.handle('server:saveProperties', async (_, id, text) => fs.writeFile(path.join(serverPath(id), 'server.properties'), text));
ipcMain.handle('server:eula', async (_, id, accepted) => fs.writeFile(path.join(serverPath(id), 'eula.txt'), `eula=${accepted}\n`));
ipcMain.handle('server:mods', async (_, id) => { const mods = path.join(serverPath(id), 'mods'); try { return (await fs.readdir(mods)).filter(f => f.endsWith('.jar')); } catch { return []; } });
ipcMain.handle('server:addMod', async (_, id) => { const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile', 'multiSelections'], filters: [{ name: 'Minecraft mods', extensions: ['jar'] }] }); if (!result.canceled) { const mods = path.join(serverPath(id), 'mods'); await fs.mkdir(mods, { recursive: true }); for (const f of result.filePaths) await fs.copyFile(f, path.join(mods, path.basename(f))); } return result.canceled ? [] : result.filePaths.map(path.basename); });
ipcMain.handle('server:start', async (_, id) => { if (activeProcesses.has(id)) return; const meta = await serverMetadata(id); const run = serverCommand(meta); const child = spawn(run.command, run.args, { cwd: run.cwd, windowsHide: true }); activeProcesses.set(id, child); child.stdout.on('data', d => mainWindow.webContents.send('server:log', id, d.toString())); child.stderr.on('data', d => mainWindow.webContents.send('server:log', id, d.toString())); child.on('close', code => { activeProcesses.delete(id); mainWindow.webContents.send('server:stopped', id, code); }); child.on('error', e => mainWindow.webContents.send('server:log', id, e.message)); });
ipcMain.handle('server:stop', (_, id) => { const child = activeProcesses.get(id); if (child) child.stdin.write('stop\n'); });
