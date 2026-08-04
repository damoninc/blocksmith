import type { Server } from "../../types";

type ModsTabProps = {
  server: Server;
  mods: string[];
  onChange: (mods: string[]) => void;
};

export function ModsTab({ server, mods, onChange }: ModsTabProps) {
  const addMods = async () => {
    await window.blocksmith.addMod(server.id);
    onChange(await window.blocksmith.mods(server.id));
  };

  return (
    <div className="card">
      <div className="tabtitle">
        <div>
          <h2>Installed mods</h2>
          <p>
            Works with Fabric and Forge. Add <code>.jar</code> files from your
            computer.
          </p>
        </div>
        <button className="primary" onClick={addMods}>
          Add mod files
        </button>
      </div>
      <ul className="modlist">
        {mods.length ? (
          mods.map((mod) => <li key={mod}>{mod}</li>)
        ) : (
          <li className="muted">No mods installed yet.</li>
        )}
      </ul>
    </div>
  );
}
