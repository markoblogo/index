import type { ReactNode } from "react";
import { InternalShell } from "@/components/layout/internal-shell";
import { requireDemoRole } from "@/lib/demo-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RespondentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireDemoRole("respondent");

  return <InternalShell user={user}>{children}</InternalShell>;
}
