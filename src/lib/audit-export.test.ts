import { describe, expect, it } from "vitest";
import { auditRowsToCsv } from "@/lib/audit-export";

describe("audit export", () => {
  it("escapes CSV fields", () => {
    const csv = auditRowsToCsv([
      {
        id: "log-1",
        tenantId: "uga-ua",
        indexProductId: "uga-ua",
        actorUserId: null,
        actorRole: "admin",
        action: "index.published",
        entityType: "PublishedIndex",
        entityId: "row-1",
        summary: 'Published "corn", locked',
        beforeJson: null,
        afterJson: null,
        createdAt: new Date("2026-06-01T10:00:00.000Z"),
        actorUser: { email: "admin@uga.ua", name: "Admin" },
      },
    ]);

    expect(csv).toContain('"Published ""corn"", locked"');
  });
});

