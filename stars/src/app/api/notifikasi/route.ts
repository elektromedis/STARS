import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { unitTerkunci } from "@/lib/akses";
import { cukup } from "@/lib/peran";
import { notifikasiPerubahan, notifikasiPetugas } from "@/lib/notifikasi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/notifikasi — notifikasi petugas (laporan baru, WO untuk saya, preventif & kalibrasi).
 * Pengunjung tanpa akun mendapat daftar kosong; status laporan miliknya dilacak di browser lewat /api/lapor/lacak.
 */
export async function GET() {
  const s = await auth();
  if (!s?.user) return NextResponse.json({ masuk: false, item: [] }, { headers: { "Cache-Control": "no-store" } });
  const kunci = await unitTerkunci();
  const [petugas, ubah] = await Promise.all([
    notifikasiPetugas({ penggunaId: Number(s.user.id) || null, unit: kunci?.nama ?? null }),
    !cukup(s.user.peran, "Operator") ? Promise.resolve([]) : notifikasiPerubahan({ email: s.user.email ?? null }),
  ]);
  const item = [...petugas, ...ubah].sort((a, b) => b.waktu.localeCompare(a.waktu));
  return NextResponse.json({ masuk: true, nama: s.user.nama ?? s.user.name ?? null, item }, { headers: { "Cache-Control": "no-store" } });
}
