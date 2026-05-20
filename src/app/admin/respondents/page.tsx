import { requireDemoRole } from "@/lib/demo-auth";
import {
  respondentContacts,
  respondentEmailSchedule,
} from "@/lib/respondent-directory";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminRespondentsPage() {
  await requireDemoRole("admin");
  const activeCount = respondentContacts.filter(
    (respondent) => respondent.status === "active",
  ).length;

  return (
    <section className="grid gap-6">
      <div className="border border-black bg-white p-5">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
              Respondent management
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase leading-tight tracking-normal">
              Respondents
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">
              Maintain respondent company contacts and notification recipients
              for daily price collection.
            </p>
          </div>
          <div className="grid grid-cols-2 border border-black text-sm font-semibold">
            <div className="border-r border-black px-4 py-3">
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-black/45">
                Active
              </p>
              <p className="mt-1 text-2xl font-black">{activeCount}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-black/45">
                Directory
              </p>
              <p className="mt-1 text-2xl font-black">
                {respondentContacts.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="overflow-hidden border border-black bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[58rem] border-collapse text-left">
              <thead className="bg-uga-dark text-white">
                <tr>
                  <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                    Company
                  </th>
                  <th className="border-l border-white/10 px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                    Contact person
                  </th>
                  <th className="border-l border-white/10 px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                    Phone
                  </th>
                  <th className="border-l border-white/10 px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                    Notification email
                  </th>
                  <th className="border-l border-white/10 px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {respondentContacts.map((respondent) => (
                  <tr className="border-t border-black/10" key={respondent.id}>
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm font-black leading-5">
                        {respondent.companyName}
                      </p>
                      <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-black/45">
                        {respondent.id}
                      </p>
                    </td>
                    <td className="border-l border-black/10 px-4 py-4 align-top text-sm font-semibold">
                      {respondent.contactPerson}
                    </td>
                    <td className="border-l border-black/10 px-4 py-4 align-top text-sm font-semibold">
                      <a
                        className="transition hover:text-uga-green"
                        href={`tel:${respondent.phone.replace(/[^\d+]/g, "")}`}
                      >
                        {respondent.phone}
                      </a>
                    </td>
                    <td className="border-l border-black/10 px-4 py-4 align-top text-sm font-semibold">
                      <a
                        className="transition hover:text-uga-green"
                        href={`mailto:${respondent.notificationEmail}`}
                      >
                        {respondent.notificationEmail}
                      </a>
                    </td>
                    <td className="border-l border-black/10 px-4 py-4 align-top">
                      <span
                        className={
                          respondent.status === "active"
                            ? "inline-flex rounded-full bg-uga-green px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-white"
                            : "inline-flex rounded-full border border-black/20 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-black/55"
                        }
                      >
                        {respondent.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="border border-black bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
            Daily email
          </p>
          <h2 className="mt-3 text-2xl font-black uppercase leading-tight">
            Survey notification settings
          </h2>
          <p className="mt-3 text-sm leading-6 text-black/65">
            Automatic workday email with a secure survey link for each
            respondent. Sending is represented as a demo setting here; production
            requires an email provider and tokenized links.
          </p>

          <dl className="mt-5 grid gap-3 text-sm">
            <SettingRow
              label="Status"
              value={respondentEmailSchedule.enabled ? "enabled" : "disabled"}
            />
            <SettingRow label="Workdays" value="Monday-Friday" />
            <SettingRow
              label="Send time"
              value={`${respondentEmailSchedule.sendTime} ${respondentEmailSchedule.timezone}`}
            />
            <SettingRow label="Sender" value={respondentEmailSchedule.sender} />
            <SettingRow
              label="Survey link"
              value={respondentEmailSchedule.surveyUrl}
            />
          </dl>

          <div className="mt-5 border border-black bg-uga-mist p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-black/45">
              Email template
            </p>
            <p className="mt-2 text-sm font-semibold leading-6">
              Please submit today&apos;s CPT UA Black Sea price indicatives for
              UGA Index. Open your daily survey form using the personal link in
              this email.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-black/10 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-black/45">
        {label}
      </dt>
      <dd className="mt-1 font-semibold leading-5">{value}</dd>
    </div>
  );
}
