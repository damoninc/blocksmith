// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PluginsTab } from "../src/renderer/components/server/PluginsTab";
import { ServerView } from "../src/renderer/views/ServerView";
import type { ServerDetails } from "../src/renderer/types";

const paperServer: ServerDetails = {
  id: "paper-server",
  name: "Paper Server",
  type: "paper",
  version: "1.21.8",
  jar: "server.jar",
  launch: { javaArgs: "-Xms1G -Xmx2G", serverArgs: "nogui" },
  properties: {
    motd: "Paper Server",
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
  },
  advancedProperties: "",
  eulaAccepted: true,
  address: "localhost:25565",
};

describe("Paper plugin management", () => {
  const searchModrinthPlugins = vi.fn(async () => [
    {
      projectId: "abc123",
      slug: "worldedit",
      title: "WorldEdit",
      description: "Build faster",
      author: "EngineHub",
      iconUrl: null,
      downloads: 1000,
    },
  ]);
  const addPlugins = vi.fn(async () => ["LocalPlugin.jar"]);
  const installModrinthPlugin = vi.fn(async () => [
    "LocalPlugin.jar",
    "worldedit.jar",
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
    window.blocksmith = {
      searchModrinthPlugins,
      addPlugins,
      installModrinthPlugin,
    } as unknown as Window["blocksmith"];
  });

  afterEach(cleanup);

  it("shows Plugins instead of Mods for Paper servers", () => {
    render(
      <ServerView
        root="C:\\servers"
        server={paperServer}
        tab="overview"
        running={false}
        logs=""
        mods={[]}
        plugins={[]}
        onTabChange={() => {}}
        onServerChange={() => {}}
        onServerDeleted={() => {}}
        onNotify={() => {}}
        onStart={() => {}}
        onStop={() => {}}
        onModsChange={() => {}}
        onPluginsChange={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Plugins" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Mods" })).toBeNull();
  });

  it("loads compatible Modrinth results and installs with one click", async () => {
    const onChange = vi.fn();
    const onNotify = vi.fn();
    render(
      <PluginsTab
        server={paperServer}
        plugins={[]}
        onChange={onChange}
        onNotify={onNotify}
      />,
    );

    expect(await screen.findByText("WorldEdit")).not.toBeNull();
    expect(searchModrinthPlugins).toHaveBeenCalledWith("paper-server", "");

    fireEvent.click(screen.getByRole("button", { name: "Install" }));
    await waitFor(() =>
      expect(installModrinthPlugin).toHaveBeenCalledWith(
        "paper-server",
        "abc123",
      ),
    );
    expect(onChange).toHaveBeenCalledWith([
      "LocalPlugin.jar",
      "worldedit.jar",
    ]);
    expect(onNotify).toHaveBeenCalledWith(
      "WorldEdit installed from Modrinth.",
    );
  });

  it("adds dropped plugin JARs", async () => {
    const onChange = vi.fn();
    const onNotify = vi.fn();
    render(
      <PluginsTab
        server={paperServer}
        plugins={[]}
        onChange={onChange}
        onNotify={onNotify}
      />,
    );
    const file = new File([new Uint8Array([80, 75, 3, 4])], "LocalPlugin.jar", {
      type: "application/java-archive",
    });
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => new Uint8Array([80, 75, 3, 4]).buffer,
    });

    await act(async () => {
      fireEvent.drop(
        screen.getByRole("button", { name: "Add plugin JAR files" }),
        {
          dataTransfer: { files: [file] },
        },
      );
    });

    await waitFor(() => expect(addPlugins).toHaveBeenCalledOnce());
    expect(addPlugins.mock.calls[0][0]).toBe("paper-server");
    expect(addPlugins.mock.calls[0][1][0].name).toBe("LocalPlugin.jar");
    expect(onChange).toHaveBeenCalledWith(["LocalPlugin.jar"]);
    expect(onNotify).toHaveBeenCalledWith("1 plugin added.");
  });
});
