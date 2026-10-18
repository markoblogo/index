import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { user, config, sync, status } = vi.hoisted(() => ({
  user: vi.fn(), config: vi.fn(), sync: vi.fn(), status: vi.fn(),
}));
vi.mock("@/lib/demo-auth", () => ({ getCurrentDemoUser: user }));
vi.mock("@/lib/index-platform", () => ({ getActiveIndexConfig: config }));
vi.mock("@/lib/media-hub-google-drive", () => ({
  getGoogleDriveSyncStatus: status, syncGoogleDriveContextMaterials: sync,
}));
import { GET, POST } from "./route";

describe("SSI admin Drive sync access", () => {
  beforeEach(() => {
    user.mockResolvedValue({ role: "admin", passwordSetupStatus: "active" });
    config.mockReturnValue({ id: "spike-ua" });
    sync.mockResolvedValue({ status: "processed", results: [], remainingCount: 0 });
    status.mockResolvedValue({ configured: true, connectedAt: "2026-10-18T10:01:39Z", materialCount: 183 });
  });
  afterEach(() => { vi.clearAllMocks(); });

  it("does not expose connection metadata without a session", async () => {
    user.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(status).not.toHaveBeenCalled();
  });
  it("rejects respondent and temporary-password sessions", async () => {
    user.mockResolvedValue({ role: "respondent", passwordSetupStatus: "active" });
    expect((await GET()).status).toBe(401);
    user.mockResolvedValue({ role: "admin", passwordSetupStatus: "temporary" });
    expect((await GET()).status).toBe(401);
  });
  it("does not run the SSI source in another tenant", async () => {
    config.mockReturnValue({ id: "1d3x" });
    expect((await GET()).status).toBe(401);
  });
  it("rejects absent and cross-site origins", async () => {
    for (const origin of [undefined, "https://attacker.example"]) {
      const response = await POST(new Request("https://spike.1d3x.com/api/admin/media-hub/google-drive/sync", {
        method: "POST", headers: origin ? { origin } : {},
      }));
      expect(response.status).toBe(403);
    }
    expect(sync).not.toHaveBeenCalled();
  });
  it("runs an authenticated same-origin request without a cron secret", async () => {
    const response = await POST(new Request("https://spike.1d3x.com/api/admin/media-hub/google-drive/sync", {
      method: "POST", headers: { origin: "https://spike.1d3x.com" },
    }));
    expect(response.status).toBe(200);
    expect(sync).toHaveBeenCalledOnce();
  });
  it("returns a useful reconnect error without leaking unexpected backend errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const request = () => new Request("https://spike.1d3x.com/api/admin/media-hub/google-drive/sync", {
      method: "POST", headers: { origin: "https://spike.1d3x.com" },
    });
    sync.mockRejectedValue(new Error("Google Drive refresh token expired or was revoked; reconnect the Drive account."));
    expect(await (await POST(request())).json()).toMatchObject({ error: expect.stringContaining("reconnect") });
    sync.mockRejectedValue(new Error("database password=do-not-expose"));
    expect(JSON.stringify(await (await POST(request())).json())).not.toContain("do-not-expose");
    vi.restoreAllMocks();
  });
});
