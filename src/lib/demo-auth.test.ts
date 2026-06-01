import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createDemoSessionCookieValue,
  parseDemoSessionCookieValue,
} from "@/lib/demo-auth";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {},
  hasDatabaseUrl: () => false,
}));

function encodeUnsignedAdminPayload() {
  return Buffer.from(
    JSON.stringify({
      email: "attacker@example.com",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      issuedAt: Math.floor(Date.now() / 1000),
      name: "Attacker",
      role: "admin",
      userId: "attacker-id",
      username: "attacker@example.com",
    }),
  ).toString("base64url");
}

describe("demo session cookies", () => {
  const originalDemoAuthSecret = process.env.DEMO_AUTH_SECRET;

  afterEach(() => {
    process.env.DEMO_AUTH_SECRET = originalDemoAuthSecret;
  });

  it("rejects old demo-prefixed unsigned sessions", () => {
    const payload = encodeUnsignedAdminPayload();

    expect(parseDemoSessionCookieValue(`demo.${payload}`)).toBeNull();
  });

  it("rejects legacy payloads with invalid signatures", () => {
    const payload = encodeUnsignedAdminPayload();

    expect(parseDemoSessionCookieValue(`${payload}.anything`)).toBeNull();
  });

  it("accepts current signed session cookies", () => {
    const cookie = createDemoSessionCookieValue({
      email: "admin@example.com",
      name: "Admin",
      passwordSetupStatus: "active",
      role: "admin",
      userId: "admin-id",
    });

    expect(parseDemoSessionCookieValue(cookie)).toMatchObject({
      email: "admin@example.com",
      role: "admin",
      userId: "admin-id",
    });
  });

  it("rejects signed sessions without tenant claims", () => {
    process.env.DEMO_AUTH_SECRET = "local-preview-secret";
    const payload = encodeUnsignedAdminPayload();
    const signature = createHmac("sha256", "local-preview-secret")
      .update(payload)
      .digest("base64url");

    expect(parseDemoSessionCookieValue(`session.${payload}.${signature}`)).toBeNull();
  });
});
