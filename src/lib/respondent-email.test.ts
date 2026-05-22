import { describe, expect, it } from "vitest";
import { isScheduledSendDue } from "@/lib/respondent-email";
import type { RespondentEmailScheduleSettings } from "@/lib/respondent-directory";

const schedule = {
  enabled: true,
  replyTo: "admin@uga.ua",
  sender: "UGA Index <onboarding@resend.dev>",
  sendTime: "16:30",
  subject: "UGA Index daily price survey",
  surveyUrl: "/respondent",
  template: "Please submit {{surveyUrl}}",
  timezone: "Europe/Kyiv",
  workdays: "Monday-Friday",
} satisfies RespondentEmailScheduleSettings;

describe("respondent email schedule", () => {
  it("is due on a Kyiv weekday after the configured time", () => {
    expect(isScheduledSendDue(schedule, new Date("2026-05-22T13:31:00.000Z"))).toBe(
      true,
    );
  });

  it("is not due before the configured Kyiv time", () => {
    expect(isScheduledSendDue(schedule, new Date("2026-05-22T13:00:00.000Z"))).toBe(
      false,
    );
  });

  it("is not due on weekends", () => {
    expect(isScheduledSendDue(schedule, new Date("2026-05-23T13:31:00.000Z"))).toBe(
      false,
    );
  });
});
