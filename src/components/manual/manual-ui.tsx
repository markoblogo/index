import Link from "next/link";
import type { ManualHelpBlock, ManualSection } from "@/lib/ssi-manual-content";

export function ManualPageShell({
  admin = false,
  eyebrow,
  intro,
  sections,
  title,
}: {
  admin?: boolean;
  eyebrow: string;
  intro: string;
  sections: ManualSection[];
  title: string;
}) {
  return (
    <div className={admin ? "grid gap-6" : "bg-[#050505] text-[#f8f8f2]"}>
      <section
        className={
          admin
            ? "rounded-[1.5rem] border border-white/12 bg-[#050505] p-6"
            : "border-b border-white/10 bg-[radial-gradient(circle_at_top_left,#243664_0%,#10192c_42%,#050505_100%)]"
        }
      >
        <div className={admin ? "" : "mx-auto max-w-[1900px] px-6 py-12 lg:px-10"}>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
            {eyebrow}
          </p>
          <h1 className="mt-3 max-w-5xl text-4xl font-black uppercase leading-none tracking-tight text-white lg:text-6xl">
            {title}
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-6 text-white/68 lg:text-base">
            {intro}
          </p>
        </div>
      </section>

      <section className={admin ? "grid gap-4" : "mx-auto grid max-w-[1900px] gap-4 px-6 py-8 lg:grid-cols-2 lg:px-10"}>
        {sections.map((section, index) => (
          <ManualSectionCard admin={admin} index={index + 1} key={section.title} section={section} />
        ))}
      </section>
    </div>
  );
}

export function ManualHelpCard({
  dark = false,
  help,
}: {
  dark?: boolean;
  help: ManualHelpBlock;
}) {
  return (
    <aside
      className={
        dark
          ? "rounded-[1.4rem] border border-white/10 bg-white/[0.035] p-4 text-white"
          : "border border-black bg-white p-4 text-black"
      }
    >
      <p
        className={
          dark
            ? "text-xs font-black uppercase tracking-[0.16em] text-uga-green"
            : "text-xs font-black uppercase tracking-[0.16em] text-uga-green"
        }
      >
        Manual
      </p>
      <h3 className="mt-2 text-lg font-black uppercase leading-tight">
        {help.title}
      </h3>
      <p className={dark ? "mt-2 text-sm leading-6 text-white/66" : "mt-2 text-sm leading-6 text-black/62"}>
        {help.body}
      </p>
      <ul className={dark ? "mt-3 grid gap-1.5 text-sm text-white/62" : "mt-3 grid gap-1.5 text-sm text-black/62"}>
        {help.bullets.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
      {help.href && help.cta ? (
        <Link
          className={
            dark
              ? "mt-4 inline-flex rounded-full border border-white/12 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-white/72 transition hover:border-uga-green hover:text-uga-green"
              : "mt-4 inline-flex rounded-full border border-black px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-black transition hover:bg-uga-lime"
          }
          href={help.href}
        >
          {help.cta}
        </Link>
      ) : null}
    </aside>
  );
}

function ManualSectionCard({
  admin,
  index,
  section,
}: {
  admin: boolean;
  index: number;
  section: ManualSection;
}) {
  const slug =
    section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    `section-${index}`;

  return (
    <article
      className={
        admin
          ? "rounded-[1.35rem] border border-white/12 bg-[#050505] p-5 text-white"
          : "rounded-[1.6rem] border border-white/10 bg-[#10192c] p-5"
      }
      id={slug}
    >
      <div className="flex items-start gap-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-uga-green text-sm font-black text-black">
          {index}
        </span>
        <div>
          <h2 className="text-2xl font-black uppercase leading-tight">
            {section.title}
          </h2>
          <p className={admin ? "mt-3 text-sm leading-6 text-white/68" : "mt-3 text-sm leading-6 text-white/70"}>
            {section.body}
          </p>
        </div>
      </div>
      <ul className={admin ? "mt-4 grid gap-2 text-sm text-white/68" : "mt-4 grid gap-2 text-sm text-white/72"}>
        {section.bullets.map((item) => (
          <li className="rounded-[0.9rem] border border-white/10 bg-black/20 px-3 py-2" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}
