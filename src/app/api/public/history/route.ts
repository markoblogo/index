import { getPublicHistoryData } from "@/lib/public-api-data";
import { publicDataResponse, publicDataUnavailableResponse } from "../public-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return publicDataResponse(await getPublicHistoryData(), 0, request);
  } catch (error) {
    return publicDataUnavailableResponse("public_history_unavailable", error);
  }
}
