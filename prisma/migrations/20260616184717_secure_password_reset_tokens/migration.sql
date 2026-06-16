ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "PasswordResetToken" FROM anon;
REVOKE ALL ON TABLE "PasswordResetToken" FROM authenticated;
REVOKE ALL ON TABLE "PasswordResetToken" FROM PUBLIC;

COMMENT ON TABLE "PasswordResetToken" IS 'Password reset tokens are server-only and must not be accessible through public Supabase API roles.';
