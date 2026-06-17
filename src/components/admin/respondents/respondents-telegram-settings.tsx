"use client";

import { SITE_CONFIG } from "@/lib/constants";

export function TelegramNotificationSettings({
  sendTelegramSurveyNowAction,
}: {
  sendTelegramSurveyNowAction: () => Promise<void>;
}) {
  const isSpike = SITE_CONFIG.tenantId === "spike-ua";
  const botLabel = isSpike ? "@spike_spot_bot" : "@uga_index_bot";
  const telegramTemplate = [
    `Будь ласка, внесіть сьогоднішні ціни для ${SITE_CONFIG.name} ({{companyName}}).`,
    "Кнопка відкриває персональну форму респондента у Telegram WebApp.",
    "Фінальне нагадування о 18:00: якщо дані не внесені зараз, вони можуть не потрапити до сьогоднішнього розрахунку індексу.",
  ].join("\n\n");

  return (
    <aside className="border border-black bg-white p-5">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
            Daily Telegram
          </p>
          <h2 className="mt-3 text-2xl font-black uppercase leading-tight">
            Telegram respondent workflow
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">
            {SITE_CONFIG.name} uses Telegram as the main daily respondent
            channel. The bot sends a Ukrainian request with a secure personal
            WebApp form; the site form remains available as a reserve input route.
          </p>
          <form action={sendTelegramSurveyNowAction} className="mt-4">
            <button className="border border-black bg-uga-dark px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
              Send Telegram now
            </button>
          </form>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[0.55fr_0.7fr_0.75fr_1fr]">
            <ReadOnlyField label="Status" value="enabled" />
            <ReadOnlyField label="Workdays" value="Monday-Friday" />
            <ReadOnlyField label="Initial request" value="16:00" />
            <ReadOnlyField label="Timezone" value="Europe/Kyiv" />
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <ReadOnlyField label="Bot" value={botLabel} />
            <ReadOnlyField label="Reminder 1" value="17:00" />
            <ReadOnlyField label="Final reminder" value="18:00" />
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_0.65fr]">
            <ReadOnlyField label="Project" value={SITE_CONFIG.name} />
            <ReadOnlyField label="WebApp / fallback" value="/respondent" />
          </div>
          <label className="block text-xs font-black uppercase tracking-[0.12em] text-black/50">
            <span className="mb-1 block">Telegram template · Ukrainian</span>
            <textarea
              className="admin-field min-h-36"
              defaultValue={telegramTemplate}
              readOnly
            />
          </label>
          <p className="text-xs font-semibold leading-5 text-black/55">
            Template variables: {"{{companyName}}"}, {"{{surveyUrl}}"},{" "}
            {"{{date}}"}. Contacts should have either Telegram username or chat
            / peer id configured in the respondent directory. Automatic weekday
            delivery is handled by the Telegram cron endpoint after the contact
            links the bot with /start.
          </p>
        </div>
      </div>
    </aside>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-black/50">
        {label}
      </p>
      <div className="admin-field">{value}</div>
    </div>
  );
}
