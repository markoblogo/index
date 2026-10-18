"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GoogleDriveSyncStatus } from "@/lib/media-hub-google-drive";

export function GoogleDriveSyncPanel({ initialStatus }: { initialStatus: GoogleDriveSyncStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function sync() {
    setPending(true);
    setError("");
    setMessage("Синхронізація розпочалася...");
    let processed = 0;
    try {
      for (let batch = 0; batch < 20; batch += 1) {
        const response = await fetch("/api/admin/media-hub/google-drive/sync", {
          method: "POST", signal: AbortSignal.timeout(280_000),
        });
        const result = await response.json() as {
          error?: string; status?: string; results?: unknown[]; remainingCount?: number; skippedCount?: number;
        };
        if (!response.ok) throw new Error(result.error || "Не вдалося завершити синхронізацію.");
        processed += result.results?.length ?? 0;
        if (result.status === "processed") {
          setMessage(`Синхронізацію завершено. Оброблено файлів: ${processed}. Пропущено папок або завеликих файлів: ${result.skippedCount ?? 0}.`);
          return;
        }
        setMessage(`Оброблено файлів: ${processed}. Залишилось у черзі: ${result.remainingCount ?? 0}.`);
      }
      setMessage(`Оброблено файлів: ${processed}. Черга ще не порожня; натисніть кнопку для продовження.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Помилка синхронізації.");
    } finally {
      setPending(false);
      router.refresh();
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5" aria-label="Google Drive">
      <h2 className="text-xl font-semibold text-white">Google Drive</h2>
      <p className="mt-2 text-sm leading-6 text-white/68">
        {initialStatus.connectedAt ? "Обліковий запис підключено." : "Потрібно підключити обліковий запис."}
        {` Матеріалів із Drive: ${initialStatus.materialCount}.`}
      </p>
      <p className="mt-1 text-sm text-white/56">
        Перевірено зміни до: {initialStatus.lastSyncAt
          ? new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Kyiv" }).format(new Date(initialStatus.lastSyncAt.endsWith("Z") ? initialStatus.lastSyncAt : `${initialStatus.lastSyncAt}Z`))
          : "ще не завершувалась"}. Автоматична перевірка щогодини.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={sync} disabled={pending || !initialStatus.connectedAt || !initialStatus.configured}
          className="rounded-full bg-uga-green px-5 py-2 text-sm font-bold text-black disabled:cursor-wait disabled:opacity-50">
          {pending ? "Синхронізація..." : "Синхронізувати Drive"}
        </button>
        <form method="get" action="/api/admin/media-hub/google-drive/connect">
          <button type="submit" disabled={pending} className="text-sm text-white/72 underline underline-offset-4 disabled:opacity-50">
            {initialStatus.connectedAt ? "Перепідключити Google Drive" : "Підключити Google Drive"}
          </button>
        </form>
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-sm text-white/72">{message}</p>
      {error ? <p role="alert" className="mt-2 text-sm text-red-300">{error}</p> : null}
      <p className="mt-3 text-xs text-white/48">Імпортуємо зміни за останні 62 дні для тижневих і місячних звітів. Старіші файли залишаються в Drive. Дата зміни файла визначає період матеріалу; фактичний період даних перевіряється за його вмістом. Публікація звітів виконується окремо.</p>
    </section>
  );
}
