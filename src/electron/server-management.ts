import fs from "node:fs/promises";
import path from "node:path";
import { readServerDetails, type ServerMetadata } from "./server-details";

export function serverDirectory(root: string, id: string): string {
  if (!root.trim() || !id.trim() || path.isAbsolute(id)) {
    throw new Error("Invalid server path.");
  }
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, id);
  const relative = path.relative(resolvedRoot, target);
  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative) ||
    relative.includes(path.sep)
  ) {
    throw new Error("Invalid server path.");
  }
  return target;
}

async function readMetadata(directory: string): Promise<ServerMetadata> {
  const metadataPath = path.join(directory, ".blocksmith.json");
  const metadataStats = await fs.lstat(metadataPath);
  if (metadataStats.isSymbolicLink()) {
    throw new Error("Server metadata cannot be a symbolic link or reparse point.");
  }
  const canonicalMetadata = await fs.realpath(metadataPath);
  if (path.dirname(canonicalMetadata) !== directory) {
    throw new Error("Server metadata resolves outside its server folder.");
  }
  return JSON.parse(
    await fs.readFile(metadataPath, "utf8"),
  ) as ServerMetadata;
}

async function canonicalServerDirectory(root: string, id: string): Promise<string> {
  const lexicalDirectory = serverDirectory(root, id);
  const directoryStats = await fs.lstat(lexicalDirectory);
  if (directoryStats.isSymbolicLink()) {
    throw new Error("Server folder cannot be a symbolic link or reparse point.");
  }
  const [canonicalRoot, canonicalDirectory] = await Promise.all([
    fs.realpath(path.resolve(root)),
    fs.realpath(lexicalDirectory),
  ]);
  const relative = path.relative(canonicalRoot, canonicalDirectory);
  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative) ||
    relative.includes(path.sep)
  ) {
    throw new Error("Server folder resolves outside the configured server root.");
  }
  return canonicalDirectory;
}

export async function renameServer(root: string, id: string, name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Server name cannot be empty.");
  const directory = await canonicalServerDirectory(root, id);
  const metadata = await readMetadata(directory);
  if (metadata.id !== id) throw new Error("Server metadata does not match its folder.");
  await fs.writeFile(
    path.join(directory, ".blocksmith.json"),
    JSON.stringify({ ...metadata, name: trimmedName }, null, 2),
  );
  return readServerDetails(directory);
}

export async function deleteServer(
  root: string,
  id: string,
  confirmation: string,
  running: boolean,
): Promise<void> {
  const directory = await canonicalServerDirectory(root, id);
  if (running) throw new Error("Stop the running server before deleting it.");
  const metadata = await readMetadata(directory);
  if (metadata.id !== id) throw new Error("Server metadata does not match its folder.");
  if (confirmation !== metadata.name) {
    throw new Error("Type the exact server name to confirm deletion.");
  }
  await fs.rm(directory, { recursive: true, force: false });
}
