import { revalidatePath } from "next/cache";
import { requireDemoRole } from "@/lib/demo-auth";
import {
  ingestMediaHubFileMaterial,
  ingestMediaHubLinkMaterial,
  listRecentMediaHubManualMaterials,
  type MediaHubManualMaterialKind,
  type MediaHubManualMaterialTenant,
} from "@/lib/media-hub-manual-materials";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMediaHubMaterialsPage() {
  await requireDemoRole("admin");
  const materials = await listRecentMediaHubManualMaterials();

  async function ingestAction(formData: FormData) {
    "use server";
    await requireDemoRole("admin");
    const tenantId = normalizeTenant(String(formData.get("tenantId") ?? ""));
    const kind = normalizeKind(String(formData.get("kind") ?? ""));
    const url = String(formData.get("url") ?? "").trim();
    const file = formData.get("file");

    if (url) {
      await ingestMediaHubLinkMaterial({
        kind,
        receivedFrom: "admin",
        sourceType: "admin_link",
        tenantId,
        url,
      });
    }
    if (file instanceof File && file.size > 0) {
      await ingestMediaHubFileMaterial({
        bytes: Buffer.from(await file.arrayBuffer()),
        filename: file.name,
        kind,
        mimeType: file.type || "application/octet-stream",
        receivedFrom: "admin",
        sourceType: "admin_upload",
        tenantId,
      });
    }
    revalidatePath("/admin/media-hub/materials");
  }

  return (
    <section className="grid gap-6">
      <header className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
          Context inputs
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Manual materials for Context reports
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-white/68">
          Use this page when Telegram upload is inconvenient or when you need
          to submit a link/file directly from the admin panel. Project selects
          SSI or 1D3X, report type selects daily/weekly/monthly, link stores a
          URL to an article/report/PDF, and file accepts PDF, XLSX, CSV, DOCX,
          TXT/HTML/MD. Notes can be included in the uploaded document or link
          context for the analyst/AI.
        </p>
        <div className="mt-5 grid gap-3 text-sm leading-6 text-white/70 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="font-bold text-white">Tag guide</p>
            <p className="mt-2">#ssi · Spike Spot Index</p>
            <p>#1d3x · 1D3X</p>
            <p>#weekly · weekly report</p>
            <p>#monthly · monthly report</p>
            <p>#daily · daily report</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="font-bold text-white">Telegram examples</p>
            <p className="mt-2">#ssi #weekly logistics PDF</p>
            <p>#1d3x #weekly global grains link</p>
            <p>#ssi #monthly XLSX export statistics</p>
            <p>#ssi #1d3x #weekly shared source</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="font-bold text-white">Default rule</p>
            <p className="mt-2">
              If report type is not specified in Telegram, material is routed
              to weekly by default. PDFs and images now create file assets:
              original, extracted text, preview pages and visual-summary slots.
            </p>
          </div>
        </div>
      </header>

      <form
        action={ingestAction}
        className="grid gap-4 rounded-[1.5rem] border border-white/12 bg-[#050505] p-5"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm text-white/72">
            Tenant
            <select className="rounded-xl border border-white/12 bg-black px-3 py-2 text-white" name="tenantId">
              <option value="spike-ua">SSI / Spike Spot Index</option>
              <option value="1d3x">1D3X</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-white/72">
            Intended use
            <select className="rounded-xl border border-white/12 bg-black px-3 py-2 text-white" name="kind">
              <option value="weekly_material">Weekly material</option>
              <option value="monthly_material">Monthly material</option>
              <option value="daily_material">Daily material</option>
              <option value="source_candidate">Source candidate</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-white/72">
            Upload file
            <input className="rounded-xl border border-white/12 bg-black px-3 py-2 text-white" name="file" type="file" />
          </label>
        </div>
        <label className="grid gap-2 text-sm text-white/72">
          URL
          <input
            className="rounded-xl border border-white/12 bg-black px-3 py-2 text-white"
            name="url"
            placeholder="https://..."
            type="url"
          />
        </label>
        <button className="w-fit rounded-full bg-uga-green px-5 py-2 text-sm font-bold uppercase tracking-[0.12em] text-black">
          Ingest material
        </button>
      </form>

      <section className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5">
        <h2 className="text-xl font-semibold text-white">Recent materials</h2>
        <div className="mt-4 grid gap-3">
          {materials.map((material) => (
            <article
              className="rounded-[1rem] border border-white/10 bg-black/30 p-4"
              key={material.id}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/42">
                <span>{material.tenantId}</span>
                <span>{material.kind}</span>
                <span>{material.sourceType}</span>
                <span>{material.extractionStatus}</span>
                <span>{material.sourceRegistrationStatus}</span>
              </div>
              <h3 className="mt-2 text-base font-semibold text-white">
                {material.originalFilename || material.sourceDomain || material.originalUrl || material.id}
              </h3>
              <dl className="mt-3 grid gap-2 text-xs text-white/48 md:grid-cols-3">
                <div>
                  <dt className="font-bold uppercase tracking-[0.12em]">Received</dt>
                  <dd>{formatMaterialDate(material.receivedAt)}</dd>
                </div>
                <div>
                  <dt className="font-bold uppercase tracking-[0.12em]">Used in report</dt>
                  <dd>{material.usedInReportId || "not yet"}</dd>
                </div>
                <div>
                  <dt className="font-bold uppercase tracking-[0.12em]">Domain/file</dt>
                  <dd>{material.sourceDomain || material.originalFilename || "n/a"}</dd>
                </div>
              </dl>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/62">
                {material.summary || "No extracted summary yet."}
              </p>
              {material.assets.length > 0 ? (
                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {material.assets.slice(0, 6).map((asset) => (
                    <div
                      className="rounded-xl border border-white/10 bg-white/[0.025] p-3 text-xs text-white/56"
                      key={asset.id}
                    >
                      <div className="flex items-center justify-between gap-2 font-bold uppercase tracking-[0.12em] text-white/70">
                        <span>{asset.assetType.replace("_", " ")}</span>
                        <span>{asset.pageNumber ? `p.${asset.pageNumber}` : ""}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 leading-5">
                        {asset.visualSummary || asset.extractedText || asset.storagePath || "Asset captured."}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-[0.12em] text-white/38">
                        {asset.mimeType ? <span>{asset.mimeType}</span> : null}
                        {asset.byteSize ? <span>{formatBytes(asset.byteSize)}</span> : null}
                        {typeof asset.confidence === "number" ? <span>{Math.round(asset.confidence * 100)}%</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function normalizeTenant(value: string): MediaHubManualMaterialTenant {
  return value === "1d3x" ? "1d3x" : "spike-ua";
}

function normalizeKind(value: string): MediaHubManualMaterialKind {
  if (value === "daily_material" || value === "monthly_material" || value === "source_candidate") {
    return value;
  }
  return "weekly_material";
}

function formatMaterialDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "n/a";
  }
  return date.toISOString().slice(0, 16).replace("T", " ");
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${value} B`;
}
