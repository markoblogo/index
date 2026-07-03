import { getPublicHistoryData } from "@/lib/public-api-data";
import { publicDataResponse, publicDataUnavailableResponse } from "../public-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return publicDataResponse(await getPublicHistoryData());
  } catch (error) {
    return publicDataUnavailableResponse("public_history_unavailable", error);
  }
}
