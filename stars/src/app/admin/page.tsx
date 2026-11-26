import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { aksesPengguna } from "@/lib/role";

/** Halaman awal admin: tab pertama yang diizinkan (Impor untuk Operator ke atas, Ekspor untuk Viewer). Pesan `ditolak` diteruskan. */
export default async function AdminIndex({ searchParams }: { searchParams: Promise<{ ditolak?: string }> }) {
  const { ditolak } = await searchParams;
  const s = await auth();
  const akses = await aksesPengguna(s?.user?.id);
  const calon = ["/admin/ekspor", "/admin/pemeliharaan", "/admin/alat", "/admin/kalibrasi", "/admin/dokumen", "/admin/jadwal"];
  const tujuan = calon.find((h) => !akses || akses.menu[h] !== false);
  if (!tujuan) redirect("/?ditolak=" + encodeURIComponent("Admin (semua menu admin dimatikan untuk peran Anda)"));
  redirect(ditolak ? `${tujuan}?ditolak=${encodeURIComponent(ditolak)}` : tujuan);
}
