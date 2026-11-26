import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";

type Baris = Record<string, unknown>;
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const judulKolom = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Dokumen Word (.docx) berisi judul, subjudul, dan tabel — dibuat langsung dari OOXML (lanskap A4). */
export async function keDocx(judul: string, sub: string, baris: Baris[]): Promise<Buffer> {
  const kunci = Object.keys(baris[0] ?? { info: "" });
  const sel = (t: unknown, tebal = false) => `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/>${tebal ? '<w:shd w:val="clear" w:color="auto" w:fill="0F766E"/>' : ""}</w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr>${tebal ? '<w:b/><w:color w:val="FFFFFF"/>' : ""}<w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p></w:tc>`;
  const tepi = ["top", "left", "bottom", "right", "insideH", "insideV"].map((s) => `<w:${s} w:val="single" w:sz="4" w:color="BFC7D1"/>`).join("");
  const tabel = `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${tepi}</w:tblBorders></w:tblPr>`
    + `<w:tr><w:trPr><w:tblHeader/></w:trPr>${kunci.map((k) => sel(judulKolom(k), true)).join("")}</w:tr>`
    + (baris.length ? baris.map((b) => `<w:tr>${kunci.map((k) => sel(b[k])).join("")}</w:tr>`).join("") : `<w:tr>${sel("Tidak ada data")}</w:tr>`)
    + `</w:tbl>`;
  const body = `<w:p><w:pPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="0B2545"/></w:rPr><w:t>${esc(judul)}</w:t></w:r></w:p>`
    + `<w:p><w:r><w:rPr><w:sz w:val="20"/><w:color w:val="555555"/></w:rPr><w:t xml:space="preserve">${esc(sub)}</w:t></w:r></w:p>${tabel}`
    + `<w:p/><w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`;
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

/** Presentasi PowerPoint (.pptx) yang bisa diedit: sampul + tabel 12 baris per slide. */
export async function kePptx(judul: string, sub: string, baris: Baris[]): Promise<Buffer> {
  const p = new PptxGenJS();
  p.layout = "LAYOUT_WIDE";
  p.title = judul;
  const s0 = p.addSlide();
  s0.background = { color: "0B2545" };
  s0.addText(judul, { x: 0.7, y: 2.4, w: 12, h: 1.2, fontSize: 36, bold: true, color: "FFFFFF" });
  s0.addText(`${sub} · ${baris.length} baris · STARS RSUD Cipayung`, { x: 0.7, y: 3.6, w: 12, h: 0.6, fontSize: 16, color: "9FE7DF" });
  const kunci = Object.keys(baris[0] ?? { info: "" }).slice(0, 9);
  const per = 12;
  for (let i = 0; i < Math.max(1, baris.length); i += per) {
    const s = p.addSlide();
    s.addText(`${judul} (${i + 1}–${Math.min(baris.length, i + per)} dari ${baris.length})`, { x: 0.4, y: 0.2, w: 12.5, h: 0.5, fontSize: 16, bold: true, color: "0B2545" });
    const kepala = kunci.map((k) => ({ text: judulKolom(k), options: { bold: true, color: "FFFFFF", fill: { color: "0F766E" } } }));
    const isi = baris.slice(i, i + per).map((b) => kunci.map((k) => ({ text: String(b[k] ?? "").slice(0, 120) })));
    s.addTable([kepala, ...(isi.length ? isi : [[{ text: "Tidak ada data" }]])], { x: 0.4, y: 0.8, w: 12.5, fontSize: 9, border: { type: "solid", pt: 0.5, color: "BFC7D1" }, autoPage: false });
  }
  return (await p.write({ outputType: "nodebuffer" })) as Buffer;
}
