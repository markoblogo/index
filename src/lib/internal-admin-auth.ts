import "server-only";

import { timingSafeEqualString } from "@/lib/cron-auth";

export function isInternalSecretHeaderAuthorized(
  request: Request,
  headerName: string,
  expectedSecret: string | null | undefined,
) {
  return timingSafeEqualString(request.headers.get(headerName), expectedSecret);
}
