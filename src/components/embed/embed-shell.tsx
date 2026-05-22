import type { ReactNode } from "react";

export function EmbedShell({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <main className="min-h-screen bg-white text-uga-dark">
      <div className={compact ? "p-3" : "p-4 sm:p-5"}>{children}</div>
    </main>
  );
}

export function EmbedAttribution({ locale }: { locale: "uk" | "en" }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-black/45">
      <span>UGA Index</span>
      <span>{locale === "uk" ? "За підтримки UGA" : "Powered by UGA"}</span>
    </div>
  );
}
