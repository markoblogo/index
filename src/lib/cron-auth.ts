import { timingSafeEqual } from "node:crypto";

export function isCronRequestAuthorized(
  request: Request,
  secrets: Array<string | null | undefined>,
) {
  return isBearerTokenAuthorized(request, secrets);
}

export function isBearerTokenAuthorized(
  request: Request,
  secrets: Array<string | null | undefined>,
) {
  const expectedSecrets = secrets.filter(
    (secret): secret is string => typeof secret === "string" && secret.length > 0,
  );

  if (expectedSecrets.length === 0) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  return Boolean(token && expectedSecrets.some((secret) => timingSafeEqualString(token, secret)));
}

export function timingSafeEqualString(value: string | null | undefined, expected: string | null | undefined) {
  if (!value || !expected) {
    return false;
  }

  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(valueBuffer, expectedBuffer);
}
