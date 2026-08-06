import { useState, type FormEvent } from "react";
import type { ServerDetails } from "../../types";

type StartupTabProps = {
  server: ServerDetails;
  running: boolean;
  onServerChange: (server: ServerDetails) => void;
  onNotify: (message: string) => void;
};

export function StartupTab({
  server,
  running,
  onServerChange,
  onNotify,
}: StartupTabProps) {
  const [javaArgs, setJavaArgs] = useState(server.launch.javaArgs);
  const [serverArgs, setServerArgs] = useState(server.launch.serverArgs);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await window.blocksmith.saveLaunch(server.id, {
        javaArgs,
        serverArgs,
      });
      onServerChange(updated);
      setJavaArgs(updated.launch.javaArgs);
      setServerArgs(updated.launch.serverArgs);
      setError("");
      onNotify("Startup arguments saved.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Startup arguments could not be saved.";
      setError(message);
      onNotify("Could not save startup arguments.");
    } finally {
      setSaving(false);
    }
  };

  const commandPreview =
    server.type === "forge"
      ? `run.bat ${serverArgs}`.trim()
      : `java ${javaArgs} -jar ${server.jar ?? "server.jar"} ${serverArgs}`.trim();

  return (
    <form className="card startup-form" onSubmit={save}>
      <div className="tabtitle">
        <div>
          <h2>Startup arguments</h2>
          <p>
            Customize the Java process much like you would in a Windows batch
            file.
          </p>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <label>
        Java / JVM arguments
        <textarea
          className="argument-editor"
          value={javaArgs}
          disabled={running || saving}
          onChange={(event) => setJavaArgs(event.target.value)}
          placeholder="-Xms1G -Xmx4G"
          spellCheck={false}
        />
        <span className="hint">
          Memory flags and system properties go here. Quoted values are supported.
          {server.type === "forge"
            ? " These are applied through user_jvm_args.txt when the server starts."
            : ""}
        </span>
      </label>
      <label>
        Server arguments
        <textarea
          className="argument-editor"
          value={serverArgs}
          disabled={running || saving}
          onChange={(event) => setServerArgs(event.target.value)}
          placeholder="nogui"
          spellCheck={false}
        />
        <span className="hint">
          Arguments placed after the server JAR, such as nogui.
        </span>
      </label>
      <div className="command-preview" aria-label="Launch command preview">
        <span>Preview</span>
        <code>{commandPreview}</code>
      </div>
      <button className="primary" disabled={running || saving} type="submit">
        {saving ? "Saving..." : "Save startup arguments"}
      </button>
      {running && (
        <p className="hint">
          Stop the server before changing its launch arguments.
        </p>
      )}
    </form>
  );
}
