export function isCronRequestAuthorized(
  request: Request,
  secrets: Array<string | null | undefined>,
) {
  const expectedSecrets = secrets.filter(
    (secret): secret is string => typeof secret === "string" && secret.length > 0,
  );

  if (expectedSecrets.length === 0) {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  return Boolean(token && expectedSecrets.includes(token));
}
