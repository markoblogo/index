DO $$
BEGIN
  ALTER TYPE "RespondentCollectionMode" ADD VALUE IF NOT EXISTS 'telegram_request';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
