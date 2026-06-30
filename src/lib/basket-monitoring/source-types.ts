export type { BasketSourceKind, BasketSource } from "@/lib/basket/types";

export type BasketMonitoringPipelineStage =
  | "fetch"
  | "raw_snapshot"
  | "parser_adapter"
  | "normalization"
  | "validation"
  | "confidence"
  | "publish_candidate";

export type BasketMonitoringSourceRegistration = {
  id: string;
  label: string;
  kind: import("@/lib/basket/types").BasketSourceKind;
  enabled: boolean;
  cadence: "daily" | "weekly" | "monthly" | "manual";
};
