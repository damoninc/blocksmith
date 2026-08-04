import { useEffect, useState } from "react";
import type { CommonServerProperties, ServerDetails } from "../../types";

type PropertiesTabProps = {
  server: ServerDetails;
  onServerChange: (server: ServerDetails) => void;
  onNotify: (message: string) => void;
};

type NumberField = "server-port" | "max-players" | "view-distance" | "simulation-distance" | "spawn-protection";
const numberFields: { key: NumberField; label: string; min: number; max: number }[] = [
  { key: "server-port", label: "Server port", min: 1, max: 65535 },
  { key: "max-players", label: "Maximum players", min: 1, max: 100000 },
  { key: "view-distance", label: "View distance", min: 2, max: 32 },
  { key: "simulation-distance", label: "Simulation distance", min: 2, max: 32 },
  { key: "spawn-protection", label: "Spawn protection", min: 0, max: 100000 },
];
const booleanFields = [
  ["online-mode", "Online mode"],
  ["pvp", "PvP"],
  ["allow-flight", "Allow flight"],
  ["white-list", "Whitelist"],
] as const;

export function PropertiesTab({ server, onServerChange, onNotify }: PropertiesTabProps) {
  const [properties, setProperties] = useState(server.properties);
  const [advanced, setAdvanced] = useState(server.advancedProperties);
  const [error, setError] = useState("");

  useEffect(() => {
    setProperties(server.properties);
    setAdvanced(server.advancedProperties);
    setError("");
  }, [server.id, server.properties, server.advancedProperties]);

  const change = (key: keyof CommonServerProperties, value: string) => {
    setProperties((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    for (const field of numberFields) {
      const value = Number(properties[field.key]);
      if (!Number.isInteger(value) || value < field.min || value > field.max) {
        setError(`${field.label} must be a whole number from ${field.min} to ${field.max}.`);
        return;
      }
    }
    try {
      const updated = await window.blocksmith.saveProperties(server.id, properties, advanced);
      onServerChange(updated);
      setError("");
      onNotify("Properties saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save properties.");
    }
  };

  return (
    <div className="card properties-card">
      <div className="tabtitle">
        <div>
          <h2>Server properties</h2>
          <p>Configure the settings most servers use.</p>
        </div>
        <button className="primary" onClick={save}>Save changes</button>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="properties-grid">
        <label className="wide">MOTD
          <input value={properties.motd} onChange={(event) => change("motd", event.target.value)} />
        </label>
        <label>Server IP
          <input value={properties["server-ip"]} placeholder="Leave blank for all interfaces" onChange={(event) => change("server-ip", event.target.value)} />
        </label>
        {numberFields.map((field) => (
          <label key={field.key}>{field.label}
            <input type="number" min={field.min} max={field.max} value={properties[field.key]} onChange={(event) => change(field.key, event.target.value)} />
          </label>
        ))}
        <label>Game mode
          <select value={properties.gamemode} onChange={(event) => change("gamemode", event.target.value)}>
            <option value="survival">Survival</option><option value="creative">Creative</option><option value="adventure">Adventure</option><option value="spectator">Spectator</option>
          </select>
        </label>
        <label>Difficulty
          <select value={properties.difficulty} onChange={(event) => change("difficulty", event.target.value)}>
            <option value="peaceful">Peaceful</option><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option>
          </select>
        </label>
        {booleanFields.map(([key, label]) => (
          <label className="toggle" key={key}>
            <input type="checkbox" checked={properties[key].trim().toLowerCase() === "true"} onChange={(event) => change(key, String(event.target.checked))} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <details className="advanced-editor">
        <summary>Advanced properties</summary>
        <p className="hint">One key=value setting per line. Common settings above are managed separately.</p>
        <textarea value={advanced} spellCheck={false} onChange={(event) => setAdvanced(event.target.value)} />
      </details>
    </div>
  );
}
