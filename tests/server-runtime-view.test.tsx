// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsoleTab } from "../src/renderer/components/server/ConsoleTab";
import { StartupTab } from "../src/renderer/components/server/StartupTab";
import type { ServerDetails } from "../src/renderer/types";

afterEach(() => cleanup());

const server: ServerDetails = {
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
  address: "",
};

describe("server runtime controls", () => {
  it("sends a console command and clears the terminal input", async () => {
    const onCommand = vi.fn().mockResolvedValue(undefined);
    render(
      <ConsoleTab logs="Done\n" running={true} onCommand={onCommand} />,
    );

    const input = screen.getByLabelText("Server command") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "say hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(onCommand).toHaveBeenCalledWith("say hello"));
    await waitFor(() => expect(input.value).toBe(""));
  });

  it("keeps startup settings locked while a server is running", () => {
    render(
      <StartupTab
        server={server}
        running={true}
        onServerChange={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    expect(
      (screen.getByRole("textbox", {
        name: /Java \/ JVM arguments/,
      }) as HTMLTextAreaElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("textbox", {
        name: /Server arguments/,
      }) as HTMLTextAreaElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", {
        name: "Save startup arguments",
      }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
