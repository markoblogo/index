import { NextResponse } from "next/server";
import { getGeneratedMediaAssetById } from "@/lib/generated-media-asset";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const params = await context.params;
  const asset = await getGeneratedMediaAssetById(params.assetId);

  if (!asset) {
    return new NextResponse("Not found", { status: 404 });
  }

  const bytes = Uint8Array.from(Buffer.from(asset.base64Data, "base64"));

  return new NextResponse(bytes, {
    headers: {
      "Cache-Control": "public, immutable, max-age=31536000",
      "Content-Disposition": `inline; filename="${asset.fileName}"`,
      "Content-Type": asset.contentType,
    },
    status: 200,
  });
}
