/// <reference types="vite/client" />
import type { CommonServerProperties, ServerDetails, ServerType } from "./types";

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
      mods(id: string): Promise<string[]>;
      addMod(id: string): Promise<string[]>;
      start(id: string): Promise<void>;
      stop(id: string): Promise<void>;
      onLog(callback: (id: string, text: string) => void): void;
      onStopped(callback: (id: string, code: number | null) => void): void;
    };
  }
}
export {};
