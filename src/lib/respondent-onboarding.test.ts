import { describe, expect, it } from "vitest";
import {
  buildRespondentTelegramDeepLink,
  buildSpikeRespondentOnboardingEmailMessage,
  buildSpikeTelegramAlreadyLinkedText,
  buildSpikeTelegramStartText,
  buildSpikeTelegramUnmatchedText,
  createRespondentTelegramLinkTokenValue,
  hashRespondentTelegramLinkToken,
} from "@/lib/respondent-onboarding";

describe("SPIKE respondent onboarding email", () => {
  it("renders Ukrainian SSI onboarding copy with escaped HTML", () => {
    const message = buildSpikeRespondentOnboardingEmailMessage({
      botHandle: "@spike_spot_bot",
      companyName: 'ТОВ "Агро" <Prime>',
      loginEmail: "respondent@example.com",
      loginUrl: "https://spike.1d3x.com/login",
      publicProjectUrl: "https://spike.1d3x.com/uk",
      recipientName: "Олександр <script>",
      telegramDeepLink: "https://t.me/spike_spot_bot?start=abc",
      temporaryPassword: "tmp-pass-123",
    });

    expect(message.subject).toBe("Ваш доступ респондента до SPIKE SPOT INDEX");
    expect(message.text).toContain("SPIKE SPOT INDEX");
    expect(message.text).toContain('ТОВ "Агро" <Prime>');
    expect(message.text).toContain("respondent@example.com");
    expect(message.text).toContain("tmp-pass-123");
    expect(message.text).toContain("https://spike.1d3x.com/login");
    expect(message.text).toContain("@spike_spot_bot");
    expect(message.text).toContain("https://spike.1d3x.com/uk");
    expect(message.text).toContain("після 17:00");
    expect(message.html).toContain("ТОВ &quot;Агро&quot; &lt;Prime&gt;");
    expect(message.html).toContain("Олександр &lt;script&gt;");
    expect(message.html).toContain("https://t.me/spike_spot_bot?start=abc");
    expect(message.text).not.toContain("Spike Brokers");
    expect(message.text).not.toContain("в продовження розмови в інста");
    expect(message.text).not.toContain("1D3X");
  });
});

describe("SPIKE respondent Telegram start copy", () => {
  it("renders the first welcome message without credentials", () => {
    const text = buildSpikeTelegramStartText({ companyName: "Агріпрайм" });

    expect(text).toContain("SPIKE SPOT INDEX");
    expect(text).toContain("Агріпрайм");
    expect(text).toContain("після 17:00");
    expect(text).toContain("https://spike.1d3x.com/uk");
    expect(text).not.toContain("Тимчасовий пароль");
    expect(text).not.toContain("Spike Brokers");
  });

  it("renders idempotent and unmatched messages", () => {
    expect(buildSpikeTelegramAlreadyLinkedText({ companyName: "Агріпрайм" })).toContain(
      "Ви вже підключені",
    );
    expect(buildSpikeTelegramUnmatchedText()).toContain("персональним посиланням");
  });
});

describe("respondent Telegram start tokens", () => {
  it("uses deep links and hash-only token storage primitives", () => {
    const previousTenant = process.env.INDEX_TENANT;
    process.env.INDEX_TENANT = "spike-ua";
    const token = createRespondentTelegramLinkTokenValue();
    const hash = hashRespondentTelegramLinkToken(token);

    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(buildRespondentTelegramDeepLink(token)).toContain(
      `https://t.me/spike_spot_bot?start=${encodeURIComponent(token)}`,
    );
    expect(hash).toHaveLength(64);
    expect(hash).not.toBe(token);

    if (previousTenant) {
      process.env.INDEX_TENANT = previousTenant;
    } else {
      delete process.env.INDEX_TENANT;
    }
  });
});
