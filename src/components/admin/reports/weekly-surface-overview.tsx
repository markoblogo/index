"use client";

import { WeeklySurfaceStatusPanel } from "@/components/admin/reports/weekly-preview-panel";

export function WeeklySurfaceOverview({
  detailCards,
}: {
  detailCards: Array<{
    detail: string;
    label: string;
    tone: "ok" | "warn";
    value: string;
  }>;
}) {
  return <WeeklySurfaceStatusPanel detailCards={detailCards} />;
}
