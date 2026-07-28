import { describe, expect, it } from "vitest";
import {
  buildContextPatternProfileFixtures,
  CONTEXT_PATTERN_PROFILES,
  findPatternProfilesForSourceFamily,
  runContextPatternLearningForHtml,
} from "./context-pattern-learning";

describe("Context pattern learning", () => {
  it("keeps AutoScraper-like profiles bounded to allowlisted source families", () => {
    const fixtures = buildContextPatternProfileFixtures();

    expect(fixtures).toEqual([
      expect.objectContaining({
        id: "zaner-netags-commodity-table",
        sourceFamilyId: "zaner_netags_grain_oilseed",
        status: "candidate",
      }),
    ]);
    expect(findPatternProfilesForSourceFamily("unknown")).toEqual([]);
  });

  it("extracts stable commodity table rows from a learned profile", () => {
    const profile = CONTEXT_PATTERN_PROFILES[0];
    const result = runContextPatternLearningForHtml({
      html: `
        <table>
          <tr><th>Commodity</th><th>Move</th><th>Signal</th></tr>
          <tr><td>Corn</td><td>+2</td><td>Export demand improved</td></tr>
          <tr><td>Soybeans</td><td>-1</td><td>Oilseed pressure</td></tr>
        </table>
      `,
      profile,
    });

    expect(result.status).toBe("ok");
    expect(result.matchedSignals).toEqual(["corn", "soybeans"]);
    expect(result.rows[0]).toMatchObject({
      Commodity: "Corn",
      Move: "+2",
    });
  });
});
