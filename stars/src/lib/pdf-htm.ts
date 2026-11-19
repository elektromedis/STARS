/** PDF HTM: lembar uji terima (WHO 2025 §7.3) & berita acara penghapusan (WHO Decommissioning 2019). */
import { jsPDF } from "jspdf";
import { gambarQr, ALAMAT_RS } from "./label-qr";

type AlatPdf = { kode: string; nama: string; merek: string | null; model: string | null; nomorSeri: string | null; unit: string; ruangan: string | null; akl: string | null; emdnKode: string | null; gmdnKode: string | null; udi: string | null; distributor: string | null; tanggalInstalasi: Date | null };
const tgl = (d: Date | null) => (d ? d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" }) : "....................");

function kop(doc: jsPDF, logo: string | null, judul: string, sub: string) {
  if (logo) doc.addImage(logo, "PNG", 15, 10, 25, 15.2);
  doc.setFont("helvetica", "bold").setFontSize(12).text("RSUD CIPAYUNG — INSTALASI PEMELIHARAAN SARANA (ELEKTROMEDIS)", 112, 15, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(8).text(ALAMAT_RS, 112, 20, { align: "center" });
  doc.setLineWidth(0.6).line(15, 27, 195, 27);
  doc.setFont("helvetica", "bold").setFontSize(13).text(judul, 105, 36, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(9).text(sub, 105, 41, { align: "center" });
}
function identitas(doc: jsPDF, a: AlatPdf, y: number) {
  const b: [string, string][] = [["Nama alat", a.nama], ["Kode STARS", a.kode], ["Merek / model / SN", [a.merek, a.model, a.nomorSeri].filter(Boolean).join(" / ") || "—"], ["Unit / ruangan", [a.unit, a.ruangan].filter(Boolean).join(" / ")], ["Izin edar (AKL/AKD)", a.akl ?? "—"], ["EMDN / GMDN / UDI", [a.emdnKode, a.gmdnKode, a.udi].filter(Boolean).join(" / ") || "—"], ["Distributor", a.distributor ?? "—"]];
  doc.setFontSize(9.5);
  for (const [k, v] of b) { doc.setFont("helvetica", "bold").text(k, 18, y); doc.setFont("helvetica", "normal").text(`: ${v}`.slice(0, 95), 62, y); y += 5.5; }
  return y;
}
function kotakCek(doc: jsPDF, judul: string, butir: string[], y: number) {
  doc.setFont("helvetica", "bold").setFontSize(10).text(judul, 18, y); y += 5;
  doc.setFont("helvetica", "normal").setFontSize(9);
  for (const t of butir) { doc.rect(20, y - 3, 3.2, 3.2); doc.text(t, 26, y); doc.text("Ya / Tidak / N.A.", 160, y); y += 5.5; }
  return y + 2;
}

export function pdfUjiTerima(a: AlatPdf, logo: string | null, urlAlat: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  kop(doc, logo, "LEMBAR UJI TERIMA ALAT KESEHATAN", "Acceptance test log — WHO Development of medical devices policies (2025) §7.3");
  gambarQr(doc, urlAlat, 175, 30, 18);
  let y = identitas(doc, a, 50) + 3;
  y = kotakCek(doc, "A. Kelengkapan pesanan", ["Unit utama sesuai spesifikasi kontrak/SPK", "Aksesori & bahan habis pakai awal lengkap", "Buku manual operasi & servis (bahasa Indonesia/Inggris)", "Sertifikat kalibrasi/uji pabrik, garansi, izin edar"], y);
  y = kotakCek(doc, "B. Keamanan & fungsi", ["Tidak ada kerusakan fisik/mekanik", "Uji keselamatan listrik (arus bocor, resistansi pembumian) memenuhi", "Uji fungsi/kinerja sesuai spesifikasi pabrik", "Alarm & fitur keselamatan berfungsi"], y);
  y = kotakCek(doc, "C. Instalasi & administrasi", ["Instalasi selesai & sesuai persyaratan (daya, gas medik, ruang)", "Dicatat di inventaris STARS & label QR ditempel", "Pelatihan pengguna & teknisi elektromedis telah dilakukan", "Jadwal pemeliharaan preventif & kalibrasi ditetapkan"], y);
  doc.setFont("helvetica", "bold").setFontSize(10).text("Kesimpulan:", 18, y + 2); doc.setFont("helvetica", "normal").text("[  ] Diterima    [  ] Diterima bersyarat    [  ] Ditolak", 45, y + 2);
  doc.text(`Tanggal uji terima: ${tgl(a.tanggalInstalasi)}`, 18, y + 9);
  const ttd = ["Teknisi Elektromedis", "Kepala Ruangan / Pengguna", "Penyedia / Distributor"];
  ttd.forEach((t, i) => { const x = 18 + i * 60; doc.setFontSize(9).text(t, x + 27, y + 20, { align: "center" }); doc.text("(..................................)", x + 27, y + 42, { align: "center" }); });
  return Buffer.from(doc.output("arraybuffer"));
}

export function pdfPenghapusan(a: AlatPdf, h: { nomor: string; alasan: string; tujuan: string; keterangan: string | null; kategoriLimbah: string | null; dekontaminasi: boolean; dataDihapus: boolean; status: string; pengusul: string; createdAt: Date }, tte: { peran: string; nama: string; waktu: Date; url: string }[], logo: string | null) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  kop(doc, logo, "BERITA ACARA PENGHAPUSAN ALAT KESEHATAN", `Nomor ${h.nomor} · Status: ${h.status} · WHO Decommissioning medical devices`);
  let y = identitas(doc, a, 50) + 3;
  const b: [string, string][] = [["Alasan", h.alasan], ["Tujuan", h.tujuan], ["Kategori limbah", h.kategoriLimbah ?? "—"], ["Dekontaminasi", h.dekontaminasi ? "Sudah" : "Belum"], ["Data pasien dihapus", h.dataDihapus ? "Sudah (aman)" : "Belum"], ["Keterangan", h.keterangan ?? "—"], ["Diusulkan", `${h.pengusul}, ${tgl(h.createdAt)}`]];
  doc.setFontSize(9.5);
  for (const [k, v] of b) { doc.setFont("helvetica", "bold").text(k, 18, y); doc.setFont("helvetica", "normal").text(`: ${v}`.slice(0, 95), 62, y); y += 5.5; }
  y += 6;
  [["PjAlkes", "Diverifikasi PJ Alat Kesehatan"], ["Direktur", "Disetujui Direktur RSUD Cipayung"]].forEach(([p, j], i) => {
    const x = 25 + i * 90, t = tte.find((z) => z.peran === p);
    doc.setDrawColor(150).roundedRect(x, y, 70, 58, 2, 2); doc.setFont("helvetica", "bold").setFontSize(9).text(j, x + 35, y + 6, { align: "center" });
    if (t) { gambarQr(doc, t.url, x + 23, y + 9, 24); doc.setFontSize(6.5).setFont("helvetica", "normal").text("DITANDATANGANI SECARA ELEKTRONIK", x + 35, y + 38, { align: "center" }); doc.setFontSize(9).setFont("helvetica", "bold").text(t.nama.slice(0, 40), x + 35, y + 45, { align: "center" }); doc.setFontSize(7).setFont("helvetica", "normal").text(t.waktu.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }), x + 35, y + 51, { align: "center" }); }
    else doc.setFont("helvetica", "italic").setFontSize(8).text("(belum ditandatangani)", x + 35, y + 32, { align: "center" });
  });
  doc.setFont("helvetica", "normal").setFontSize(7.5).text("Penghapusan Barang Milik Daerah tetap mengikuti ketentuan Permendagri 47/2021 & Pergub DKI; dokumen ini adalah berita acara teknis.", 105, y + 68, { align: "center", maxWidth: 175 });
  return Buffer.from(doc.output("arraybuffer"));
}
