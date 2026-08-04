import { ConsoleTab } from "../components/server/ConsoleTab";
import { ModsTab } from "../components/server/ModsTab";
import { OverviewTab } from "../components/server/OverviewTab";
import { PropertiesTab } from "../components/server/PropertiesTab";
import type { ServerDetails, ServerTab } from "../types";

const tabs: ServerTab[] = ["overview", "properties", "mods", "console"];

type ServerViewProps = {
  root: string;
  server: ServerDetails;
  tab: ServerTab;
  running: boolean;
  logs: string;
  mods: string[];
  onTabChange: (tab: ServerTab) => void;
  onServerChange: (server: ServerDetails) => void;
  onNotify: (message: string) => void;
  onStart: () => void;
  onStop: () => void;
  onModsChange: (mods: string[]) => void;
};

export function ServerView({
  root,
  server,
  tab,
  running,
  logs,
  mods,
  onTabChange,
  onServerChange,
  onNotify,
  onStart,
  onStop,
  onModsChange,
}: ServerViewProps) {
  return (
    <section>
      <div className="top">
        <div>
          <p className="eyebrow">{server.type.toUpperCase()}</p>
          <h1>{server.name}</h1>
          <p className="muted">
            Minecraft {server.version}
            {server.build ? ` / Paper build ${server.build}` : ""}
          </p>
        </div>
        <div className="actions">
          <span className={`status ${running ? "running" : ""}`}>
            {running ? "RUNNING" : "OFFLINE"}
          </span>
          <button className="primary" disabled={running} onClick={onStart}>
            Start server
          </button>
          <button className="danger" disabled={!running} onClick={onStop}>
            Stop
          </button>
        </div>
      </div>
      <div className="tabs">
        {tabs.map((item) => (
          <button
            key={item}
            className={tab === item ? "active" : ""}
            onClick={() => onTabChange(item)}
          >
            {item === "properties"
              ? "server.properties"
              : item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <OverviewTab
          root={root}
          server={server}
          onServerChange={onServerChange}
          onNotify={onNotify}
        />
      )}
      {tab === "properties" && (
        <PropertiesTab
          server={server}
          onServerChange={onServerChange}
          onNotify={onNotify}
        />
      )}
      {tab === "mods" && (
        <ModsTab server={server} mods={mods} onChange={onModsChange} />
      )}
      {tab === "console" && <ConsoleTab logs={logs} />}
    </section>
  );
}
