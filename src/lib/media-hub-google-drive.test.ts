import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { classifyGoogleDriveMaterialKind } from "./media-hub-google-drive";
import { classifySsiWeeklyLogisticsTypeFromFilename } from "./ssi-weekly-logistics-control";

describe("Google Drive Context material classification", () => {
  it("routes monthly report filenames to the monthly report window", () => {
    expect(classifyGoogleDriveMaterialKind("SSI monthly report September 2026.pdf"))
      .toBe("monthly_material");
    expect(classifyGoogleDriveMaterialKind("Звіт за місяць 09.2026.xlsx"))
      .toBe("monthly_material");
  });

  it("defaults unmarked files to weekly materials", () => {
    expect(classifyGoogleDriveMaterialKind("agro_ex_im 2026-09-28.xlsx"))
      .toBe("weekly_material");
  });

  it("recognizes the checkpoint filename abbreviation used by the shared folder", () => {
    expect(classifySsiWeeklyLogisticsTypeFromFilename("chk_points daily v2 (46).xlsx")).toBe("checkpoints");
  });

  it("recognizes the mixed-script initial in the folder's railway statistics filenames", () => {
    expect(classifySsiWeeklyLogisticsTypeFromFilename("27 08 2026 Cтатистичні дані щодо перевезення зернових вантажів.pdf")).toBe("uz_statistics");
  });
});
