-- These Cortex/SSI ledgers are accessed through the server-side Prisma
-- connection. The public Supabase Data API must not read or mutate them.
-- Keep RLS enabled without anon/authenticated policies; postgres/service_role
-- continue to access the tables through their privileged server credentials.

ALTER TABLE IF EXISTS public."CortexAgentGovernanceApprovalUseLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CortexAgentGovernanceReceiptLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CortexAgentGovernanceTelemetryLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CortexAssistantAuditLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CortexAutonomyReadinessLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CortexEcosystemEvidenceLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CortexEditorialMatchDiagnosticsLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CortexEditorialPromotionLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CortexEditorialQualityLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CortexEditorialShadowLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CortexMarketWorkforceLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CortexSgrLiteCheckpointLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CortexSsiIntegrityLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."SsiWeeklyLogisticsControl" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'CortexAgentGovernanceApprovalUseLedger',
    'CortexAgentGovernanceReceiptLedger',
    'CortexAgentGovernanceTelemetryLedger',
    'CortexAssistantAuditLedger',
    'CortexAutonomyReadinessLedger',
    'CortexEcosystemEvidenceLedger',
    'CortexEditorialMatchDiagnosticsLedger',
    'CortexEditorialPromotionLedger',
    'CortexEditorialQualityLedger',
    'CortexEditorialShadowLedger',
    'CortexMarketWorkforceLedger',
    'CortexSgrLiteCheckpointLedger',
    'CortexSsiIntegrityLedger',
    'SsiWeeklyLogisticsControl'
  ] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated, PUBLIC',
        table_name
      );
    END IF;
  END LOOP;
END;
$$;
