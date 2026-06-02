import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { sendRespondentTelegramSubmissionConfirmation } from "@/lib/respondent-telegram";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (
    !isCronRequestAuthorized(request, [
      process.env.RESPONDENT_TELEGRAM_CRON_SECRET,
      process.env.CRON_SECRET,
    ])
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const respondentId = url.searchParams.get("respondentId") ?? "fop-solovey";
  const date = url.searchParams.get("date") ?? formatDateKyiv();
  const locale = url.searchParams.get("locale") === "en" ? "en" : "uk";
  const tradeDate = new Date(`${date}T00:00:00.000Z`);
  const submissions = await db.priceSubmission.findMany({
    orderBy: { updatedAt: "desc" },
    where: {
      respondentId,
      source: "respondent",
      status: { in: ["submitted", "verified", "published"] },
      tradeDate,
    },
  });
  const latestByCommodity = new Map<string, (typeof submissions)[number]>();

  for (const submission of submissions) {
    if (!latestByCommodity.has(submission.commodityId)) {
      latestByCommodity.set(submission.commodityId, submission);
    }
  }

  const items = [...latestByCommodity.values()].map((submission) => ({
    commodityId: submission.commodityId,
    price: submission.priceUsdPerMt.toNumber(),
  }));

  if (items.length === 0) {
    return NextResponse.json(
      { date, error: "No submitted respondent values found.", respondentId },
      { status: 404 },
    );
  }

  const result = await sendRespondentTelegramSubmissionConfirmation({
    date,
    items,
    locale,
    respondentId,
  });

  return NextResponse.json({ date, itemCount: items.length, respondentId, result });
}

function formatDateKyiv(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Kyiv",
    year: "numeric",
  }).format(date);
}
