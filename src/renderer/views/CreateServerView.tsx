import { useEffect, useState, type FormEvent } from "react";
import type { ServerType } from "../types";

const descriptions: Record<ServerType, string> = {
  vanilla: "The official Mojang server, clean and unmodified.",
  paper: "Fast, reliable server software with plugin compatibility.",
  fabric: "A lightweight modding platform. Add Fabric mods from the Mods tab.",
  forge: "A classic modding platform. The official installer runs locally.",
};

type CreateServerViewProps = {
  versions: string[];
  onCancel: () => void;
  onCreate: (input: {
    name: string;
    type: ServerType;
    version: string;
    forgeVersion?: string;
  }) => Promise<void>;
};

type ForgeDiscovery = {
  version: string;
  builds: string[];
  loading: boolean;
  error: string;
};

export function CreateServerView({
  versions,
  onCancel,
  onCreate,
}: CreateServerViewProps) {
  const [type, setType] = useState<ServerType>("vanilla");
  const [version, setVersion] = useState(versions[0] ?? "");
  const [forgeDiscovery, setForgeDiscovery] = useState<ForgeDiscovery>({
    version: "",
    builds: [],
    loading: false,
    error: "",
  });
  const [creating, setCreating] = useState(false);
  const forgeCurrent =
    type === "forge" && forgeDiscovery.version === version;
  const forgeBuilds = forgeCurrent ? forgeDiscovery.builds : [];
  const forgeError = forgeCurrent ? forgeDiscovery.error : "";
  const loadingForge =
    type === "forge" && (!forgeCurrent || forgeDiscovery.loading);
  const forgeReady =
    type !== "forge" ||
    (forgeCurrent && !forgeDiscovery.loading && forgeBuilds.length > 0);

  useEffect(() => {
    if (!version && versions.length) setVersion(versions[0]);
  }, [version, versions]);

  useEffect(() => {
    if (type !== "forge" || !version) {
      setForgeDiscovery({ version: "", builds: [], loading: false, error: "" });
      return;
    }

    let active = true;
    setForgeDiscovery({ version, builds: [], loading: true, error: "" });
    window.blocksmith
      .listForge(version)
      .then((builds) => {
        if (active) {
          setForgeDiscovery({
            version,
            builds,
            loading: false,
            error:
              builds.length === 0
                ? `No Forge builds are available for Minecraft ${version}.`
                : "",
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setForgeDiscovery({
            version,
            builds: [],
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Could not load Forge builds.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [type, version]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (type === "forge" && !forgeReady) return;
    const data = new FormData(event.currentTarget);
    setCreating(true);
    try {
      await onCreate({
        name: String(data.get("name")),
        type,
        version,
        forgeVersion: String(data.get("forgeVersion") || ""),
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <section>
      <div className="top">
        <div>
          <p className="eyebrow">NEW INSTANCE</p>
          <h1>Create a server</h1>
        </div>
        <button className="outline" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <form className="card form" onSubmit={submit}>
        <label>
          Server name
          <input
            name="name"
            placeholder="Weekend world"
            required
            maxLength={64}
          />
        </label>
        <div className="twocol">
          <label>
            Server software
            <select
              value={type}
              onChange={(event) => setType(event.target.value as ServerType)}
            >
              <option value="vanilla">Vanilla</option>
              <option value="paper">Paper — optimized plugins</option>
              <option value="fabric">Fabric — lightweight mods</option>
              <option value="forge">Forge — modpacks</option>
            </select>
          </label>
          <label>
            Minecraft version
            <select
              value={version}
              onChange={(event) => setVersion(event.target.value)}
            >
              {versions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        {type === "forge" && (
          <label aria-busy={loadingForge}>
            Forge build
            {loadingForge ? (
              <span className="hint" role="status" aria-live="polite">
                Loading Forge builds…
              </span>
            ) : forgeError ? (
              <span className="form-error" role="alert">
                {forgeError}
              </span>
            ) : (
              <select name="forgeVersion">
                {forgeBuilds.map((build) => (
                  <option key={build}>{build}</option>
                ))}
              </select>
            )}
          </label>
        )}
        <p className="hint">{descriptions[type]}</p>
        <button className="primary" disabled={creating || !forgeReady}>
          {creating ? "Creating server…" : "Download & create server"}
        </button>
      </form>
    </section>
  );
}
