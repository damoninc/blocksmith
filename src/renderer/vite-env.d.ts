/// <reference types="vite/client" />
import type {
  CommonServerProperties,
  ModrinthPlugin,
  ModrinthSort,
  ServerDetails,
  ServerLaunchSettings,
  ServerType,
} from "./types";

declare global {
  interface Window {
    blocksmith: {
      getRoot(): Promise<string>;
      chooseRoot(): Promise<string>;
      listServers(): Promise<ServerDetails[]>;
      listVersions(): Promise<string[]>;
      listForge(version: string): Promise<string[]>;
      create(input: {
        name: string;
        type: ServerType;
        version: string;
        forgeVersion?: string;
      }): Promise<ServerDetails>;
      rename(id: string, name: string): Promise<ServerDetails>;
      delete(id: string, confirmation: string): Promise<void>;
      saveProperties(
        id: string,
        common: CommonServerProperties,
        advanced: string,
      ): Promise<ServerDetails>;
      setEula(id: string, accepted: boolean): Promise<ServerDetails>;
      saveLaunch(
        id: string,
        launch: ServerLaunchSettings,
      ): Promise<ServerDetails>;
      mods(id: string): Promise<string[]>;
      addMod(id: string): Promise<string[]>;
      plugins(id: string): Promise<string[]>;
      addPlugins(
        id: string,
        files: Array<{ name: string; data: Uint8Array }>,
      ): Promise<string[]>;
      searchModrinthPlugins(
        id: string,
        query: string,
        sort: ModrinthSort,
      ): Promise<ModrinthPlugin[]>;
      openModrinthPlugin(slug: string): Promise<void>;
      installModrinthPlugin(
        id: string,
        projectId: string,
      ): Promise<string[]>;
      start(id: string): Promise<void>;
      stop(id: string): Promise<void>;
      command(id: string, command: string): Promise<void>;
      onLog(callback: (id: string, text: string) => void): void;
      onStopped(callback: (id: string, code: number | null) => void): void;
    };
  }
}
export {};
