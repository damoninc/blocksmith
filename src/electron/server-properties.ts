export const COMMON_PROPERTY_KEYS = [
  "motd",
  "server-ip",
  "server-port",
  "max-players",
  "gamemode",
  "difficulty",
  "online-mode",
  "pvp",
  "allow-flight",
  "white-list",
  "view-distance",
  "simulation-distance",
  "spawn-protection",
] as const;

export type CommonPropertyKey = (typeof COMMON_PROPERTY_KEYS)[number];
export type CommonServerProperties = Record<CommonPropertyKey, string>;

const defaults: CommonServerProperties = {
  motd: "A Minecraft Server",
  "server-ip": "",
  "server-port": "25565",
  "max-players": "20",
  gamemode: "survival",
  difficulty: "easy",
  "online-mode": "true",
  pvp: "true",
  "allow-flight": "false",
  "white-list": "false",
  "view-distance": "10",
  "simulation-distance": "10",
  "spawn-protection": "16",
};

const commonKeys = new Set<string>(COMMON_PROPERTY_KEYS);

function propertyLine(line: string) {
  const separator = line.indexOf("=");
  if (separator < 1 || line.trimStart().startsWith("#")) return null;
  return {
    key: line.slice(0, separator).trim(),
    value: line.slice(separator + 1),
  };
}

export function parseServerProperties(text: string): {
  common: CommonServerProperties;
  advanced: string;
} {
  const common = { ...defaults };
  const advanced: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    const property = propertyLine(line);
    if (!property) continue;
    if (commonKeys.has(property.key)) {
      common[property.key as CommonPropertyKey] = property.value;
    } else {
      advanced.push(`${property.key}=${property.value}`);
    }
  }

  return { common, advanced: advanced.join("\n") };
}

export function mergeServerProperties(
  original: string,
  common: CommonServerProperties,
  advanced: string,
): string {
  const remainingAdvanced = new Map<string, string>();
  for (const line of advanced.split(/\r?\n/)) {
    const property = propertyLine(line);
    if (property && !commonKeys.has(property.key)) {
      remainingAdvanced.set(property.key, property.value);
    }
  }

  const seenCommon = new Set<string>();
  const seenAdvanced = new Set<string>();
  const output: string[] = [];
  for (const line of original.split(/\r?\n/)) {
    const property = propertyLine(line);
    if (!property) {
      if (line || output.length > 0) output.push(line);
      continue;
    }
    if (commonKeys.has(property.key)) {
      if (!seenCommon.has(property.key)) {
        output.push(`${property.key}=${common[property.key as CommonPropertyKey]}`);
        seenCommon.add(property.key);
      }
      continue;
    }
    if (remainingAdvanced.has(property.key) && !seenAdvanced.has(property.key)) {
      output.push(`${property.key}=${remainingAdvanced.get(property.key)}`);
      seenAdvanced.add(property.key);
    }
  }

  for (const key of COMMON_PROPERTY_KEYS) {
    if (!seenCommon.has(key)) output.push(`${key}=${common[key]}`);
  }
  for (const [key, value] of remainingAdvanced) {
    if (!seenAdvanced.has(key)) output.push(`${key}=${value}`);
  }

  while (output.at(-1) === "") output.pop();
  return `${output.join("\n")}\n`;
}

export function formatServerAddress(values: {
  "server-ip": string;
  "server-port": string;
}): string {
  const ip = values["server-ip"].trim();
  return ip ? `${ip}:${values["server-port"].trim() || "25565"}` : "";
}

export function parseEula(text: string): boolean {
  return text.split(/\r?\n/).some((line) => /^\s*eula\s*=\s*true\s*$/i.test(line));
}
