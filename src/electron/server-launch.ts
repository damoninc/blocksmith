export type ServerLaunchSettings = {
  javaArgs: string;
  serverArgs: string;
};

type LaunchableServer = {
  type: "vanilla" | "paper" | "fabric" | "forge";
  jar: string | null;
};

export type ServerLaunchCommand = {
  command: string;
  args: string[];
};

const MAX_ARGUMENT_TEXT_LENGTH = 16_384;
const FORGE_SHELL_METACHARACTERS = /[&|<>^%\r\n]/;

export function defaultServerLaunchSettings(): ServerLaunchSettings {
  return {
    javaArgs: "-Xms1G -Xmx2G",
    serverArgs: "nogui",
  };
}

export function normalizeServerLaunchSettings(
  launch?: Partial<ServerLaunchSettings>,
): ServerLaunchSettings {
  const defaults = defaultServerLaunchSettings();
  return {
    javaArgs:
      typeof launch?.javaArgs === "string"
        ? launch.javaArgs.trim()
        : defaults.javaArgs,
    serverArgs:
      typeof launch?.serverArgs === "string"
        ? launch.serverArgs.trim()
        : defaults.serverArgs,
  };
}

export function parseLaunchArguments(input: string): string[] {
  if (input.length > MAX_ARGUMENT_TEXT_LENGTH) {
    throw new Error("Launch arguments are too long.");
  }

  const args: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let tokenStarted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];

    if (character === "\\" && quote && next === quote) {
      current += next;
      tokenStarted = true;
      index += 1;
      continue;
    }

    if (quote) {
      if (character === quote) quote = null;
      else current += character;
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      tokenStarted = true;
      continue;
    }

    if (/\s/.test(character)) {
      if (tokenStarted) {
        args.push(current);
        current = "";
        tokenStarted = false;
      }
      continue;
    }

    current += character;
    tokenStarted = true;
  }

  if (quote) throw new Error("Launch arguments contain an unclosed quote.");
  if (tokenStarted) args.push(current);
  return args;
}

export function buildServerLaunchCommand(
  server: LaunchableServer,
  javaExecutable: string,
  launchInput?: Partial<ServerLaunchSettings>,
): ServerLaunchCommand {
  const launch = normalizeServerLaunchSettings(launchInput);
  const javaArgs = parseLaunchArguments(launch.javaArgs);
  const serverArgs = parseLaunchArguments(launch.serverArgs);

  if (server.type === "forge") {
    const unsafeArgument = serverArgs.find((argument) =>
      FORGE_SHELL_METACHARACTERS.test(argument),
    );
    if (unsafeArgument) {
      throw new Error(
        "Forge server arguments cannot contain Windows command-shell metacharacters.",
      );
    }
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "run.bat", ...serverArgs],
    };
  }

  if (!server.jar) {
    throw new Error("This server does not have a runnable JAR file.");
  }
  if (!javaExecutable) throw new Error("A Java executable is required.");
  return {
    command: javaExecutable,
    args: [...javaArgs, "-jar", server.jar, ...serverArgs],
  };
}

export function forgeJvmArgumentFile(
  launchInput?: Partial<ServerLaunchSettings>,
): string {
  const args = parseLaunchArguments(
    normalizeServerLaunchSettings(launchInput).javaArgs,
  );
  const serialized = args.map((argument) => {
    if (argument && !/[\s"']/.test(argument) && !argument.startsWith("#")) {
      return argument;
    }
    return `"${argument.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  });
  return serialized.length ? `${serialized.join("\n")}\n` : "";
}

export function validateConsoleCommand(input: string): string {
  const command = input.trim();
  if (!command) throw new Error("Enter a server command first.");
  if (command.length > 32_768) throw new Error("The server command is too long.");
  if (/[\r\n\0]/.test(command)) {
    throw new Error("Send one server command at a time.");
  }
  return command;
}
