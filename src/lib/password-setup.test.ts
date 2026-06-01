import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyPassword } from "@/lib/password-hash";
import { setPermanentPasswordForUser } from "@/lib/password-setup";

vi.mock("server-only", () => ({}));

const userFindFirst = vi.fn();
const userUpdate = vi.fn();
const auditLogCreate = vi.fn();
const respondentAuthUpdate = vi.fn();
const respondentFindFirst = vi.fn();
const userUpdateMany = vi.fn();

vi.mock("@/lib/db", () => ({
  hasDatabaseUrl: () => true,
  db: {
    $transaction: async (
      callback: (tx: {
        auditLog: { create: typeof auditLogCreate };
        respondent: { findFirst: typeof respondentFindFirst };
        respondentAuthAccount: { update: typeof respondentAuthUpdate };
        user: {
          findFirst: typeof userFindFirst;
          update: typeof userUpdate;
          updateMany: typeof userUpdateMany;
        };
      }) => Promise<void>,
    ) =>
      callback({
        auditLog: { create: auditLogCreate },
        respondent: { findFirst: respondentFindFirst },
        respondentAuthAccount: { update: respondentAuthUpdate },
        user: {
          findFirst: userFindFirst,
          update: userUpdate,
          updateMany: userUpdateMany,
        },
      }),
  },
}));

describe("setPermanentPasswordForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userFindFirst.mockResolvedValue({
      email: "a.biletskiy@gmail.com",
      id: "real-admin-id",
    });
    userUpdate.mockResolvedValue({});
    auditLogCreate.mockResolvedValue({});
    respondentFindFirst.mockResolvedValue({ id: "bunge-ukraine" });
    respondentAuthUpdate.mockResolvedValue({});
    userUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("sets an admin password by database user found from email when session id is stale", async () => {
    await setPermanentPasswordForUser(
      {
        email: "a.biletskiy@gmail.com",
        expiresAt: 1,
        issuedAt: 1,
        name: "ABV - Anton Biletskiy",
        passwordSetupStatus: "temporary",
        role: "admin",
        userId: "stale-cookie-admin-id",
        username: "a.biletskiy@gmail.com",
      },
      "  permanent-password  ",
    );

    expect(userFindFirst).toHaveBeenCalledWith({
      select: { email: true, id: true },
      where: {
        OR: [{ id: "stale-cookie-admin-id" }, { email: "a.biletskiy@gmail.com" }],
        active: true,
        indexProductId: "uga-ua",
        role: "admin",
        tenantId: "uga-ua",
      },
    });
    expect(userUpdate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        passwordSetAt: expect.any(Date),
        passwordSetupStatus: "active",
        temporaryPassword: null,
      }),
      where: { id: "real-admin-id" },
    });
    const updateArg = userUpdate.mock.calls[0][0] as {
      data: { passwordHash: string };
    };
    expect(verifyPassword("permanent-password", updateArg.data.passwordHash)).toBe(
      true,
    );
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "real-admin-id",
        action: "auth.password_setup_completed",
        entityId: "real-admin-id",
      }),
    });
  });

  it("requires respondent password setup to match the active tenant", async () => {
    respondentFindFirst.mockResolvedValue(null);

    await expect(
      setPermanentPasswordForUser(
        {
          email: "respondent@example.com",
          expiresAt: 1,
          issuedAt: 1,
          name: "Respondent",
          passwordSetupStatus: "temporary",
          respondentId: "foreign-respondent",
          role: "respondent",
          userId: "respondent-user-id",
          username: "respondent@example.com",
        },
        "permanent-password",
      ),
    ).rejects.toThrow("Password setup respondent was not found");

    expect(respondentFindFirst).toHaveBeenCalledWith({
      select: { id: true },
      where: {
        id: "foreign-respondent",
        indexProductId: "uga-ua",
        tenantId: "uga-ua",
      },
    });
    expect(respondentAuthUpdate).not.toHaveBeenCalled();
    expect(userUpdateMany).not.toHaveBeenCalled();
  });
});
