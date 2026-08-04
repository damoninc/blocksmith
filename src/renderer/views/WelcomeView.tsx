export function WelcomeView({ onChooseRoot }: { onChooseRoot: () => void }) {
  return (
    <section className="empty">
      <div className="pickaxe">◆</div>
      <h1>Your servers, in one place.</h1>
      <p>
        Choose a folder to start creating and managing local Minecraft servers.
      </p>
      <button onClick={onChooseRoot}>Choose server folder</button>
    </section>
  );
}
