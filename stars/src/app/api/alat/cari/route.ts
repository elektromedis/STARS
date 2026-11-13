import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { unitTerkunci } from "@/lib/akses";
import { statusKalibrasi } from "@/lib/kalibrasi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/alat/cari — PUBLIK (data yang sama dengan Inventaris Alat Kesehatan). Hanya alat aktif.
 *   ?q=<teks>[&unit=<id>]  → saran untuk kolom pencarian (nama, merek, tipe, nomor seri, kode, ruangan), maks 20
 *   ?kode=<teks>           → cocok persis kode inventaris / nomor seri / no urut aset (hasil scan QR)
 *   ?aspak=<kode>          → QR lama Trilux (kode jenis alat ASPAK), bisa beberapa alat
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim().slice(0, 80) ?? "";
  const kode = sp.get("kode")?.trim().slice(0, 120) ?? "";
  const aspak = sp.get("aspak")?.trim().slice(0, 40) ?? "";
  const unitId = Number(sp.get("unit")) || null;
  const kunci = await unitTerkunci();

  const where: Prisma.AlatWhereInput = { aktif: true, ...(kunci ? { unitKerja: { nama: kunci.nama } } : unitId ? { unitKerjaId: unitId } : {}) };
  let batas = 20;
  if (kode) { where.OR = [{ kode }, { nomorSeri: kode }, { noUrutAset: kode }]; batas = 10; }
  else if (aspak) { where.kodeAspak = aspak; batas = 100; }
  else if (q.length >= 2) {
    // setiap kata harus muncul di salah satu kolom (mis. "infus terumo" → nama "Infusion Pump" merek "Terumo")
    const kata = q.split(/\s+/).filter(Boolean).slice(0, 5);
    where.AND = kata.map((k) => ({ OR: [{ nama: { contains: k } }, { merek: { contains: k } }, { model: { contains: k } }, { nomorSeri: { contains: k } }, { kode: { contains: k } }, { ruangan: { nama: { contains: k } } }, { lokasi: { contains: k } }] }));
  } else return NextResponse.json({ alat: [] });

  const rows = await prisma.alat.findMany({
    where, take: batas,
    orderBy: [{ nama: "asc" }, { unitKerja: { urut: "asc" } }, { kode: "asc" }],
    select: {
      id: true, kode: true, nama: true, merek: true, model: true, nomorSeri: true, kondisi: true, foto: true, lokasi: true, unitKerjaId: true,
      unitKerja: { select: { nama: true } }, ruangan: { select: { nama: true } },
      kalibrasi: { orderBy: [{ tanggal: "desc" }, { id: "desc" }], take: 1, select: { laik: true, berlakuSampai: true } },
    },
  });
  const kini = Date.now();
  // untuk saran: yang namanya diawali kata kunci tampil lebih dulu
  const awalan = q.toLowerCase();
  if (q) rows.sort((a, b) => Number(!a.nama.toLowerCase().startsWith(awalan)) - Number(!b.nama.toLowerCase().startsWith(awalan)));
  return NextResponse.json({
    alat: rows.map((a) => {
      const st = statusKalibrasi(a.kalibrasi[0] ?? null, kini);
      return {
        id: a.id, kode: a.kode, nama: a.nama, merek: a.merek, model: a.model, nomorSeri: a.nomorSeri, kondisi: a.kondisi, foto: a.foto,
        unitKerjaId: a.unitKerjaId, unit: a.unitKerja.nama, ruangan: a.ruangan?.nama ?? a.lokasi, kalibrasi: { label: st.label, variant: st.variant },
      };
    }),
  }, { headers: { "Cache-Control": "no-store" } });
}
