import { expect, it } from "vitest";
import { GOOGLE_DRIVE_MATERIAL_MAX_BYTES, mediaHubMaterialByteLimit } from "./media-hub-material-size";

it("aligns the trusted Drive download and file-ingestion limits without widening other sources", () => {
  const bytes = 21 * 1024 * 1024;
  expect(mediaHubMaterialByteLimit(undefined, "google-drive")).toBe(GOOGLE_DRIVE_MATERIAL_MAX_BYTES);
  expect(bytes).toBeLessThan(mediaHubMaterialByteLimit(undefined, "google-drive"));
  for (const source of [undefined, "admin", "telegram", "scheduler"]) {
    expect(mediaHubMaterialByteLimit(undefined, source)).toBe(20 * 1024 * 1024);
    expect(bytes).toBeGreaterThan(mediaHubMaterialByteLimit(undefined, source));
  }
  expect(mediaHubMaterialByteLimit("5", "admin")).toBe(5 * 1024 * 1024);
  expect(mediaHubMaterialByteLimit("1000", "admin")).toBe(GOOGLE_DRIVE_MATERIAL_MAX_BYTES);
  expect(mediaHubMaterialByteLimit("-1", "admin")).toBe(1024 * 1024);
});
