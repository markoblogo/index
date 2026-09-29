import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { classifyGoogleDriveMaterialKind } from "./media-hub-google-drive";

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
});
