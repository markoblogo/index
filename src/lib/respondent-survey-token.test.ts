import { describe, expect, it } from "vitest";

import { digestRespondentSurveyToken } from "@/lib/respondent-survey-token";

describe("respondent survey tokens", () => {
  it("stores a deterministic digest instead of the bearer token", () => {
    const token = "survey-access-token";
    const digest = digestRespondentSurveyToken(token);

    expect(digest).not.toBe(token);
    expect(digest).toBe(digestRespondentSurveyToken(token));
    expect(digest).not.toBe(digestRespondentSurveyToken(`${token}-other`));
  });
});
