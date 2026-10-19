import { handleSsiWeeklyCron } from "@/lib/ssi-weekly-runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export function GET(request: Request) {
  return handleSsiWeeklyCron(request, "send");
}
