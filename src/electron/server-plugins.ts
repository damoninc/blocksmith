import fs from "node:fs/promises";
import path from "node:path";
import {
  managedServerDirectory,
  readServerMetadata,
} from "./server-management";
import type { ServerMetadata } from "./server-details";

const MAX_PLUGIN_SIZE = 128 * 1024 * 1024;
const MAX_PLUGIN_BATCH_SIZE = 256 * 1024 * 1024;
const MAX_PLUGIN_BATCH_FILES = 20;

export type PluginUpload = {
  name: string;
  data: Uint8Array;
};

export async function paperServerMetadata(
  root: string,
  id: string,
): Promise<{ directory: string; metadata: ServerMetadata }> {
  const directory = await managedServerDirectory(root, id);
  const metadata = await readServerMetadata(directory);
  if (metadata.id !== id) {
    throw new Error("Server metadata does not match its folder.");
  }
  if (metadata.type !== "paper") {
    throw new Error("Plugins can only be installed on Paper servers.");
  }
  return { directory, metadata };
}

async function pluginDirectory(root: string, id: string): Promise<string> {
  const { directory } = await paperServerMetadata(root, id);
  const plugins = path.join(directory, "plugins");
  try {
    const stats = await fs.lstat(plugins);
    if (stats.isSymbolicLink()) {
      throw new Error(
        "The plugins folder cannot be a symbolic link or reparse point.",
      );
    }
    if (!stats.isDirectory()) {
      throw new Error("The plugins path is not a folder.");
    }
    const canonicalPlugins = await fs.realpath(plugins);
    if (path.relative(directory, canonicalPlugins).toLowerCase() !== "plugins") {
      throw new Error("The plugins folder resolves outside its Paper server.");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return plugins;
}

export function pluginFilename(name: string): string {
  const trimmed = name.trim();
  if (
    !trimmed ||
    path.basename(trimmed) !== trimmed ||
    !trimmed.toLowerCase().endsWith(".jar")
  ) {
    throw new Error("Plugin files must be .jar files with a valid filename.");
  }
  return trimmed;
}

export async function listPlugins(root: string, id: string): Promise<string[]> {
  const plugins = await pluginDirectory(root, id);
  try {
    const entries = await fs.readdir(plugins, { withFileTypes: true });
    return entries
      .filter(
        (entry) =>
          entry.isFile() && entry.name.toLowerCase().endsWith(".jar"),
      )
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function addPluginFiles(
  root: string,
  id: string,
  files: PluginUpload[],
): Promise<string[]> {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("Choose at least one plugin JAR.");
  }
  if (files.length > MAX_PLUGIN_BATCH_FILES) {
    throw new Error(
      `Add no more than ${MAX_PLUGIN_BATCH_FILES} plugins at once.`,
    );
  }
  const plugins = await pluginDirectory(root, id);
  const validated = files.map((file) => {
    const name = pluginFilename(file.name);
    if (!(file.data instanceof Uint8Array) || file.data.byteLength === 0) {
      throw new Error(`${name} is empty or unreadable.`);
    }
    if (file.data.byteLength > MAX_PLUGIN_SIZE) {
      throw new Error(`${name} is larger than the 128 MB plugin limit.`);
    }
    return { name, data: file.data };
  });
  const batchSize = validated.reduce(
    (total, file) => total + file.data.byteLength,
    0,
  );
  if (batchSize > MAX_PLUGIN_BATCH_SIZE) {
    throw new Error(
      "The selected plugins are larger than the 256 MB batch limit.",
    );
  }

  await fs.mkdir(plugins, { recursive: true });
  await pluginDirectory(root, id);
  await Promise.all(
    validated.map(({ name, data }) =>
      fs.writeFile(path.join(plugins, name), data),
    ),
  );
  return listPlugins(root, id);
}

export async function addDownloadedPlugin(
  root: string,
  id: string,
  name: string,
  data: Uint8Array,
): Promise<string[]> {
  return addPluginFiles(root, id, [{ name, data }]);
}
