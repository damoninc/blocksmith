/// <reference types="vite/client" />
type ServerType = 'vanilla' | 'paper' | 'fabric' | 'forge';
type Server = { id: string; name: string; type: ServerType; version: string; jar: string | null; build?: number };
declare global { interface Window { blocksmith: { getRoot(): Promise<string>; chooseRoot(): Promise<string>; listServers(): Promise<Server[]>; listVersions(): Promise<string[]>; listForge(version: string): Promise<string[]>; create(input: { name: string; type: ServerType; version: string; forgeVersion?: string }): Promise<Server>; properties(id: string): Promise<string>; saveProperties(id: string, text: string): Promise<void>; setEula(id: string, accepted: boolean): Promise<void>; mods(id: string): Promise<string[]>; addMod(id: string): Promise<string[]>; start(id: string): Promise<void>; stop(id: string): Promise<void>; onLog(callback: (id: string, text: string) => void): void; onStopped(callback: (id: string, code: number | null) => void): void } } }
export {};
