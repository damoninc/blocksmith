import { useEffect, useRef, useState, type FormEvent } from "react";

type ConsoleTabProps = {
  logs: string;
  running: boolean;
  onCommand: (command: string) => Promise<void>;
};

export function ConsoleTab({ logs, running, onCommand }: ConsoleTabProps) {
  const [command, setCommand] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const output = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (output.current) output.current.scrollTop = output.current.scrollHeight;
  }, [logs]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!command.trim()) return;
    setSending(true);
    try {
      await onCommand(command);
      setCommand("");
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "The command could not be sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card console">
      <div className="tabtitle">
        <div>
          <h2>Live console</h2>
          <p>Output from the running server. Send commands just like a local terminal.</p>
        </div>
      </div>
      <pre ref={output} aria-live="polite">
        {logs}
      </pre>
      <form className="console-command" onSubmit={send}>
        <label htmlFor="server-command">Server command</label>
        <div>
          <input
            id="server-command"
            value={command}
            disabled={!running || sending}
            onChange={(event) => setCommand(event.target.value)}
            placeholder={
              running
                ? "say Hello from Blocksmith"
                : "Start the server to enter commands"
            }
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={!running || sending || !command.trim()}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>
    </div>
  );
}
