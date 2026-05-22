import { EmbedCodeCopy } from "@/components/admin/embed-code-copy";
import { requireDemoRole } from "@/lib/demo-auth";
import { getActiveIndexConfig } from "@/lib/index-platform";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminEmbedPage() {
  await requireDemoRole("admin");
  const activeIndex = getActiveIndexConfig();
  const siteUrl = normalizeSiteUrl(activeIndex.publicSiteUrl);
  const embedId = `${activeIndex.id}-index-embed`;
  const embedTheme = activeIndex.id === "spike-ua" ? "dark" : "light";
  const iframeCode = `<iframe
  src="${siteUrl}/embed/site?locale=uk&theme=${embedTheme}&view=index"
  title="${activeIndex.name}"
  loading="lazy"
  allowfullscreen
  style="width:100%;height:820px;border:0;display:block;"
></iframe>`;
  const jsCode = `<div id="${embedId}"></div>
<script
  src="${siteUrl}/embed/uga-index.js"
  data-target="#${embedId}"
  data-locale="uk"
  data-theme="${embedTheme}"
  data-layout="site"
></script>`;

  return (
    <section className="grid gap-6">
      <div className="border border-black bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
          Website embed
        </p>
        <h1 className="mt-3 text-3xl font-black uppercase leading-tight">
          Embed {activeIndex.name}
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-black/65">
          Use this full-site iframe when {activeIndex.legalName.en} creates a section on its website.
          The embedded area has no footer, keeps a hidden hover header, syncs
          language through the URL, supports light/dark theme switching,
          fullscreen mode, internal pages, and opening the standalone index site.
        </p>
      </div>

      <div className="border border-black bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-black/45">
              Preview
            </p>
            <h2 className="mt-1 text-xl font-black uppercase">
              Embedded site block
            </h2>
          </div>
          <a
            className="border border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-black transition hover:bg-uga-lime"
            href={`${siteUrl}/embed/site?locale=uk&theme=${embedTheme}&view=index`}
            rel="noopener noreferrer"
            target="_blank"
          >
            Open embed route
          </a>
        </div>
        <div className="overflow-hidden border border-black">
          <iframe
            allowFullScreen
            className="block h-[640px] w-full border-0"
            loading="lazy"
            src={`${siteUrl}/embed/site?locale=uk&theme=${embedTheme}&view=index`}
            title={`${activeIndex.name} embed preview`}
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <CodePanel
          code={iframeCode}
          description="Recommended for WordPress or CMS Custom HTML blocks."
          title="Iframe embed code"
        />
        <CodePanel
          code={jsCode}
          description="Optional loader. It reads data attributes and injects the iframe."
          title="JavaScript loader code"
        />
      </div>
    </section>
  );
}

function CodePanel({
  code,
  description,
  title,
}: {
  code: string;
  description: string;
  title: string;
}) {
  return (
    <section className="border border-black bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-uga-green">
            Integration
          </p>
          <h2 className="mt-1 text-xl font-black uppercase">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-black/60">{description}</p>
        </div>
        <EmbedCodeCopy code={code} />
      </div>
      <pre className="mt-4 overflow-x-auto border border-black bg-uga-dark p-4 text-xs leading-5 text-white">
        <code>{code}</code>
      </pre>
    </section>
  );
}

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/, "");
}
