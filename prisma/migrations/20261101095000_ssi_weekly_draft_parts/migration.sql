ALTER TABLE private."SsiWeeklyVideoPreparation"
  ADD COLUMN IF NOT EXISTS "reportDraftPartsJson" JSONB;
