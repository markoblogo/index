"use client";

import type { ReactNode } from "react";

export function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block text-xs font-black uppercase tracking-[0.12em] text-black/50">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

export function StatusPill({
  children,
  tone,
  title,
}: {
  children: ReactNode;
  title?: string;
  tone: "active" | "danger" | "muted" | "warning";
}) {
  const className =
    tone === "active"
      ? "admin-contrast-pill bg-uga-lime text-black"
      : tone === "danger"
        ? "admin-contrast-pill bg-red-500 text-black"
        : tone === "warning"
          ? "admin-warning-pill text-black"
          : "border border-white/35 text-white/70";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[0.66rem] font-black uppercase tracking-[0.12em] ${className}`}
      title={title}
    >
      {children}
    </span>
  );
}
