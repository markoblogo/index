import { redirect } from "next/navigation";
import { ManualPageShell } from "@/components/manual/manual-ui";
import { SITE_CONFIG } from "@/lib/constants";
import { requireDemoRole } from "@/lib/demo-auth";
import { getSsiAdminManual } from "@/lib/ssi-manual-content";

export default async function AdminManualPage() {
  await requireDemoRole("admin");

  if (SITE_CONFIG.tenantId !== "spike-ua") {
    redirect("/admin");
  }

  const manual = getSsiAdminManual();

  return <ManualPageShell admin {...manual} />;
}
