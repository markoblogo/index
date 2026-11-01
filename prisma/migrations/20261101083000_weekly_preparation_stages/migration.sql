ALTER TABLE private."SsiWeeklyVideoPreparation"
ADD COLUMN IF NOT EXISTS "intakeCompleteAt" TIMESTAMPTZ;
