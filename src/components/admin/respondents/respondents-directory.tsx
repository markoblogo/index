"use client";

import { AddRespondentPanel } from "@/components/admin/respondents/respondent-add-panel";
import { RespondentRow } from "@/components/admin/respondents/respondent-row";
import type { RespondentDirectoryProps } from "@/components/admin/respondents/respondents-directory-types";

export function RespondentsDirectory({
  respondents,
  actions,
}: RespondentDirectoryProps) {
  return (
    <div className="grid gap-4">
      <AddRespondentPanel addRespondentAction={actions.addRespondentAction} />
      <section className="border border-black bg-white">
        <div className="hidden border-b border-black bg-uga-dark px-4 py-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/70 lg:grid lg:grid-cols-[minmax(22rem,1.35fr)_minmax(16rem,0.85fr)_minmax(20rem,1fr)_auto]">
          <span>Company</span>
          <span>Primary contact</span>
          <span>Login</span>
          <span className="text-right">Status / action</span>
        </div>
        {respondents.map((respondent) => (
          <RespondentRow
            actions={actions}
            key={respondent.id}
            respondent={respondent}
          />
        ))}
      </section>
    </div>
  );
}
