// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateServerView } from "../src/renderer/views/CreateServerView";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("CreateServerView Forge discovery", () => {
  const requests = new Map<string, Deferred<string[]>>();
  const onCreate = vi.fn(async () => {});

  beforeEach(() => {
    requests.clear();
    onCreate.mockClear();
    window.blocksmith = {
      listForge: vi.fn((version: string) => {
        const request = deferred<string[]>();
        requests.set(version, request);
        return request.promise;
      }),
    } as Window["blocksmith"];
  });

  afterEach(cleanup);

  function renderForgeForm() {
    const result = render(
      <CreateServerView
        versions={["1.20.1", "1.19.4"]}
        onCancel={() => {}}
        onCreate={onCreate}
      />,
    );
    fireEvent.change(screen.getByLabelText("Server software"), {
      target: { value: "forge" },
    });
    return result;
  }

  it("keeps submission disabled until builds for the current version resolve", async () => {
    const { container } = renderForgeForm();
    const submit = screen.getByRole("button", {
      name: "Download & create server",
    });

    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
    expect(
      screen.getByText("Forge build").closest("label")?.getAttribute("aria-busy"),
    ).toBe("true");

    fireEvent.change(screen.getByLabelText("Minecraft version"), {
      target: { value: "1.19.4" },
    });
    fireEvent.submit(container.querySelector("form")!);
    expect(onCreate).not.toHaveBeenCalled();

    await act(async () => {
      requests.get("1.20.1")!.resolve(["old-forge"]);
    });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("option", { name: "old-forge" })).toBeNull();
    expect(screen.getByRole("status")).not.toBeNull();

    await act(async () => {
      requests.get("1.19.4")!.resolve(["current-forge"]);
    });
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    expect(
      (screen.getByRole("combobox", {
        name: "Forge build",
      }) as HTMLSelectElement).value,
    ).toBe("current-forge");
  });

  it("keeps current builds when the stale request rejects later", async () => {
    renderForgeForm();
    fireEvent.change(screen.getByLabelText("Minecraft version"), {
      target: { value: "1.19.4" },
    });

    await act(async () => {
      requests.get("1.19.4")!.resolve(["current-forge"]);
    });
    await act(async () => {
      requests.get("1.20.1")!.reject(new Error("stale failure"));
    });

    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      (screen.getByRole("combobox", {
        name: "Forge build",
      }) as HTMLSelectElement).value,
    ).toBe("current-forge");
  });

  it("keeps the current error when the stale request resolves later", async () => {
    renderForgeForm();
    fireEvent.change(screen.getByLabelText("Minecraft version"), {
      target: { value: "1.19.4" },
    });

    await act(async () => {
      requests.get("1.19.4")!.reject(new Error("current failure"));
    });
    await act(async () => {
      requests.get("1.20.1")!.resolve(["stale-forge"]);
    });

    expect(screen.getByRole("alert").textContent).toContain("current failure");
    expect(screen.queryByRole("option", { name: "stale-forge" })).toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: "Download & create server",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
