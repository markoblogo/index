import { getPublicLatestData } from "@/lib/public-api-data";
import { publicDataResponse, publicDataUnavailableResponse } from "../public-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return publicDataResponse(await getPublicLatestData(), 300, request);
  } catch (error) {
    return publicDataUnavailableResponse("public_latest_unavailable", error);
  }
}
