import { useState } from "react";
import type { ServerDetails } from "../../types";

type OverviewTabProps = {
  root: string;
  server: ServerDetails;
  onServerChange: (server: ServerDetails) => void;
  onNotify: (message: string) => void;
};

export function OverviewTab({ root, server, onServerChange, onNotify }: OverviewTabProps) {
  const [error, setError] = useState("");

  const acceptEula = async () => {
    try {
      const updated = await window.blocksmith.setEula(server.id, true);
      onServerChange(updated);
      setError("");
      onNotify("EULA accepted.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "The EULA file could not be updated.";
      setError(`Could not accept the EULA: ${detail}`);
      onNotify("Could not accept the EULA.");
    }
  };

  return (
    <div className="card overview">
      <h2>Before first launch</h2>
      <p>
        By starting the server, you confirm you agree to the{" "}
        <a href="https://aka.ms/MinecraftEULA">Minecraft EULA</a>.
      </p>
      {error && <p className="form-error">{error}</p>}
      {server.eulaAccepted ? (
        <button className="accepted" disabled>
          {"\u2713 Accepted"}
        </button>
      ) : (
        <button className="outline" onClick={acceptEula}>
          Accept EULA
        </button>
      )}
      <h2>Server location</h2>
      <code>
        {root}\{server.id}
      </code>
    </div>
  );
}
