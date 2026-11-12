import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { cukup } from "@/lib/peran";

/** Halaman awal admin: Operator ke atas ke Impor; Viewer (tanpa hak impor) ke Ekspor. Pesan `ditolak` diteruskan. */
export default async function AdminIndex({ searchParams }: { searchParams: Promise<{ ditolak?: string }> }) {
  const { ditolak } = await searchParams;
  const s = await auth();
  const tujuan = cukup(s?.user?.peran, "Operator") ? "/admin/impor" : "/admin/ekspor";
  redirect(ditolak ? `${tujuan}?ditolak=${encodeURIComponent(ditolak)}` : tujuan);
}
