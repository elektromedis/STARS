/**
 * Kartu Inventaris Ruangan (KIR) — format Permendagri No. 47 Tahun 2021 tentang Tata Cara Pelaksanaan
 * Pembukuan, Inventarisasi, dan Pelaporan Barang Milik Daerah (kolom KIR), dengan kop surat Pemerintah Provinsi
 * DKI Jakarta. Nomor dokumen: KIR-<idRuangan>-<tahun>. Disahkan 4 TTE berurutan:
 * Kepala Ruangan/PJ Unit → PJ Alat Kesehatan → Pengurus Barang → Direktur. Sidik SHA-256 dihitung dari daftar
 * barang di ruangan, sehingga /verifikasi mendeteksi bila isi ruangan berubah setelah ditandatangani.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { prisma } from "./prisma";
import { gambarQr, ALAMAT_RS } from "./label-qr";

export const URUTAN_KIR = ["KepalaRuangan", "PjAlkes", "PengurusBarang", "Direktur"] as const;
export type PeranKir = (typeof URUTAN_KIR)[number];
export const JUDUL_KIR: Record<PeranKir, string> = { KepalaRuangan: "Kepala Ruangan / PJ Unit", PjAlkes: "PJ Alat Kesehatan", PengurusBarang: "Pengurus Barang", Direktur: "Direktur RSUD Cipayung" };

export const nomorKir = (ruanganId: number, tahun: number) => `KIR-${ruanganId}-${tahun}`;
export function uraiNomorKir(nomor: string) {
  const m = /^KIR-(\d+)-(\d{4})$/.exec(nomor);
  return m ? { ruanganId: Number(m[1]), tahun: Number(m[2]) } : null;
}

export async function dataKir(ruanganId: number) {
  return prisma.ruangan.findUnique({
    where: { id: ruanganId },
    select: {
      id: true, nama: true, gedung: true, kepala: true, unitKerja: { select: { id: true, nama: true } },
      alat: {
        where: { aktif: true }, orderBy: [{ nama: "asc" }, { kode: "asc" }],
        select: { id: true, kode: true, nama: true, merek: true, model: true, nomorSeri: true, tahunProduksi: true, tahunPembelian: true, tahunPerolehan: true, noUrutAset: true, kodeAspak: true, hargaPerolehan: true, kondisi: true, catatan: true, pendanaan: true },
      },
    },
  });
}

export async function isiKanonikKir(nomor: string): Promise<string | null> {
  const u = uraiNomorKir(nomor);
  const r = u ? await dataKir(u.ruanganId) : null;
  if (!r) return null;
  return [nomor, r.nama, r.unitKerja.nama, ...r.alat.map((a) => [a.id, a.kode, a.nama, a.merek ?? "", a.nomorSeri ?? "", a.kondisi, a.hargaPerolehan ?? ""].join("|"))].join("␞");
}

export const keadaan = (k: string) => (k === "Baik" ? "B" : k === "Rusak Ringan" ? "KB" : "RB");

let logo: { jaya: string | null; rsud: string | null } | null = null;
async function muatLogo() {
  if (logo) return logo;
  const baca = async (f: string) => { try { return `data:image/png;base64,${(await readFile(join(process.cwd(), "public", "label", f))).toString("base64")}`; } catch { return null; } };
  logo = { jaya: await baca("logo-jayaraya.png"), rsud: await baca("logo-rsud.png") };
  return logo;
}

export type TteKir = { peran: string; nama: string; identitas: string | null; waktu: Date; url: string };

/** PDF A4 lanskap: kop Pemprov DKI Jakarta, identitas ruangan, tabel KIR, 4 kotak pengesahan (TTE ber-QR). */
export async function pdfKir(r: NonNullable<Awaited<ReturnType<typeof dataKir>>>, o: { tahun: number; tte: TteKir[] }) {
  const lg = await muatLogo();
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const W = 297, M = 12;
  const kop = () => {
    if (lg.jaya) doc.addImage(lg.jaya, "PNG", M + 2, 8, 20, 24);
    else { doc.setDrawColor(180).setLineDashPattern([1, 1], 0).rect(M + 2, 8, 20, 24).setLineDashPattern([], 0); doc.setFontSize(5.5).setTextColor(150).text(["Logo", "Jaya Raya"], M + 12, 19, { align: "center" }).setTextColor(0); }
    if (lg.rsud) doc.addImage(lg.rsud, "PNG", W - M - 30, 11, 30, 18.2);
    doc.setFont("times", "bold").setFontSize(14).text("PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA", W / 2, 13, { align: "center" });
    doc.setFontSize(13).text("DINAS KESEHATAN", W / 2, 19, { align: "center" });
    doc.setFontSize(15).text("RUMAH SAKIT UMUM DAERAH CIPAYUNG", W / 2, 25.5, { align: "center" });
    doc.setFont("times", "normal").setFontSize(9).text(ALAMAT_RS, W / 2, 30.5, { align: "center" });
    doc.setLineWidth(0.9).line(M, 34, W - M, 34).setLineWidth(0.3).line(M, 35.2, W - M, 35.2);
  };
  kop();
  doc.setFont("times", "bold").setFontSize(13).text("KARTU INVENTARIS RUANGAN (KIR)", W / 2, 42, { align: "center" });
  doc.setFont("times", "normal").setFontSize(9.5);
  const id: [string, string][] = [["PROVINSI", "DKI JAKARTA"], ["KABUPATEN/KOTA", "KOTA ADMINISTRASI JAKARTA TIMUR"], ["UNIT", "DINAS KESEHATAN"], ["SATUAN KERJA", "RSUD CIPAYUNG"]];
  const id2: [string, string][] = [["UNIT KERJA", r.unitKerja.nama.toUpperCase()], ["RUANGAN", r.nama.toUpperCase() + (r.gedung ? ` (${r.gedung})` : "")], ["TAHUN", String(o.tahun)], ["NO. KIR", nomorKir(r.id, o.tahun)]];
  id.forEach(([k, v], i) => { doc.text(k, M, 49 + i * 4.6); doc.text(`: ${v}`, M + 32, 49 + i * 4.6); });
  id2.forEach(([k, v], i) => { doc.text(k, 160, 49 + i * 4.6); doc.text(`: ${v}`, 185, 49 + i * 4.6); });

  const rp = (n: number | null) => (n == null ? "" : n.toLocaleString("id-ID"));
  autoTable(doc, {
    startY: 68, margin: { left: M, right: M, top: 14, bottom: 14 }, theme: "grid",
    styles: { font: "helvetica", fontSize: 7, cellPadding: 1, lineColor: 60, lineWidth: 0.15, textColor: 20, valign: "middle" },
    headStyles: { fillColor: [235, 238, 243], textColor: 10, fontStyle: "bold", halign: "center" },
    head: [["No.\nUrut", "Nama Barang /\nJenis Barang", "Merk /\nModel", "No. Seri\nPabrik", "Ukuran", "Bahan", "Tahun\nPembuatan /\nPembelian", "No. Kode\nBarang", "Jumlah\nBarang /\nRegister", "Harga Beli /\nPerolehan\n(Rp)", "Keadaan\nBarang\n(B/KB/RB)", "Keterangan\nMutasi dll"],
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]],
    body: r.alat.map((a, i) => [String(i + 1), a.nama, [a.merek, a.model].filter(Boolean).join(" / "), a.nomorSeri ?? "", "", "", String(a.tahunPembelian ?? a.tahunPerolehan ?? a.tahunProduksi ?? ""), a.noUrutAset ?? a.kode, "1", rp(a.hargaPerolehan), keadaan(a.kondisi), [a.pendanaan, a.kondisi === "Afkir" ? "Afkir" : ""].filter(Boolean).join("; ")]),
    foot: [["", `Jumlah: ${r.alat.length} barang`, "", "", "", "", "", "", String(r.alat.length), rp(r.alat.reduce((s, a) => s + (a.hargaPerolehan ?? 0), 0)), "", ""]],
    footStyles: { fillColor: [245, 246, 248], textColor: 10, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 9, halign: "center" }, 1: { cellWidth: 46 }, 2: { cellWidth: 30 }, 3: { cellWidth: 26 }, 4: { cellWidth: 13 }, 5: { cellWidth: 13 }, 6: { cellWidth: 18, halign: "center" }, 7: { cellWidth: 26 }, 8: { cellWidth: 15, halign: "center" }, 9: { cellWidth: 24, halign: "right" }, 10: { cellWidth: 17, halign: "center" }, 11: { cellWidth: "auto" } },
  });
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  if (y > 210 - 62) { doc.addPage(); y = 16; }
  doc.setFont("helvetica", "normal").setFontSize(7).text("Keadaan barang: B = Baik, KB = Kurang Baik (rusak ringan), RB = Rusak Berat.  Dicetak dari STARS; pindai QR pada kotak pengesahan untuk memverifikasi tanda tangan elektronik.", M, y);
  const kol = [...URUTAN_KIR].reverse(); // kiri→kanan: Direktur (mengetahui) … Kepala Ruangan
  const lebar = (W - 2 * M) / 4;
  kol.forEach((peran, i) => {
    const x = M + i * lebar, yy = y + 3, t = o.tte.find((z) => z.peran === peran);
    doc.setFont("times", "normal").setFontSize(9.5).text(peran === "Direktur" ? "Mengetahui," : peran === "KepalaRuangan" ? `Jakarta, ${(t?.waktu ?? new Date()).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" })}` : "", x + lebar / 2, yy + 3, { align: "center" });
    doc.setFont("times", "bold").text(JUDUL_KIR[peran], x + lebar / 2, yy + 8, { align: "center" });
    if (t) {
      gambarQr(doc, t.url, x + lebar / 2 - 10, yy + 11, 20);
      doc.setFont("helvetica", "normal").setFontSize(5.5).text("DITANDATANGANI SECARA ELEKTRONIK", x + lebar / 2, yy + 34, { align: "center" });
    }
    doc.setFont("times", "bold").setFontSize(9.5).text(t ? t.nama : "(.......................................)", x + lebar / 2, yy + 41, { align: "center" });
    doc.setFont("times", "normal").setFontSize(8.5).text(t?.identitas?.startsWith("NIP") ? t.identitas : "NIP. ", x + lebar / 2, yy + 45.5, { align: "center" });
  });
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(120).text(`${nomorKir(r.id, o.tahun)} · Halaman ${i}/${n}`, W - M, 205, { align: "right" }).setTextColor(0); }
  return Buffer.from(doc.output("arraybuffer"));
}
