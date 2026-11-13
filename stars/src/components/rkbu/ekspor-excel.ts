/** Ekspor dokumen RKBU ke Excel (dibuat di browser; xlsx dimuat hanya saat tombol diklik). */
import { jumlahBaris, totalRkbu, type IsiRkbu } from "@/lib/rkbu";

export async function unduhExcelRkbu(isi: IsiRkbu, namaBerkas: string) {
  const XLSX = await import("xlsx");
  const K = isi.kolom;
  const aoa: (string | number | null)[][] = [];
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
  const gabung = (r1: number, c1: number, r2: number, c2: number) => merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });

  for (const j of isi.judul.filter((x) => x.trim())) { gabung(aoa.length, 0, aoa.length, 14); aoa.push([j]); }
  aoa.push([]);
  for (const i of isi.identitas.filter((x) => x.label || x.nilai)) { gabung(aoa.length, 0, aoa.length, 1); aoa.push([i.label, null, `: ${i.nilai}`]); }
  aoa.push([]);

  const h = aoa.length;
  aoa.push([K.no, K.rekening, K.barang, K.uraian, K.lokasi, K.kodeBarang, K.kelompokJumlah, null, null, null, null, K.kelompokHarga, null, K.prioritas, K.keterangan]);
  aoa.push([null, null, null, null, null, null, K.vol1, K.satuan1, K.x, K.vol2, K.satuan2, K.harga, K.jumlah, null, null]);
  for (const c of [0, 1, 2, 3, 4, 5, 13, 14]) gabung(h, c, h + 1, c);
  gabung(h, 6, h, 10); gabung(h, 11, h, 12);
  aoa.push(Array.from({ length: 15 }, (_, i) => i + 1));
  const awalData = aoa.length;
  isi.baris.forEach((b, i) => aoa.push([i + 1, b.rekening, b.barang, b.uraian, b.lokasi, b.kodeBarang, b.vol1, b.satuan1, "x", b.vol2, b.satuan2, b.harga, jumlahBaris(b, isi.ppn), b.prioritas, b.keterangan]));
  const akhirData = aoa.length;
  aoa.push([null, null, null, null, null, null, null, null, null, null, null, "GRAND TOTAL", totalRkbu(isi)]);
  aoa.push([]);
  for (const c of isi.catatan.filter((x) => x.trim())) aoa.push([c]);
  aoa.push([]);
  if (isi.pengesahan.ttd.length) {
    if (isi.pengesahan.pembuka) aoa.push([isi.pengesahan.pembuka]);
    const kol = isi.pengesahan.ttd.map((_, i, a) => Math.round((i * 14) / Math.max(1, a.length - 1 || 1)) + (a.length === 1 ? 6 : 0));
    const baris = (isiSel: (t: IsiRkbu["pengesahan"]["ttd"][number], i: number) => string) => {
      const r: (string | null)[] = Array(15).fill(null);
      isi.pengesahan.ttd.forEach((t, i) => { r[Math.min(14, kol[i])] = isiSel(t, i); });
      aoa.push(r);
    };
    if (isi.pengesahan.tempatTanggal) baris((_, i) => (i === isi.pengesahan.ttd.length - 1 ? isi.pengesahan.tempatTanggal : ""));
    baris((t) => t.jabatan.replace(/\n/g, " "));
    aoa.push([], [], []);
    baris((t) => t.nama);
    baris((t) => (t.nip ? `NIP. ${t.nip}` : ""));
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = merges;
  ws["!cols"] = [5, 24, 30, 32, 14, 12, 7, 8, 3, 7, 8, 15, 16, 10, 24].map((wch) => ({ wch }));
  for (let r = awalData; r <= akhirData; r++) {
    for (const c of [11, 12]) { const sel = ws[XLSX.utils.encode_cell({ r, c })]; if (sel && typeof sel.v === "number") sel.z = "#,##0"; }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, isi.jenis === "Pengadaan" ? "RKBU" : "RKPBU");
  XLSX.writeFile(wb, `${namaBerkas.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120) || "RKBU"}.xlsx`);
}
