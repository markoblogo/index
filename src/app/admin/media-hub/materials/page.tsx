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
          Media Hub inputs
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Manual weekly/monthly materials
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-white/68">
          Backup intake for Telegram: paste a URL or upload PDF/XLSX/CSV/TXT.
          Materials are stored as extracted facts and summaries, not public files.
        </p>
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
                <span>{material.kind}</span>
                <span>{material.sourceType}</span>
                <span>{material.sourceRegistrationStatus}</span>
              </div>
              <h3 className="mt-2 text-base font-semibold text-white">
                {material.originalFilename || material.sourceDomain || material.originalUrl || material.id}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/62">
                {material.summary || "No extracted summary yet."}
              </p>
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
