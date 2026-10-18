import { afterEach, describe, expect, it, vi } from "vitest";
const { materials } = vi.hoisted(() => ({ materials: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {}, hasDatabaseUrl: () => true }));
vi.mock("./media-hub-manual-materials", () => ({ getManualMaterialsForPeriod: materials, getMediaHubManualMaterialPeriod: vi.fn() }));
import { classifySsiWeeklyLogisticsTypeFromFilename, getSsiWeeklyLogisticsGate } from "./ssi-weekly-logistics-control";

describe("real SSI Drive logistics package", () => {
  afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });
  const filenames = ["agro_ex_im_26_10_15.xlsx", "check points_26_10_15.xlsx", "15 10 2026 Середньодобова_передача_через ПП.pdf", "15 10 2026_Cтатистичні дані щодо перевезення зернових вантажів за жовтень.pdf"];
  it("recognizes the observed wagon-operation family without misclassifying customs tables", () => {
    expect(classifySsiWeeklyLogisticsTypeFromFilename(filenames[2])).toBe("operational_wagons");
    expect(classifySsiWeeklyLogisticsTypeFromFilename("15 10 2026 Черга зернові в напрямку пп по даті навант.pdf")).toBe("operational_wagons");
    expect(classifySsiWeeklyLogisticsTypeFromFilename("out_260930_F.xlsx")).toBeUndefined();
  });
  it("opens the existing four-type gate only for a readable complete package", async () => {
    vi.stubEnv("SSI_WEEKLY_LOGISTICS_TELEGRAM_CHAT_ID", "provider");
    const rows = filenames.map(originalFilename => ({ receivedFrom: "google-drive", originalFilename, hashtags: [], extractedText: "Статистика перевезення зернових вантажів, обсяг у тоннах та кількість вагонів. ".repeat(4), extractionStatus: "extracted" }));
    materials.mockResolvedValue(rows);
    expect(await getSsiWeeklyLogisticsGate("2026-10-17")).toMatchObject({ status: "ready", missingTypes: [] });
    materials.mockResolvedValue(rows.map((row, i) => i === 3 ? { ...row, extractedText: "", extractionStatus: "unsupported" } : row));
    expect(await getSsiWeeklyLogisticsGate("2026-10-17")).toMatchObject({ status: "blocked", missingTypes: ["uz_statistics"] });
  });
});
