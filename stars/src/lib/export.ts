import * as XLSX from "xlsx";

type Baris = Record<string, unknown>;

/** Buku kerja XLSX dari satu atau beberapa sheet (array objek → tabel). */
export function keXlsx(sheets: { nama: string; baris: Baris[] }[]): Buffer {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.baris.length ? s.baris : [{ info: "Tidak ada data" }]);
    // lebar kolom otomatis (maks 60 karakter)
    const keys = Object.keys(s.baris[0] ?? { info: "" });
    ws["!cols"] = keys.map((k) => ({ wch: Math.min(60, Math.max(k.length, ...s.baris.slice(0, 200).map((b) => String(b[k] ?? "").length)) + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, s.nama.slice(0, 31));
  }
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as ArrayBuffer);
}

/** CSV berpemisah titik koma (format Excel Indonesia) dengan BOM agar huruf Indonesia tampil benar. */
export function keCsv(baris: Baris[]): string {
  return "﻿" + XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(baris), { FS: ";" });
}

export function namaBerkas(bagian: (string | number | null | undefined)[], ext: string) {
  const bersih = bagian.filter(Boolean).map((b) => String(b).replace(/[^\w\-]+/g, "_"));
  return `STARS_${bersih.join("_")}.${ext}`;
}
