import type { ServerDetails } from "../../types";

type OverviewTabProps = {
  root: string;
  server: ServerDetails;
  onServerChange: (server: ServerDetails) => void;
  onNotify: (message: string) => void;
};

export function OverviewTab({ root, server, onServerChange, onNotify }: OverviewTabProps) {
  const acceptEula = async () => {
    const updated = await window.blocksmith.setEula(server.id, true);
    onServerChange(updated);
    onNotify("EULA accepted.");
  };

  return (
    <div className="card overview">
      <h2>Before first launch</h2>
      <p>
        By starting the server, you confirm you agree to the{" "}
        <a href="https://aka.ms/MinecraftEULA">Minecraft EULA</a>.
      </p>
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
