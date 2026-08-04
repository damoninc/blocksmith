import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Toast } from "./components/Toast";
import { CreateServerView } from "./views/CreateServerView";
import { ServerView } from "./views/ServerView";
import { WelcomeView } from "./views/WelcomeView";
import type { Server, ServerTab, ServerType, View } from "./types";

export function App() {
  const [root, setRoot] = useState("");
  const [servers, setServers] = useState<Server[]>([]);
  const [selected, setSelected] = useState<Server | null>(null);
  const [view, setView] = useState<View>("welcome");
  const [versions, setVersions] = useState<string[]>([]);
  const [properties, setProperties] = useState("");
  const [mods, setMods] = useState<string[]>([]);
  const [tab, setTab] = useState<ServerTab>("overview");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState("Server is not running.");
  const [toast, setToast] = useState("");
  const selectedId = useRef<string | null>(null);

  const notify = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 3500);
  }, []);

  const reload = useCallback(async () => {
    const [serverRoot, found] = await Promise.all([
      window.blocksmith.getRoot(),
      window.blocksmith.listServers(),
    ]);
    setRoot(serverRoot);
    setServers(found);
  }, []);

  useEffect(() => {
    void reload();
    window.blocksmith
      .listVersions()
      .then(setVersions)
      .catch((error: Error) =>
        notify(`Could not load versions: ${error.message}`),
      );
    window.blocksmith.onLog((id, text) => {
      if (selectedId.current === id) setLogs((previous) => previous + text);
    });
    window.blocksmith.onStopped((id, code) => {
      if (selectedId.current === id) {
        setRunning(false);
        setLogs((previous) => `${previous}\nServer stopped (code ${code}).`);
      }
    });
  }, [notify, reload]);

  const chooseRoot = async () => {
    const chosenRoot = await window.blocksmith.chooseRoot();
    if (chosenRoot) {
      await reload();
      setView("create");
    }
  };

  const chooseServer = async (server: Server) => {
    selectedId.current = server.id;
    setSelected(server);
    setProperties(await window.blocksmith.properties(server.id));
    setMods(await window.blocksmith.mods(server.id));
    setLogs("Server is not running.");
    setRunning(false);
    setView("server");
    setTab("overview");
  };

  const createServer = async (input: {
    name: string;
    type: ServerType;
    version: string;
    forgeVersion?: string;
  }) => {
    try {
      const server = await window.blocksmith.create(input);
      notify("Server created. Accept the EULA, then start it.");
      await reload();
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
            running={running}
            logs={logs}
            properties={properties}
            mods={mods}
            onTabChange={setTab}
            onPropertiesChange={setProperties}
            onNotify={notify}
            onStart={async () => {
              await window.blocksmith.start(selected.id);
              setRunning(true);
              setLogs("Starting server…\n");
            }}
            onStop={() => window.blocksmith.stop(selected.id)}
            onModsChange={setMods}
          />
        )}
      </main>
      <Toast message={toast} />
    </>
  );
}
