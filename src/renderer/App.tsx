import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Toast } from "./components/Toast";
import { ContentShell } from "./components/ContentShell";
import { CreateServerView } from "./views/CreateServerView";
import { ServerView } from "./views/ServerView";
import { WelcomeView } from "./views/WelcomeView";
import type { ServerDetails, ServerTab, ServerType, View } from "./types";

export function App() {
  const [root, setRoot] = useState("");
  const [servers, setServers] = useState<ServerDetails[]>([]);
  const [selected, setSelected] = useState<ServerDetails | null>(null);
  const [view, setView] = useState<View>("welcome");
  const [versions, setVersions] = useState<string[]>([]);
  const [mods, setMods] = useState<string[]>([]);
  const [tab, setTab] = useState<ServerTab>("overview");
  const [runningServers, setRunningServers] = useState<Set<string>>(() => new Set());
  const [serverLogs, setServerLogs] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const selectedId = useRef<string | null>(null);

  const notify = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 3500);
  }, []);

  const replaceServer = useCallback((server: ServerDetails) => {
    if (selectedId.current === server.id) setSelected(server);
    setServers((current) =>
      current
        .map((item) => (item.id === server.id ? server : item))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  }, []);

  const chooseServer = useCallback(async (server: ServerDetails) => {
    selectedId.current = server.id;
    setSelected(server);
    const foundMods = await window.blocksmith.mods(server.id);
    if (selectedId.current !== server.id) return;
    setMods(foundMods);
    setView("server");
    setTab("overview");
  }, []);

  const reload = useCallback(async () => {
    const [serverRoot, found] = await Promise.all([
      window.blocksmith.getRoot(),
      window.blocksmith.listServers(),
    ]);
    setRoot(serverRoot);
    setServers(found);
    const next = found.find(server => server.id === selectedId.current) ?? found[0];
    if (next) {
      selectedId.current = next.id;
      setSelected(next);
      const foundMods = await window.blocksmith.mods(next.id);
      if (selectedId.current === next.id) setMods(foundMods);
      setView("server");
    } else {
      selectedId.current = null;
      setSelected(null);
      setMods([]);
      setView("welcome");
    }
  }, []);

  const handleServerDeleted = useCallback(async (id: string) => {
    setRunningServers((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setServerLogs((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (selectedId.current === id) {
      selectedId.current = null;
      setSelected(null);
    }
    await reload();
  }, [reload]);

  useEffect(() => {
    void reload();
    window.blocksmith
      .listVersions()
      .then(setVersions)
      .catch((error: Error) =>
        notify(`Could not load versions: ${error.message}`),
      );
    window.blocksmith.onLog((id, text) => {
      setServerLogs((current) => ({
        ...current,
        [id]: (current[id] ?? "") + text,
      }));
    });
    window.blocksmith.onStopped((id, code) => {
      setRunningServers((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      setServerLogs((current) => ({
        ...current,
        [id]: `${current[id] ?? ""}\nServer stopped (code ${code}).`,
      }));
    });
  }, [notify, reload]);

  const chooseRoot = async () => {
    const chosenRoot = await window.blocksmith.chooseRoot();
    if (chosenRoot) {
      await reload();
      setView("create");
    }
  };

  const createServer = async (input: {
    name: string;
    type: ServerType;
    version: string;
    forgeVersion?: string;
  }) => {
    try {
      const server = await window.blocksmith.create(input);
      setServers((current) =>
        [...current.filter((item) => item.id !== server.id), server].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      notify("Server created. Accept the EULA, then start it.");
      await chooseServer(server);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Server creation failed.");
    }
  };

  return (
    <>
      <Sidebar
        root={root}
        servers={servers}
        selectedId={selected?.id}
        onChooseRoot={chooseRoot}
        onChooseServer={chooseServer}
        onCreate={() => (root ? setView("create") : void chooseRoot())}
      />
      <main>
        <ContentShell centerVertically={view === "welcome"}>
          {view === "welcome" && <WelcomeView onChooseRoot={chooseRoot} />}
          {view === "create" && (
            <CreateServerView
              versions={versions}
              onCancel={() => setView(selected ? "server" : "welcome")}
              onCreate={createServer}
            />
          )}
          {view === "server" && selected && (
            <ServerView
              root={root}
              server={selected}
              tab={tab}
              running={runningServers.has(selected.id)}
              logs={serverLogs[selected.id] ?? "Server is not running."}
              mods={mods}
              onTabChange={setTab}
              onServerChange={replaceServer}
              onServerDeleted={handleServerDeleted}
              onNotify={notify}
              onStart={async () => {
                const serverId = selected.id;
                setTab("console");
                setServerLogs((current) => ({
                  ...current,
                  [serverId]: "Starting server...\n",
                }));
                try {
                  await window.blocksmith.start(serverId);
                  setRunningServers((current) => new Set(current).add(serverId));
                } catch (error) {
                  const message = error instanceof Error ? error.message : "Server startup failed.";
                  setRunningServers((current) => {
                    const next = new Set(current);
                    next.delete(serverId);
                    return next;
                  });
                  setServerLogs((current) => ({
                    ...current,
                    [serverId]: `${current[serverId] ?? ""}${message}\n`,
                  }));
                }
              }}
              onStop={() => window.blocksmith.stop(selected.id)}
              onCommand={async (command) => {
                const serverId = selected.id;
                await window.blocksmith.command(serverId, command);
                setServerLogs((current) => ({
                  ...current,
                  [serverId]: `${current[serverId] ?? ""}> ${command.trim()}\n`,
                }));
              }}
              onModsChange={setMods}
            />
          )}
        </ContentShell>
      </main>
      <Toast message={toast} />
    </>
  );
}
