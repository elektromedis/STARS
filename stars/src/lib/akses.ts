import { auth } from "@/auth";

/**
 * Akun Viewer yang punya unit kerja hanya boleh melihat data & dokumen unitnya sendiri.
 * Mengembalikan unit yang mengunci tampilan, atau null bila tidak dibatasi.
 */
export async function unitTerkunci(): Promise<{ id: number | null; nama: string } | null> {
  const s = await auth();
  if (s?.user?.peran === "Viewer" && s.user.unitKerja) return { id: s.user.unitKerjaId ?? null, nama: s.user.unitKerja };
  return null;
}
