import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, hasDatabaseUrl } from "@/lib/db";
import type { DemoUser } from "@/lib/demo-auth";
import { getConfiguredDeliveryBasisCodes } from "@/lib/tenant-basis";

export function todayKyivDate() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Kyiv",
    year: "numeric",
  }).format(new Date());
}

export function canManuallyUnlockPublicationDate(date: string) {
  return date === todayKyivDate();
}

export async function unlockTodayPublishedIndices(formData: FormData, user: DemoUser) {
  const date = String(formData.get("date") ?? todayKyivDate());
  const returnTo = normalizeUnlockReturnTo(String(formData.get("returnTo") ?? ""));
  const noticeParam = returnTo.endsWith("calculate") ? "notice" : "saved";

  if (!canManuallyUnlockPublicationDate(date)) {
    redirect(`${returnTo}?date=${date}&${noticeParam}=unlock_unavailable`);
  }

  if (!hasDatabaseUrl()) {
    redirect(`${returnTo}?date=${date}&${noticeParam}=unlock_unavailable`);
  }

  const tradeDate = new Date(`${date}T00:00:00.000Z`);
  const basisCodes = getConfiguredDeliveryBasisCodes();
  const lockedRows = await db.publishedIndex.findMany({
    where: {
      tradeDate,
      deliveryBasis: { code: { in: basisCodes } },
      locked: true,
      status: "published",
    },
    select: {
      id: true,
      commodityId: true,
      valueUsdPerMt: true,
    },
  });

  if (lockedRows.length === 0) {
    redirect(`${returnTo}?date=${date}&${noticeParam}=unlocked_empty`);
  }

  await db.publishedIndex.updateMany({
    where: { id: { in: lockedRows.map((row) => row.id) } },
    data: { locked: false },
  });

  await db.auditLog.create({
    data: {
      actorRole: "admin",
      action: "index.manual_unlock",
      entityType: "PublishedIndex",
      summary: `Admin unlocked ${lockedRows.length} published index values for correction on ${date}.`,
      beforeJson: {
        locked: true,
        tradeDate: date,
        rows: lockedRows.map((row) => ({
          id: row.id,
          commodityId: row.commodityId,
          valueUsdPerMt: row.valueUsdPerMt.toNumber(),
        })),
      },
      afterJson: {
        locked: false,
        tradeDate: date,
        username: user.username,
      },
    },
  });

  revalidatePublishedIndexViews();
  redirect(`${returnTo}?date=${date}&${noticeParam}=unlocked`);
}

function normalizeUnlockReturnTo(value: string) {
  return value === "/admin/calculate" ? value : "/admin/daily-inputs";
}

export function revalidatePublishedIndexViews() {
  revalidatePath("/uk");
  revalidatePath("/en");
  revalidatePath("/uk/analytics");
  revalidatePath("/en/analytics");
  revalidatePath("/api/public/latest");
  revalidatePath("/api/public/history");
}
