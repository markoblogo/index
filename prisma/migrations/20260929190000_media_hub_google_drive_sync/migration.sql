CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private."MediaHubGoogleDriveCredential" (
  "id" TEXT PRIMARY KEY,
  "refreshTokenCiphertext" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS private."MediaHubGoogleDriveSyncState" (
  "id" TEXT PRIMARY KEY,
  "lastSuccessfulSyncAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE private."MediaHubGoogleDriveCredential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE private."MediaHubGoogleDriveSyncState" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE private."MediaHubGoogleDriveCredential" FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE private."MediaHubGoogleDriveSyncState" FROM PUBLIC, anon, authenticated;
