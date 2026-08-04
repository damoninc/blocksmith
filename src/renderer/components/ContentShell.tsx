import type { ReactNode } from "react";

export function ContentShell({
  centerVertically = false,
  children,
}: {
  centerVertically?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`content-shell${centerVertically ? " centered" : ""}`}>
      {children}
    </div>
  );
}
