import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("blocksmith", {
  getRoot: () => ipcRenderer.invoke("root:get"),
  chooseRoot: () => ipcRenderer.invoke("root:choose"),
  listServers: () => ipcRenderer.invoke("servers:list"),
  listVersions: () => ipcRenderer.invoke("versions:list"),
  listForge: (version: string) => ipcRenderer.invoke("forge:list", version),
  create: (input: unknown) => ipcRenderer.invoke("server:create", input),
  rename: (id: string, name: string) =>
    ipcRenderer.invoke("server:rename", id, name),
  delete: (id: string, confirmation: string) =>
    ipcRenderer.invoke("server:delete", id, confirmation),
  saveProperties: (id: string, common: unknown, advanced: string) =>
    ipcRenderer.invoke("server:saveProperties", id, common, advanced),
  setEula: (id: string, accepted: boolean) =>
    ipcRenderer.invoke("server:eula", id, accepted),
  saveLaunch: (id: string, launch: unknown) =>
    ipcRenderer.invoke("server:saveLaunch", id, launch),
  mods: (id: string) => ipcRenderer.invoke("server:mods", id),
  addMod: (id: string) => ipcRenderer.invoke("server:addMod", id),
  plugins: (id: string) => ipcRenderer.invoke("server:plugins", id),
  addPlugins: (id: string, files: unknown[]) =>
    ipcRenderer.invoke("server:addPlugins", id, files),
  searchModrinthPlugins: (id: string, query: string) =>
    ipcRenderer.invoke("plugins:searchModrinth", id, query),
  installModrinthPlugin: (id: string, projectId: string) =>
    ipcRenderer.invoke("plugins:installModrinth", id, projectId),
  start: (id: string) => ipcRenderer.invoke("server:start", id),
  stop: (id: string) => ipcRenderer.invoke("server:stop", id),
  command: (id: string, command: string) =>
    ipcRenderer.invoke("server:command", id, command),
  onLog: (callback: (id: string, text: string) => void) =>
    ipcRenderer.on("server:log", (_, ...args) => callback(args[0], args[1])),
  onStopped: (callback: (id: string, code: number | null) => void) =>
    ipcRenderer.on("server:stopped", (_, ...args) =>
      callback(args[0], args[1]),
    ),
});
