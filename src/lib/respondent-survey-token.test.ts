import { describe, expect, it } from "vitest";

import { digestRespondentSurveyToken } from "@1d3x/auth";

describe("respondent survey tokens", () => {
  it("stores a deterministic digest instead of the bearer token", () => {
    const token = "survey-access-token";
    const digest = digestRespondentSurveyToken(token);

    expect(digest).not.toBe(token);
    expect(digest).toBe(digestRespondentSurveyToken(token));
    expect(digest).not.toBe(digestRespondentSurveyToken(`${token}-other`));
  });
});
