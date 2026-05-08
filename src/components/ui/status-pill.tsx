import type { ReactNode } from "react";

export function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="ui-control inline-flex items-center border border-black px-3 py-1 text-xs font-semibold lowercase tracking-tight text-black">
      <span className="mr-2 h-2 w-2 rounded-full bg-uga-lime" />
      {children}
    </span>
  );
}
