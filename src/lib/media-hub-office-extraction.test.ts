import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { extractBoundedOfficeFile } from "./media-hub-office-extraction";

const workbook = () => Buffer.from(zipSync({
  "xl/workbook.xml": strToU8('<workbook><sheets><sheet name="Об&apos;єми" sheetId="3" r:id="rId7"/></sheets></workbook>'),
  "xl/_rels/workbook.xml.rels": strToU8('<Relationships><Relationship Id="rId7" Target="worksheets/sheet3.xml"/></Relationships>'),
  "xl/sharedStrings.xml": strToU8('<sst><si><t>Культура</t></si><si><r><t>Куку</t></r><r><t>рудза</t></r></si></sst>'),
  "xl/worksheets/sheet3.xml": strToU8('<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="inlineStr"><is><t>USD/t</t></is></c></row><row r="2"><c r="A2" t="s"><v>1</v></c><c r="C2"><v>210.5</v></c><c r="D2"><f>SUM(A1:A2)</f></c><c r="E2" t="s"></c></row></sheetData></worksheet>'),
}));

describe("bounded Office material extraction", () => {
  it("retains sheet names, sparse columns, shared strings and exact cached prices", () => {
    const result = extractBoundedOfficeFile(workbook(), "agro_ex_im.xlsx");
    expect(result?.tables[0]).toMatchObject({ sheetName: "Об'єми", header: ["Культура", "", "USD/t"], rows: [["Кукурудза", "", "210.5", "", ""]] });
    expect(result?.warnings).toContain("formula_has_no_cached_value");
    expect(result?.warnings).toContain("missing_shared_string");
    expect(result?.text).toContain("210.5");
    expect(result?.text).not.toContain("SUM(");
  });
  it("extracts DOCX paragraphs and tables without retaining tracked deletions", () => {
    const bytes = Buffer.from(zipSync({ "word/document.xml": strToU8('<w:document><w:body><w:p><w:r><w:t>Зерно &amp; логістика</w:t></w:r></w:p><w:del><w:r><w:delText>OLD PRICE</w:delText></w:r></w:del><w:tbl><w:tr><w:tc><w:p><w:r><w:t>210 USD/t</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>') }));
    const result = extractBoundedOfficeFile(bytes, "weekly.docx");
    expect(result?.text).toContain("Зерно & логістика");
    expect(result?.text).toContain("210 USD/t");
    expect(result?.text).not.toContain("OLD PRICE");
  });
  it("fails to operator review for corrupt archives, unsupported files or oversized XML parts", () => {
    expect(extractBoundedOfficeFile(Buffer.from("not a ZIP"), "weekly.docx")).toBeNull();
    expect(extractBoundedOfficeFile(workbook(), "legacy.xls")).toBeNull();
    const large = Buffer.from(zipSync({ "word/document.xml": strToU8(" ".repeat(8 * 1024 * 1024 + 1)) }));
    expect(extractBoundedOfficeFile(large, "large.docx")).toBeNull();
  });
});
