import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { SITE_CONFIG } from "@/lib/constants";

export default function DriveSyncLayout({ children }: { children: ReactNode }) {
  if (SITE_CONFIG.tenantId !== "spike-ua") notFound();
  return <section className="mx-auto max-w-4xl px-6 py-12 lg:px-8">{children}</section>;
}
