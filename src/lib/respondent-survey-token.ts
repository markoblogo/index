import { createHash, randomBytes } from "node:crypto";

export function createRespondentSurveyToken() {
  return randomBytes(24).toString("base64url");
}

export function digestRespondentSurveyToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("base64url");
}
