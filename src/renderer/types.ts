export type ServerType = "vanilla" | "paper" | "fabric" | "forge";

export type Server = {
  id: string;
  name: string;
  type: ServerType;
  version: string;
  jar: string | null;
  build?: number;
};

export type View = "welcome" | "create" | "server";
export type ServerTab = "overview" | "properties" | "mods" | "console";
