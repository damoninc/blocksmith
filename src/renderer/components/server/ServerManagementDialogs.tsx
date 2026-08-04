import { useState } from "react";
import type { ServerDetails } from "../../types";

type Mode = "rename" | "delete" | null;
type ServerManagementDialogsProps = {
  server: ServerDetails;
  running: boolean;
  mode: Mode;
  onClose: () => void;
  onRenamed: (server: ServerDetails) => void;
  onDeleted: (id: string) => void;
};

export function ServerManagementDialogs({
  server,
  running,
  mode,
  onClose,
  onRenamed,
  onDeleted,
}: ServerManagementDialogsProps) {
  const [renameName, setRenameName] = useState(server.name);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!mode) return null;

  const rename = async () => {
    if (!renameName.trim()) {
      setError("Server name cannot be empty.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const updated = await window.blocksmith.rename(server.id, renameName);
      onRenamed(updated);
      onClose();
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Could not rename the server.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (running || confirmation !== server.name) return;
    setBusy(true);
    setError("");
    try {
      await window.blocksmith.delete(server.id, confirmation);
      onDeleted(server.id);
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="server-dialog-title">
        {mode === "rename" ? (
          <>
            <h2 id="server-dialog-title">Rename server</h2>
            <p className="muted">This changes the displayed name. The server folder stays where it is.</p>
            <label>Server name
              <input autoFocus value={renameName} onChange={(event) => setRenameName(event.target.value)} />
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="modal-actions">
              <button className="outline" disabled={busy} onClick={onClose}>Cancel</button>
              <button disabled={busy || !renameName.trim()} onClick={() => void rename()}>
                {busy ? "Renaming..." : "Rename"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="server-dialog-title">Delete {server.name}?</h2>
            <p className="delete-warning">This permanently removes the server folder, world, configuration, and mods.</p>
            <p>Type <strong>{server.name}</strong> to confirm.</p>
            <label>Server name
              <input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="modal-actions">
              <button className="outline" disabled={busy} onClick={onClose}>Cancel</button>
              <button
                className="danger"
                disabled={busy || running || confirmation !== server.name}
                onClick={() => void remove()}
              >
                {busy ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
