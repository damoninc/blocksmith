import fs from "node:fs/promises";
import path from "node:path";
import {
  formatServerAddress,
  parseEula,
  parseServerProperties,
  type CommonServerProperties,
} from "./server-properties";

export type ServerType = "vanilla" | "paper" | "fabric" | "forge";
export type ServerMetadata = {
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
export type ServerDetails = ServerMetadata & {
  properties: CommonServerProperties;
  advancedProperties: string;
  eulaAccepted: boolean;
  address: string;
};

async function readOptional(file: string): Promise<string> {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return "";
  }
}

export async function readServerDetails(directory: string): Promise<ServerDetails> {
  const metadata = JSON.parse(
    await fs.readFile(path.join(directory, ".blocksmith.json"), "utf8"),
  ) as ServerMetadata;
  const [propertiesText, eulaText] = await Promise.all([
    readOptional(path.join(directory, "server.properties")),
    readOptional(path.join(directory, "eula.txt")),
  ]);
  const parsed = parseServerProperties(propertiesText);
  return {
    ...metadata,
    properties: parsed.common,
    advancedProperties: parsed.advanced,
    eulaAccepted: parseEula(eulaText),
    address: formatServerAddress(parsed.common),
  };
}
