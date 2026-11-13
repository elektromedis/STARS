import { NextRequest, NextResponse } from "next/server";
import { unitTerkunci } from "@/lib/akses";
import { getDataKalibrasi, JENIS_UJI, STATUS_DATA, type FilterKalibrasi } from "@/lib/kalibrasi-data";
import { isoTanggal } from "@/lib/kalibrasi";
import { keXlsx, namaBerkas } from "@/lib/export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/kalibrasi/ekspor?… (filter sama dengan halaman) — XLSX: Data per alat / riwayat, Per unit, Jatuh tempo. Publik, tanpa berkas sertifikat. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const g = (k: string) => sp.get(k)?.trim() ?? "";
  const f: FilterKalibrasi = {
    q: g("q").slice(0, 100), unit: g("unit").slice(0, 120), lembaga: g("lembaga").slice(0, 160), tahun: /^\d{4}$/.test(g("tahun")) ? g("tahun") : "",
    status: STATUS_DATA.some((s) => s.kode === g("status")) ? g("status") : "", jenis: (JENIS_UJI as readonly string[]).includes(g("jenis")) ? g("jenis") : "",
    mode: g("mode") === "riwayat" ? "riwayat" : "alat",
  };
  const kunci = await unitTerkunci();
  const d = await getDataKalibrasi({ kunci: kunci?.nama ?? null, f: kunci ? { ...f, unit: "" } : f, page: 1, pageSize: 1 });
  const data = d.semuaBaris.map((b) => ({
    "Nomor Seri (SN)": b.nomorSeri ?? "", "Kode Inventaris": b.kode, "Nama Alat": b.nama, "Merek/Tipe": b.tipe, "Unit Kerja": b.unit, Ruangan: b.ruangan ?? "",
    Jenis: b.jenis ?? "", "Tanggal": isoTanggal(b.tanggal), Lembaga: b.kalibrator ?? "", "No. Sertifikat": b.nomorSertifikat ?? "",
    Hasil: b.laik === null ? "" : b.laik ? "Laik" : "Tidak laik", "Berlaku s/d": isoTanggal(b.berlakuSampai), Status: b.st.label, "Sertifikat digital": b.adaBerkas ? "Ada" : "",
  }));
  const perUnit = d.perUnit.map((u) => ({ "Unit Kerja": u.nama, "Jumlah alat": u.total, Berlaku: u.berlaku, "Habis ≤30 hari": u.segera, "Kedaluwarsa/tidak laik": u.bermasalah, "Tanpa masa berlaku": u["tanpa-batas"], "Belum pernah": u.belum }));
  const tempo = d.bulan.map((b) => ({ Bulan: b.kunci, "Alat jatuh tempo": b.jumlah }));
  const buf = keXlsx([{ nama: f.mode === "riwayat" ? "Riwayat" : "Per alat", baris: data }, { nama: "Per unit", baris: perUnit }, { nama: "Jatuh tempo 12 bulan", baris: tempo }]);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaBerkas(["Pengujian_Kalibrasi", f.mode === "riwayat" ? "riwayat" : "per_alat", kunci?.nama ?? f.unit, new Date().toISOString().slice(0, 10)], "xlsx")}"`,
      "Cache-Control": "no-store",
    },
  });
}
