export function ConsoleTab({ logs }: { logs: string }) {
  return (
    <div className="card console">
      <div className="tabtitle">
        <div>
          <h2>Live console</h2>
          <p>Output from the running server.</p>
        </div>
      </div>
      <pre>{logs}</pre>
    </div>
  );
}
