export type ServerType = "vanilla" | "paper" | "fabric" | "forge";

export type Server = {
  id: string;
  name: string;
  type: ServerType;
  version: string;
  jar: string | null;
  build?: number;
  loader?: string;
  forgeVersion?: string;
};

export type ServerLaunchSettings = {
  javaArgs: string;
  serverArgs: string;
};

export type CommonServerProperties = {
  motd: string;
  "server-ip": string;
  "server-port": string;
  "max-players": string;
  gamemode: string;
  difficulty: string;
  "online-mode": string;
  pvp: string;
  "allow-flight": string;
  "white-list": string;
  "view-distance": string;
  "simulation-distance": string;
  "spawn-protection": string;
};

export type ServerDetails = Server & {
  launch: ServerLaunchSettings;
  properties: CommonServerProperties;
  advancedProperties: string;
  eulaAccepted: boolean;
  address: string;
};

export type View = "welcome" | "create" | "server";
export type ServerTab =
  | "overview"
  | "startup"
  | "properties"
  | "mods"
  | "console";
