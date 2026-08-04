import type { Server } from "../../types";

type PropertiesTabProps = {
  server: Server;
  properties: string;
  onChange: (properties: string) => void;
  onNotify: (message: string) => void;
};

export function PropertiesTab({
  server,
  properties,
  onChange,
  onNotify,
}: PropertiesTabProps) {
  const save = async () => {
    await window.blocksmith.saveProperties(server.id, properties);
    onNotify("Properties saved.");
  };

  return (
    <div className="card">
      <div className="tabtitle">
        <div>
          <h2>Server properties</h2>
          <p>Edit Minecraft’s native configuration file directly.</p>
        </div>
        <button className="primary" onClick={save}>
          Save changes
        </button>
      </div>
      <textarea
        value={properties}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
