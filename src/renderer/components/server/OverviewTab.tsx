import type { Server } from "../../types";

type OverviewTabProps = {
  root: string;
  server: Server;
  onNotify: (message: string) => void;
};

export function OverviewTab({ root, server, onNotify }: OverviewTabProps) {
  const acceptEula = async () => {
    await window.blocksmith.setEula(server.id, true);
    onNotify("EULA accepted.");
  };

  return (
    <div className="card overview">
      <h2>Before first launch</h2>
      <p>
        By starting the server, you confirm you agree to the{" "}
        <a href="https://aka.ms/MinecraftEULA">Minecraft EULA</a>.
      </p>
      <button className="outline" onClick={acceptEula}>
        Accept EULA
      </button>
      <h2>Server location</h2>
      <code>
        {root}\{server.id}
      </code>
    </div>
  );
}
