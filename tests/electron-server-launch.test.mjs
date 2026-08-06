import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildServerLaunchCommand,
  defaultServerLaunchSettings,
  forgeJvmArgumentFile,
  parseLaunchArguments,
  validateConsoleCommand,
} from "../dist/main/server-launch.js";

test("launch arguments support familiar quoted command-line values", () => {
  assert.deepEqual(
    parseLaunchArguments('-Xms2G -Xmx4G -Dmotd="Hello world" "two words"'),
    ["-Xms2G", "-Xmx4G", "-Dmotd=Hello world", "two words"],
  );
  assert.throws(() => parseLaunchArguments('-Dmotd="unfinished'), /unclosed quote/i);
});

test("standard servers receive custom JVM and post-JAR arguments", () => {
  const launch = buildServerLaunchCommand(
    { type: "paper", jar: "paper.jar" },
    "C:\\Java\\bin\\java.exe",
    { javaArgs: "-Xms2G -Xmx6G", serverArgs: "nogui --demo" },
  );

  assert.equal(launch.command, "C:\\Java\\bin\\java.exe");
  assert.deepEqual(launch.args, [
    "-Xms2G",
    "-Xmx6G",
    "-jar",
    "paper.jar",
    "nogui",
    "--demo",
  ]);
});

test("Forge uses run.bat arguments and a generated JVM argument file", () => {
  const settings = { javaArgs: "-Xms3G -Xmx5G", serverArgs: "nogui" };
  const launch = buildServerLaunchCommand(
    { type: "forge", jar: null },
    "",
    settings,
  );

  assert.deepEqual(launch, {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", "run.bat", "nogui"],
  });
  assert.equal(forgeJvmArgumentFile(settings), "-Xms3G\n-Xmx5G\n");
  assert.throws(
    () => buildServerLaunchCommand(
      { type: "forge", jar: null },
      "",
      { javaArgs: "", serverArgs: "nogui & calc" },
    ),
    /metacharacters/i,
  );
  assert.equal(
    forgeJvmArgumentFile({ javaArgs: '-Dmotd="Hello world"', serverArgs: "" }),
    '"-Dmotd=Hello world"\n',
  );
});

test("legacy servers receive the previous launch defaults", () => {
  assert.deepEqual(defaultServerLaunchSettings(), {
    javaArgs: "-Xms1G -Xmx2G",
    serverArgs: "nogui",
  });
  assert.deepEqual(
    buildServerLaunchCommand({ type: "vanilla", jar: "server.jar" }, "java").args,
    ["-Xms1G", "-Xmx2G", "-jar", "server.jar", "nogui"],
  );
});

test("console accepts one non-empty command at a time", () => {
  assert.equal(validateConsoleCommand("  say hello  "), "say hello");
  assert.throws(() => validateConsoleCommand("   "), /enter a server command/i);
  assert.throws(() => validateConsoleCommand("say one\nstop"), /one server command/i);
});
