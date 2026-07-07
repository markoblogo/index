-- Keep internal MediaHub, Telegram, Cortex and audit tables closed to Supabase
-- anon/auth API access. The application accesses these tables through server-side
-- database credentials, so no public RLS policies are required here.

ALTER TABLE IF EXISTS public."MediaHubReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."MediaHubApiUsageBudget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."MediaHubManualMaterial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Mn7rMonitorImportAudit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."RespondentTelegramLinkToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."MediaHubManualMaterialAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."MediaHubTelegramPendingMaterial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."MediaHubTelegramWebhookUpdate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."MediaHubMonitoringLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CortexContextPackLedger" ENABLE ROW LEVEL SECURITY;
