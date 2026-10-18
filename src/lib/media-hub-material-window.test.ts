import { describe, expect, it } from "vitest";
import { materialFilenameDate, selectReportWindowMaterials } from "./media-hub-material-window";

describe("Drive reporting window", () => {
  it("reads only explicit source dates and validates calendar values", () => {
    expect(materialFilenameDate("agro_ex_im_26_09_06.xlsx")).toBe("2026-09-06");
    expect(materialFilenameDate("15 10 2026_Cтатистичні дані.pdf")).toBe("2026-10-15");
    expect(materialFilenameDate("check points 30.08.26.xlsx")).toBe("2026-08-30");
    expect(materialFilenameDate("report_2026-10-15.pdf")).toBe("2026-10-15");
    expect(materialFilenameDate("check points_26_02_31.xlsx")).toBeUndefined();
    expect(materialFilenameDate("out_260930_F.xlsx")).toBeUndefined();
  });
  it("does not let recently copied archive files crowd current-week evidence out", () => {
    const row = (originalFilename: string) => ({ originalFilename, receivedFrom: "google-drive", canonicalUrl: "https://drive.google.com/file/x?driveVersion=2026-10-16T00%3A00%3A00Z", reportingDate: new Date("2026-10-18") });
    const archive = Array.from({ length: 40 }, () => row("agro_ex_im_26_09_06.xlsx"));
    const current = row("15 10 2026_Cтатистичні дані.pdf");
    expect(selectReportWindowMaterials([...archive, current], "2026-10-11", "2026-10-17")).toEqual([current]);
  });
  it("preserves non-Drive period eligibility and ranks current source dates", () => {
    const base = { receivedFrom: "google-drive", canonicalUrl: null, reportingDate: new Date("2026-10-15") };
    const older = { ...base, originalFilename: "agro_ex_im_26_10_12.xlsx" };
    const newer = { ...base, originalFilename: "agro_ex_im_26_10_15.xlsx" };
    const manual = { ...base, receivedFrom: "telegram", originalFilename: null };
    expect(selectReportWindowMaterials([older, newer, manual], "2026-10-11", "2026-10-17")).toEqual([newer, manual, older]);
  });
});
