import type { ServerDetails } from "../types";

type SidebarProps = {
  root: string;
  servers: ServerDetails[];
  selectedId?: string;
  onChooseRoot: () => void;
  onChooseServer: (server: ServerDetails) => void;
  onCreate: () => void;
};

export function Sidebar({
  root,
  servers,
  selectedId,
  onChooseRoot,
  onChooseServer,
  onCreate,
}: SidebarProps) {
  return (
    <aside>
      <div className="brand">
        BLOCK<span>SMITH</span>
      </div>
      <p className="tagline">Local Minecraft server manager</p>
      <button className="outline" onClick={onChooseRoot}>
        Choose server folder
      </button>
      <p className="path">{root || "No folder selected"}</p>
      <div className="side-label">YOUR SERVERS</div>
      <nav>
        {servers.map((server) => (
          <button
            key={server.id}
            className={`server-item ${selectedId === server.id ? "selected" : ""}`}
            onClick={() => onChooseServer(server)}
          >
            {server.name}
            <small>
              {server.type} / {server.version}
            </small>
            {server.address && <small className="server-address">{server.address}</small>}
          </button>
        ))}
      </nav>
      <button className="new" onClick={onCreate}>
        + Create server
      </button>
    </aside>
  );
}
