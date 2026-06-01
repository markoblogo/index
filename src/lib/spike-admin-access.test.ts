import { describe, expect, it } from "vitest";
import {
  buildSpikeAdminInviteMessage,
  isSpikeAdminEmail,
} from "@/lib/spike-admin-access";

describe("spike admin access", () => {
  it("allows only configured Spike admin emails", () => {
    expect(isSpikeAdminEmail("a.biletskiy@gmail.com")).toBe(true);
    expect(isSpikeAdminEmail("AN@SPIKE.BROKER")).toBe(true);
    expect(isSpikeAdminEmail("admin@spike-ua.demo")).toBe(false);
  });

  it("renders one-time setup link invite text", () => {
    const message = buildSpikeAdminInviteMessage({
      email: "a.biletskiy@gmail.com",
      name: "Anton Biletskiy",
      setupLink: "https://spike.1d3x.com/setup-password?token=one-time",
    });

    expect(message.text).toContain("Login: a.biletskiy@gmail.com");
    expect(message.text).toContain("Set your password: https://spike.1d3x.com/setup-password?token=one-time");
    expect(message.text).toContain("used only once");
    expect(message.html).toContain("https://spike.1d3x.com/setup-password?token=one-time");
  });
});
