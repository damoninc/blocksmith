export function Toast({ message }: { message: string }) {
  return (
    <div id="toast" className={message ? "show" : ""}>
      {message}
    </div>
  );
}
