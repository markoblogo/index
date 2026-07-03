import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const passwordResetTokenDeleteMany = vi.fn();
const passwordResetTokenCreate = vi.fn();
const userFindFirst = vi.fn();
const respondentAuthFindUnique = vi.fn();
const auditLogCreate = vi.fn();

vi.mock("@/lib/db", () => ({
  hasDatabaseUrl: () => true,
  db: {
    $transaction: async (
      callback: (tx: {
        passwordResetToken: {
          create: typeof passwordResetTokenCreate;
          deleteMany: typeof passwordResetTokenDeleteMany;
        };
      }) => Promise<void>,
    ) =>
      callback({
        passwordResetToken: {
          create: passwordResetTokenCreate,
          deleteMany: passwordResetTokenDeleteMany,
        },
      }),
    auditLog: { create: auditLogCreate },
    respondentAuthAccount: { findUnique: respondentAuthFindUnique },
    user: { findFirst: userFindFirst },
  },
}));

describe("requestPasswordReset", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.RESEND_API_KEY = "re_test";
    delete process.env.SPIKE_ADMIN_INVITE_SENDER;
    delete process.env.SPIKE_ADMIN_INVITE_REPLY_TO;
    delete process.env.UGA_PASSWORD_RESET_SENDER;
    delete process.env.UGA_PASSWORD_RESET_REPLY_TO;
    delete process.env.UGA_AUTH_EMAIL_SENDER;
    delete process.env.UGA_AUTH_EMAIL_REPLY_TO;

    userFindFirst.mockResolvedValue({
      active: true,
      email: "admin@uga.ua",
      id: "admin-user-id",
      name: "UGA Admin",
      passwordSetupStatus: "active",
      role: "admin",
    });
    respondentAuthFindUnique.mockResolvedValue(null);
    passwordResetTokenDeleteMany.mockResolvedValue({ count: 0 });
    passwordResetTokenCreate.mockResolvedValue({});
    auditLogCreate.mockResolvedValue({});
  });

  it("logs failed reset email delivery when Resend rejects the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ message: "Domain not verified" }),
      ok: false,
      statusText: "Forbidden",
    });
    global.fetch = fetchMock as typeof fetch;

    const { requestPasswordReset } = await import("@/lib/password-reset");

    await requestPasswordReset("admin@uga.ua", "uk");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "auth.password_reset_email_failed",
        actorRole: "admin",
        actorUserId: "admin-user-id",
        entityId: "admin-user-id",
        summary: "Password reset email failed for admin@uga.ua.",
      }),
    });
    expect(auditLogCreate.mock.calls[0][0].data.afterJson).toEqual(
      expect.objectContaining({
        email: "admin@uga.ua",
        error: "Domain not verified",
        role: "admin",
        status: "failed",
      }),
    );
  });

  it("uses UGA-specific reset sender and reply-to overrides when configured", async () => {
    process.env.UGA_PASSWORD_RESET_SENDER = "UGA Index <security@uga.ua>";
    process.env.UGA_PASSWORD_RESET_REPLY_TO = "support@uga.ua";

    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ id: "re_123" }),
      ok: true,
      statusText: "OK",
    });
    global.fetch = fetchMock as typeof fetch;

    const {
      getPasswordResetReplyTo,
      getPasswordResetSender,
      requestPasswordReset,
    } = await import("@/lib/password-reset");

    expect(getPasswordResetSender()).toBe("UGA Index <security@uga.ua>");
    expect(getPasswordResetReplyTo()).toBe("support@uga.ua");

    await requestPasswordReset("admin@uga.ua", "en");

    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}")) as {
      from?: string;
      reply_to?: string;
    };
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(payload.from).toBe("UGA Index <security@uga.ua>");
    expect(payload.reply_to).toBe("support@uga.ua");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "auth.password_reset_email_sent",
      }),
    });
  });
});
