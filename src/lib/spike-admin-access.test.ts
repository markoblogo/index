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

  it("renders temporary password invite text", () => {
    const message = buildSpikeAdminInviteMessage({
      email: "a.biletskiy@gmail.com",
      loginUrl: "https://spike-ua.cr0pto.com/login",
      name: "Anton Biletskiy",
      temporaryPassword: "tmp-password",
    });

    expect(message.text).toContain("Login: a.biletskiy@gmail.com");
    expect(message.text).toContain("Temporary password: tmp-password");
    expect(message.html).toContain("https://spike-ua.cr0pto.com/login");
  });
});
