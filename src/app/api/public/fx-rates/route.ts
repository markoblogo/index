import { getFxRates } from "@/lib/fx-rates";
import { publicDataResponse, publicDataUnavailableResponse } from "../public-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fxRates = await getFxRates(searchParams.get("date") ?? undefined);
    return publicDataResponse(fxRates, 21_600, request);
  } catch (error) {
    return publicDataUnavailableResponse("public_fx_rates_unavailable", error);
  }
}
